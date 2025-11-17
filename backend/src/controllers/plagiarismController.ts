import { Request, Response } from 'express';
import { plagiarismDetectionService } from '../services/plagiarismDetectionService';
import Attempt from '../models/Attempt';
import { logger } from '../utils/logger';

/**
 * Detect similarity between submissions for a specific question
 */
export const detectSimilarity = async (req: Request, res: Response) => {
  try {
    const { questionId, assessmentId } = req.body;

    if (!questionId || !assessmentId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'questionId and assessmentId are required',
        },
      });
    }

    const similarityResults = await plagiarismDetectionService.detectSimilarity(
      questionId,
      assessmentId
    );

    return res.json({
      success: true,
      data: {
        results: similarityResults,
        flaggedCount: similarityResults.filter((r) => r.similarityScore > 0.8).length,
        totalComparisons: similarityResults.length,
      },
    });
  } catch (error) {
    logger.error('Error detecting similarity:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to detect similarity',
      },
    });
  }
};

/**
 * Detect timing anomalies for a specific attempt
 */
export const detectTimingAnomalies = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;

    const anomalies = await plagiarismDetectionService.detectTimingAnomalies(attemptId);

    return res.json({
      success: true,
      data: {
        anomalies,
        hasAnomalies: anomalies.length > 0,
        highSeverityCount: anomalies.filter((a) => a.severity === 'high').length,
      },
    });
  } catch (error) {
    logger.error('Error detecting timing anomalies:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to detect timing anomalies',
      },
    });
  }
};

/**
 * Check if code appears to be AI-generated
 */
export const detectAIGenerated = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'code is required',
        },
      });
    }

    const result = plagiarismDetectionService.detectAIGeneratedCode(code);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error detecting AI-generated code:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to detect AI-generated code',
      },
    });
  }
};

/**
 * Get comprehensive integrity report for an assessment
 */
export const getIntegrityReport = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;

    // Get all attempts for this assessment
    const attempts = await Attempt.find({
      assessmentId,
      status: 'submitted',
    }).populate('userId', 'email firstName lastName');

    // Get all coding questions
    const codingQuestions = new Set<string>();
    attempts.forEach((attempt) => {
      attempt.answers.forEach((answer) => {
        if (answer.answer?.code) {
          codingQuestions.add(answer.questionId.toString());
        }
      });
    });

    // Run similarity detection for each question
    const similarityReports = await Promise.all(
      Array.from(codingQuestions).map((questionId) =>
        plagiarismDetectionService.detectSimilarity(questionId, assessmentId)
      )
    );

    // Run timing anomaly detection for each attempt
    const anomalyReports = await Promise.all(
      attempts.map((attempt) =>
        plagiarismDetectionService.detectTimingAnomalies(attempt._id.toString())
      )
    );

    // Compile report
    const flaggedSubmissions = new Set<string>();
    const flaggedPairs: any[] = [];

    similarityReports.forEach((results) => {
      results.forEach((result) => {
        if (result.similarityScore > 0.7) {
          flaggedSubmissions.add(result.submission1.attemptId);
          flaggedSubmissions.add(result.submission2.attemptId);
          flaggedPairs.push({
            attempt1: result.submission1.attemptId,
            attempt2: result.submission2.attemptId,
            similarityScore: result.similarityScore,
            confidence: result.confidence,
            patterns: result.suspiciousPatterns,
          });
        }
      });
    });

    const suspiciousAttempts = anomalyReports
      .filter((anomalies) => anomalies.length > 0)
      .map((anomalies) => ({
        attemptId: anomalies[0].attemptId,
        anomalies: anomalies.map((a) => ({
          type: a.anomalyType,
          description: a.description,
          severity: a.severity,
        })),
      }));

    return res.json({
      success: true,
      data: {
        totalAttempts: attempts.length,
        flaggedCount: flaggedSubmissions.size,
        flaggedPercentage: (flaggedSubmissions.size / attempts.length) * 100,
        flaggedPairs,
        suspiciousAttempts,
        summary: {
          highSimilarity: flaggedPairs.filter((p) => p.similarityScore > 0.85).length,
          mediumSimilarity: flaggedPairs.filter(
            (p) => p.similarityScore > 0.7 && p.similarityScore <= 0.85
          ).length,
          timingAnomalies: suspiciousAttempts.filter((s) =>
            s.anomalies.some((a) => a.type === 'timing')
          ).length,
        },
      },
    });
  } catch (error) {
    logger.error('Error generating integrity report:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate integrity report',
      },
    });
  }
};
