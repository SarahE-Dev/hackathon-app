import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import CodeExecutionService, { TestCaseResult } from '../services/codeExecutionService';

export const executeCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, language, testCases, timeLimit = 1000, memoryLimit = 256 } = req.body;

    if (!code || !language) {
      throw new ApiError(400, 'Code and language are required');
    }

    if (!testCases || !Array.isArray(testCases)) {
      throw new ApiError(400, 'Test cases are required and must be an array');
    }

    // Currently only support Python
    if (language !== 'python') {
      throw new ApiError(400, 'Only Python language is currently supported');
    }

    // Validate test cases structure
    for (const tc of testCases) {
      if (!tc.id || !tc.input || !tc.expectedOutput) {
        throw new ApiError(400, 'Each test case must have id, input, and expectedOutput');
      }
    }

    // Execute code with test cases
    const results: TestCaseResult[] = await CodeExecutionService.executePythonCode(
      code,
      testCases,
      timeLimit,
      memoryLimit
    );

    // Calculate score
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          totalTests,
          passedTests,
          failedTests: totalTests - passedTests,
          score: `${score}%`,
          allPassed: passedTests === totalTests,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const validateCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      throw new ApiError(400, 'Code and language are required');
    }

    if (language !== 'python') {
      throw new ApiError(400, 'Only Python language is currently supported');
    }

    const validation = await CodeExecutionService.validatePythonSyntax(code);

    res.json({
      success: true,
      data: {
        valid: validation.valid,
        error: validation.error,
      },
    });
  } catch (error) {
    next(error);
  }
};
