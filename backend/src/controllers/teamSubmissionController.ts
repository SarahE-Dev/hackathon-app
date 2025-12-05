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
    const { code, explanation, proctoringEvents, codeSnapshot } = req.body;
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

    // Build update object
    const updateSet: any = {
      code,
      explanation,
      language: problem.content?.language || 'python',
      maxPoints: problem.points,
      submittedBy: userId,
    };

    // Build push operations for proctoring data
    const pushOperations: any = {};
    
    // Add new proctoring events (append to existing)
    if (proctoringEvents && Array.isArray(proctoringEvents) && proctoringEvents.length > 0) {
      pushOperations.proctoringEvents = { $each: proctoringEvents };
    }
    
    // Add code snapshot if provided
    if (codeSnapshot) {
      pushOperations.codeSnapshots = {
        code: codeSnapshot.code?.substring(0, 5000), // Limit size
        timestamp: new Date(),
        charCount: codeSnapshot.code?.length || 0,
      };
    }

    // Build the full update
    const updateQuery: any = {
      $set: updateSet,
      $setOnInsert: {
        status: 'in_progress',
        attempts: 0,
        startedAt: new Date(),
        proctoringStats: {
          copyCount: 0,
          pasteCount: 0,
          externalPasteCount: 0,
          tabSwitchCount: 0,
          windowBlurCount: 0,
          suspiciousShortcuts: 0,
          totalTimeSpent: 0,
          activeTypingTime: 0,
          idleTime: 0,
          avgTypingSpeed: 0,
          largestPaste: 0,
          suspiciousPatterns: [],
          riskScore: 0,
        },
      },
    };

    if (Object.keys(pushOperations).length > 0) {
      updateQuery.$push = pushOperations;
    }

    // Upsert the submission
    const submission = await TeamSubmission.findOneAndUpdate(
      { teamId, sessionId, problemId },
      updateQuery,
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
    const { code, runAllTests: isRunAllTests } = req.body;
    const userId = req.user!.userId;
    const MAX_TEST_RUN_ATTEMPTS = 5;

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

    // Check test run attempts if this is a "Run All Tests" call
    if (isRunAllTests) {
      const existingSubmission = await TeamSubmission.findOne({ teamId, sessionId, problemId });
      const currentAttempts = existingSubmission?.testRunAttempts || 0;
      
      if (currentAttempts >= MAX_TEST_RUN_ATTEMPTS) {
        throw new ApiError(400, `Maximum "Run All Tests" attempts reached (${MAX_TEST_RUN_ATTEMPTS}/${MAX_TEST_RUN_ATTEMPTS}). You can still use "Run Code" for visible tests.`);
      }
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
    // Points are ONLY awarded by judges, not automatically on submission
    const pointsEarned = 0;

    // Build update query - increment testRunAttempts only for "Run All Tests"
    const updateQuery: any = {
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
      $setOnInsert: {
        createdAt: new Date(),
      },
    };

    // Increment testRunAttempts only for "Run All Tests" calls
    if (isRunAllTests) {
      updateQuery.$inc = { testRunAttempts: 1 };
    }

    // Update submission
    const submission = await TeamSubmission.findOneAndUpdate(
      { teamId, sessionId, problemId },
      updateQuery,
      { upsert: true, new: true }
    );

    logger.info(`Team ${teamId} ran tests for problem ${problemId}: ${passedTests}/${totalTests} passed${isRunAllTests ? ` (attempt ${submission.testRunAttempts}/${MAX_TEST_RUN_ATTEMPTS})` : ''}`);

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
        testRunAttempts: submission.testRunAttempts || 0,
        maxTestRunAttempts: MAX_TEST_RUN_ATTEMPTS,
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
    const { code, explanation, explanationFields, proctoringStats, proctoringEvents, codeSnapshots } = req.body;
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
    // Points are ONLY awarded by judges, not automatically on submission
    const pointsEarned = 0;

    // Build update object with proctoring data
    const updateSet: any = {
      code,
      explanation,
      explanationFields: explanationFields || null, // Structured explanation fields
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
    };

    // Add final proctoring stats if provided
    if (proctoringStats) {
      updateSet.proctoringStats = proctoringStats;
    }

    const updateQuery: any = {
      $set: updateSet,
      $inc: { attempts: 1 },
    };

    // Add remaining proctoring events and snapshots
    const pushOperations: any = {};
    if (proctoringEvents && Array.isArray(proctoringEvents) && proctoringEvents.length > 0) {
      pushOperations.proctoringEvents = { $each: proctoringEvents };
    }
    if (codeSnapshots && Array.isArray(codeSnapshots) && codeSnapshots.length > 0) {
      pushOperations.codeSnapshots = { $each: codeSnapshots };
    }
    if (Object.keys(pushOperations).length > 0) {
      updateQuery.$push = pushOperations;
    }

    // Update submission with final status
    const submission = await TeamSubmission.findOneAndUpdate(
      { teamId, sessionId, problemId },
      updateQuery,
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

    // Aggregate team scores (only final submissions)
    const leaderboard = await TeamSubmission.aggregate([
      { 
        $match: { 
          sessionId: new (require('mongoose').Types.ObjectId)(sessionId),
          status: { $in: ['submitted', 'passed'] }  // Only count final submissions
        } 
      },
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

/**
 * Get all submissions for a session (judges/admins only)
 */
export const getAllSessionSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const userRoles = req.user?.roles?.map((r: any) => r.role) || [];
    
    // Check if user is judge or admin
    const canView = userRoles.some((role: string) => 
      ['judge', 'admin', 'proctor'].includes(role)
    );
    
    if (!canView) {
      throw new ApiError(403, 'Only judges and admins can view all submissions');
    }

    // Check if judges want to see all submissions (including in-progress)
    const showAll = req.query.showAll === 'true';
    
    // Build query based on filter
    const query: any = { sessionId };
    if (!showAll) {
      // Default: only show final submissions with explanations
      query.status = { $in: ['submitted', 'passed'] };
      query.explanation = { $exists: true, $ne: '' };
    }
    
    const submissions = await TeamSubmission.find(query)
      .populate('teamId', 'name memberIds')
      .populate('problemId', 'title difficulty points')
      .populate('submittedBy', 'firstName lastName email')
      .sort({ teamId: 1, 'problemId.difficulty': 1 });

    // Group by team
    const teamMap = new Map<string, any>();
    
    for (const sub of submissions) {
      const team = sub.teamId as any;
      const teamIdStr = team._id.toString();
      
      if (!teamMap.has(teamIdStr)) {
        teamMap.set(teamIdStr, {
          team: {
            _id: team._id,
            name: team.name,
            memberCount: team.memberIds?.length || 0,
          },
          submissions: [],
          stats: {
            totalSubmissions: 0,
            passedSubmissions: 0,
            totalPoints: 0,
            avgRiskScore: 0,
          },
        });
      }
      
      const teamData = teamMap.get(teamIdStr);
      teamData.submissions.push({
        _id: sub._id,
        problem: sub.problemId,
        code: sub.code,
        language: sub.language,
        explanation: sub.explanation,
        explanationFields: (sub as any).explanationFields,
        testResults: sub.testResults,
        passedTests: sub.passedTests,
        totalTests: sub.totalTests,
        score: sub.score,
        pointsEarned: sub.pointsEarned,
        maxPoints: sub.maxPoints,
        status: sub.status,
        allTestsPassed: sub.allTestsPassed,
        submittedBy: sub.submittedBy,
        submittedAt: sub.submittedAt,
        attempts: sub.attempts,
        proctoringStats: sub.proctoringStats,
        judgeFeedback: (sub as any).judgeFeedback,
      });
      
      teamData.stats.totalSubmissions++;
      if (sub.allTestsPassed) teamData.stats.passedSubmissions++;
      
      // Calculate points from judge review (not auto-awarded)
      const problem = sub.problemId as any;
      const judgeFeedback = (sub as any).judgeFeedback;
      if (judgeFeedback?.totalJudgeScore && problem?.points) {
        const judgePoints = Math.round((judgeFeedback.totalJudgeScore / 100) * problem.points);
        teamData.stats.totalPoints += judgePoints;
      }
      
      if (sub.proctoringStats?.riskScore) {
        teamData.stats.avgRiskScore += sub.proctoringStats.riskScore;
      }
    }
    
    // Calculate averages and format response
    const teamsWithSubmissions = Array.from(teamMap.values()).map(data => {
      if (data.stats.totalSubmissions > 0) {
        data.stats.avgRiskScore = Math.round(
          data.stats.avgRiskScore / data.stats.totalSubmissions
        );
      }
      return data;
    });
    
    // Sort by total points descending
    teamsWithSubmissions.sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);

    res.json({
      success: true,
      data: {
        teams: teamsWithSubmissions,
        summary: {
          totalTeams: teamsWithSubmissions.length,
          totalSubmissions: submissions.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add judge feedback to a submission with rubric-based scoring
 * 
 * Rubric breakdown:
 * - Correctness (40%): Does the code produce correct output?
 * - Code Quality (20%): Is the code clean, readable, well-organized?
 * - Efficiency (20%): Is the time/space complexity appropriate?
 * - Explanation (20%): Did they clearly explain their approach?
 */
export const addJudgeFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { submissionId } = req.params;
    const { rubricScores, feedback, flagged, flagReason } = req.body;
    const userId = req.user!.userId;
    const userRoles = req.user?.roles?.map((r: any) => r.role) || [];
    
    // Check if user is judge or admin
    const canJudge = userRoles.some((role: string) => 
      ['judge', 'admin'].includes(role)
    );
    
    if (!canJudge) {
      throw new ApiError(403, 'Only judges and admins can add feedback');
    }

    // Calculate total judge score based on rubric weights
    const weights = {
      correctness: 0.40,
      codeQuality: 0.20,
      efficiency: 0.20,
      explanation: 0.20,
    };
    
    const scores = rubricScores || {};
    const totalJudgeScore = Math.round(
      (scores.correctness || 0) * weights.correctness +
      (scores.codeQuality || 0) * weights.codeQuality +
      (scores.efficiency || 0) * weights.efficiency +
      (scores.explanation || 0) * weights.explanation
    );

    const submission = await TeamSubmission.findByIdAndUpdate(
      submissionId,
      {
        $set: {
          'judgeFeedback.judgeId': userId,
          'judgeFeedback.rubricScores': {
            correctness: scores.correctness || 0,
            codeQuality: scores.codeQuality || 0,
            efficiency: scores.efficiency || 0,
            explanation: scores.explanation || 0,
          },
          'judgeFeedback.totalJudgeScore': totalJudgeScore,
          'judgeFeedback.feedback': feedback,
          'judgeFeedback.flagged': flagged || false,
          'judgeFeedback.flagReason': flagReason,
          'judgeFeedback.reviewedAt': new Date(),
        },
      },
      { new: true }
    ).populate('teamId', 'name')
     .populate('problemId', 'title points');

    if (!submission) {
      throw new ApiError(404, 'Submission not found');
    }

    logger.info(`Judge ${userId} reviewed submission ${submissionId} with score ${totalJudgeScore}%`);

    res.json({
      success: true,
      data: { submission },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get leaderboard for a hackathon session
 * Shows all teams ranked by total points earned from judge reviews
 */
export const getLeaderboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    
    // Get all teams in this session
    const HackathonSession = (await import('../models/HackathonSession')).default;
    const session = await HackathonSession.findById(sessionId)
      .populate('teams', 'name memberIds');
    
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }
    
    const teamIds = session.teams.map((t: any) => t._id);
    
    // Aggregate submissions by team
    const teamStats = await TeamSubmission.aggregate([
      {
        $match: {
          teamId: { $in: teamIds },
          status: 'submitted',
        },
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'problemId',
          foreignField: '_id',
          as: 'problem',
        },
      },
      {
        $unwind: '$problem',
      },
      {
        $group: {
          _id: '$teamId',
          totalSubmissions: { $sum: 1 },
          reviewedSubmissions: {
            $sum: { $cond: [{ $ifNull: ['$judgeFeedback.reviewedAt', false] }, 1, 0] },
          },
          totalJudgePoints: {
            $sum: {
              $cond: [
                { $ifNull: ['$judgeFeedback.totalJudgeScore', false] },
                { $multiply: [{ $divide: ['$judgeFeedback.totalJudgeScore', 100] }, '$problem.points'] },
                0,
              ],
            },
          },
          maxPossiblePoints: { $sum: '$problem.points' },
          avgJudgeScore: {
            $avg: {
              $cond: [
                { $ifNull: ['$judgeFeedback.totalJudgeScore', false] },
                '$judgeFeedback.totalJudgeScore',
                null,
              ],
            },
          },
          passedTests: { $sum: '$passedTests' },
          totalTests: { $sum: '$totalTests' },
        },
      },
      {
        $sort: { totalJudgePoints: -1 },
      },
    ]);
    
    // Enrich with team names
    const Team = (await import('../models/Team')).default;
    const teams = await Team.find({ _id: { $in: teamIds } }).select('name memberIds');
    const teamMap = new Map(teams.map(t => [t._id.toString(), t]));
    
    const leaderboard = teamStats.map((stat, index) => {
      const team = teamMap.get(stat._id.toString());
      return {
        rank: index + 1,
        teamId: stat._id,
        teamName: team?.name || 'Unknown Team',
        memberCount: team?.memberIds?.length || 0,
        totalSubmissions: stat.totalSubmissions,
        reviewedSubmissions: stat.reviewedSubmissions,
        totalJudgePoints: Math.round(stat.totalJudgePoints * 10) / 10,
        maxPossiblePoints: stat.maxPossiblePoints,
        avgJudgeScore: stat.avgJudgeScore ? Math.round(stat.avgJudgeScore) : null,
        passedTests: stat.passedTests,
        totalTests: stat.totalTests,
        passRate: stat.totalTests > 0 ? Math.round((stat.passedTests / stat.totalTests) * 100) : 0,
      };
    });
    
    // Add teams with no submissions
    const teamsWithSubmissions = new Set(teamStats.map(s => s._id.toString()));
    const teamsWithoutSubmissions = teams.filter(t => !teamsWithSubmissions.has(t._id.toString()));
    
    teamsWithoutSubmissions.forEach(team => {
      leaderboard.push({
        rank: leaderboard.length + 1,
        teamId: team._id,
        teamName: team.name,
        memberCount: team.memberIds?.length || 0,
        totalSubmissions: 0,
        reviewedSubmissions: 0,
        totalJudgePoints: 0,
        maxPossiblePoints: 0,
        avgJudgeScore: null,
        passedTests: 0,
        totalTests: 0,
        passRate: 0,
      });
    });

    res.json({
      success: true,
      data: {
        sessionTitle: session.title,
        leaderboard,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a team's own submissions with judge feedback
 * For fellows to view their team's progress and reviews
 */
export const getMyTeamReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { teamId } = req.params;
    
    // Verify user is a member of this team
    const Team = (await import('../models/Team')).default;
    const team = await Team.findById(teamId);
    
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }
    
    const isMember = team.memberIds.some((m: any) => m.toString() === userId);
    if (!isMember) {
      throw new ApiError(403, 'You are not a member of this team');
    }
    
    // Get all submissions for this team
    const submissions: any[] = await TeamSubmission.find({ teamId })
      .populate('problemId', 'title difficulty points')
      .populate('submittedBy', 'firstName lastName')
      .sort({ submittedAt: -1 });
    
    // Calculate team totals
    const stats = {
      totalSubmissions: submissions.length,
      reviewedSubmissions: submissions.filter(s => s.judgeFeedback?.reviewedAt).length,
      totalJudgePoints: 0,
      maxPossiblePoints: 0,
      flaggedSubmissions: submissions.filter(s => s.judgeFeedback?.flagged).length,
    };
    
    submissions.forEach(sub => {
      const problem = sub.problemId as any;
      if (problem?.points) {
        stats.maxPossiblePoints += problem.points;
        if (sub.judgeFeedback?.totalJudgeScore) {
          stats.totalJudgePoints += (sub.judgeFeedback.totalJudgeScore / 100) * problem.points;
        }
      }
    });
    
    stats.totalJudgePoints = Math.round(stats.totalJudgePoints * 10) / 10;

    res.json({
      success: true,
      data: {
        team: {
          _id: team._id,
          name: team.name,
        },
        stats,
        submissions: submissions.map(sub => ({
          _id: sub._id,
          problem: sub.problemId,
          code: sub.code,
          explanation: sub.explanation,
          passedTests: sub.passedTests,
          totalTests: sub.totalTests,
          status: sub.status,
          submittedBy: sub.submittedBy,
          submittedAt: sub.submittedAt,
          judgeFeedback: sub.judgeFeedback ? {
            rubricScores: sub.judgeFeedback.rubricScores,
            totalJudgeScore: sub.judgeFeedback.totalJudgeScore,
            feedback: sub.judgeFeedback.feedback,
            flagged: sub.judgeFeedback.flagged,
            reviewedAt: sub.judgeFeedback.reviewedAt,
          } : null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all submissions for a team (DEV ONLY)
 */
export const clearTeamSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(403, 'This endpoint is only available in development');
    }

    const { teamId, sessionId } = req.params;
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

    // Delete all submissions for this team in this session
    const result = await TeamSubmission.deleteMany({ teamId, sessionId });

    logger.info(`DEV RESET: Cleared ${result.deletedCount} submissions for team ${teamId} in session ${sessionId}`);

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} submissions`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

