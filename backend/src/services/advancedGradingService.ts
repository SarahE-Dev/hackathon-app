import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  weight?: number;
  isHidden?: boolean;
}

interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  executionTime: number;
  memoryUsed: number;
  error?: string;
}

interface CodeQualityMetrics {
  readability: number;
  structure: number;
  bestPractices: number;
  maintainability: number;
  comments: number;
  namingConventions: number;
}

interface EfficiencyMetrics {
  timeComplexity: string;
  spaceComplexity: string;
  averageRuntime: number;
  peakMemory: number;
  algorithmicApproach: string;
}

interface GradingResult {
  correctnessScore: number; // 0-50
  qualityScore: number; // 0-20
  efficiencyScore: number; // 0-20
  styleScore: number; // 0-10
  totalScore: number; // 0-100
  feedback: string[];
  testResults: TestResult[];
  qualityMetrics: CodeQualityMetrics;
  efficiencyMetrics: EfficiencyMetrics;
  partialCredit: {
    basicTests: number;
    intermediateTests: number;
    advancedTests: number;
  };
}

export class AdvancedGradingService {
  /**
   * Grade a code submission with multi-dimensional evaluation
   */
  async gradeCodeSubmission(
    code: string,
    language: string,
    testCases: TestCase[]
  ): Promise<GradingResult> {
    try {
      // 1. Run test cases and measure correctness
      const testResults = await this.runTestCases(code, language, testCases);
      const correctnessScore = this.calculateCorrectnessScore(testResults, testCases);

      // 2. Analyze code quality
      const qualityMetrics = await this.analyzeCodeQuality(code, language);
      const qualityScore = this.calculateQualityScore(qualityMetrics);

      // 3. Analyze efficiency
      const efficiencyMetrics = await this.analyzeEfficiency(code, language, testResults);
      const efficiencyScore = this.calculateEfficiencyScore(efficiencyMetrics);

      // 4. Analyze code style
      const styleScore = await this.analyzeStyle(code, language);

      // 5. Calculate partial credit
      const partialCredit = this.calculatePartialCredit(testResults, testCases);

      // 6. Generate feedback
      const feedback = this.generateFeedback({
        testResults,
        qualityMetrics,
        efficiencyMetrics,
        correctnessScore,
        qualityScore,
        efficiencyScore,
        styleScore,
      });

      const totalScore = correctnessScore + qualityScore + efficiencyScore + styleScore;

      return {
        correctnessScore,
        qualityScore,
        efficiencyScore,
        styleScore,
        totalScore,
        feedback,
        testResults,
        qualityMetrics,
        efficiencyMetrics,
        partialCredit,
      };
    } catch (error) {
      logger.error('Error grading code submission:', error);
      throw error;
    }
  }

