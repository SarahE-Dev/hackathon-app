'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Question {
  _id: string;
  content: {
    text: string;
    rubric?: Array<{ criteria: string; points: number; description?: string }>;
    options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
    correctAnswer?: any;
    maxPoints?: number;
  };
  type: string;
  points: number;
}

interface Answer {
  questionId: string;
  answer: any;
  timestamp: string;
  timeSpent: number;
}

interface Attempt {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  assessmentId: {
    _id: string;
    title: string;
    description: string;
    totalPoints: number;
  };
  assessmentSnapshot: {
    sections: Array<{
      id: string;
      title: string;
      questionIds: string[];
    }>;
    questions: Question[];
  };
  answers: Answer[];
  files: any[];
  submittedAt: string;
  timeSpent: number;
}

interface QuestionScore {
  questionId: string;
  points: number;
  maxPoints: number;
  comments: Array<{ id: string; text: string; timestamp: Date }>;
  rubricScores?: Record<string, number>;
  autograded: boolean;
}

interface Grade {
  _id: string;
  questionScores: QuestionScore[];
  overallScore: number;
  maxScore: number;
  percentage: number;
  status: string;
  feedback?: string;
}

export default function GradeAttemptPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const router = useRouter();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [existingGrade, setExistingGrade] = useState<Grade | null>(null);
  const [questionScores, setQuestionScores] = useState<Record<string, QuestionScore>>({});
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    fetchAttemptForGrading();
  }, [attemptId]);

  const fetchAttemptForGrading = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `${BACKEND_URL}/api/grades/attempt/${attemptId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { attempt: attemptData, existingGrade: gradeData } = response.data.data;
      setAttempt(attemptData);
      setExistingGrade(gradeData);

      // Initialize question scores
      const initialScores: Record<string, QuestionScore> = {};
      attemptData.assessmentSnapshot.questions.forEach((question: Question) => {
        const existingScore = gradeData?.questionScores.find(
          (qs: QuestionScore) => qs.questionId === question._id
        );

        initialScores[question._id] = existingScore || {
          questionId: question._id,
          points: 0,
          maxPoints: question.points || question.content.maxPoints || 0,
          comments: [],
          rubricScores: {},
          autograded: false,
        };
      });

      setQuestionScores(initialScores);
      if (gradeData?.feedback) {
        setFeedback(gradeData.feedback);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching attempt:', err);
      setError(err.response?.data?.message || 'Failed to load attempt');
      setLoading(false);
    }
  };

  const handleScoreChange = (questionId: string, points: number, maxPoints: number) => {
    setQuestionScores((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        points: Math.min(Math.max(0, points), maxPoints),
      },
    }));
  };

  const handleRubricScoreChange = (
    questionId: string,
    criteria: string,
    points: number,
    maxPoints: number
  ) => {
    setQuestionScores((prev) => {
      const current = prev[questionId];
      const newRubricScores = {
        ...current.rubricScores,
        [criteria]: Math.min(Math.max(0, points), maxPoints),
      };

      // Calculate total from rubric
      const totalFromRubric = Object.values(newRubricScores).reduce((sum, p) => sum + p, 0);

      return {
        ...prev,
        [questionId]: {
          ...current,
          rubricScores: newRubricScores,
          points: totalFromRubric,
        },
      };
    });
  };

  const handleAddComment = (questionId: string, text: string) => {
    if (!text.trim()) return;

    setQuestionScores((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        comments: [
          ...prev[questionId].comments,
          {
            id: Date.now().toString(),
            text: text.trim(),
            timestamp: new Date(),
          },
        ],
      },
    }));
  };

  const handleDeleteComment = (questionId: string, commentId: string) => {
    setQuestionScores((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        comments: prev[questionId].comments.filter((c) => c.id !== commentId),
      },
    }));
  };

  const calculateTotalScore = () => {
    return Object.values(questionScores).reduce((sum, qs) => sum + qs.points, 0);
  };

  const calculateMaxScore = () => {
    return Object.values(questionScores).reduce((sum, qs) => sum + qs.maxPoints, 0);
  };

  const handleSaveGrade = async (status: 'draft' | 'submitted') => {
    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');

      const payload = {
        attemptId,
        questionScores: Object.values(questionScores),
        feedback,
        status,
      };

      await axios.post(`${BACKEND_URL}/api/grades`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(status === 'draft' ? 'Grade saved as draft' : 'Grade submitted successfully');
      if (status === 'submitted') {
        router.push('/judge/grading');
      } else {
        // Refresh to get updated grade
        fetchAttemptForGrading();
      }
    } catch (err: any) {
      console.error('Error saving grade:', err);
      alert(err.response?.data?.message || 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseGrade = async () => {
    if (!existingGrade?._id) return;

    if (!confirm('Are you sure you want to release this grade to the student?')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      await axios.put(
        `${BACKEND_URL}/api/grades/${existingGrade._id}/release`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('Grade released successfully');
      router.push('/judge/grading');
    } catch (err: any) {
      console.error('Error releasing grade:', err);
      alert(err.response?.data?.message || 'Failed to release grade');
    }
  };

  const getAnswerForQuestion = (questionId: string) => {
    return attempt?.answers.find((a) => a.questionId === questionId);
  };

  const renderAnswer = (question: Question, answer: Answer | undefined) => {
    if (!answer || answer.answer === null || answer.answer === undefined) {
      return <p className="text-gray-500 italic">No answer submitted</p>;
    }

    switch (question.type) {
      case 'Multiple-Choice':
      case 'True-False':
        const selectedOption = question.content.options?.find(
          (opt) => opt.id === answer.answer
        );
        return (
          <div className="space-y-2">
            {question.content.options?.map((option) => (
              <div
                key={option.id}
                className={`p-3 border rounded-lg ${
                  option.id === answer.answer
                    ? option.isCorrect
                      ? 'bg-green-500/10 border-green-500'
                      : 'bg-red-500/10 border-red-500'
                    : option.isCorrect
                    ? 'bg-green-500/5 border-green-500/50'
                    : 'border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white">{option.text}</span>
                  <div className="flex gap-2">
                    {option.id === answer.answer && (
                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                        Selected
                      </span>
                    )}
                    {option.isCorrect && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                        Correct
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'Short-Answer':
      case 'Essay':
      case 'Long-Answer':
        return (
          <div className="bg-dark-700 border border-gray-600 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-white font-mono text-sm">
              {answer.answer}
            </pre>
          </div>
        );

      case 'Coding':
        return (
          <div className="bg-dark-700 border border-gray-600 rounded-lg overflow-hidden">
            <div className="bg-dark-800 px-4 py-2 border-b border-gray-600">
              <span className="text-gray-400 text-sm">
                Language: {answer.answer?.language || 'Unknown'}
              </span>
            </div>
            <pre className="p-4 text-white font-mono text-sm overflow-x-auto">
              {answer.answer?.code || answer.answer}
            </pre>
          </div>
        );

      case 'File-Upload':
        if (Array.isArray(answer.answer) && answer.answer.length > 0) {
          return (
            <div className="space-y-2">
              {answer.answer.map((file: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-dark-700 border border-gray-600 rounded-lg"
                >
                  <svg
                    className="w-6 h-6 text-neon-blue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-white text-sm">{file.fileName}</p>
                    <p className="text-gray-400 text-xs">
                      {(file.fileSize / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <a
                    href={file.fileUrl}
                    download
                    className="px-3 py-1 bg-neon-blue/20 text-neon-blue rounded hover:bg-neon-blue/30 transition-colors text-sm"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          );
        }
        return <p className="text-gray-500 italic">No files uploaded</p>;

      default:
        return <pre className="text-white">{JSON.stringify(answer.answer, null, 2)}</pre>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading attempt...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error || 'Attempt not found'}</p>
          <Link
            href="/judge/grading"
            className="px-4 py-2 bg-neon-blue text-white rounded-lg hover:bg-neon-blue/80 transition-colors"
          >
            Back to Grading
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = attempt.assessmentSnapshot.questions[currentQuestionIndex];
  const currentAnswer = getAnswerForQuestion(currentQuestion._id);
  const currentScore = questionScores[currentQuestion._id];
  const totalScore = calculateTotalScore();
  const maxScore = calculateMaxScore();
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{attempt.assessmentId.title}</h1>
                <span
                  className={`px-3 py-1 text-xs font-medium border rounded-full ${
                    existingGrade?.status === 'released'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                      : existingGrade?.status === 'submitted'
                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                      : existingGrade?.status === 'draft'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                  }`}
                >
                  {existingGrade?.status || 'Not Started'}
                </span>
              </div>
              <p className="text-gray-400">Student: {attempt.userId.name}</p>
              <p className="text-gray-500 text-sm">{attempt.userId.email}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Overall Score</div>
              <div className="text-3xl font-bold">
                <span className="text-neon-blue">{totalScore.toFixed(1)}</span>
                <span className="text-gray-500"> / {maxScore}</span>
              </div>
              <div className="text-sm text-gray-400 mt-1">{percentage.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Question Navigation */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-400">
                  Question {currentQuestionIndex + 1} of{' '}
                  {attempt.assessmentSnapshot.questions.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
                    }
                    disabled={currentQuestionIndex === 0}
                    className="px-3 py-1 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentQuestionIndex(
                        Math.min(
                          attempt.assessmentSnapshot.questions.length - 1,
                          currentQuestionIndex + 1
                        )
                      )
                    }
                    disabled={
                      currentQuestionIndex === attempt.assessmentSnapshot.questions.length - 1
                    }
                    className="px-3 py-1 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Question Grid */}
              <div className="grid grid-cols-8 gap-2">
                {attempt.assessmentSnapshot.questions.map((q, idx) => {
                  const score = questionScores[q._id];
                  const isGraded = score && score.points > 0;
                  return (
                    <button
                      key={q._id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        idx === currentQuestionIndex
                          ? 'border-neon-blue bg-neon-blue/20'
                          : isGraded
                          ? 'border-green-500/50 bg-green-500/10 hover:border-green-500'
                          : 'border-gray-600 bg-dark-700 hover:border-gray-500'
                      }`}
                    >
                      <span className="text-sm font-medium">{idx + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Display */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1 bg-neon-purple/20 text-neon-purple border border-neon-purple/50 rounded">
                      {currentQuestion.type}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {currentScore.maxPoints} points
                    </span>
                  </div>
                  <h3 className="text-xl font-medium text-white mb-4">
                    {currentQuestion.content.text}
                  </h3>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Student Answer:</h4>
                {renderAnswer(currentQuestion, currentAnswer)}
              </div>

              {currentAnswer && (
                <div className="text-sm text-gray-400 mt-4">
                  Time spent: {Math.floor(currentAnswer.timeSpent / 60)}m{' '}
                  {currentAnswer.timeSpent % 60}s
                </div>
              )}
            </div>

            {/* Scoring Section */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Scoring</h3>

              {/* Rubric Scoring */}
              {currentQuestion.content.rubric && currentQuestion.content.rubric.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400 mb-3">Grade using rubric:</p>
                  {currentQuestion.content.rubric.map((item, idx) => (
                    <div key={idx} className="bg-dark-700 border border-gray-600 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{item.criteria}</h4>
                          {item.description && (
                            <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={item.points}
                            step="0.5"
                            value={currentScore.rubricScores?.[item.criteria] || 0}
                            onChange={(e) =>
                              handleRubricScoreChange(
                                currentQuestion._id,
                                item.criteria,
                                parseFloat(e.target.value) || 0,
                                item.points
                              )
                            }
                            className="w-20 px-3 py-2 bg-dark-800 border border-gray-600 rounded text-white text-center focus:outline-none focus:border-neon-blue"
                          />
                          <span className="text-gray-400">/ {item.points}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="bg-neon-blue/10 border border-neon-blue/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">Total from Rubric:</span>
                      <span className="text-2xl font-bold text-neon-blue">
                        {currentScore.points} / {currentScore.maxPoints}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <label className="text-white font-medium">Points:</label>
                  <input
                    type="number"
                    min="0"
                    max={currentScore.maxPoints}
                    step="0.5"
                    value={currentScore.points}
                    onChange={(e) =>
                      handleScoreChange(
                        currentQuestion._id,
                        parseFloat(e.target.value) || 0,
                        currentScore.maxPoints
                      )
                    }
                    className="w-24 px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white text-center focus:outline-none focus:border-neon-blue"
                  />
                  <span className="text-gray-400">/ {currentScore.maxPoints}</span>
                </div>
              )}

              {/* Comments */}
              <div className="mt-6">
                <h4 className="text-white font-medium mb-3">Comments & Feedback</h4>
                <div className="space-y-3 mb-3">
                  {currentScore.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-dark-700 border border-gray-600 rounded-lg p-3 flex items-start justify-between"
                    >
                      <p className="text-white text-sm flex-1">{comment.text}</p>
                      <button
                        onClick={() => handleDeleteComment(currentQuestion._id, comment.id)}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddComment(currentQuestion._id, e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Overall Feedback */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Overall Feedback</h3>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add overall feedback for the student..."
                rows={6}
                className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white resize-none focus:outline-none focus:border-neon-blue"
              />
            </div>

            {/* Actions */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6 space-y-3">
              <button
                onClick={() => handleSaveGrade('draft')}
                disabled={saving}
                className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                onClick={() => handleSaveGrade('submitted')}
                disabled={saving}
                className="w-full px-4 py-3 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-blue/80 hover:to-neon-purple/80 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-neon-blue/50 disabled:opacity-50"
              >
                {saving ? 'Submitting...' : 'Submit Grade'}
              </button>
              {existingGrade?.status === 'submitted' && (
                <button
                  onClick={handleReleaseGrade}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Release to Student
                </button>
              )}
              <Link
                href="/judge/grading"
                className="block w-full px-4 py-3 text-center bg-transparent hover:bg-dark-700 border border-gray-600 text-white rounded-lg transition-colors"
              >
                Back to List
              </Link>
            </div>

            {/* Attempt Info */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Attempt Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Submitted:</span>
                  <p className="text-white">{new Date(attempt.submittedAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-400">Total Time:</span>
                  <p className="text-white">
                    {Math.floor(attempt.timeSpent / 3600)}h{' '}
                    {Math.floor((attempt.timeSpent % 3600) / 60)}m
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Questions:</span>
                  <p className="text-white">{attempt.assessmentSnapshot.questions.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
