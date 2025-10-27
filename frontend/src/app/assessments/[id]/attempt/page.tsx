'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore, useAttemptStore, useUIStore } from '@/store';
import { useProctoring } from '@/hooks/useProctoring';
import { Button, Card, CardBody, CardHeader } from '@/components/ui';
import { Timer } from '@/components/assessment/Timer';
import { AlertCircle, ChevronLeft, ChevronRight, Send } from 'lucide-react';

export default function AssessmentAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;

  const { user } = useAuthStore();
  const {
    attemptId,
    answers,
    currentQuestionIndex,
    timeRemainingSeconds,
    isSubmitted,
    isSaving,
    proctorAlerts,
    answerQuestion,
    setCurrentQuestion,
    updateTimeRemaining,
    submitAttempt,
    addProctorAlert,
  } = useAttemptStore();

  const { addToast } = useUIStore();

  const [assessment, setAssessment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Proctoring
  const proctoring = useProctoring({
    attemptId: attemptId || '',
    enableTabDetection: assessment?.settings?.detectTabSwitch,
    enableCopyPaste: assessment?.settings?.detectCopyPaste,
  });

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      updateTimeRemaining(timeRemainingSeconds - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemainingSeconds, updateTimeRemaining]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemainingSeconds <= 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [timeRemainingSeconds, isSubmitted]);

  // Handle proctor alerts
  useEffect(() => {
    if (proctoring.alerts.length > proctorAlerts.length) {
      const newAlert = proctoring.alerts[proctoring.alerts.length - 1];
      addProctorAlert(newAlert.message);
    }
  }, [proctoring.alerts, proctorAlerts, addProctorAlert]);

  // Force submit from proctor
  useEffect(() => {
    if (proctoring.forceSubmit) {
      addToast('Proctor forced submission', 'warning');
      handleSubmit();
    }
  }, [proctoring.forceSubmit, addToast]);

  const handleAnswerChange = (answer: any) => {
    const questions = assessment?.sections.flatMap((s: any) => s.questions) || [];
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      answerQuestion(currentQuestion.id, answer);
    }
  };

  const handleSubmit = async () => {
    try {
      await submitAttempt();
      addToast('Assessment submitted successfully!', 'success');
      router.push(`/assessments/${assessmentId}/results`);
    } catch (error: any) {
      addToast(error.message || 'Failed to submit assessment', 'error');
    }
  };

  const handleNextQuestion = () => {
    const totalQuestions = assessment?.sections.flatMap((s: any) => s.questions).length || 0;
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestion(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestion(currentQuestionIndex - 1);
    }
  };

  // Load assessment
  useEffect(() => {
    const loadAssessment = async () => {
      try {
        // API call would go here
        setIsLoading(false);
      } catch (error) {
        addToast('Failed to load assessment', 'error');
        router.push('/dashboard');
      }
    };

    if (!user) {
      router.push('/login');
      return;
    }

    loadAssessment();
  }, [user, router, assessmentId, addToast]);

  if (isLoading || !assessment) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block">
            <div className="w-12 h-12 border-4 border-neon-blue border-t-transparent rounded-full" />
          </div>
          <p className="text-gray-300 mt-4">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-green/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-neon-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Assessment Submitted!</h2>
            <p className="text-gray-300 mb-6">Your responses have been saved and submitted successfully.</p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const questions = assessment?.sections.flatMap((s: any) => s.questions) || [];
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  return (
    <div className="min-h-screen bg-dark-900 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{assessment.title}</h1>
            <p className="text-gray-400 mt-1">{assessment.description}</p>
          </div>
          <Timer secondsRemaining={timeRemainingSeconds} onTimeUp={handleSubmit} warningAt={300} />
        </div>

        {/* Proctor Alerts */}
        {proctorAlerts.length > 0 && (
          <div className="space-y-2 mb-4">
            {proctorAlerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-neon-yellow/20 border border-neon-yellow/50 text-neon-yellow">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question List Sidebar */}
        <div className="lg:col-span-1">
          <Card variant="glass">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Questions</h3>
            </CardHeader>
            <CardBody className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((q: any, idx: number) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestion(idx)}
                  className={`
                    w-full px-3 py-2 rounded-lg text-left transition-all
                    ${currentQuestionIndex === idx
                      ? 'bg-neon-blue/20 border border-neon-blue text-neon-blue'
                      : answers[q.id]
                      ? 'bg-neon-green/10 border border-neon-green/30 text-neon-green'
                      : 'bg-dark-700/50 border border-dark-600 text-gray-300 hover:border-dark-500'
                    }
                  `}
                >
                  <span className="font-mono text-sm">Q{idx + 1}</span>
                  {answers[q.id] && <span className="ml-2 text-xs">✓</span>}
                </button>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Question Content */}
        <div className="lg:col-span-3">
          {currentQuestion ? (
            <Card variant="glass">
              <CardHeader>
                <h2 className="text-2xl font-bold text-white">Question {currentQuestionIndex + 1}</h2>
                <p className="text-gray-400 text-sm mt-2">{currentQuestion.type} • {currentQuestion.points} points</p>
              </CardHeader>
              <CardBody className="space-y-6">
                {/* Question Content */}
                <div>
                  <p className="text-lg text-white mb-4">{currentQuestion.content}</p>
                </div>

                {/* Question Type Specific Rendering */}
                <div className="bg-dark-900/50 rounded-lg p-4 min-h-40">
                  {/* Placeholder for question rendering */}
                  <div className="text-gray-400 text-center py-8">
                    Question type: {currentQuestion.type}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-4 pt-6 border-t border-dark-700">
                  <Button
                    variant="ghost"
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  {currentQuestionIndex === questions.length - 1 ? (
                    <Button
                      onClick={() => setShowSubmitConfirm(true)}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Assessment
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={handleNextQuestion}
                      className="flex-1"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card variant="glass">
              <CardBody className="text-center py-12">
                <p className="text-gray-400">No questions found</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <h3 className="text-xl font-bold text-white">Submit Assessment?</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to submit your assessment? You won't be able to make changes after submission.
              </p>
              <div className="bg-dark-900/50 p-3 rounded-lg text-sm text-gray-300">
                Questions answered: {Object.keys(answers).length} / {questions.length}
              </div>
            </CardBody>
            <div className="px-6 py-4 border-t border-dark-700 flex gap-3">
              <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmit} isLoading={isSaving} className="flex-1">
                Submit
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
