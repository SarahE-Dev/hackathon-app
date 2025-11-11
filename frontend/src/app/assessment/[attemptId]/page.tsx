'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProctoring } from '@/hooks/useProctoring';
import { MCQQuestion } from '@/components/assessment/MCQQuestion';
import { CodingQuestion } from '@/components/assessment/CodingQuestion';
import axios from 'axios';

interface Answer {
  questionId: string;
  answer: any;
  timestamp: Date;
  timeSpent: number;
}

interface Question {
  _id: string;
  type: 'multiple-choice' | 'short-answer' | 'long-answer' | 'coding' | 'file-upload' | 'multi-select';
  title: string;
  description: string;
  points: number;
  content: any;
}

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

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Auto-save answers
  const saveAnswer = useCallback(
    async (questionId: string, answer: any) => {
      try {
        setSaving(true);
        const token = localStorage.getItem('accessToken');
        await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/${attemptId}/answer`,
          {
            questionId,
            answer,
            timeSpent: 0, // TODO: Track actual time spent per question
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSaving(false);
      } catch (error) {
        console.error('Error saving answer:', error);
        setSaving(false);
      }
    },
    [attemptId]
  );

  // Handle answer change
  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    // Auto-save after 2 seconds of no changes
    setTimeout(() => {
      saveAnswer(questionId, answer);
    }, 2000);
  };

  // Submit assessment
  const handleSubmit = async () => {
    if (submitting) return;

    const confirmed = window.confirm(
      'Are you sure you want to submit your assessment? You will not be able to make changes after submission.'
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/${attemptId}/submit`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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

  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
                <div className={`text-center ${timeRemaining < 300 ? 'text-red-400' : 'text-neon-blue'}`}>
                  <div className="text-xs text-gray-400 mb-1">Time Remaining</div>
                  <div className="text-2xl font-mono font-bold">{formatTime(timeRemaining)}</div>
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
                {currentQuestion.type === 'multiple-choice' && (
                  <MCQQuestion
                    question={currentQuestion}
                    answer={answers[currentQuestion._id]}
                    onChange={(answer) => handleAnswerChange(currentQuestion._id, answer)}
                    disabled={submitting}
                  />
                )}

                {currentQuestion.type === 'coding' && (
                  <CodingQuestion
                    question={currentQuestion}
                    answer={answers[currentQuestion._id]}
                    onChange={(answer) => handleAnswerChange(currentQuestion._id, answer)}
                    disabled={submitting}
                  />
                )}

                {currentQuestion.type === 'short-answer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Your Answer
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all"
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion._id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                )}

                {currentQuestion.type === 'long-answer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Your Answer
                    </label>
                    <textarea
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all min-h-[200px]"
                      placeholder="Type your detailed answer here..."
                      value={answers[currentQuestion._id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                )}

                {!['multiple-choice', 'coding', 'short-answer', 'long-answer'].includes(currentQuestion.type) && (
                  <div>
                    <p className="text-gray-500 text-sm italic mb-4">
                      Question type "{currentQuestion.type}" - Generic input
                    </p>
                    <textarea
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all min-h-[200px]"
                      placeholder="Your answer..."
                      value={answers[currentQuestion._id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                )}
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
