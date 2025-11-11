'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { QuestionRenderer, IQuestion } from '@/components/questions/QuestionRenderer';
import { RoleGuard } from '@/components/guards/RoleGuard';
import axios from 'axios';

interface Answer {
  questionId: string;
  answer: any;
  timestamp: Date;
  timeSpent: number;
}

interface Question extends IQuestion {
  _id: string;
  points: number;
  description?: string; // Backend field mapping
}

interface Attempt {
  _id: string;
  assessmentId: string;
  userId: string;
  userName?: string;
  assessmentSnapshot: {
    title: string;
    description: string;
    questions: Question[];
    settings: any;
  };
  startedAt: string;
  submittedAt?: string;
  answers: Answer[];
  status: 'in-progress' | 'submitted' | 'graded';
  score?: number;
}

interface Grade {
  _id?: string;
  attemptId: string;
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
}

function GradingContent() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAttemptAndGrades();
  }, [attemptId]);

  const loadAttemptAndGrades = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('accessToken');

      // Load attempt data
      const attemptResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/${attemptId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const attemptData = attemptResponse.data.data.attempt;
      setAttempt(attemptData);

      // Initialize grades from existing data or create empty grades
      const initialGrades: Record<string, Grade> = {};
      attemptData.assessmentSnapshot.questions.forEach((question: Question) => {
        initialGrades[question._id] = {
          attemptId,
          questionId: question._id,
          score: 0,
          maxScore: question.points,
          feedback: '',
        };
      });

      // Load existing grades if any
      try {
        const gradesResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/grades/attempt/${attemptId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const existingGrades = gradesResponse.data.data || [];
        existingGrades.forEach((grade: Grade) => {
          initialGrades[grade.questionId] = grade;
        });
      } catch (gradesErr) {
        // Grades might not exist yet, that's ok
        console.log('No existing grades found');
      }

      setGrades(initialGrades);

    } catch (err: any) {
      console.error('Error loading attempt:', err);
      setError(err.response?.data?.message || 'Failed to load attempt');
    } finally {
      setLoading(false);
    }
  };

  const updateGrade = (questionId: string, updates: Partial<Grade>) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...updates,
      }
    }));
  };

  const saveGrade = async (questionId: string) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      const grade = grades[questionId];

      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/grades`,
        grade,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show success message
      alert('Grade saved successfully!');
    } catch (err: any) {
      console.error('Error saving grade:', err);
      alert('Failed to save grade: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const saveAllGrades = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');

      // Save all grades
      const savePromises = Object.values(grades).map(grade =>
        axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/grades`,
          grade,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      );

      await Promise.all(savePromises);

      // Update attempt status to graded
      await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/${attemptId}`,
        { status: 'graded' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('All grades saved successfully!');
      router.push('/admin/assessments'); // Redirect to assessments list
    } catch (err: any) {
      console.error('Error saving grades:', err);
      alert('Failed to save grades: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const getTotalScore = () => {
    return Object.values(grades).reduce((total, grade) => total + grade.score, 0);
  };

  const getTotalMaxScore = () => {
    return Object.values(grades).reduce((total, grade) => total + grade.maxScore, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Submission not found</p>
          <Link href="/admin/assessments" className="text-neon-blue hover:text-neon-blue/80 mt-4 inline-block">
            ← Back to Assessments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin/assessments"
                className="text-neon-blue hover:text-neon-blue/80 transition-all mb-2 inline-block"
              >
                ← Back to Assessments
              </Link>
              <h1 className="text-2xl font-bold text-gradient">{attempt.assessmentSnapshot.title}</h1>
              <p className="text-gray-400 mt-1">Grading Submission</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-neon-blue">{getTotalScore()}/{getTotalMaxScore()}</div>
              <div className="text-sm text-gray-400">Total Points</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Student Info */}
        <div className="mb-8">
          <div className="glass rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Submission Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Student:</span>
                <div className="font-medium">{attempt.userName || 'Unknown Student'}</div>
              </div>
              <div>
                <span className="text-gray-400">Started:</span>
                <div className="font-medium">{new Date(attempt.startedAt).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-400">Submitted:</span>
                <div className="font-medium">
                  {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'Not submitted'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grading Questions */}
        <div className="space-y-8">
          <h2 className="text-xl font-bold">Grade Questions</h2>

          {attempt.assessmentSnapshot.questions.map((question, index) => {
            const userAnswer = attempt.answers.find(a => a.questionId === question._id);
            const grade = grades[question._id];

            return (
              <div
                key={question._id}
                className="glass rounded-xl p-6 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-neon-blue">Q{index + 1}</span>
                      <span className="px-2 py-1 bg-gray-700 rounded text-xs capitalize">
                        {question.type.replace('-', ' ')}
                      </span>
                      <span className="text-sm text-gray-400">
                        Max: {question.points} points
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{question.title}</h3>
                    {question.description && (
                      <p className="text-gray-400 text-sm mb-4">{question.description}</p>
                    )}
                  </div>
                </div>

                {/* Student's Answer */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Student's Answer:</h4>
                  <div className="bg-dark-800 rounded-lg p-4 border border-gray-700">
                    {userAnswer ? (
                      <QuestionRenderer
                        question={{
                          ...question,
                          id: question._id,
                        }}
                        currentAnswer={userAnswer.answer}
                        onChange={() => {}}
                        readOnly={true}
                      />
                    ) : (
                      <p className="text-gray-500 italic">No answer provided</p>
                    )}
                  </div>
                </div>

                {/* Grading Section */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-sm font-medium text-neon-blue mb-4">Grading:</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Score (out of {question.points})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={question.points}
                        value={grade?.score || 0}
                        onChange={(e) => updateGrade(question._id, { score: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Feedback
                      </label>
                      <textarea
                        value={grade?.feedback || ''}
                        onChange={(e) => updateGrade(question._id, { feedback: e.target.value })}
                        className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all min-h-[100px]"
                        placeholder="Provide feedback for the student..."
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => saveGrade(question._id)}
                      disabled={saving}
                      className="px-4 py-2 bg-neon-blue/20 border border-neon-blue text-neon-blue rounded-lg hover:bg-neon-blue/30 transition-all disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Grade'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit All Grades */}
        <div className="mt-12 text-center">
          <button
            onClick={saveAllGrades}
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-neon-green to-neon-blue text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving Grades...' : 'Save All Grades & Complete Grading'}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function GradingPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'proctor']}>
      <GradingContent />
    </RoleGuard>
  );
}
