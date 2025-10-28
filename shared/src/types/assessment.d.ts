import { QuestionType, AssessmentStatus, DifficultyLevel, Timestamps } from './common';
export interface Question extends Timestamps {
    _id: string;
    type: QuestionType;
    version: number;
    status: AssessmentStatus;
    title: string;
    content: QuestionContent;
    tags: string[];
    difficulty: DifficultyLevel;
    authorId: string;
    organizationId: string;
    points: number;
}
export interface QuestionContent {
    prompt: string;
    options?: MCQOption[];
    correctAnswer?: any;
    testCases?: TestCase[];
    rubricId?: string;
    allowedFileTypes?: string[];
    maxFileSize?: number;
    codeTemplate?: string;
    language?: string;
}
export interface MCQOption {
    id: string;
    text: string;
    isCorrect?: boolean;
}
export interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    points: number;
    timeLimit?: number;
    memoryLimit?: number;
}
export interface Assessment extends Timestamps {
    _id: string;
    title: string;
    description?: string;
    organizationId: string;
    authorId: string;
    sections: AssessmentSection[];
    settings: AssessmentSettings;
    status: AssessmentStatus;
    publishedSnapshot?: PublishedAssessmentSnapshot;
    publishedAt?: Date;
}
export interface AssessmentSection {
    id: string;
    title: string;
    description?: string;
    questionIds: string[];
    timeLimit?: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    questionsToDisplay?: number;
}
export interface AssessmentSettings {
    totalTimeLimit?: number;
    attemptsAllowed: number;
    showResultsImmediately: boolean;
    allowReview: boolean;
    allowBackward: boolean;
    shuffleSections: boolean;
    startWindow?: Date;
    endWindow?: Date;
    lateSubmissionPolicy?: {
        enabled: boolean;
        deadline: Date;
        penaltyPercentage: number;
    };
    proctoring: ProctoringSettings;
    accessibility: AccessibilitySettings;
}
export interface ProctoringSettings {
    enabled: boolean;
    requireIdCheck: boolean;
    detectTabSwitch: boolean;
    detectCopyPaste: boolean;
    enableWebcam: boolean;
    enableScreenRecording: boolean;
    fullscreenRequired: boolean;
    allowCalculator: boolean;
    allowScratchpad: boolean;
}
export interface AccessibilitySettings {
    allowExtraTime: boolean;
    extraTimePercentage?: number;
    allowScreenReader: boolean;
    dyslexiaFriendlyFont: boolean;
}
export interface PublishedAssessmentSnapshot {
    version: number;
    assessment: Assessment;
    questions: Question[];
    publishedAt: Date;
    publishedBy: string;
}
export interface QuestionBank {
    _id: string;
    name: string;
    description?: string;
    organizationId: string;
    questionIds: string[];
    tags: string[];
}
//# sourceMappingURL=assessment.d.ts.map