  /**
   * Run test cases and measure performance
   */
  private async runTestCases(
    code: string,
    language: string,
    testCases: TestCase[]
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      try {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;

        // Execute code with test input
        const output = await this.executeCode(code, language, testCase.input);

        const executionTime = Date.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;

        const passed = this.compareOutput(output, testCase.expectedOutput);

        results.push({
          testCaseId: testCase.id,
          passed,
          actualOutput: output,
          expectedOutput: testCase.expectedOutput,
          executionTime,
          memoryUsed,
        });
      } catch (error: any) {
        results.push({
          testCaseId: testCase.id,
          passed: false,
          actualOutput: '',
          expectedOutput: testCase.expectedOutput,
          executionTime: 0,
          memoryUsed: 0,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Execute code safely in a sandbox
   */
  private async executeCode(
    code: string,
    language: string,
    input: string
  ): Promise<string> {
    // This is a simplified version - in production, use proper sandboxing
    // like Docker containers, VM2, or isolated-vm

    if (language === 'javascript' || language === 'typescript') {
      return this.executeJavaScript(code, input);
    } else if (language === 'python') {
      return this.executePython(code, input);
    }

    throw new Error(`Language ${language} not supported`);
  }

  /**
   * Execute JavaScript code
   */
  private async executeJavaScript(code: string, input: string): Promise<string> {
    // Use VM2 or similar for safe execution
    // This is simplified for demonstration
    try {
      const wrappedCode = `
        const input = ${JSON.stringify(input)};
        ${code}
      `;

      // In production, use vm2 or isolated-vm
      const result = eval(wrappedCode);
      return String(result);
    } catch (error: any) {
      throw new Error(`Execution error: ${error.message}`);
    }
  }

  /**
   * Execute Python code
   */
  private async executePython(code: string, input: string): Promise<string> {
    // Write to temp file and execute with timeout
    const { stdout, stderr } = await execAsync(
      `echo "${input}" | timeout 5s python3 -c "${code.replace(/"/g, '\\"')}"`,
      { timeout: 5000 }
    );

    if (stderr) {
      throw new Error(stderr);
    }

    return stdout.trim();
  }

  /**
   * Compare output with expected (flexible matching)
   */
  private compareOutput(actual: string, expected: string): boolean {
    // Normalize whitespace
    const normalizeActual = actual.trim().replace(/\s+/g, ' ');
    const normalizeExpected = expected.trim().replace(/\s+/g, ' ');

    // Exact match
    if (normalizeActual === normalizeExpected) return true;

    // Try parsing as numbers (for floating point comparison)
    const actualNum = parseFloat(normalizeActual);
    const expectedNum = parseFloat(normalizeExpected);
    if (!isNaN(actualNum) && !isNaN(expectedNum)) {
      return Math.abs(actualNum - expectedNum) < 1e-6;
    }

    return false;
  }

  /**
   * Calculate correctness score based on test results
   */
  private calculateCorrectnessScore(
    testResults: TestResult[],
    testCases: TestCase[]
  ): number {
    const passedTests = testResults.filter((r) => r.passed).length;
    const totalTests = testCases.length;

    // Base score (0-50 points)
    const baseScore = (passedTests / totalTests) * 50;

    return Math.round(baseScore);
  }

  /**
   * Analyze code quality
   */
  private async analyzeCodeQuality(
    code: string,
    language: string
  ): Promise<CodeQualityMetrics> {
    // In production, integrate with ESLint, Pylint, etc.
    
    // Calculate basic metrics
    const lines = code.split('\n');
    const totalLines = lines.length;
    const commentLines = lines.filter(
      (line) => line.trim().startsWith('//') || line.trim().startsWith('#')
    ).length;

    // Readability: based on line length, complexity
    const avgLineLength = code.length / totalLines;
    const readability = avgLineLength < 80 ? 10 : Math.max(0, 10 - (avgLineLength - 80) / 10);

    // Structure: functions, classes, organization
    const hasFunctions = /function|def|=>\s*{/.test(code);
    const structure = hasFunctions ? 8 : 5;

    // Best practices: error handling, validation
    const hasErrorHandling = /try|catch|except|throw/.test(code);
    const bestPractices = hasErrorHandling ? 8 : 6;

    // Maintainability: DRY, single responsibility
    const maintainability = this.calculateMaintainability(code);

    // Comments ratio
    const comments = Math.min(10, (commentLines / totalLines) * 30);

    // Naming conventions
    const namingConventions = this.evaluateNaming(code, language);

    return {
      readability,
      structure,
      bestPractices,
      maintainability,
      comments,
      namingConventions,
    };
  }

  /**
   * Calculate maintainability score
   */
  private calculateMaintainability(code: string): number {
    // Cyclomatic complexity approximation
    const complexityKeywords = code.match(/if|for|while|&&|\|\||case/g) || [];
    const complexity = complexityKeywords.length;

    // Lower complexity is better
    if (complexity < 10) return 10;
    if (complexity < 20) return 7;
    if (complexity < 30) return 5;
    return 3;
  }

  /**
   * Evaluate naming conventions
   */
  private evaluateNaming(code: string, language: string): number {
    let score = 10;

    // Check for single-letter variables (except common ones like i, j, x, y)
    const singleLetterVars = code.match(/\b[a-z]\b/g) || [];
    const badVars = singleLetterVars.filter(
      (v) => !['i', 'j', 'k', 'x', 'y', 'n'].includes(v)
    );
    score -= badVars.length * 0.5;

    // Check for unclear names
    const unclearNames = code.match(/\b(temp|tmp|data|val|num)\d*\b/g) || [];
    score -= unclearNames.length * 0.3;

    return Math.max(0, score);
  }

  /**
   * Calculate quality score from metrics
   */
  private calculateQualityScore(metrics: CodeQualityMetrics): number {
    const weights = {
      readability: 0.25,
      structure: 0.2,
      bestPractices: 0.2,
      maintainability: 0.15,
      comments: 0.1,
      namingConventions: 0.1,
    };

    const weightedScore =
      metrics.readability * weights.readability +
      metrics.structure * weights.structure +
      metrics.bestPractices * weights.bestPractices +
      metrics.maintainability * weights.maintainability +
      metrics.comments * weights.comments +
      metrics.namingConventions * weights.namingConventions;

    // Scale to 0-20
    return Math.round((weightedScore / 10) * 20);
  }

  /**
   * Analyze efficiency (time/space complexity)
   */
  private async analyzeEfficiency(
    code: string,
    language: string,
    testResults: TestResult[]
  ): Promise<EfficiencyMetrics> {
    // Calculate average runtime
    const averageRuntime =
      testResults.reduce((sum, r) => sum + r.executionTime, 0) / testResults.length;

    // Calculate peak memory
    const peakMemory = Math.max(...testResults.map((r) => r.memoryUsed));

    // Estimate time complexity from code patterns
    const timeComplexity = this.estimateTimeComplexity(code);
    const spaceComplexity = this.estimateSpaceComplexity(code);

    // Detect algorithmic approach
    const algorithmicApproach = this.detectAlgorithm(code);

    return {
      timeComplexity,
      spaceComplexity,
      averageRuntime,
      peakMemory,
      algorithmicApproach,
    };
  }

  /**
   * Estimate time complexity from code
   */
  private estimateTimeComplexity(code: string): string {
    // Simple heuristic-based estimation
    const nestedLoops = (code.match(/for[\s\S]*for|while[\s\S]*while/g) || []).length;
    const singleLoops = (code.match(/for|while/g) || []).length - nestedLoops * 2;

    if (nestedLoops >= 2) return 'O(n³) or higher';
    if (nestedLoops === 1) return 'O(n²)';
    if (code.includes('sort') || code.includes('sorted')) return 'O(n log n)';
    if (singleLoops > 0) return 'O(n)';
    return 'O(1)';
  }

  /**
   * Estimate space complexity from code
   */
  private estimateSpaceComplexity(code: string): string {
    if (/new Array\(.*n.*\)|Array\.from\(.*n.*\)|\*\s*\[/.test(code)) {
      return 'O(n)';
    }
    if (/recursion|recursive/.test(code)) {
      return 'O(n) - recursion';
    }
    return 'O(1)';
  }

  /**
   * Detect algorithmic approach
   */
  private detectAlgorithm(code: string): string {
    if (/binary.*search|binarySearch/i.test(code)) return 'Binary Search';
    if (/dynamic.*programming|dp\[|memo/i.test(code)) return 'Dynamic Programming';
    if (/two.*pointer|left.*right/i.test(code)) return 'Two Pointers';
    if (/sliding.*window/i.test(code)) return 'Sliding Window';
    if (/breadth.*first|bfs|queue/i.test(code)) return 'BFS';
    if (/depth.*first|dfs|stack/i.test(code)) return 'DFS';
    if (/greedy/i.test(code)) return 'Greedy';
    if (/divide.*conquer/i.test(code)) return 'Divide and Conquer';
    return 'Iterative';
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiencyScore(metrics: EfficiencyMetrics): number {
    let score = 20;

    // Penalize high time complexity
    if (metrics.timeComplexity.includes('O(n³)')) score -= 8;
    else if (metrics.timeComplexity.includes('O(n²)')) score -= 5;
    else if (metrics.timeComplexity.includes('O(n log n)')) score -= 2;

    // Penalize slow execution
    if (metrics.averageRuntime > 1000) score -= 5;
    else if (metrics.averageRuntime > 500) score -= 3;
    else if (metrics.averageRuntime > 100) score -= 1;

    // Bonus for optimal algorithms
    const optimalAlgorithms = [
      'Binary Search',
      'Dynamic Programming',
      'Two Pointers',
      'Sliding Window',
    ];
    if (optimalAlgorithms.includes(metrics.algorithmicApproach)) {
      score += 3;
    }

    return Math.max(0, Math.min(20, score));
  }

  /**
   * Analyze code style
   */
  private async analyzeStyle(code: string, language: string): Promise<number> {
    let score = 10;

    // Check indentation consistency
    const lines = code.split('\n').filter((line) => line.trim());
    const indents = lines.map((line) => line.match(/^\s*/)?.[0].length || 0);
    const inconsistentIndents = indents.filter((indent, i) => {
      if (i === 0) return false;
      const diff = Math.abs(indent - indents[i - 1]);
      return diff !== 0 && diff !== 2 && diff !== 4;
    }).length;
    score -= inconsistentIndents * 0.5;

    // Check for proper spacing
    const hasProperSpacing = /[a-z]\s*[+\-*/%=<>]\s*[a-z]/g.test(code);
    if (!hasProperSpacing) score -= 2;

    // Check for trailing whitespace
    const hasTrailingWhitespace = /\s+$/m.test(code);
    if (hasTrailingWhitespace) score -= 1;

    return Math.max(0, Math.round(score));
  }

  /**
   * Calculate partial credit based on test case categories
   */
  private calculatePartialCredit(
    testResults: TestResult[],
    testCases: TestCase[]
  ): { basicTests: number; intermediateTests: number; advancedTests: number } {
    // Categorize test cases (assuming first 30% are basic, next 40% intermediate, last 30% advanced)
    const totalTests = testCases.length;
    const basicCount = Math.ceil(totalTests * 0.3);
    const intermediateCount = Math.ceil(totalTests * 0.4);

    const basicTests = testResults.slice(0, basicCount);
    const intermediateTests = testResults.slice(basicCount, basicCount + intermediateCount);
    const advancedTests = testResults.slice(basicCount + intermediateCount);

    const basicScore = basicTests.filter((r) => r.passed).length / basicTests.length;
    const intermediateScore =
      intermediateTests.filter((r) => r.passed).length / (intermediateTests.length || 1);
    const advancedScore =
      advancedTests.filter((r) => r.passed).length / (advancedTests.length || 1);

    return {
      basicTests: Math.round(basicScore * 100),
      intermediateTests: Math.round(intermediateScore * 100),
      advancedTests: Math.round(advancedScore * 100),
    };
  }

  /**
   * Generate detailed feedback
   */
  private generateFeedback(data: any): string[] {
    const feedback: string[] = [];

    // Correctness feedback
    const passedCount = data.testResults.filter((r: TestResult) => r.passed).length;
    const totalCount = data.testResults.length;
    feedback.push(`✓ Passed ${passedCount}/${totalCount} test cases`);

    if (passedCount < totalCount) {
      feedback.push(
        `⚠ Consider edge cases and boundary conditions for the remaining test failures`
      );
    }

    // Quality feedback
    if (data.qualityMetrics.readability < 7) {
      feedback.push('💡 Improve code readability by breaking long lines and adding whitespace');
    }
    if (data.qualityMetrics.comments < 5) {
      feedback.push('📝 Add comments to explain complex logic');
    }
    if (data.qualityMetrics.namingConventions < 7) {
      feedback.push('🏷 Use more descriptive variable and function names');
    }

    // Efficiency feedback
    if (data.efficiencyMetrics.timeComplexity.includes('O(n²)')) {
      feedback.push('⚡ Consider optimizing to linear time complexity (O(n))');
    }
    if (data.efficiencyMetrics.averageRuntime > 1000) {
      feedback.push('🐌 Code execution is slow - consider algorithm optimization');
    }

    // Style feedback
    if (data.styleScore < 7) {
      feedback.push('✨ Improve code formatting and consistent style');
    }

    // Overall feedback
    if (data.totalScore >= 90) {
      feedback.push('🎉 Excellent work! Your code is correct, efficient, and well-written');
    } else if (data.totalScore >= 75) {
      feedback.push('👍 Good job! Minor improvements could make this even better');
    } else if (data.totalScore >= 60) {
      feedback.push('📚 Solid attempt! Focus on correctness and code quality');
    } else {
      feedback.push('💪 Keep practicing! Review the feedback and try optimizing your approach');
    }

    return feedback;
  }
}

export const advancedGradingService = new AdvancedGradingService();
