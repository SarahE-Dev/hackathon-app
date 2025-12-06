import { ProctoringEventType, Timestamps } from './common';
export interface ProctorEvent extends Timestamps {
    _id: string;
    attemptId: string;
    userId: string;
    sessionId: string;
    type: ProctoringEventType;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
    metadata?: Record<string, any>;
    proctorNote?: string;
    resolved: boolean;
    resolvedBy?: string;
    resolvedAt?: Date;
}
export interface ProctorSession {
    sessionId: string;
    proctorId: string;
    activeStudents: ActiveStudent[];
    events: ProctorEvent[];
}
export interface ActiveStudent {
    userId: string;
    userName: string;
    attemptId: string;
    status: 'active' | 'idle' | 'flagged';
    currentQuestion: number;
    timeRemaining: number;
    flagCount: number;
    lastActivity: Date;
}
export interface IdCheckData {
    attemptId: string;
    userId: string;
    photoUrl?: string;
    verifiedAt?: Date;
    verifiedBy?: string;
    passed: boolean;
    notes?: string;
}
export interface RecordingMetadata {
    attemptId: string;
    userId: string;
    type: 'webcam' | 'screen';
    storageUrl: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    fileSize?: number;
    consent: boolean;
    consentTimestamp: Date;
}
export interface DeviceFingerprint {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    platform: string;
    canvas?: string;
}
export interface ProctorDashboardStats {
    totalStudents: number;
    activeStudents: number;
    flaggedStudents: number;
    completedStudents: number;
    averageProgress: number;
    recentEvents: ProctorEvent[];
}
//# sourceMappingURL=proctoring.d.ts.map