import Attempt from '../models/Attempt';
import { logger } from '../utils/logger';

interface CodeSubmission {
  attemptId: string;
  userId: string;
  questionId: string;
  code: string;
  language: string;
  timestamp: Date;
}

interface SimilarityResult {
  submission1: CodeSubmission;
  submission2: CodeSubmission;
  similarityScore: number;
  matchedLines: number;
  totalLines: number;
  suspiciousPatterns: string[];
  confidence: number;
}

interface AnomalyResult {
  attemptId: string;
  anomalyType: 'timing' | 'pattern' | 'behavior';
  description: string;
  severity: 'low' | 'medium' | 'high';
  evidence: any;
}

export class PlagiarismDetectionService {
  /**
   * Detect code similarity between multiple submissions for the same question
   */
  async detectSimilarity(
    questionId: string,
    assessmentId: string
  ): Promise<SimilarityResult[]> {
    try {
      // Get all submissions for this question
      const attempts = await Attempt.find({
        assessmentId,
        status: 'submitted',
      }).populate('userId', 'email firstName lastName');

      const submissions: CodeSubmission[] = [];

      // Extract code submissions
      for (const attempt of attempts) {
        const answer = attempt.answers.find(
          (a) => a.questionId.toString() === questionId
        );

        if (answer && answer.answer?.code) {
          submissions.push({
            attemptId: attempt._id.toString(),
            userId: attempt.userId._id.toString(),
            questionId,
            code: answer.answer.code,
            language: answer.answer.language || 'javascript',
            timestamp: answer.timestamp,
          });
        }
      }

      const similarityResults: SimilarityResult[] = [];

      // Compare each pair of submissions
      for (let i = 0; i < submissions.length; i++) {
        for (let j = i + 1; j < submissions.length; j++) {
          const similarity = this.compareCodeSimilarity(
            submissions[i],
            submissions[j]
          );

          // Flag if similarity is above threshold
          if (similarity.similarityScore > 0.7) {
            similarityResults.push(similarity);
          }
        }
      }

      return similarityResults.sort((a, b) => b.similarityScore - a.similarityScore);
    } catch (error) {
      logger.error('Error detecting similarity:', error);
      throw error;
    }
  }

  /**
   * Compare two code submissions for similarity
   */
  private compareCodeSimilarity(
    submission1: CodeSubmission,
    submission2: CodeSubmission
  ): SimilarityResult {
    // Normalize code (remove whitespace, comments, etc.)
    const normalized1 = this.normalizeCode(submission1.code, submission1.language);
    const normalized2 = this.normalizeCode(submission2.code, submission2.language);

    // Tokenize code
    const tokens1 = this.tokenizeCode(normalized1);
    const tokens2 = this.tokenizeCode(normalized2);

    // Calculate similarity using Jaccard similarity
    const intersection = tokens1.filter((token) => tokens2.includes(token));
    const union = [...new Set([...tokens1, ...tokens2])];
    const jaccardSimilarity = intersection.length / union.length;

    // Calculate line-based similarity
    const lines1 = normalized1.split('\n').filter((line) => line.trim());
    const lines2 = normalized2.split('\n').filter((line) => line.trim());
    const matchedLines = this.countMatchingLines(lines1, lines2);
    const lineSimilarity = matchedLines / Math.max(lines1.length, lines2.length);

    // Combined similarity score
    const similarityScore = (jaccardSimilarity * 0.6 + lineSimilarity * 0.4);

    // Detect suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(
      submission1.code,
      submission2.code
    );

    // Calculate confidence based on various factors
    const confidence = this.calculateConfidence(
      similarityScore,
      suspiciousPatterns.length,
      Math.abs(submission1.timestamp.getTime() - submission2.timestamp.getTime())
    );

