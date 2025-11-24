'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProctoring } from '@/hooks/useProctoring';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { QuestionRenderer, IQuestion } from '@/components/questions/QuestionRenderer';
import { Timer } from '@/components/assessment/Timer';
import { RecordingConsentModal, RecordingIndicator } from '@/components/recording';
import { useNotifications } from '@/contexts/NotificationContext';
import axios from 'axios';

// Custom hook for debounced autosave
function useDebouncedAutosave(delay: number = 2000) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingSavesRef = useRef<Map<string, any>>(new Map());

  const debouncedSave = useCallback((questionId: string, answer: any, saveFunction: (id: string, ans: any) => Promise<void>) => {
    // Store the latest answer for this question
    pendingSavesRef.current.set(questionId, answer);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      // Save all pending changes
      const saves = Array.from(pendingSavesRef.current.entries());
      pendingSavesRef.current.clear();

      // Execute saves (could be done in parallel or sequentially)
      for (const [id, ans] of saves) {
        try {
          await saveFunction(id, ans);
        } catch (error) {
          console.error(`Failed to save answer for question ${id}:`, error);
          // Re-queue failed saves
          pendingSavesRef.current.set(id, ans);
        }
      }
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Force save all pending changes
  const forceSave = useCallback(async (saveFunction: (id: string, ans: any) => Promise<void>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const saves = Array.from(pendingSavesRef.current.entries());
    pendingSavesRef.current.clear();

    for (const [id, ans] of saves) {
      try {
        await saveFunction(id, ans);
      } catch (error) {
        console.error(`Failed to save answer for question ${id}:`, error);
      }
    }
  }, []);

  return { debouncedSave, forceSave };
}

interface Answer {
  questionId: string;
  answer: any;
  timestamp: Date;
  timeSpent: number;
}

// Use the standardized Question interface from QuestionRenderer
interface Question extends IQuestion {
  _id: string;
  description?: string; // Backend field mapping
}

// Map backend question types to QuestionRenderer types
const mapQuestionType = (backendType: string): 'MCQ' | 'Multi-Select' | 'Short-Answer' | 'Long-Answer' | 'Coding' | 'File-Upload' => {
  switch (backendType) {
    case 'multiple-choice': return 'MCQ';
    case 'multi-select': return 'Multi-Select';
    case 'short-answer': return 'Short-Answer';
    case 'long-answer': return 'Long-Answer';
    case 'coding': return 'Coding';
    case 'file-upload': return 'File-Upload';
    default: return 'Short-Answer'; // Default fallback
  }
};

interface Attempt {
  _id: string;
  sessionId: string;
  assessmentId: string;
  assessmentSnapshot: {
    title: string;
    description: string;
    questions: Question[];
    settings: {
      timeLimit?: number;
      proctoring: {
        enabled: boolean;
        requireWebcam: boolean;
        detectTabSwitch: boolean;
        preventCopyPaste: boolean;
        recordWebcam: boolean;
        recordScreen: boolean;
        takeSnapshots: boolean;
        snapshotIntervalMinutes: number;
      };
    };
  };
  startedAt: string;
  answers: Answer[];
  status: 'in-progress' | 'submitted' | 'graded';
}

export default function TakeAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;
  const { addNotification } = useNotifications();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Recording state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [recordingConsented, setRecordingConsented] = useState(false);

  // Track time spent per question
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<string, number>>({});

  // Use debounced autosave hook
  const { debouncedSave, forceSave } = useDebouncedAutosave(2000);

  // Calculate time spent on current question
  const calculateTimeSpent = useCallback((questionId: string): number => {
    const startTime = questionStartTimes[questionId] || Date.now();
    const currentTimeSpent = questionTimeSpent[questionId] || 0;
    const additionalTime = Math.floor((Date.now() - startTime) / 1000); // in seconds
    return currentTimeSpent + additionalTime;
  }, [questionStartTimes, questionTimeSpent]);

  // Save answer function (used by debounced autosave) - declared early
  const saveAnswer = useCallback(
    async (questionId: string, answer: any) => {
      try {
        setSaving(true);
        const token = localStorage.getItem('accessToken');
        const timeSpent = calculateTimeSpent(questionId);

        await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/${attemptId}/answer`,
          {
            questionId,
            answer,
            timeSpent,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSaving(false);
      } catch (error) {
        console.error('Error saving answer:', error);
        setSaving(false);
        throw error; // Re-throw so debounced save can handle it
      }
    },
    [attemptId, calculateTimeSpent]
  );

  // Cleanup: save any pending changes when component unmounts
  useEffect(() => {
    return () => {
      forceSave(saveAnswer).catch(error => {
        console.error('Failed to save on unmount:', error);
      });
    };
  }, [forceSave, saveAnswer]);

  // Load attempt
  useEffect(() => {
    const loadAttempt = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/${attemptId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const attemptData = response.data.data.attempt;
        setAttempt(attemptData);

        // Load existing answers
        const answerMap: Record<string, any> = {};
        attemptData.answers.forEach((ans: Answer) => {
          answerMap[ans.questionId] = ans.answer;
        });
        setAnswers(answerMap);

        // Calculate time remaining
        if (attemptData.assessmentSnapshot.settings.timeLimit) {
          const startTime = new Date(attemptData.startedAt).getTime();
          const timeLimit = attemptData.assessmentSnapshot.settings.timeLimit * 60 * 1000; // Convert to ms
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, timeLimit - elapsed);
          setTimeRemaining(Math.floor(remaining / 1000)); // In seconds
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading attempt:', error);
        setLoading(false);
      }
    };

    loadAttempt();
  }, [attemptId]);

  // Initialize proctoring
  const { isConnected, alerts, forceSubmit, clearAlert } = useProctoring({
    attemptId,
    enableTabDetection: attempt?.assessmentSnapshot.settings.proctoring.detectTabSwitch,
    enableCopyPaste: attempt?.assessmentSnapshot.settings.proctoring.preventCopyPaste,
    enableRightClick: true,
    enableFullscreen: false,
  });

  // Check if recording is enabled
  const recordingEnabled = attempt?.assessmentSnapshot.settings.proctoring.recordWebcam ||
    attempt?.assessmentSnapshot.settings.proctoring.recordScreen ||
    attempt?.assessmentSnapshot.settings.proctoring.takeSnapshots;

  // Initialize webcam recording
  const webcamRecorder = useMediaRecorder({
    sourceType: 'assessment',
    sourceId: attemptId,
    type: 'webcam',
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Recording Error',
        message: error,
      });
    },
  });

  // Initialize screen recording
  const screenRecorder = useMediaRecorder({
    sourceType: 'assessment',
    sourceId: attemptId,
    type: 'screen',
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Recording Error',
        message: error,
      });
    },
  });

  // Show consent modal when recording is needed and not yet consented
  useEffect(() => {
    if (attempt && recordingEnabled && !recordingConsented && !loading) {
      setShowConsentModal(true);
    }
  }, [attempt, recordingEnabled, recordingConsented, loading]);

  // Start recordings after consent
  useEffect(() => {
    if (!recordingConsented || !attempt) return;

    const proctoring = attempt.assessmentSnapshot.settings.proctoring;

    if (proctoring.recordWebcam && webcamRecorder.status === 'idle') {
      webcamRecorder.startRecording(true);
    }

    if (proctoring.recordScreen && screenRecorder.status === 'idle') {
      screenRecorder.startRecording(true);
    }
  }, [recordingConsented, attempt]);

  // Handle consent
  const handleRecordingConsent = () => {
    setRecordingConsented(true);
    setShowConsentModal(false);
  };

  // Handle decline - redirect away
  const handleRecordingDecline = () => {
    router.push('/dashboard');
  };

  // Stop recordings on submit
  const stopRecordings = useCallback(async () => {
    if (webcamRecorder.isRecording) {
      await webcamRecorder.stopRecording();
    }
    if (screenRecorder.isRecording) {
      await screenRecorder.stopRecording();
    }
  }, [webcamRecorder, screenRecorder]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Track time spent when question changes
  useEffect(() => {
    if (!attempt) return;

    const currentQuestion = attempt.assessmentSnapshot.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const questionId = currentQuestion._id;

    // Initialize start time for this question if not already set
    if (!questionStartTimes[questionId]) {
      setQuestionStartTimes(prev => ({
        ...prev,
        [questionId]: Date.now()
      }));
    }

    // Return cleanup function to record time spent when leaving this question
    return () => {
      if (questionStartTimes[questionId]) {
        const timeSpent = calculateTimeSpent(questionId);
        setQuestionTimeSpent(prev => ({
          ...prev,
          [questionId]: timeSpent
        }));
        // Reset start time so it can be set again if user returns
        setQuestionStartTimes(prev => {
          const newTimes = { ...prev };
          delete newTimes[questionId];
          return newTimes;
        });
      }
    };
  }, [currentQuestionIndex, attempt, questionStartTimes, calculateTimeSpent]);

  // Handle answer change with debounced autosave
  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    debouncedSave(questionId, answer, saveAnswer);
  };

  // Submit assessment (force save all pending changes first)
  const handleSubmit = async () => {
    if (submitting) return;

    const confirmed = window.confirm(
      'Are you sure you want to submit your assessment? You will not be able to make changes after submission.'
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);

      // Force save all pending changes before submitting
      await forceSave(saveAnswer);

      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/${attemptId}/submit`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Stop recordings before redirecting
      await stopRecordings();

      // Show success notification
      addNotification({
        type: 'success',
        title: 'Assessment Submitted',
        message: `${attempt?.assessmentSnapshot.title} has been submitted successfully.`,
      });

      router.push('/dashboard?submitted=true');
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setSubmitting(false);
    }
  };

  // Force submit handler
  useEffect(() => {
    if (forceSubmit) {
      alert(`Your assessment has been force-submitted by a proctor. Reason: ${forceSubmit.reason}`);
      router.push('/dashboard');
    }
  }, [forceSubmit, router]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Assessment not found</p>
        </div>
      </div>
    );
  }

  const currentQuestion = attempt.assessmentSnapshot.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / attempt.assessmentSnapshot.questions.length) * 100;

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Recording Consent Modal */}
      <RecordingConsentModal
        isOpen={showConsentModal}
        onConsent={handleRecordingConsent}
        onDecline={handleRecordingDecline}
        recordingTypes={{
          webcam: attempt.assessmentSnapshot.settings.proctoring.recordWebcam || false,
          screen: attempt.assessmentSnapshot.settings.proctoring.recordScreen || false,
          snapshots: attempt.assessmentSnapshot.settings.proctoring.takeSnapshots || false,
        }}
        sessionType="assessment"
      />

      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                {attempt.assessmentSnapshot.title}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Question {currentQuestionIndex + 1} of {attempt.assessmentSnapshot.questions.length}
              </p>
            </div>

            <div className="flex items-center gap-6">
              {/* Time remaining */}
              {timeRemaining !== null && (
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Time Remaining</div>
                  <Timer
                    secondsRemaining={timeRemaining}
                    onTimeUp={() => handleSubmit()}
                    warningAt={300}
                  />
                </div>
              )}

              {/* Proctoring status */}
              {attempt.assessmentSnapshot.settings.proctoring.enabled && (
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Proctoring</div>
                  <div className={`flex items-center gap-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                    <span className="text-sm font-medium">{isConnected ? 'Active' : 'Disconnected'}</span>
                  </div>
                </div>
              )}

              {/* Recording indicator */}
              {(webcamRecorder.isRecording || screenRecorder.isRecording) && (
                <RecordingIndicator
                  isRecording={true}
                  recordingType={
                    webcamRecorder.isRecording && screenRecorder.isRecording
                      ? 'both'
                      : webcamRecorder.isRecording
                      ? 'webcam'
                      : 'screen'
                  }
                  duration={Math.max(webcamRecorder.duration, screenRecorder.duration)}
                  minimal={true}
                />
              )}

              {/* Save status */}
              <div className="text-sm text-gray-400">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  <span className="text-green-400">✓ Saved</span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 bg-dark-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* Proctor alerts */}
      {alerts.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-2 flex items-start justify-between"
            >
              <div>
                <div className="font-semibold text-yellow-400">Proctor Alert</div>
                <div className="text-sm text-gray-300 mt-1">{alert.message}</div>
              </div>
              <button
                onClick={() => clearAlert(index)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question panel */}
          <div className="lg:col-span-3 space-y-6">
            {/* Current question */}
            <div className="glass rounded-2xl p-8 border border-gray-800">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold">{currentQuestion.title}</h2>
                <span className="px-3 py-1 bg-neon-blue/20 text-neon-blue rounded-full text-sm">
                  {currentQuestion.points} points
                </span>
              </div>

              {currentQuestion.description && (
                <p className="text-gray-300 mb-6">{currentQuestion.description}</p>
              )}

              {/* Question-specific component */}
              <div className="mt-6">
                <QuestionRenderer
                  question={{
                    ...currentQuestion,
                    id: currentQuestion._id, // Map _id to id
                    type: mapQuestionType(currentQuestion.type), // Map backend type to renderer type
                    content: currentQuestion.description || currentQuestion.content || '', // Map description to content
                  }}
                  currentAnswer={answers[currentQuestion._id]}
                  onChange={(answer) => handleAnswerChange(currentQuestion._id, answer)}
                  readOnly={submitting}
                  attemptId={attemptId}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ← Previous
              </button>

              <button
                onClick={() =>
                  setCurrentQuestionIndex((prev) =>
                    Math.min(attempt.assessmentSnapshot.questions.length - 1, prev + 1)
                  )
                }
                disabled={currentQuestionIndex === attempt.assessmentSnapshot.questions.length - 1}
                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Question navigator */}
            <div className="glass rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold mb-4">Questions</h3>
              <div className="grid grid-cols-5 gap-2">
                {attempt.assessmentSnapshot.questions.map((q, index) => (
                  <button
                    key={q._id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                      index === currentQuestionIndex
                        ? 'bg-neon-blue text-white'
                        : answers[q._id]
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-dark-700 text-gray-400 border border-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed glow-purple"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
