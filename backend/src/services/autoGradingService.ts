import CodeExecutionService, { TestCaseResult } from './codeExecutionService';
import Question from '../models/Question';
import Attempt from '../models/Attempt';
import Grade from '../models/Grade';
import { QuestionType, GradeStatus } from '../../../shared/src/types/common';
import { logger } from '../utils/logger';

export interface AutoGradeResult {
  questionId: string;
  points: number;
  maxPoints: number;
  passed: boolean;
  feedback?: string;
  testCaseResults?: TestCaseResult[];
}

export class AutoGradingService {
  /**
   * Auto-grade an entire attempt
   */
  static async gradeAttempt(attemptId: string): Promise<void> {
    try {
      const attempt = await Attempt.findById(attemptId).populate('assessmentId');
      if (!attempt) {
        throw new Error('Attempt not found');
      }

      const questions = attempt.assessmentSnapshot?.questions || [];
      const questionScores = [];
      let totalScore = 0;
      let maxScore = 0;

      for (const question of questions) {
        const answer = attempt.answers.find(
          (a) => a.questionId.toString() === question._id.toString()
        );

        if (!answer) {
          // No answer provided
          questionScores.push({
            questionId: question._id,
            points: 0,
            maxPoints: question.points || 0,
            comments: [],
            autograded: true,
          });
          maxScore += question.points || 0;
          continue;
        }

        const result = await this.gradeQuestion(question, answer.answer);

        questionScores.push({
          questionId: question._id,
          points: result.points,
          maxPoints: result.maxPoints,
          comments: result.feedback
            ? [
                {
                  id: Date.now().toString(),
                  text: result.feedback,
                  timestamp: new Date(),
                },
              ]
            : [],
          autograded: true,
        });

        totalScore += result.points;
        maxScore += result.maxPoints;
      }

      // Create or update grade
      const existingGrade = await Grade.findOne({ attemptId: attempt._id });

      if (existingGrade) {
        existingGrade.questionScores = questionScores;
        existingGrade.overallScore = totalScore;
        existingGrade.maxScore = maxScore;
        existingGrade.status = GradeStatus.SUBMITTED;
        existingGrade.gradedAt = new Date();
        await existingGrade.save();
      } else {
        await Grade.create({
          attemptId: attempt._id,
          graderId: null, // Auto-graded, no specific grader
          questionScores,
          overallScore: totalScore,
          maxScore,
          status: GradeStatus.SUBMITTED,
          gradedAt: new Date(),
        });
      }

      // Update attempt score
      attempt.score = totalScore;
      attempt.maxScore = maxScore;
      await attempt.save();

      logger.info(
        `Auto-graded attempt ${attemptId}: ${totalScore}/${maxScore} (${
          maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(2) : 0
        }%)`
      );
    } catch (error) {
      logger.error('Error auto-grading attempt:', error);
      throw error;
    }
  }

