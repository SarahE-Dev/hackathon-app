import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import codewarsService from '../services/codewarsService';
import Question from '../models/Question';
import { UserRole } from '../../../shared/src/types/common';

/**
 * Import a coding problem from Codewars by ID or slug
 * POST /api/problems/import
 */
export const importCodewarseProblem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only admins and instructors can import problems
    if (!req.user?.roles?.some(r => [UserRole.ADMIN, UserRole.PROCTOR].includes(r.role as any))) {
      throw new ApiError(403, 'Only admins and instructors can import problems');
    }

    const { codewarsId, language = 'javascript' } = req.body;

    if (!codewarsId) {
      throw new ApiError(400, 'codewarsId is required');
    }

    // Fetch problem from Codewars
    const codewarsProblem = await codewarsService.getProblem(codewarsId);

    // Convert to CodeArena format
    const questionData = codewarsService.convertToCodeArenaQuestion(codewarsProblem, language);

    // Check if problem already imported
    const existing = await Question.findOne({
      'metadata.codewarsId': codewarsProblem.id,
    });

    if (existing) {
      return res.json({
        success: true,
        data: {
          message: 'Problem already imported',
          question: existing,
        },
      });
    }

    // Create question in database
    const question = new Question({
      ...questionData,
      authorId: req.user!.userId,
    });

    await question.save();

    res.status(201).json({
      success: true,
      data: {
        message: 'Problem imported successfully',
        question,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if Codewars API is available
 * GET /api/problems/codewars/status
 */
export const checkCodewarsStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const available = await codewarsService.checkAvailability();

    res.json({
      success: true,
      data: {
        available,
        service: 'codewars',
        message: available
          ? 'Codewars API is available'
          : 'Codewars API is currently unavailable',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get preview of a Codewars problem before importing
 * GET /api/problems/codewars/preview/:id
 */
export const previewCodewarsProblem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Fetch problem from Codewars
    const codewarsProblem = await codewarsService.getProblem(id);

    // Convert to CodeArena format (without saving)
    const preview = codewarsService.convertToCodeArenaQuestion(codewarsProblem, 'javascript');

    res.json({
      success: true,
      data: {
        preview,
        originalProblem: codewarsProblem,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  importCodewarseProblem,
  checkCodewarsStatus,
  previewCodewarsProblem,
};
