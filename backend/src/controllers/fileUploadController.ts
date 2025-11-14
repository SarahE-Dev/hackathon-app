import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import FileUploadService from '../services/fileUploadService';
import multer from 'multer';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const uploadMiddleware = upload.array('files', 10); // Allow up to 10 files

export const uploadFiles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new ApiError(400, 'No files uploaded');
    }

    const { questionId, attemptId } = req.body;
    if (!questionId) {
      throw new ApiError(400, 'Question ID is required');
    }

    // Process and upload each file
    const uploadedFiles = await FileUploadService.uploadMultipleFiles(
      files.map((file) => ({
        buffer: file.buffer,
        originalName: file.originalname,
      })),
      req.user.id,
      questionId,
      attemptId
    );

    res.json({
      success: true,
      data: {
        files: uploadedFiles,
        count: uploadedFiles.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadSingleFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const file = req.file as Express.Multer.File;
    if (!file) {
      throw new ApiError(400, 'No file uploaded');
    }

    const { questionId, attemptId } = req.body;
    if (!questionId) {
      throw new ApiError(400, 'Question ID is required');
    }

    // Upload the file
    const uploadedFile = await FileUploadService.uploadFile(
      file.buffer,
      file.originalname,
      req.user.id,
      questionId,
      attemptId
    );

    res.json({
      success: true,
      data: uploadedFile,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { filename } = req.params;
    if (!filename) {
      throw new ApiError(400, 'Filename is required');
    }

    // Verify user has access to this file
    const hasAccess = await FileUploadService.verifyFileAccess(
      filename,
      req.user.id,
      req.user.role
    );

    if (!hasAccess) {
      throw new ApiError(403, 'Access denied to this file');
    }

    const filePath = FileUploadService.getFilePathFromUrl(`/api/uploads/assessments/${filename}`);

    // Check if file exists
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new ApiError(404, 'File not found');
    }

    // Stream the file
    const fileStream = createReadStream(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileStats.size);

    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { filename } = req.params;
    if (!filename) {
      throw new ApiError(400, 'Filename is required');
    }

    // Verify user owns this file (or is admin)
    const hasAccess = await FileUploadService.verifyFileAccess(
      filename,
      req.user.id,
      req.user.role
    );

    if (!hasAccess) {
      throw new ApiError(403, 'Access denied to delete this file');
    }

    await FileUploadService.deleteFile(filename, req.user.id);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
