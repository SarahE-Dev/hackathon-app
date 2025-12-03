import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import Team from '../models/Team';
import User from '../models/User';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  teamId?: string;
}

interface CodeUpdate {
  code: string;
  cursorPosition?: { line: number; column: number };
  timestamp: Date;
  userId: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system' | 'code-share';
}

interface TeamPresence {
  userId: string;
  username: string;
  avatar?: string;
  cursorPosition?: { line: number; column: number };
  lastActive: Date;
  isOnline: boolean;
}

export class TeamCollaborationService {
  private io: Server;
  private teamRooms: Map<string, TeamPresence[]> = new Map();
  private chatHistory: Map<string, ChatMessage[]> = new Map();
  private codeState: Map<string, CodeUpdate> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/collaboration',
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
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
      logger.info(`Team collaboration client connected: ${socket.id} (User: ${socket.userId})`);

      // Join team room
      socket.on('join-team', async (teamId: string) => {
        try {
          const team = await Team.findById(teamId).populate('memberIds', 'firstName lastName');

          if (!team) {
            socket.emit('error', { message: 'Team not found' });
            return;
          }

          // Verify user is a team member
          const memberIdStrings = team.memberIds.map(m => {
            const memberId = typeof m === 'string' ? m : (m as any)._id?.toString() || m.toString();
            return memberId;
          });
          const isMember = memberIdStrings.includes(socket.userId);

          logger.debug(`Team membership check: userId=${socket.userId}, memberIds=${JSON.stringify(memberIdStrings)}, isMember=${isMember}`);

          if (!isMember) {
            socket.emit('error', { message: 'Access denied - not a team member' });
            return;
          }

          socket.teamId = teamId;
          socket.join(`team:${teamId}`);

          // Add user to team presence
          await this.addUserToTeam(teamId, socket.userId!);

          // Send current team state
          const presence = this.teamRooms.get(teamId) || [];
          const chatHistory = this.chatHistory.get(teamId) || [];
          const currentCode = this.codeState.get(teamId);

          socket.emit('team-joined', {
            teamId,
            presence,
            chatHistory: chatHistory.slice(-50), // Last 50 messages
            currentCode: currentCode?.code || '',
          });

          // Notify other team members
          socket.to(`team:${teamId}`).emit('user-joined', {
            userId: socket.userId,
            presence: presence.find(p => p.userId === socket.userId),
          });

          logger.info(`User ${socket.userId} joined team ${teamId}`);
        } catch (error) {
          logger.error('Error joining team:', error);
          socket.emit('error', { message: 'Failed to join team' });
        }
      });

      // Code updates
      socket.on('code-update', async (data: { code: string; cursorPosition?: { line: number; column: number } }) => {
        if (!socket.teamId) return;

        const codeUpdate: CodeUpdate = {
          code: data.code,
          cursorPosition: data.cursorPosition,
          timestamp: new Date(),
          userId: socket.userId!,
        };

        // Store latest code state
        this.codeState.set(socket.teamId, codeUpdate);

        // Update user presence
        await this.updateUserPresence(socket.teamId, socket.userId!, {
          cursorPosition: data.cursorPosition,
          lastActive: new Date(),
        });

        // Broadcast to team (except sender)
        socket.to(`team:${socket.teamId}`).emit('code-updated', {
          userId: socket.userId,
          code: data.code,
          cursorPosition: data.cursorPosition,
          timestamp: codeUpdate.timestamp,
        });
      });

