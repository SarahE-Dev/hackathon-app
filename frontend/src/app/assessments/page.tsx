'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { assessmentsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Assessment {
  id: string;
  title: string;
  description?: string;
  settings?: {
    timeLimit?: number;
  };
  questions?: any[];
  totalPoints: number;
  status: string;
  createdAt: string;
}

interface Attempt {
  id: string;
  assessmentId: string;
  status: 'in_progress' | 'submitted' | 'graded';
  score?: number;
  startedAt: string;
  submittedAt?: string;
}

export default function AssessmentsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<Map<string, Attempt>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Check authentication from localStorage
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/auth/login');
        return;
      }
      try {
        // Fetch assessments
        const assessmentsData = await assessmentsAPI.getAll();
        const assessmentsList = assessmentsData.data?.assessments || [];
        const normalizedAssessments: Assessment[] = (Array.isArray(assessmentsList) ? assessmentsList : []).map((assessment: any) => ({
          ...assessment,
          id: assessment.id || assessment._id,
        }));
        setAssessments(normalizedAssessments);

        // Fetch user's attempts
        const attemptsData = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/attempts/my-attempts`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }).then(r => r.json());

        const attemptsMap = new Map<string, Attempt>();
        if (attemptsData.data && Array.isArray(attemptsData.data)) {
          attemptsData.data.forEach((attempt: any) => {
            const assessmentId = typeof attempt.assessmentId === 'string'
              ? attempt.assessmentId
              : attempt.assessmentId?.id || attempt.assessmentId?._id;

            if (!assessmentId) return;

            const normalizedAttempt: Attempt = {
              id: attempt.id || attempt._id,
              assessmentId,
              status: attempt.status as Attempt['status'],
              score: attempt.score,
              startedAt: attempt.startedAt,
              submittedAt: attempt.submittedAt,
            };

            attemptsMap.set(assessmentId, normalizedAttempt);
          });
        }
        setAttempts(attemptsMap);
      } catch (err: any) {
        console.error('Error loading assessments:', err);
        setError('Failed to load assessments');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
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
              <h1 className="text-3xl font-bold text-gradient">Assessments</h1>
              <p className="text-gray-400 mt-1">Take coding tests and technical interviews</p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {assessments.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-2">No Assessments Available</h2>
            <p className="text-gray-400">Check back later for new assessments</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assessments.map((assessment) => {
              const assessmentId = assessment.id;
              const attempt = assessmentId ? attempts.get(assessmentId) : undefined;
              
              return (
                <div
                  key={assessmentId}
                  className="glass rounded-xl p-6 border border-gray-700 hover:border-neon-blue/50 transition-all"
                >
                  {/* Status Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{assessment.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {assessment.description || 'No description available'}
                      </p>
                    </div>
                    {attempt && (
                      <span
                        className={`ml-2 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          attempt.status === 'graded'
                            ? 'bg-green-500/20 text-green-400'
                            : attempt.status === 'submitted'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {attempt.status === 'graded'
                          ? 'Graded'
                          : attempt.status === 'submitted'
                          ? 'Submitted'
                          : 'In Progress'}
                      </span>
                    )}
                  </div>

                  {/* Assessment Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Questions:</span>
                      <span className="text-white font-medium">
                        {assessment.questions?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Time Limit:</span>
                      <span className="text-white font-medium">
                        {assessment.settings?.timeLimit || 'No'} minutes
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Total Points:</span>
                      <span className="text-white font-medium">{assessment.totalPoints}</span>
                    </div>
                    {attempt?.score !== undefined && (
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
                        <span className="text-gray-400">Your Score:</span>
                        <span className="text-neon-green font-bold">{attempt.score}%</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                      {!attempt && assessmentId && (
                        <button
                          onClick={async () => {
                            try {
                              // Create a new attempt - sessionId is optional
                              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/attempts/start`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                                },
                                body: JSON.stringify({
                                  assessmentId,
                                  // sessionId is optional - not required for direct assessment attempts
                                }),
                              });

                              if (!response.ok) {
                                const errorData = await response.json();
                                console.error('Start assessment error:', errorData);
                                alert('Failed to start assessment: ' + (errorData.error?.message || errorData.message || `HTTP ${response.status}`));
                                return;
                              }

                              const data = await response.json();
                              console.log('Start assessment response:', data);

                              if (data.success && data.data) {
                                const attemptId = data.data.id || data.data.attempt?._id || data.data.attempt?.id;
                                if (attemptId) {
                                  router.push(`/assessment/${attemptId}`);
                                } else {
                                  console.error('No attempt ID in response:', data);
                                  alert('Failed to start assessment: missing attempt ID in response');
                                }
                              } else {
                                alert('Failed to start assessment: ' + (data.error?.message || data.message || 'Unknown error'));
                              }
                            } catch (error: any) {
                              console.error('Error starting assessment:', error);
                              alert('Failed to start assessment: ' + (error.message || 'Network error'));
                            }
                          }}
                          className="w-full py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:opacity-90 transition-all"
                        >
                          Start Assessment
                        </button>
                      )}

                    {attempt?.status === 'in_progress' && (
                      <Link href={`/assessment/${attempt.id}`}>
                        <button className="w-full py-3 bg-gradient-to-r from-neon-yellow to-neon-orange text-white font-semibold rounded-lg hover:opacity-90 transition-all">
                          Continue Assessment
                        </button>
                      </Link>
                    )}

                    {attempt?.status === 'submitted' && (
                      <div className="w-full py-3 bg-gray-700 text-gray-300 font-semibold rounded-lg text-center">
                        Awaiting Grading
                      </div>
                    )}

                    {attempt?.status === 'graded' && (
                      <Link href={`/assessment/${attempt.id}/results`}>
                        <button className="w-full py-3 bg-gradient-to-r from-neon-green to-neon-blue text-white font-semibold rounded-lg hover:opacity-90 transition-all">
                          View Results
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

