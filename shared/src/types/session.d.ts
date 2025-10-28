import { AttemptStatus, Timestamps } from './common';
export interface Session extends Timestamps {
    _id: string;
    assessmentId: string;
    organizationId: string;
    cohortId?: string;
    title: string;
    windowStart: Date;
    windowEnd: Date;
    policies: SessionPolicies;
    accommodations: SessionAccommodation[];
    isActive: boolean;
}
export interface SessionPolicies {
    allowLateSubmission: boolean;
    lateDeadline?: Date;
    autoStartOnJoin: boolean;
    showLeaderboard: boolean;
}
export interface SessionAccommodation {
    userId: string;
    timeMultiplier: number;
    reducedProctoring: boolean;
    separateRoom: boolean;
    notes?: string;
}
export interface Attempt extends Timestamps {
    _id: string;
    sessionId: string;
    userId: string;
    assessmentId: string;
    assessmentSnapshot: any;
    startedAt?: Date;
    submittedAt?: Date;
    timeSpent: number;
    answers: Answer[];
    files: FileSubmission[];
    events: AttemptEvent[];
    status: AttemptStatus;
    score?: number;
    maxScore?: number;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
}
export interface Answer {
    questionId: string;
    answer: any;
    timestamp: Date;
    timeSpent: number;
    version: number;
}
export interface FileSubmission {
    questionId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
}
export interface AttemptEvent {
    type: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export interface SessionStats {
    totalStudents: number;
    started: number;
    inProgress: number;
    submitted: number;
    averageTimeSpent: number;
    flaggedAttempts: number;
}
//# sourceMappingURL=session.d.ts.map