      // Chat messages
      socket.on('send-message', async (data: { message: string }) => {
        if (!socket.teamId) return;

        try {
          const user = await User.findById(socket.userId);
          if (!user) return;

          const chatMessage: ChatMessage = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: socket.userId!,
            username: `${user.firstName} ${user.lastName}`,
            message: data.message,
            timestamp: new Date(),
            type: 'message',
          };

          // Store in chat history
          const teamChat = this.chatHistory.get(socket.teamId) || [];
          teamChat.push(chatMessage);
          this.chatHistory.set(socket.teamId, teamChat.slice(-100)); // Keep last 100 messages

          // Broadcast to team
          this.io.to(`team:${socket.teamId}`).emit('chat-message', chatMessage);
        } catch (error) {
          logger.error('Error sending chat message:', error);
        }
      });

      // Code execution results (for team visibility)
      socket.on('execution-result', (data: { result: any; problemId: string }) => {
        if (!socket.teamId) return;

        socket.to(`team:${socket.teamId}`).emit('team-execution', {
          userId: socket.userId,
          result: data.result,
          problemId: data.problemId,
          timestamp: new Date(),
        });
      });

      // Cursor position updates
      socket.on('cursor-move', (data: { line: number; column: number }) => {
        if (!socket.teamId) return;

        // Update presence
        this.updateUserPresence(socket.teamId, socket.userId!, {
          cursorPosition: { line: data.line, column: data.column },
          lastActive: new Date(),
        });

        // Broadcast cursor position
        socket.to(`team:${socket.teamId}`).emit('cursor-moved', {
          userId: socket.userId,
          position: { line: data.line, column: data.column },
        });
      });

      // Status updates (in-team-space vs live-coding)
      socket.on('update-status', (data: { status: string; problemTitle?: string }) => {
        if (!socket.teamId) return;

        logger.info(`User ${socket.userId} status update: ${data.status}${data.problemTitle ? ` (${data.problemTitle})` : ''}`);

        // Broadcast status update to all team members
        this.io.to(`team:${socket.teamId}`).emit('user-status-update', {
          odId: socket.userId,
          odStatus: data.status,
          odProblemTitle: data.problemTitle,
        });
      });

      // Leave team
      socket.on('leave-team', () => {
        this.handleUserLeave(socket);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleUserLeave(socket);
        logger.info(`Team collaboration client disconnected: ${socket.id}`);
      });
    });
  }

  private async addUserToTeam(teamId: string, userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const presence: TeamPresence = {
        userId,
        username: `${user.firstName} ${user.lastName}`,
        lastActive: new Date(),
        isOnline: true,
      };

      const teamPresence = this.teamRooms.get(teamId) || [];
      const existingIndex = teamPresence.findIndex(p => p.userId === userId);

      if (existingIndex >= 0) {
        teamPresence[existingIndex] = presence;
      } else {
        teamPresence.push(presence);
      }

      this.teamRooms.set(teamId, teamPresence);
    } catch (error) {
      logger.error('Error adding user to team:', error);
    }
  }

  private async updateUserPresence(teamId: string, userId: string, updates: Partial<TeamPresence>) {
    const teamPresence = this.teamRooms.get(teamId);
    if (!teamPresence) return;

    const userPresence = teamPresence.find(p => p.userId === userId);
    if (!userPresence) return;

    Object.assign(userPresence, updates);
  }

  private handleUserLeave(socket: AuthenticatedSocket) {
    if (!socket.teamId || !socket.userId) return;

    // Mark user as offline
    this.updateUserPresence(socket.teamId, socket.userId, {
      isOnline: false,
      lastActive: new Date(),
    });

    // Leave room
    socket.leave(`team:${socket.teamId}`);

    // Notify other team members
    socket.to(`team:${socket.teamId}`).emit('user-left', {
      userId: socket.userId,
    });

    logger.info(`User ${socket.userId} left team ${socket.teamId}`);
  }

  // Get current team presence
  public getTeamPresence(teamId: string): TeamPresence[] {
    return this.teamRooms.get(teamId) || [];
  }

  // Get chat history for team
  public getChatHistory(teamId: string): ChatMessage[] {
    return this.chatHistory.get(teamId) || [];
  }

  // Get current code state
  public getCodeState(teamId: string): CodeUpdate | null {
    return this.codeState.get(teamId) || null;
  }

  // Broadcast system message to team
  public broadcastToTeam(teamId: string, event: string, data: any) {
    this.io.to(`team:${teamId}`).emit(event, data);
  }

  // Get Socket.io instance
  public getIO() {
    return this.io;
  }
}
