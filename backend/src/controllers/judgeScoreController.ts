import { Response, NextFunction } from 'express';
import JudgeScore from '../models/JudgeScore';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getJudgeScore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { teamId, judgeId } = req.params;

    const score = await JudgeScore.findOne({
      teamId,
      judgeId: judgeId || req.user!.userId,
    });

    if (!score) {
      throw new ApiError(404, 'Judge score not found');
    }

    res.json({
      success: true,
      data: { score },
    });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateJudgeScore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { teamId, judgeId, scores, totalScore, notes, conflictOfInterest, track } = req.body;

    // Validate required fields
    if (!teamId || !scores || typeof totalScore !== 'number') {
      throw new ApiError(400, 'Team ID, scores, and total score are required');
    }

    const judgeIdToUse = judgeId || req.user!.userId;

    // Check if score already exists
    const existingScore = await JudgeScore.findOne({ teamId, judgeId: judgeIdToUse });

    let score;
    if (existingScore) {
      // Update existing score
      existingScore.scores = scores;
      existingScore.totalScore = totalScore;
      existingScore.notes = notes;
      existingScore.conflictOfInterest = conflictOfInterest;
      existingScore.track = track;
      existingScore.submittedAt = new Date();
      score = await existingScore.save();
    } else {
      // Create new score
      score = new JudgeScore({
        teamId,
        judgeId: judgeIdToUse,
        track,
        scores,
        totalScore,
        notes,
        conflictOfInterest,
      });
      await score.save();
    }

    res.json({
      success: true,
      data: { score },
      message: existingScore ? 'Score updated successfully' : 'Score submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamScores = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { teamId } = req.params;

    const scores = await JudgeScore.find({ teamId })
      .populate('judgeId', 'firstName lastName email')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: { scores },
    });
  } catch (error) {
    next(error);
  }
};

export const getJudgeScores = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { judgeId } = req.params;

    const scores = await JudgeScore.find({ judgeId: judgeId || req.user!.userId })
      .populate('teamId', 'name projectTitle track')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: { scores },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJudgeScore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { teamId, judgeId } = req.params;

    const score = await JudgeScore.findOneAndDelete({
      teamId,
      judgeId: judgeId || req.user!.userId,
    });

    if (!score) {
      throw new ApiError(404, 'Judge score not found');
    }

    res.json({
      success: true,
      message: 'Score deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
