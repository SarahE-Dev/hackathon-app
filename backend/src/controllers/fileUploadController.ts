import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import FileUploadService from '../services/fileUploadService';
import multer from 'multer';

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

    const { questionId } = req.body;
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
      questionId
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

    const { questionId } = req.body;
    if (!questionId) {
      throw new ApiError(400, 'Question ID is required');
    }

    // Upload the file
    const uploadedFile = await FileUploadService.uploadFile(
      file.buffer,
      file.originalname,
      req.user.id,
      questionId
    );

    res.json({
      success: true,
      data: uploadedFile,
    });
  } catch (error) {
    next(error);
  }
};
