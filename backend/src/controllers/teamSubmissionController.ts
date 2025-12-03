import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import TeamSubmission from '../models/TeamSubmission';
import Team from '../models/Team';
import HackathonSession from '../models/HackathonSession';
import Question from '../models/Question';
import CodeExecutionService from '../services/codeExecutionService';
import { logger } from '../utils/logger';

/**
 * Get all submissions for a team in a session
 */
export const getTeamSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { teamId, sessionId } = req.params;

    // Verify user is a member of the team
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    const isMember = team.memberIds.some(
      (m) => m.toString() === req.user?.userId
    );
    if (!isMember) {
      throw new ApiError(403, 'You are not a member of this team');
    }

    const submissions = await TeamSubmission.find({ teamId, sessionId })
      .populate('problemId', 'title difficulty points')
      .populate('submittedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Calculate team stats
    const totalProblems = await HackathonSession.findById(sessionId)
      .then((s) => s?.problems?.length || 0);
    
    const completedProblems = submissions.filter((s) => s.allTestsPassed).length;
    const totalPointsEarned = submissions.reduce((sum, s) => sum + s.pointsEarned, 0);
    const totalPossiblePoints = submissions.reduce((sum, s) => sum + s.maxPoints, 0);

    res.json({
      success: true,
      data: {
        submissions,
        stats: {
          totalProblems,
          completedProblems,
          inProgressProblems: submissions.filter((s) => s.status === 'in_progress').length,
          totalPointsEarned,
          totalPossiblePoints,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific submission
 */
export const getSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { teamId, sessionId, problemId } = req.params;

    const submission = await TeamSubmission.findOne({ teamId, sessionId, problemId })
      .populate('problemId', 'title difficulty points content')
      .populate('submittedBy', 'firstName lastName');

    if (!submission) {
      return res.json({
        success: true,
        data: { submission: null },
      });
    }

    res.json({
      success: true,
      data: { submission },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save/update a team's submission (auto-save while coding)
 */
export const saveSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { teamId, sessionId, problemId } = req.params;
    const { code, explanation } = req.body;
    const userId = req.user!.userId;

    // Verify user is a member of the team
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    const isMember = team.memberIds.some(
      (m) => m.toString() === userId
    );
    if (!isMember) {
      throw new ApiError(403, 'You are not a member of this team');
    }

    // Get the problem to get max points
    const problem = await Question.findById(problemId);
    if (!problem) {
      throw new ApiError(404, 'Problem not found');
    }

    // Upsert the submission
    const submission = await TeamSubmission.findOneAndUpdate(
      { teamId, sessionId, problemId },
      {
        $set: {
          code,
          explanation,
          language: problem.content?.language || 'python',
          maxPoints: problem.points,
          submittedBy: userId,
        },
        $setOnInsert: {
          status: 'in_progress',
          attempts: 0,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: { submission },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Run tests for a submission
 */
export const runTests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { teamId, sessionId, problemId } = req.params;
    const { code } = req.body;
    const userId = req.user!.userId;

    // Verify user is a member of the team
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    const isMember = team.memberIds.some(
      (m) => m.toString() === userId
    );
    if (!isMember) {
      throw new ApiError(403, 'You are not a member of this team');
    }

    // Get the problem with test cases
    const problem = await Question.findById(problemId);
    if (!problem) {
      throw new ApiError(404, 'Problem not found');
    }

    const testCases = problem.content?.testCases || [];
    if (testCases.length === 0) {
      throw new ApiError(400, 'No test cases defined for this problem');
    }

    // Execute code with test cases
    const language = problem.content?.language || 'python';
    const results = await CodeExecutionService.executeCode(
      code,
      language,
      testCases.map((tc: any) => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      }))
    );

    // Calculate results
    const passedTests = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    const allTestsPassed = passedTests === totalTests;
    const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    const pointsEarned = allTestsPassed ? problem.points : 0;

    // Update submission
    const submission = await TeamSubmission.findOneAndUpdate(
      { teamId, sessionId, problemId },
      {
        $set: {
          code,
          language,
          testResults: results.map((r) => ({
            testCaseId: r.id,
            passed: r.passed,
            actualOutput: r.actualOutput,
            expectedOutput: r.expectedOutput,
            executionTime: r.executionTime,
            error: r.error,
          })),
          passedTests,
          totalTests,
          score,
          pointsEarned,
          maxPoints: problem.points,
          allTestsPassed,
          status: allTestsPassed ? 'passed' : 'in_progress',
          submittedBy: userId,
        },
        $inc: { attempts: 1 },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`Team ${teamId} ran tests for problem ${problemId}: ${passedTests}/${totalTests} passed`);

    res.json({
      success: true,
      data: {
        results,
        summary: {
          passedTests,
          totalTests,
          score: `${score}%`,
          allTestsPassed,
          pointsEarned,
          maxPoints: problem.points,
        },
        submission,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit final solution
 */
export const submitSolution = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { teamId, sessionId, problemId } = req.params;
    const { code, explanation } = req.body;
    const userId = req.user!.userId;

    // Verify user is a member of the team
    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    const isMember = team.memberIds.some(
      (m) => m.toString() === userId
    );
    if (!isMember) {
      throw new ApiError(403, 'You are not a member of this team');
    }

    // Get the problem
    const problem = await Question.findById(problemId);
    if (!problem) {
      throw new ApiError(404, 'Problem not found');
    }

    const testCases = problem.content?.testCases || [];
    const language = problem.content?.language || 'python';

    // Run all tests
    const results = await CodeExecutionService.executeCode(
      code,
      language,
      testCases.map((tc: any) => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      }))
    );

    // Calculate results
    const passedTests = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    const allTestsPassed = passedTests === totalTests;
    const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    const pointsEarned = allTestsPassed ? problem.points : 0;

    // Update submission with final status
    const submission = await TeamSubmission.findOneAndUpdate(
      { teamId, sessionId, problemId },
      {
        $set: {
          code,
          explanation,
          language,
          testResults: results.map((r) => ({
            testCaseId: r.id,
            passed: r.passed,
            actualOutput: r.actualOutput,
            expectedOutput: r.expectedOutput,
            executionTime: r.executionTime,
            error: r.error,
          })),
          passedTests,
          totalTests,
          score,
          pointsEarned,
          maxPoints: problem.points,
          allTestsPassed,
          status: allTestsPassed ? 'passed' : 'submitted',
          submittedBy: userId,
          submittedAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
      { upsert: true, new: true }
    );

    logger.info(`Team ${teamId} submitted solution for problem ${problemId}: ${allTestsPassed ? 'PASSED' : 'FAILED'}`);

    res.json({
      success: true,
      data: {
        submission,
        results,
        summary: {
          passedTests,
          totalTests,
          score: `${score}%`,
          allTestsPassed,
          pointsEarned,
          maxPoints: problem.points,
          status: submission.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get leaderboard for a session
 */
export const getSessionLeaderboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;

    // Aggregate team scores
    const leaderboard = await TeamSubmission.aggregate([
      { $match: { sessionId: new (require('mongoose').Types.ObjectId)(sessionId) } },
      {
        $group: {
          _id: '$teamId',
          totalPoints: { $sum: '$pointsEarned' },
          problemsSolved: { $sum: { $cond: ['$allTestsPassed', 1, 0] } },
          totalAttempts: { $sum: '$attempts' },
          lastSubmission: { $max: '$updatedAt' },
        },
      },
      { $sort: { totalPoints: -1, problemsSolved: -1, lastSubmission: 1 } },
    ]);

    // Populate team names
    const populatedLeaderboard = await Team.populate(leaderboard, {
      path: '_id',
      select: 'name',
    });

    const formattedLeaderboard = populatedLeaderboard.map((entry: any, index: number) => ({
      rank: index + 1,
      team: entry._id,
      totalPoints: entry.totalPoints,
      problemsSolved: entry.problemsSolved,
      totalAttempts: entry.totalAttempts,
      lastSubmission: entry.lastSubmission,
    }));

    res.json({
      success: true,
      data: { leaderboard: formattedLeaderboard },
    });
  } catch (error) {
    next(error);
  }
};

