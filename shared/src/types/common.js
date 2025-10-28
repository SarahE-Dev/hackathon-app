"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmissionLanguage = exports.DifficultyLevel = exports.ProctoringEventType = exports.GradeStatus = exports.AttemptStatus = exports.AssessmentStatus = exports.QuestionType = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["PROCTOR"] = "proctor";
    UserRole["GRADER"] = "grader";
    UserRole["JUDGE"] = "judge";
    UserRole["APPLICANT"] = "applicant";
})(UserRole || (exports.UserRole = UserRole = {}));
var QuestionType;
(function (QuestionType) {
    QuestionType["MCQ_SINGLE"] = "mcq-single";
    QuestionType["MCQ_MULTI"] = "mcq-multi";
    QuestionType["FREEFORM"] = "freeform";
    QuestionType["LONG_FORM"] = "long-form";
    QuestionType["CODING"] = "coding";
    QuestionType["FILE_UPLOAD"] = "file-upload";
})(QuestionType || (exports.QuestionType = QuestionType = {}));
var AssessmentStatus;
(function (AssessmentStatus) {
    AssessmentStatus["DRAFT"] = "draft";
    AssessmentStatus["REVIEW"] = "review";
    AssessmentStatus["PUBLISHED"] = "published";
    AssessmentStatus["ARCHIVED"] = "archived";
})(AssessmentStatus || (exports.AssessmentStatus = AssessmentStatus = {}));
var AttemptStatus;
(function (AttemptStatus) {
    AttemptStatus["NOT_STARTED"] = "not-started";
    AttemptStatus["IN_PROGRESS"] = "in-progress";
    AttemptStatus["SUBMITTED"] = "submitted";
    AttemptStatus["GRADED"] = "graded";
    AttemptStatus["RELEASED"] = "released";
})(AttemptStatus || (exports.AttemptStatus = AttemptStatus = {}));
var GradeStatus;
(function (GradeStatus) {
    GradeStatus["PENDING"] = "pending";
    GradeStatus["DRAFT"] = "draft";
    GradeStatus["SUBMITTED"] = "submitted";
    GradeStatus["RELEASED"] = "released";
})(GradeStatus || (exports.GradeStatus = GradeStatus = {}));
var ProctoringEventType;
(function (ProctoringEventType) {
    ProctoringEventType["TAB_SWITCH"] = "tab-switch";
    ProctoringEventType["BLUR"] = "blur";
    ProctoringEventType["COPY"] = "copy";
    ProctoringEventType["PASTE"] = "paste";
    ProctoringEventType["PRINT"] = "print";
    ProctoringEventType["IDLE"] = "idle";
    ProctoringEventType["MANUAL_FLAG"] = "manual-flag";
    ProctoringEventType["ID_CHECK"] = "id-check";
})(ProctoringEventType || (exports.ProctoringEventType = ProctoringEventType = {}));
var DifficultyLevel;
(function (DifficultyLevel) {
    DifficultyLevel["EASY"] = "easy";
    DifficultyLevel["MEDIUM"] = "medium";
    DifficultyLevel["HARD"] = "hard";
    DifficultyLevel["EXPERT"] = "expert";
})(DifficultyLevel || (exports.DifficultyLevel = DifficultyLevel = {}));
var SubmissionLanguage;
(function (SubmissionLanguage) {
    SubmissionLanguage["PYTHON"] = "python";
    SubmissionLanguage["JAVASCRIPT"] = "javascript";
    SubmissionLanguage["JAVA"] = "java";
    SubmissionLanguage["CPP"] = "cpp";
    SubmissionLanguage["GO"] = "go";
})(SubmissionLanguage || (exports.SubmissionLanguage = SubmissionLanguage = {}));
//# sourceMappingURL=common.js.map