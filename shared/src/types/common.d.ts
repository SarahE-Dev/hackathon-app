export declare enum UserRole {
    ADMIN = "admin",
    PROCTOR = "proctor",
    GRADER = "grader",
    JUDGE = "judge",
    APPLICANT = "applicant"
}
export declare enum QuestionType {
    MCQ_SINGLE = "mcq-single",
    MCQ_MULTI = "mcq-multi",
    FREEFORM = "freeform",
    LONG_FORM = "long-form",
    CODING = "coding",
    FILE_UPLOAD = "file-upload"
}
export declare enum AssessmentStatus {
    DRAFT = "draft",
    REVIEW = "review",
    PUBLISHED = "published",
    ARCHIVED = "archived"
}
export declare enum AttemptStatus {
    NOT_STARTED = "not-started",
    IN_PROGRESS = "in-progress",
    SUBMITTED = "submitted",
    GRADED = "graded",
    RELEASED = "released"
}
export declare enum GradeStatus {
    PENDING = "pending",
    DRAFT = "draft",
    SUBMITTED = "submitted",
    RELEASED = "released"
}
export declare enum ProctoringEventType {
    TAB_SWITCH = "tab-switch",
    BLUR = "blur",
    COPY = "copy",
    PASTE = "paste",
    PRINT = "print",
    IDLE = "idle",
    MANUAL_FLAG = "manual-flag",
    ID_CHECK = "id-check"
}
export declare enum DifficultyLevel {
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard",
    EXPERT = "expert"
}
export declare enum SubmissionLanguage {
    PYTHON = "python",
    JAVASCRIPT = "javascript",
    JAVA = "java",
    CPP = "cpp",
    GO = "go"
}
export interface Timestamps {
    createdAt: Date;
    updatedAt: Date;
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
    };
}
//# sourceMappingURL=common.d.ts.map