  /**
   * Auto-grade a single question
   */
  static async gradeQuestion(question: any, answer: any): Promise<AutoGradeResult> {
    const questionType = question.type as QuestionType;

    switch (questionType) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.TRUE_FALSE:
        return this.gradeMultipleChoice(question, answer);

      case QuestionType.CODING:
        return this.gradeCoding(question, answer);

      case QuestionType.SHORT_ANSWER:
      case QuestionType.ESSAY:
      case QuestionType.FILE_UPLOAD:
        // These require manual grading
        return {
          questionId: question._id,
          points: 0,
          maxPoints: question.points || 0,
          passed: false,
          feedback: 'This question requires manual grading.',
        };

      default:
        return {
          questionId: question._id,
          points: 0,
          maxPoints: question.points || 0,
          passed: false,
          feedback: 'Unknown question type.',
        };
    }
  }

  /**
   * Grade multiple choice or true/false question
   */
  private static async gradeMultipleChoice(
    question: any,
    answer: any
  ): Promise<AutoGradeResult> {
    const correctAnswer = question.content.correctAnswer;
    const maxPoints = question.points || 0;

    // Check if answer matches
    const isCorrect = answer === correctAnswer;

    return {
      questionId: question._id,
      points: isCorrect ? maxPoints : 0,
      maxPoints,
      passed: isCorrect,
      feedback: isCorrect
        ? 'Correct answer!'
        : `Incorrect. The correct answer was: ${
            question.content.options?.find((opt: any) => opt.id === correctAnswer)?.text ||
            correctAnswer
          }`,
    };
  }

  /**
   * Grade coding question
   */
  private static async gradeCoding(question: any, answer: any): Promise<AutoGradeResult> {
    const testCases = question.content.testCases || [];
    const maxPoints = question.points || 0;

    if (testCases.length === 0) {
      return {
        questionId: question._id,
        points: 0,
        maxPoints,
        passed: false,
        feedback: 'No test cases available for grading.',
      };
    }

    // Extract code and language from answer
    const code = answer?.code || answer;
    const language = answer?.language || question.content.language || 'python';

    if (!code) {
      return {
        questionId: question._id,
        points: 0,
        maxPoints,
        passed: false,
        feedback: 'No code submitted.',
      };
    }

    try {
      // Run code against all test cases (including hidden ones)
      const results = await CodeExecutionService.executeCode(
        code,
        language,
        testCases.map((tc: any) => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
        3000,
        256
      );

      // Calculate points based on passed test cases
      let earnedPoints = 0;
      for (const result of results) {
        if (result.passed) {
          const testCase = testCases.find((tc: any) => tc.id === result.id);
          earnedPoints += testCase?.points || 0;
        }
      }

      const passedCount = results.filter((r) => r.passed).length;
      const totalCount = results.length;

      return {
        questionId: question._id,
        points: earnedPoints,
        maxPoints,
        passed: passedCount === totalCount,
        feedback: `Passed ${passedCount}/${totalCount} test cases. Earned ${earnedPoints}/${maxPoints} points.`,
        testCaseResults: results,
      };
    } catch (error: any) {
      logger.error('Error grading coding question:', error);
      return {
        questionId: question._id,
        points: 0,
        maxPoints,
        passed: false,
        feedback: `Error executing code: ${error.message}`,
      };
    }
  }

  /**
   * Check if a question can be auto-graded
   */
  static canAutoGrade(questionType: QuestionType): boolean {
    return [
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.TRUE_FALSE,
      QuestionType.CODING,
    ].includes(questionType);
  }

  /**
   * Grade attempt after submission
   * Only auto-grades questions that can be auto-graded
   */
  static async gradeAttemptPartial(attemptId: string): Promise<void> {
    try {
      const attempt = await Attempt.findById(attemptId);
      if (!attempt) {
        throw new Error('Attempt not found');
      }

      const questions = attempt.assessmentSnapshot?.questions || [];
      const questionScores = [];
      let totalAutoGradedScore = 0;
      let maxAutoGradedScore = 0;

      for (const question of questions) {
        const answer = attempt.answers.find(
          (a) => a.questionId.toString() === question._id.toString()
        );

        if (this.canAutoGrade(question.type)) {
          const result = await this.gradeQuestion(question, answer?.answer);
          questionScores.push({
            questionId: question._id,
            points: result.points,
            maxPoints: result.maxPoints,
            comments: result.feedback
              ? [
                  {
                    id: Date.now().toString(),
                    text: result.feedback,
                    timestamp: new Date(),
                  },
                ]
              : [],
            autograded: true,
          });

          totalAutoGradedScore += result.points;
          maxAutoGradedScore += result.maxPoints;
        } else {
          // Question needs manual grading
          questionScores.push({
            questionId: question._id,
            points: 0,
            maxPoints: question.points || 0,
            comments: [
              {
                id: Date.now().toString(),
                text: 'Awaiting manual grading',
                timestamp: new Date(),
              },
            ],
            autograded: false,
          });
        }
      }

      // Create grade in DRAFT status (needs manual review for non-auto-graded questions)
      const hasManualQuestions = questions.some((q) => !this.canAutoGrade(q.type));

      await Grade.create({
        attemptId: attempt._id,
        graderId: null,
        questionScores,
        overallScore: totalAutoGradedScore,
        maxScore: questions.reduce((sum, q) => sum + (q.points || 0), 0),
        status: hasManualQuestions ? GradeStatus.DRAFT : GradeStatus.SUBMITTED,
        gradedAt: hasManualQuestions ? undefined : new Date(),
      });

      logger.info(
        `Partial auto-grade for attempt ${attemptId}: ${totalAutoGradedScore}/${maxAutoGradedScore} auto-graded. ${
          hasManualQuestions ? 'Requires manual grading.' : 'Fully auto-graded.'
        }`
      );
    } catch (error) {
      logger.error('Error in partial auto-grading:', error);
      throw error;
    }
  }
}

export default AutoGradingService;
