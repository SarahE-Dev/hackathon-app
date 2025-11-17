import { logger } from '../utils/logger';
import Attempt from '../models/Attempt';

interface KeystrokeEvent {
  key: string;
  timestamp: Date;
  duration: number; // Time key was held down
  questionId: string;
}

interface MouseEvent {
  type: 'click' | 'move' | 'scroll';
  x?: number;
  y?: number;
  scrollY?: number;
  timestamp: Date;
  questionId: string;
}

interface CodeChangeEvent {
  type: 'insert' | 'delete' | 'paste';
  position: number;
  length: number;
  content?: string;
  timestamp: Date;
  questionId: string;
}

interface BehavioralMetrics {
  avgTypingSpeed: number; // Words per minute
  pausePatterns: number[]; // Milliseconds between keystrokes
  deleteRatio: number; // Deletions vs additions
  pasteCount: number;
  copyCount: number;
  consistencyScore: number; // 0-1, how consistent is the behavior
  suspiciousPatterns: string[];
}

interface NavigationPattern {
  questionId: string;
  timeSpent: number; // Seconds
  revisitCount: number;
  answerChangeCount: number;
  timestamp: Date;
}

export class AuditTrailService {
  /**
   * Log keystroke event
   */
  async logKeystroke(attemptId: string, event: KeystrokeEvent): Promise<void> {
    try {
      const attempt = await Attempt.findById(attemptId);
      if (!attempt) return;

      // Store in events array
      attempt.events.push({
        type: 'keystroke',
        timestamp: event.timestamp,
        metadata: {
          key: event.key,
          duration: event.duration,
          questionId: event.questionId,
        },
      });

      await attempt.save();
    } catch (error) {
      logger.error('Error logging keystroke:', error);
    }
  }

  /**
   * Log mouse event
   */
  async logMouseEvent(attemptId: string, event: MouseEvent): Promise<void> {
    try {
      const attempt = await Attempt.findById(attemptId);
      if (!attempt) return;

      attempt.events.push({
        type: `mouse-${event.type}`,
        timestamp: event.timestamp,
        metadata: {
          x: event.x,
          y: event.y,
          scrollY: event.scrollY,
          questionId: event.questionId,
        },
      });

      await attempt.save();
    } catch (error) {
      logger.error('Error logging mouse event:', error);
    }
  }

  /**
   * Log code change event
   */
  async logCodeChange(attemptId: string, event: CodeChangeEvent): Promise<void> {
    try {
      const attempt = await Attempt.findById(attemptId);
      if (!attempt) return;

      attempt.events.push({
        type: `code-${event.type}`,
        timestamp: event.timestamp,
        metadata: {
          position: event.position,
          length: event.length,
          content: event.content?.substring(0, 100), // Limit stored content
          questionId: event.questionId,
        },
      });

      await attempt.save();
    } catch (error) {
      logger.error('Error logging code change:', error);
    }
  }

  /**
   * Analyze keystroke dynamics to detect behavioral patterns
   */
  async analyzeBehavioralMetrics(attemptId: string): Promise<BehavioralMetrics> {
    try {
      const attempt = await Attempt.findById(attemptId);
      if (!attempt) throw new Error('Attempt not found');

      const keystrokeEvents = attempt.events.filter((e) => e.type === 'keystroke');
      const codeChangeEvents = attempt.events.filter((e) => 
        e.type.startsWith('code-')
      );

      // Calculate typing speed
      const typingSpeed = this.calculateTypingSpeed(keystrokeEvents);

      // Analyze pause patterns
      const pausePatterns = this.analyzePausePatterns(keystrokeEvents);

      // Calculate delete ratio
      const deleteRatio = this.calculateDeleteRatio(codeChangeEvents);

      // Count paste/copy events
      const pasteCount = codeChangeEvents.filter((e) => e.type === 'code-paste').length;
      const copyCount = attempt.events.filter((e) => e.type === 'copy-detected').length;

      // Calculate consistency score
      const consistencyScore = this.calculateConsistencyScore(keystrokeEvents);

      // Detect suspicious patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns({
        typingSpeed,
        pausePatterns,
        deleteRatio,
        pasteCount,
        copyCount,
        consistencyScore,
      });

