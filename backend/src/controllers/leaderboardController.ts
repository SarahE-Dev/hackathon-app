import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Leaderboard from '../models/Leaderboard';
import JudgeScore from '../models/JudgeScore';
import Team from '../models/Team';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const getLeaderboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, eventId } = req.query;

    const query: any = {};
    if (organizationId) query.organizationId = organizationId;
    if (eventId) query.eventId = eventId;

    let leaderboard = await Leaderboard.findOne(query);

    // If no leaderboard exists, create one
    if (!leaderboard) {
      leaderboard = new Leaderboard({
        organizationId: req.user!.roles[0]?.organizationId,
        eventId,
        standings: [],
        isPublic: false,
      });
      await leaderboard.save();
    }

    // Check if user can see private leaderboard (admins only)
    const isAdmin = req.user!.roles.some(r => r.role === 'admin' || r.role === 'proctor');
    if (!leaderboard.isPublic && !isAdmin) {
      return res.json({
        success: true,
        data: {
          leaderboard: {
            standings: [],
            isPublic: false,
            revealAt: leaderboard.revealAt,
            lastUpdated: leaderboard.lastUpdated,
          },
        },
      });
    }

    res.json({
      success: true,
      data: { leaderboard },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshLeaderboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, eventId } = req.query;

    const query: any = {};
    if (organizationId) query.organizationId = organizationId;
    if (eventId) query.eventId = eventId;

    // Get all teams that have submitted
    const submittedTeams = await Team.find({
      organizationId: req.user!.roles[0]?.organizationId,
      submittedAt: { $exists: true },
      disqualified: false,
    });

    // Get all judge scores
    const judgeScores = await JudgeScore.find({
      teamId: { $in: submittedTeams.map(t => t._id) },
    }).populate('teamId');

    // Calculate standings
    const teamScores: Record<string, {
      teamId: string;
      teamName: string;
      track?: string;
      scores: number[];
      averageScore: number;
      submittedAt: Date;
    }> = {};

    // Initialize teams
    submittedTeams.forEach((team: any) => {
      teamScores[team._id.toString()] = {
        teamId: team._id.toString(),
        teamName: team.name,
        track: team.track,
        scores: [],
        averageScore: 0,
        submittedAt: team.submittedAt!,
      };
    });

    // Aggregate scores
    judgeScores.forEach(score => {
      const teamId = score.teamId.toString();
      if (teamScores[teamId]) {
        teamScores[teamId].scores.push(score.totalScore);
      }
    });

    // Calculate averages
    Object.values(teamScores).forEach(team => {
      if (team.scores.length > 0) {
        team.averageScore = team.scores.reduce((sum, score) => sum + score, 0) / team.scores.length;
      }
    });

    // Sort by average score (descending), then by submission time (ascending)
    const standings = Object.values(teamScores)
      .filter(team => team.scores.length > 0) // Only include teams with scores
      .sort((a, b) => {
        if (Math.abs(a.averageScore - b.averageScore) < 0.01) {
          // Same score, earlier submission wins
          return a.submittedAt.getTime() - b.submittedAt.getTime();
        }
        return b.averageScore - a.averageScore;
      })
      .map((team, index) => ({
        rank: index + 1,
        teamId: new mongoose.Types.ObjectId(team.teamId),
        teamName: team.teamName,
        track: team.track,
        averageScore: team.averageScore,
        judgeScores: team.scores,
        submittedAt: team.submittedAt,
      }));

    // Update or create leaderboard
    let leaderboard = await Leaderboard.findOne(query);
    if (!leaderboard) {
      leaderboard = new Leaderboard(query);
    }

    leaderboard.standings = standings;
    leaderboard.lastUpdated = new Date();
    await leaderboard.save();

    res.json({
      success: true,
      data: { leaderboard },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleLeaderboardPublic = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, eventId } = req.query;

    // Only admins can toggle leaderboard visibility
    const isAdmin = req.user!.roles.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new ApiError(403, 'Only admins can toggle leaderboard visibility');
    }

    const query: any = {};
    if (organizationId) query.organizationId = organizationId;
    if (eventId) query.eventId = eventId;

    const leaderboard = await Leaderboard.findOne(query);
    if (!leaderboard) {
      throw new ApiError(404, 'Leaderboard not found');
    }

    leaderboard.isPublic = !leaderboard.isPublic;
    if (leaderboard.isPublic) {
      leaderboard.revealAt = new Date();
    }

    await leaderboard.save();

    res.json({
      success: true,
      data: { leaderboard },
      message: `Leaderboard ${leaderboard.isPublic ? 'revealed' : 'hidden'}`,
    });
  } catch (error) {
    next(error);
  }
};
