import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import Attempt from '../models/Attempt';
import { logger } from '../utils/logger';
import { AttemptStatus } from '../../../shared/src/types/common';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  attemptId?: string;
}

interface ProctorEvent {
  type: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class ProctorService {
  private io: Server;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/proctoring',
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        if (!process.env.JWT_SECRET) {
          logger.error('JWT_SECRET environment variable is not set');
          return next(new Error('Server configuration error'));
        }

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET
        ) as any;

        socket.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Proctor client connected: ${socket.id} (User: ${socket.userId})`);

      // Join attempt room
      socket.on('join-attempt', async (attemptId: string) => {
        try {
          const attempt = await Attempt.findById(attemptId);

          if (!attempt) {
            socket.emit('error', { message: 'Attempt not found' });
            return;
          }

          // Verify ownership
          if (attempt.userId.toString() !== socket.userId) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          // Verify attempt is in progress
          if (attempt.status !== AttemptStatus.IN_PROGRESS) {
            socket.emit('error', { message: 'Attempt is not in progress' });
            return;
          }

          socket.attemptId = attemptId;
          socket.join(`attempt:${attemptId}`);

          logger.info(`User ${socket.userId} joined attempt ${attemptId}`);
          socket.emit('joined-attempt', { attemptId });
        } catch (error) {
          logger.error('Error joining attempt:', error);
          socket.emit('error', { message: 'Failed to join attempt' });
        }
      });

      // Tab switch detection
      socket.on('tab-switch', async (data: { hidden: boolean }) => {
        await this.logEvent(socket, {
          type: data.hidden ? 'tab-hidden' : 'tab-visible',
          timestamp: new Date(),
          metadata: { visibility: !data.hidden },
        });
      });

      // Focus loss
      socket.on('focus-loss', async () => {
        await this.logEvent(socket, {
          type: 'window-blur',
          timestamp: new Date(),
          metadata: {},
        });
      });

      // Focus gain
      socket.on('focus-gain', async () => {
        await this.logEvent(socket, {
          type: 'window-focus',
          timestamp: new Date(),
          metadata: {},
        });
      });

      // Copy/paste attempts
      socket.on('copy-attempt', async (data: { text?: string }) => {
        await this.logEvent(socket, {
          type: 'copy-detected',
          timestamp: new Date(),
          metadata: { textLength: data.text?.length || 0 },
        });
      });

      socket.on('paste-attempt', async (data: { text?: string }) => {
        await this.logEvent(socket, {
          type: 'paste-detected',
          timestamp: new Date(),
          metadata: { textLength: data.text?.length || 0 },
        });
      });

      // Right click detection
      socket.on('right-click', async (data: { x: number; y: number }) => {
        await this.logEvent(socket, {
          type: 'right-click-detected',
          timestamp: new Date(),
          metadata: { position: { x: data.x, y: data.y } },
        });
      });

      // Keyboard shortcuts
      socket.on('keyboard-shortcut', async (data: { keys: string }) => {
        await this.logEvent(socket, {
          type: 'keyboard-shortcut',
          timestamp: new Date(),
          metadata: { keys: data.keys },
        });
      });

      // Full screen events
      socket.on('fullscreen-exit', async () => {
        await this.logEvent(socket, {
          type: 'fullscreen-exit',
          timestamp: new Date(),
          metadata: {},
        });
      });

      socket.on('fullscreen-enter', async () => {
        await this.logEvent(socket, {
          type: 'fullscreen-enter',
          timestamp: new Date(),
          metadata: {},
        });
      });

      // Webcam events
      socket.on('webcam-started', async () => {
        await this.logEvent(socket, {
          type: 'webcam-started',
          timestamp: new Date(),
          metadata: {},
        });
      });

      socket.on('webcam-stopped', async () => {
        await this.logEvent(socket, {
          type: 'webcam-stopped',
          timestamp: new Date(),
          metadata: {},
        });
      });

      socket.on('webcam-error', async (data: { error: string }) => {
        await this.logEvent(socket, {
          type: 'webcam-error',
          timestamp: new Date(),
          metadata: { error: data.error },
        });
      });

      // Screen recording events
      socket.on('screen-recording-started', async () => {
        await this.logEvent(socket, {
          type: 'screen-recording-started',
          timestamp: new Date(),
          metadata: {},
        });
      });

      socket.on('screen-recording-stopped', async () => {
        await this.logEvent(socket, {
          type: 'screen-recording-stopped',
          timestamp: new Date(),
          metadata: {},
        });
      });

      // Multiple monitor detection
      socket.on('multiple-monitors-detected', async (data: { count: number }) => {
        await this.logEvent(socket, {
          type: 'multiple-monitors-detected',
          timestamp: new Date(),
          metadata: { monitorCount: data.count },
        });
      });

      // Face detection results
      socket.on('face-detection', async (data: {
        faceCount: number;
        confidence?: number;
      }) => {
        await this.logEvent(socket, {
          type: data.faceCount === 0
            ? 'face-not-detected'
            : data.faceCount > 1
            ? 'multiple-faces-detected'
            : 'face-detected',
          timestamp: new Date(),
          metadata: {
            faceCount: data.faceCount,
            confidence: data.confidence,
          },
        });
      });

      // Heartbeat to track connection
      socket.on('heartbeat', async () => {
        socket.emit('heartbeat-ack');
      });

      // Disconnect
      socket.on('disconnect', () => {
        logger.info(`Proctor client disconnected: ${socket.id}`);
      });
    });
  }

  private async logEvent(socket: AuthenticatedSocket, event: ProctorEvent) {
    try {
      if (!socket.attemptId) {
        logger.warn('Event received without attempt context');
        return;
      }

      const attempt = await Attempt.findById(socket.attemptId);

      if (!attempt) {
        logger.error(`Attempt not found: ${socket.attemptId}`);
        return;
      }

      // Add event to attempt
      attempt.events.push({
        type: event.type,
        timestamp: event.timestamp,
        metadata: event.metadata || {},
      });

      await attempt.save();

      // Notify proctors in the room
      this.io.to(`proctor:${socket.attemptId}`).emit('proctor-event', {
        attemptId: socket.attemptId,
        userId: socket.userId,
        event,
      });

      logger.debug(`Proctor event logged: ${event.type} for attempt ${socket.attemptId}`);
    } catch (error) {
      logger.error('Error logging proctor event:', error);
    }
  }

  // Allow proctors to join and monitor specific attempts
  public joinProctorRoom(socket: Socket, attemptId: string) {
    socket.join(`proctor:${attemptId}`);
    logger.info(`Proctor joined monitoring room for attempt ${attemptId}`);
  }

  // Send alert to student
  public sendAlert(attemptId: string, message: string) {
    this.io.to(`attempt:${attemptId}`).emit('proctor-alert', { message });
  }

  // Force submit attempt
  public forceSubmit(attemptId: string, reason: string) {
    this.io.to(`attempt:${attemptId}`).emit('force-submit', { reason });
  }

  // Get Socket.io instance
  public getIO() {
    return this.io;
  }
}