      return {
        avgTypingSpeed: typingSpeed,
        pausePatterns,
        deleteRatio,
        pasteCount,
        copyCount,
        consistencyScore,
        suspiciousPatterns,
      };
    } catch (error) {
      logger.error('Error analyzing behavioral metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate typing speed (WPM)
   */
  private calculateTypingSpeed(keystrokeEvents: any[]): number {
    if (keystrokeEvents.length < 10) return 0;

    // Get events from the last coding session
    const recentEvents = keystrokeEvents.slice(-100);
    const timeSpan = new Date(recentEvents[recentEvents.length - 1].timestamp).getTime() - 
                     new Date(recentEvents[0].timestamp).getTime();

    const minutes = timeSpan / 60000;
    const wordsTyped = recentEvents.length / 5; // Assume average 5 keystrokes per word

    return Math.round(wordsTyped / minutes);
  }

  /**
   * Analyze pause patterns between keystrokes
   */
  private analyzePausePatterns(keystrokeEvents: any[]): number[] {
    const pauses: number[] = [];

    for (let i = 1; i < keystrokeEvents.length; i++) {
      const timeDiff = new Date(keystrokeEvents[i].timestamp).getTime() - 
                       new Date(keystrokeEvents[i - 1].timestamp).getTime();
      pauses.push(timeDiff);
    }

    return pauses;
  }

  /**
   * Calculate delete-to-insert ratio
   */
  private calculateDeleteRatio(codeChangeEvents: any[]): number {
    const deleteEvents = codeChangeEvents.filter((e) => e.type === 'code-delete').length;
    const insertEvents = codeChangeEvents.filter((e) => e.type === 'code-insert').length;

    if (insertEvents === 0) return 0;
    return deleteEvents / insertEvents;
  }

  /**
   * Calculate consistency score (0-1)
   */
  private calculateConsistencyScore(keystrokeEvents: any[]): number {
    if (keystrokeEvents.length < 20) return 1;

    const pauses = this.analyzePausePatterns(keystrokeEvents);
    
    // Calculate variance in typing speed
    const mean = pauses.reduce((sum, p) => sum + p, 0) / pauses.length;
    const variance = pauses.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pauses.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower variance = higher consistency
    // Normalize to 0-1 scale (lower is more consistent)
    const coefficientOfVariation = standardDeviation / mean;
    
    // Invert so higher score = more consistent
    return Math.max(0, 1 - Math.min(coefficientOfVariation, 1));
  }

  /**
   * Detect suspicious behavioral patterns
   */
  private detectSuspiciousPatterns(metrics: Partial<BehavioralMetrics>): string[] {
    const patterns: string[] = [];

    // Very high typing speed (>120 WPM sustained)
    if (metrics.avgTypingSpeed && metrics.avgTypingSpeed > 120) {
      patterns.push('Unusually high typing speed');
    }

    // Too consistent (possibly automated)
    if (metrics.consistencyScore && metrics.consistencyScore > 0.95) {
      patterns.push('Suspiciously consistent typing pattern');
    }

    // Excessive pasting
    if (metrics.pasteCount && metrics.pasteCount > 10) {
      patterns.push('Excessive paste operations');
    }

    // Very low delete ratio (no mistakes = suspicious)
    if (metrics.deleteRatio !== undefined && metrics.deleteRatio < 0.05 && 
        metrics.avgTypingSpeed && metrics.avgTypingSpeed > 60) {
      patterns.push('Unusually low error rate');
    }

    // Burst patterns (long pause then rapid typing)
    if (metrics.pausePatterns) {
      const longPauses = metrics.pausePatterns.filter((p) => p > 30000); // 30 second pauses
      if (longPauses.length > 3) {
        patterns.push('Multiple long idle periods followed by rapid completion');
      }
    }

    return patterns;
  }

  /**
   * Track navigation patterns to detect anomalies
   */
  async trackNavigationPattern(
    attemptId: string,
    pattern: NavigationPattern
  ): Promise<void> {
    try {
      const attempt = await Attempt.findById(attemptId);
      if (!attempt) return;

      attempt.events.push({
        type: 'navigation',
        timestamp: pattern.timestamp,
        metadata: {
          questionId: pattern.questionId,
          timeSpent: pattern.timeSpent,
          revisitCount: pattern.revisitCount,
          answerChangeCount: pattern.answerChangeCount,
        },
      });

      await attempt.save();
    } catch (error) {
      logger.error('Error tracking navigation pattern:', error);
    }
  }

  /**
   * Analyze navigation patterns for suspicious behavior
   */
  async analyzeNavigationPatterns(attemptId: string): Promise<{
    totalTimeSpent: number;
    questionsVisited: number;
    avgTimePerQuestion: number;
    quickCompletions: number; // Questions completed in < 30 seconds
    suspiciousPatterns: string[];
  }> {
    try {
      const attempt = await Attempt.findById(attemptId);
      if (!attempt) throw new Error('Attempt not found');

      const navigationEvents = attempt.events.filter((e) => e.type === 'navigation');

      const totalTimeSpent = navigationEvents.reduce(
        (sum, e) => sum + (e.metadata?.timeSpent || 0),
        0
      );

      const questionsVisited = new Set(
        navigationEvents.map((e) => e.metadata?.questionId)
      ).size;

      const avgTimePerQuestion = totalTimeSpent / questionsVisited;

      const quickCompletions = navigationEvents.filter(
        (e) => e.metadata?.timeSpent && e.metadata.timeSpent < 30
      ).length;

      const suspiciousPatterns: string[] = [];

      // Detect suspicious patterns
      if (avgTimePerQuestion < 30) {
        suspiciousPatterns.push('Unusually quick completion time');
      }

      if (quickCompletions > questionsVisited * 0.5) {
        suspiciousPatterns.push('More than 50% of questions completed very quickly');
      }

      // Check for sequential completion without revisits (suspicious for complex problems)
      const hasRevisits = navigationEvents.some((e) => e.metadata?.revisitCount > 0);
      if (!hasRevisits && questionsVisited > 5) {
        suspiciousPatterns.push('No question revisits (unusual for complex assessments)');
      }

      return {
        totalTimeSpent,
        questionsVisited,
        avgTimePerQuestion,
        quickCompletions,
        suspiciousPatterns,
      };
    } catch (error) {
      logger.error('Error analyzing navigation patterns:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive audit trail for an attempt
   */
  async getAuditTrail(attemptId: string): Promise<{
    behavioral: BehavioralMetrics;
    navigation: any;
    timeline: any[];
    summary: {
      totalEvents: number;
      suspiciousEvents: number;
      riskScore: number; // 0-100
    };
  }> {
    try {
      const attempt = await Attempt.findById(attemptId);
      if (!attempt) throw new Error('Attempt not found');

      // Get behavioral metrics
      const behavioral = await this.analyzeBehavioralMetrics(attemptId);

      // Get navigation patterns
      const navigation = await this.analyzeNavigationPatterns(attemptId);

      // Create timeline of events
      const timeline = attempt.events
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((event) => ({
          type: event.type,
          timestamp: event.timestamp,
          metadata: event.metadata,
        }));

      // Calculate risk score
      const riskScore = this.calculateRiskScore(behavioral, navigation, attempt.events);

      // Count suspicious events
      const suspiciousEvents = attempt.events.filter(
        (e) =>
          e.type === 'tab-hidden' ||
          e.type === 'copy-detected' ||
          e.type === 'paste-detected' ||
          e.type === 'fullscreen-exit'
      ).length;

      return {
        behavioral,
        navigation,
        timeline,
        summary: {
          totalEvents: attempt.events.length,
          suspiciousEvents,
          riskScore,
        },
      };
    } catch (error) {
      logger.error('Error getting audit trail:', error);
      throw error;
    }
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private calculateRiskScore(
    behavioral: BehavioralMetrics,
    navigation: any,
    events: any[]
  ): number {
    let score = 0;

    // Behavioral risk factors
    score += behavioral.suspiciousPatterns.length * 15;
    if (behavioral.pasteCount > 5) score += 20;
    if (behavioral.consistencyScore > 0.95) score += 10;

    // Navigation risk factors
    score += navigation.suspiciousPatterns.length * 15;
    if (navigation.quickCompletions > 5) score += 15;

    // Proctoring violations
    const violations = events.filter(
      (e) =>
        e.type === 'tab-hidden' ||
        e.type === 'fullscreen-exit' ||
        e.type === 'copy-detected'
    ).length;
    score += violations * 5;

    return Math.min(100, score);
  }

  /**
   * Batch log events for better performance
   */
  async batchLogEvents(
    attemptId: string,
    events: Array<{
      type: string;
      timestamp: Date;
      metadata: any;
    }>
  ): Promise<void> {
    try {
      const attempt = await Attempt.findById(attemptId);
      if (!attempt) return;

      // Add all events at once
      attempt.events.push(...events);

      await attempt.save();
    } catch (error) {
      logger.error('Error batch logging events:', error);
    }
  }
}

export const auditTrailService = new AuditTrailService();
