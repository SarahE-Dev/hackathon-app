import { Timestamps } from './common';

export interface Team extends Timestamps {
  _id: string;
  name: string;
  organizationId: string;
  memberIds: string[];
  projectTitle: string;
  description: string;
  track?: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  submittedAt?: Date;
  disqualified: boolean;
}

export interface JudgeScore extends Timestamps {
  _id: string;
  teamId: string;
  judgeId: string;
  track?: string;
  scores: Record<string, number>; // criterionId -> score
  totalScore: number;
  notes?: string;
  conflictOfInterest: boolean;
  submittedAt?: Date;
}

export interface Leaderboard extends Timestamps {
  _id: string;
  organizationId: string;
  cohortId?: string;
  standings: LeaderboardEntry[];
  lastUpdated: Date;
  isPublic: boolean;
  revealAt?: Date;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  track?: string;
  averageScore: number;
  judgeScores: number[];
  tiebreakScore?: number;
  submittedAt: Date;
}

export interface HackathonRubric extends Timestamps {
  _id: string;
  name: string;
  track?: string;
  criteria: HackathonCriterion[];
  totalPoints: number;
  tiebreakRules: TiebreakRule[];
}

export interface HackathonCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  weight?: number;
}

export interface TiebreakRule {
  order: number;
  type: 'highest-criterion' | 'earliest-submission';
  criterionId?: string; // For highest-criterion type
}

export interface JudgeAssignment {
  judgeId: string;
  teamIds: string[];
  track?: string;
  maxAssignments?: number;
}