    return {
      submission1,
      submission2,
      similarityScore,
      matchedLines,
      totalLines: Math.max(lines1.length, lines2.length),
      suspiciousPatterns,
      confidence,
    };
  }

  /**
   * Normalize code by removing comments, extra whitespace, etc.
   */
  private normalizeCode(code: string, language: string): string {
    let normalized = code;

    // Remove single-line comments
    normalized = normalized.replace(/\/\/.*$/gm, '');
    normalized = normalized.replace(/#.*$/gm, '');

    // Remove multi-line comments
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
    normalized = normalized.replace(/'''[\s\S]*?'''/g, '');
    normalized = normalized.replace(/"""[\s\S]*?"""/g, '');

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/\s*([{}()\[\];,])\s*/g, '$1');

    // Convert to lowercase for case-insensitive comparison
    normalized = normalized.toLowerCase();

    return normalized.trim();
  }

  /**
   * Tokenize code into meaningful units
   */
  private tokenizeCode(code: string): string[] {
    // Split on common delimiters and operators
    const tokens = code.split(/[\s(){}\[\];,=+\-*/<>!&|]+/).filter((t) => t.length > 0);

    // Filter out language keywords (they're common and not indicative of plagiarism)
    const keywords = new Set([
      'if',
      'else',
      'for',
      'while',
      'return',
      'function',
      'const',
      'let',
      'var',
      'def',
      'class',
      'import',
      'from',
    ]);

    return tokens.filter((token) => !keywords.has(token));
  }

  /**
   * Count matching lines between two code samples
   */
  private countMatchingLines(lines1: string[], lines2: string[]): number {
    let matches = 0;

    for (const line1 of lines1) {
      if (lines2.includes(line1)) {
        matches++;
      }
    }

    return matches;
  }

  /**
   * Detect suspicious patterns indicating plagiarism
   */
  private detectSuspiciousPatterns(code1: string, code2: string): string[] {
    const patterns: string[] = [];

    // Check for identical variable names (unusual)
    const vars1 = this.extractVariableNames(code1);
    const vars2 = this.extractVariableNames(code2);
    const commonVars = vars1.filter((v) => vars2.includes(v));

    if (commonVars.length > 5 && commonVars.some((v) => v.length > 8)) {
      patterns.push('Identical unusual variable names');
    }

    // Check for identical comment patterns (very suspicious)
    if (this.hasIdenticalComments(code1, code2)) {
      patterns.push('Identical comments or formatting');
    }

    // Check for identical error handling
    if (this.hasIdenticalErrorHandling(code1, code2)) {
      patterns.push('Identical error handling patterns');
    }

    // Check for copy-paste from Stack Overflow (common patterns)
    if (this.hasStackOverflowPatterns(code1) && this.hasStackOverflowPatterns(code2)) {
      patterns.push('Possible Stack Overflow copy-paste');
    }

    return patterns;
  }

  /**
   * Extract variable names from code
   */
  private extractVariableNames(code: string): string[] {
    // Simple regex-based extraction (would be better with AST parsing)
    const varPattern = /\b(let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const matches = Array.from(code.matchAll(varPattern));
    return matches.map((m) => m[2]);
  }

  /**
   * Check if two code samples have identical comments
   */
  private hasIdenticalComments(code1: string, code2: string): boolean {
    const comments1 = code1.match(/\/\/.*$|\/\*[\s\S]*?\*\//gm) || [];
    const comments2 = code2.match(/\/\/.*$|\/\*[\s\S]*?\*\//gm) || [];

    if (comments1.length === 0 || comments2.length === 0) return false;

    const matching = comments1.filter((c) => comments2.includes(c));
    return matching.length / Math.min(comments1.length, comments2.length) > 0.5;
  }

  /**
   * Check for identical error handling
   */
  private hasIdenticalErrorHandling(code1: string, code2: string): boolean {
    const errorPattern1 = code1.match(/catch\s*\([^)]*\)\s*{[^}]*}/g) || [];
    const errorPattern2 = code2.match(/catch\s*\([^)]*\)\s*{[^}]*}/g) || [];

    if (errorPattern1.length === 0 || errorPattern2.length === 0) return false;

    return errorPattern1.some((p1) => errorPattern2.includes(p1));
  }

  /**
   * Detect common Stack Overflow patterns
   */
  private hasStackOverflowPatterns(code: string): boolean {
    // Common patterns from Stack Overflow answers
    const soPatterns = [
      /function\s+compare\s*\([^)]*\)\s*{[\s\S]*return\s+[ab]\s*-\s*[ab]/,
      /\.reduce\s*\(\s*\([^)]*\)\s*=>\s*[^,]+,\s*{}\s*\)/,
      /JSON\.parse\(JSON\.stringify/,
    ];

    return soPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * Calculate confidence score for plagiarism detection
   */
  private calculateConfidence(
    similarityScore: number,
    patternCount: number,
    timeDifference: number
  ): number {
    let confidence = similarityScore;

    // Boost confidence for suspicious patterns
    confidence += patternCount * 0.05;

    // Boost confidence if submissions were made close in time
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    if (hoursDifference < 1) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Detect timing anomalies (too fast, suspicious patterns)
   */
  async detectTimingAnomalies(attemptId: string): Promise<AnomalyResult[]> {
    try {
      const attempt = await Attempt.findById(attemptId);
      if (!attempt) throw new Error('Attempt not found');

      const anomalies: AnomalyResult[] = [];

      // Check for suspiciously fast completion
      const codingQuestions = attempt.answers.filter((a) => a.answer?.code);
      
      for (const answer of codingQuestions) {
        const timeSpent = answer.timeSpent || 0;
        const codeLength = answer.answer?.code?.length || 0;

        // If they wrote 100+ lines in under 5 minutes, suspicious
        const linesOfCode = answer.answer.code.split('\n').length;
        if (linesOfCode > 100 && timeSpent < 300) {
          anomalies.push({
            attemptId,
            anomalyType: 'timing',
            description: `Wrote ${linesOfCode} lines of code in ${timeSpent} seconds`,
            severity: 'high',
            evidence: {
              linesOfCode,
              timeSpent,
              avgTimePerLine: timeSpent / linesOfCode,
            },
          });
        }

        // Check for long idle periods followed by sudden complete solution
        // This would require tracking keystroke events, which we'll add later
      }

      return anomalies;
    } catch (error) {
      logger.error('Error detecting timing anomalies:', error);
      throw error;
    }
  }

  /**
   * Detect AI-generated code patterns
   */
  detectAIGeneratedCode(code: string): {
    isAIGenerated: boolean;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let score = 0;

    // AI often generates very clean, well-commented code
    const commentRatio = (code.match(/\/\/|\/\*|\*/g) || []).length / code.split('\n').length;
    if (commentRatio > 0.3) {
      indicators.push('High comment-to-code ratio');
      score += 0.2;
    }

    // AI often uses very descriptive variable names
    const longVarNames = (code.match(/\b[a-zA-Z_][a-zA-Z0-9_]{15,}\b/g) || []).length;
    if (longVarNames > 5) {
      indicators.push('Unusually descriptive variable names');
      score += 0.15;
    }

    // AI often includes comprehensive error handling
    const errorHandling = (code.match(/try|catch|throw|error/gi) || []).length;
    if (errorHandling > 5) {
      indicators.push('Comprehensive error handling');
      score += 0.1;
    }

    // AI often uses modern syntax and patterns consistently
    const modernPatterns = [
      /const\s+[a-zA-Z_]/g,
      /=>\s*{/g,
      /async\s+/g,
      /await\s+/g,
      /\.\.\./g, // Spread operator
    ];
    const modernScore = modernPatterns.filter((p) => p.test(code)).length;
    if (modernScore === modernPatterns.length) {
      indicators.push('Consistent modern syntax');
      score += 0.15;
    }

    // AI rarely makes typos or has inconsistent style
    const hasTypos = /\b(teh|adn|fro|nad|consoe)\b/i.test(code);
    if (!hasTypos && code.length > 500) {
      indicators.push('No common typos in large code');
      score += 0.1;
    }

    return {
      isAIGenerated: score > 0.5,
      confidence: Math.min(score, 1.0),
      indicators,
    };
  }
}

export const plagiarismDetectionService = new PlagiarismDetectionService();
