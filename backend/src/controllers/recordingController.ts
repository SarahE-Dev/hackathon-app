import { Request, Response, NextFunction } from 'express';
import Recording, { IRecording, RecordingSourceType, RecordingType, RecordingStatus } from '../models/Recording';
import Attempt from '../models/Attempt';
import HackathonSession from '../models/HackathonSession';
import { StorageService } from '../services/storageService';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const storageService = StorageService.getInstance();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

/**
 * Start a new recording session
 * POST /api/recordings/start
 */
export const startRecording = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sourceType, sourceId, type, teamId, consent, metadata } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    // Validate required fields
    if (!sourceType || !sourceId || !type) {
      throw new ApiError(400, 'sourceType, sourceId, and type are required');
    }

    // Validate consent
    if (!consent || !consent.given) {
      throw new ApiError(400, 'Recording consent is required');
    }

    // Validate source type
    if (!['assessment', 'hackathon'].includes(sourceType)) {
      throw new ApiError(400, 'Invalid sourceType. Must be "assessment" or "hackathon"');
    }

    // Validate recording type
    if (!['webcam', 'screen', 'snapshot'].includes(type)) {
      throw new ApiError(400, 'Invalid type. Must be "webcam", "screen", or "snapshot"');
    }

    // Verify source exists and user has access
    if (sourceType === 'assessment') {
      const attempt = await Attempt.findById(sourceId);
      if (!attempt) {
        throw new ApiError(404, 'Assessment attempt not found');
      }
      if (attempt.userId.toString() !== userId) {
        throw new ApiError(403, 'Access denied to this attempt');
      }
    } else {
      const session = await HackathonSession.findById(sourceId);
      if (!session) {
        throw new ApiError(404, 'Hackathon session not found');
      }
      // For hackathons, verify user is part of a participating team
      // This would need team membership check in production
    }

    // Check for existing active recording of same type
    const existingRecording = await Recording.findOne({
      sourceType,
      sourceId,
      userId,
      type,
      status: { $in: ['recording', 'uploading'] },
    });

    if (existingRecording) {
      throw new ApiError(409, `An active ${type} recording already exists for this session`);
    }

    // Generate storage key
    const storageKey = storageService.generateStorageKey(
      sourceType as 'assessment' | 'hackathon',
      sourceId,
      userId,
      type as 'webcam' | 'screen' | 'snapshot'
    );

    // Create recording document
    const recording = new Recording({
      sourceType,
      sourceId,
      userId,
      teamId: teamId || undefined,
      type,
      status: 'recording',
      storageKey,
      storageBucket: storageService.getProvider() === 's3' ? process.env.S3_BUCKET_NAME : undefined,
      startTime: new Date(),
      mimeType: type === 'snapshot' ? 'image/jpeg' : 'video/webm',
      consent: {
        given: consent.given,
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      metadata: metadata || {},
    });

    await recording.save();

    logger.info(`Recording started: ${recording._id} (${type}) for ${sourceType}:${sourceId}`);

    // If using S3, return presigned URL for direct upload
    let uploadUrl: string | undefined;
    if (storageService.getProvider() === 's3' && type !== 'snapshot') {
      const presigned = await storageService.getPresignedUploadUrl(
        storageKey,
        'video/webm',
        3600 // 1 hour
      );
      uploadUrl = presigned.uploadUrl;
    }

    res.status(201).json({
      success: true,
      data: {
        recordingId: recording._id,
        storageKey,
        uploadUrl,
        provider: storageService.getProvider(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload a recording chunk
 * POST /api/recordings/:recordingId/chunk
 */
export const uploadChunk = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { recordingId } = req.params;
    const { chunkIndex, duration } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!req.file) {
      throw new ApiError(400, 'Chunk file is required');
    }

    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new ApiError(404, 'Recording not found');
    }

    if (recording.userId.toString() !== userId) {
      throw new ApiError(403, 'Access denied to this recording');
    }

    if (!['recording', 'uploading'].includes(recording.status)) {
      throw new ApiError(400, 'Recording is not active');
    }

    // Generate chunk storage key
    const chunkKey = storageService.generateChunkKey(
      recording.storageKey,
      parseInt(chunkIndex) || recording.chunks.length
    );

    // Upload chunk
    const result = await storageService.uploadBuffer(
      req.file.buffer,
      chunkKey,
      recording.mimeType
    );

    // Add chunk to recording
    recording.chunks.push({
      index: parseInt(chunkIndex) || recording.chunks.length,
      storageKey: chunkKey,
      size: req.file.buffer.length,
      duration: parseInt(duration) || 0,
      uploadedAt: new Date(),
    });

    recording.status = 'uploading';
    await recording.save();

    logger.debug(`Chunk ${chunkIndex} uploaded for recording ${recordingId}`);

    res.json({
      success: true,
      data: {
        chunkIndex: recording.chunks.length - 1,
        storageKey: chunkKey,
        size: req.file.buffer.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload a snapshot
 * POST /api/recordings/:recordingId/snapshot
 */
export const uploadSnapshot = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { recordingId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!req.file) {
      throw new ApiError(400, 'Snapshot file is required');
    }

    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new ApiError(404, 'Recording not found');
    }

    if (recording.userId.toString() !== userId) {
      throw new ApiError(403, 'Access denied to this recording');
    }

    if (recording.type !== 'snapshot') {
      throw new ApiError(400, 'This recording is not a snapshot type');
    }

    // Upload snapshot directly to the storage key
    const result = await storageService.uploadBuffer(
      req.file.buffer,
      recording.storageKey,
      'image/jpeg'
    );

    recording.status = 'complete';
    recording.fileSize = req.file.buffer.length;
    recording.endTime = new Date();
    recording.duration = recording.endTime.getTime() - recording.startTime.getTime();
    await recording.save();

    logger.info(`Snapshot uploaded for recording ${recordingId}`);

    res.json({
      success: true,
      data: {
        recordingId: recording._id,
        storageKey: recording.storageKey,
        size: recording.fileSize,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete a recording
 * POST /api/recordings/:recordingId/complete
 */
export const completeRecording = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { recordingId } = req.params;
    const { totalSize, duration } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new ApiError(404, 'Recording not found');
    }

    if (recording.userId.toString() !== userId) {
      throw new ApiError(403, 'Access denied to this recording');
    }

    if (recording.status === 'complete') {
      throw new ApiError(400, 'Recording is already complete');
    }

    // Update recording status
    recording.status = 'complete';
    recording.endTime = new Date();
    recording.duration = duration || (recording.endTime.getTime() - recording.startTime.getTime());
    recording.fileSize = totalSize || recording.chunks.reduce((acc, chunk) => acc + chunk.size, 0);

    await recording.save();

    logger.info(`Recording completed: ${recordingId}`);

    res.json({
      success: true,
      data: {
        recordingId: recording._id,
        status: recording.status,
        duration: recording.duration,
        fileSize: recording.fileSize,
        chunksCount: recording.chunks.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recordings for a source (attempt or hackathon session)
 * GET /api/recordings/:sourceType/:sourceId
 */
export const getRecordings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sourceType, sourceId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    // Validate source type
    if (!['assessment', 'hackathon'].includes(sourceType)) {
      throw new ApiError(400, 'Invalid sourceType');
    }

    // Build query
    const query: any = { sourceType, sourceId };

    // Non-admin users can only see their own recordings
    if (!['admin', 'proctor', 'judge'].includes(userRole || '')) {
      query.userId = userId;
    }

    const recordings = await Recording.find(query)
      .select('-chunks') // Exclude chunks for list view
      .sort({ startTime: -1 });

    // Generate download URLs
    const recordingsWithUrls = await Promise.all(
      recordings.map(async (recording) => {
        let downloadUrl: string | undefined;
        if (recording.status === 'complete') {
          downloadUrl = await storageService.getPresignedDownloadUrl(recording.storageKey);
        }
        return {
          ...recording.toObject(),
          downloadUrl,
        };
      })
    );

    res.json({
      success: true,
      data: recordingsWithUrls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single recording with details
 * GET /api/recordings/:recordingId
 */
export const getRecording = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { recordingId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new ApiError(404, 'Recording not found');
    }

    // Check access
    const isOwner = recording.userId.toString() === userId;
    const isPrivileged = ['admin', 'proctor', 'judge'].includes(userRole || '');

    if (!isOwner && !isPrivileged) {
      throw new ApiError(403, 'Access denied');
    }

    // Generate download URL
    let downloadUrl: string | undefined;
    if (recording.status === 'complete') {
      downloadUrl = await storageService.getPresignedDownloadUrl(recording.storageKey);
    }

    res.json({
      success: true,
      data: {
        ...recording.toObject(),
        downloadUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a recording (admin only)
 * DELETE /api/recordings/:recordingId
 */
export const deleteRecording = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { recordingId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    if (userRole !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new ApiError(404, 'Recording not found');
    }

    // Delete from storage
    try {
      await storageService.deleteFile(recording.storageKey);

      // Delete chunks
      for (const chunk of recording.chunks) {
        await storageService.deleteFile(chunk.storageKey);
      }
    } catch (storageError) {
      logger.warn(`Failed to delete recording files from storage: ${storageError}`);
    }

    // Delete from database
    await Recording.findByIdAndDelete(recordingId);

    logger.info(`Recording deleted: ${recordingId} by admin ${userId}`);

    res.json({
      success: true,
      message: 'Recording deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark recording as failed
 * POST /api/recordings/:recordingId/fail
 */
export const failRecording = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { recordingId } = req.params;
    const { errorMessage } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const recording = await Recording.findById(recordingId);
    if (!recording) {
      throw new ApiError(404, 'Recording not found');
    }

    if (recording.userId.toString() !== userId) {
      throw new ApiError(403, 'Access denied to this recording');
    }

    recording.status = 'failed';
    recording.errorMessage = errorMessage || 'Recording failed';
    recording.endTime = new Date();
    await recording.save();

    logger.warn(`Recording failed: ${recordingId} - ${errorMessage}`);

    res.json({
      success: true,
      data: {
        recordingId: recording._id,
        status: recording.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Serve local recording file
 * GET /api/recordings/file/:storageKey(*)
 */
export const serveRecordingFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const storageKey = req.params[0] || req.params.storageKey;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    if (storageService.getProvider() !== 'local') {
      throw new ApiError(400, 'File serving only available for local storage');
    }

    // Validate path to prevent directory traversal
    if (!storageService.isValidLocalPath(storageKey)) {
      throw new ApiError(400, 'Invalid file path');
    }

    // Find recording to verify access
    const recording = await Recording.findOne({ storageKey });
    if (!recording) {
      throw new ApiError(404, 'Recording not found');
    }

    // Check access
    const isOwner = recording.userId.toString() === userId;
    const isPrivileged = ['admin', 'proctor', 'judge'].includes(userRole || '');

    if (!isOwner && !isPrivileged) {
      throw new ApiError(403, 'Access denied');
    }

    // Read and serve file
    const fileBuffer = await storageService.readLocalFile(storageKey);

    res.setHeader('Content-Type', recording.mimeType);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Get recording statistics (admin only)
 * GET /api/recordings/stats
 */
export const getRecordingStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      throw new ApiError(403, 'Admin access required');
    }

    const stats = await Recording.aggregate([
      {
        $group: {
          _id: { sourceType: '$sourceType', status: '$status' },
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          avgDuration: { $avg: '$duration' },
        },
      },
      {
        $group: {
          _id: '$_id.sourceType',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count',
              totalSize: '$totalSize',
              avgDuration: '$avgDuration',
            },
          },
          totalCount: { $sum: '$count' },
          totalSize: { $sum: '$totalSize' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        provider: storageService.getProvider(),
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};
