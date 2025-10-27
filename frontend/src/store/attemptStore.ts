import { create } from 'zustand';

export interface Answer {
  questionId: string;
  answer: any; // Can be string, array, file, etc.
  timestamp: Date;
  timeSpent: number;
  version: number;
}

export interface AttemptState {
  attemptId: string | null;
  sessionId: string | null;
  assessmentId: string | null;
  answers: Record<string, Answer>;
  currentQuestionIndex: number;
  startedAt: Date | null;
  timeRemainingSeconds: number;
  isSubmitted: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  autoSaveEnabled: boolean;
  proctorAlerts: Array<{ message: string; timestamp: Date }>;

  // Actions
  startAttempt: (attemptId: string, sessionId: string, assessmentId: string, startedAt: Date, timeLimit: number) => void;
  answerQuestion: (questionId: string, answer: any) => void;
  setCurrentQuestion: (index: number) => void;
  updateTimeRemaining: (seconds: number) => void;
  setSaving: (isSaving: boolean) => void;
  submitAttempt: () => Promise<void>;
  autoSave: () => Promise<void>;
  addProctorAlert: (message: string) => void;
  clearError: () => void;
  resetAttempt: () => void;
}

export const useAttemptStore = create<AttemptState>((set, get) => ({
  attemptId: null,
  sessionId: null,
  assessmentId: null,
  answers: {},
  currentQuestionIndex: 0,
  startedAt: null,
  timeRemainingSeconds: 0,
  isSubmitted: false,
  isSaving: false,
  isLoading: false,
  error: null,
  autoSaveEnabled: true,
  proctorAlerts: [],

  startAttempt: (attemptId, sessionId, assessmentId, startedAt, timeLimit) =>
    set({
      attemptId,
      sessionId,
      assessmentId,
      startedAt,
      timeRemainingSeconds: timeLimit * 60,
      answers: {},
      currentQuestionIndex: 0,
      isSubmitted: false,
      error: null,
    }),

  answerQuestion: (questionId, answer) => {
    const state = get();
    set({
      answers: {
        ...state.answers,
        [questionId]: {
          questionId,
          answer,
          timestamp: new Date(),
          timeSpent: state.startedAt ? Date.now() - state.startedAt.getTime() : 0,
          version: (state.answers[questionId]?.version || 0) + 1,
        },
      },
    });
  },

  setCurrentQuestion: (index) => set({ currentQuestionIndex: index }),

  updateTimeRemaining: (seconds) => set({ timeRemainingSeconds: Math.max(0, seconds) }),

  setSaving: (isSaving) => set({ isSaving }),

  submitAttempt: async () => {
    set({ isSaving: true, error: null });
    try {
      const state = get();
      if (!state.attemptId) throw new Error('No attempt in progress');

      // API call would go here
      set({
        isSubmitted: true,
        isSaving: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to submit attempt',
        isSaving: false,
      });
      throw error;
    }
  },

  autoSave: async () => {
    const state = get();
    if (!state.autoSaveEnabled || state.isSaving || state.isSubmitted) return;

    set({ isSaving: true });
    try {
      // API call would go here for auto-save
      set({ isSaving: false });
    } catch (error) {
      set({ isSaving: false });
      console.error('Auto-save failed:', error);
    }
  },

  addProctorAlert: (message) => {
    const state = get();
    set({
      proctorAlerts: [
        ...state.proctorAlerts,
        { message, timestamp: new Date() },
      ],
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((s) => ({
        proctorAlerts: s.proctorAlerts.filter((a) => a.timestamp !== get().proctorAlerts.find((pa) => pa.message === message)?.timestamp),
      }));
    }, 5000);
  },

  clearError: () => set({ error: null }),

  resetAttempt: () =>
    set({
      attemptId: null,
      sessionId: null,
      assessmentId: null,
      answers: {},
      currentQuestionIndex: 0,
      startedAt: null,
      timeRemainingSeconds: 0,
      isSubmitted: false,
      isSaving: false,
      isLoading: false,
      error: null,
      proctorAlerts: [],
    }),
}));
