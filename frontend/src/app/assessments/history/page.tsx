'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Attempt {
  _id: string;
  assessmentId: {
    _id: string;
    title: string;
    description: string;
    totalPoints: number;
  };
  status: 'in-progress' | 'submitted' | 'graded';
  startedAt: string;
  submittedAt?: string;
  grade?: {
    totalScore: number;
    maxScore: number;
    status: string;
    feedback?: string;
  };
}

interface AttemptStats {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  highestScore: number;
  totalTimeSpent: number;
}

export default function AssessmentHistoryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [stats, setStats] = useState<AttemptStats>({
    totalAttempts: 0,
    completedAttempts: 0,
    averageScore: 0,
    highestScore: 0,
    totalTimeSpent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'submitted' | 'graded'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    fetchAttempts();
  }, [isAuthenticated]);

  const fetchAttempts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${BACKEND_URL}/api/attempts/my-attempts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const attemptsData = response.data.data || [];
      setAttempts(attemptsData);
      calculateStats(attemptsData);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching attempts:', err);
      setError(err.response?.data?.message || 'Failed to load assessment history');
      setLoading(false);
    }
  };

  const calculateStats = (attemptsData: Attempt[]) => {
    const completed = attemptsData.filter((a) => a.status === 'submitted' || a.status === 'graded');
    const graded = attemptsData.filter((a) => a.status === 'graded' && a.grade);

    const scores = graded.map((a) => {
      if (a.grade && a.grade.maxScore > 0) {
        return (a.grade.totalScore / a.grade.maxScore) * 100;
      }
      return 0;
    });

    const totalTimeSpent = completed.reduce((sum, attempt) => {
      if (attempt.submittedAt && attempt.startedAt) {
        const timeSpent =
          (new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000;
        return sum + timeSpent;
      }
      return sum;
    }, 0);

    setStats({
      totalAttempts: attemptsData.length,
      completedAttempts: completed.length,
      averageScore: scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      totalTimeSpent: Math.round(totalTimeSpent),
    });
  };

  const filteredAttempts = attempts.filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
      case 'submitted':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
      case 'graded':
        return 'bg-green-500/20 text-green-400 border border-green-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 70) return 'text-blue-400';
    if (percentage >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTimeTaken = (startedAt: string, submittedAt?: string) => {
    if (!submittedAt) return 'In progress';
    const timeSpent =
      (new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000;
    return formatTime(Math.round(timeSpent));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your assessment history...</p>
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
              <h1 className="text-3xl font-bold text-gradient mb-2">My Assessment History</h1>
              <p className="text-gray-400">Track your progress and performance</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/assessments"
                className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90 transition-all"
              >
                Browse Assessments
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-xl p-6 border-2 border-neon-blue/20 hover:border-neon-blue transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Total Attempts</h3>
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-4xl font-bold text-neon-blue">{stats.totalAttempts}</p>
            <p className="text-xs text-gray-500 mt-2">
              {stats.completedAttempts} completed
            </p>
          </div>

          <div className="glass rounded-xl p-6 border-2 border-neon-green/20 hover:border-neon-green transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Average Score</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-4xl font-bold text-neon-green">
              {stats.averageScore.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-2">Across all graded assessments</p>
          </div>

          <div className="glass rounded-xl p-6 border-2 border-neon-purple/20 hover:border-neon-purple transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Highest Score</h3>
              <span className="text-2xl">🏆</span>
            </div>
            <p className="text-4xl font-bold text-neon-purple">
              {stats.highestScore.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-2">Personal best</p>
          </div>

          <div className="glass rounded-xl p-6 border-2 border-neon-pink/20 hover:border-neon-pink transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Time Spent</h3>
              <span className="text-2xl">⏱️</span>
            </div>
            <p className="text-4xl font-bold text-neon-pink">
              {formatTime(stats.totalTimeSpent)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Total assessment time</p>
          </div>
        </div>

        {/* Performance Chart */}
        {attempts.filter((a) => a.status === 'graded' && a.grade).length > 0 && (
          <div className="glass rounded-xl p-6 border border-gray-800 mb-8">
            <h2 className="text-xl font-semibold mb-4">Performance Trend</h2>
            <div className="h-64 flex items-end justify-between gap-2">
              {attempts
                .filter((a) => a.status === 'graded' && a.grade)
                .slice(0, 10)
                .reverse()
                .map((attempt, index) => {
                  const percentage =
                    attempt.grade && attempt.grade.maxScore > 0
                      ? (attempt.grade.totalScore / attempt.grade.maxScore) * 100
                      : 0;
                  return (
                    <div
                      key={attempt._id}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div
                        className="w-full bg-gradient-to-t from-neon-blue to-neon-purple rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                        style={{ height: `${percentage}%` }}
                        title={`${attempt.assessmentId.title}: ${percentage.toFixed(1)}%`}
                      ></div>
                      <div className="text-xs text-gray-500 mt-2 rotate-45 origin-top-left">
                        {index + 1}
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="mt-4 text-sm text-gray-500 text-center">
              Recent assessments (most recent on right)
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {[
            { key: 'all', label: 'All', count: attempts.length },
            {
              key: 'in-progress',
              label: 'In Progress',
              count: attempts.filter((a) => a.status === 'in-progress').length,
            },
            {
              key: 'submitted',
              label: 'Submitted',
              count: attempts.filter((a) => a.status === 'submitted').length,
            },
            {
              key: 'graded',
              label: 'Graded',
              count: attempts.filter((a) => a.status === 'graded').length,
            },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-neon-blue text-white'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600 border border-gray-600'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Attempts List */}
        <div className="glass rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 bg-dark-800">
            <h2 className="text-lg font-semibold text-white">Assessment Attempts</h2>
          </div>

          {filteredAttempts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-50">📋</div>
              <p className="text-gray-400 mb-4">
                {filter === 'all'
                  ? 'No assessment attempts yet'
                  : `No ${filter} attempts`}
              </p>
              <Link
                href="/assessments"
                className="inline-block px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90 transition-all"
              >
                Start an Assessment
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredAttempts.map((attempt) => {
                const percentage =
                  attempt.grade && attempt.grade.maxScore > 0
                    ? (attempt.grade.totalScore / attempt.grade.maxScore) * 100
                    : 0;

                return (
                  <div
                    key={attempt._id}
                    className="p-6 hover:bg-dark-800 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-white">
                            {attempt.assessmentId.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              attempt.status
                            )}`}
                          >
                            {attempt.status}
                          </span>
                        </div>

                        {attempt.assessmentId.description && (
                          <p className="text-gray-400 text-sm mb-3">
                            {attempt.assessmentId.description}
                          </p>
                        )}

                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span>
                            Started: {new Date(attempt.startedAt).toLocaleDateString()}
                          </span>
                          {attempt.submittedAt && (
                            <span>
                              Submitted: {new Date(attempt.submittedAt).toLocaleDateString()}
                            </span>
                          )}
                          <span>Time: {formatTimeTaken(attempt.startedAt, attempt.submittedAt)}</span>
                        </div>

                        {attempt.status === 'graded' && attempt.grade && (
                          <div className="mt-4 flex items-center gap-6">
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Score</div>
                              <div className={`text-2xl font-bold ${getScoreColor(percentage)}`}>
                                {attempt.grade.totalScore} / {attempt.grade.maxScore}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Percentage</div>
                              <div className={`text-2xl font-bold ${getScoreColor(percentage)}`}>
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-gray-400 mb-1">Performance</div>
                              <div className="bg-dark-700 rounded-full h-3 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    percentage >= 90
                                      ? 'bg-green-500'
                                      : percentage >= 70
                                      ? 'bg-blue-500'
                                      : percentage >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}

                        {attempt.grade?.feedback && (
                          <div className="mt-3 p-3 bg-dark-700 rounded-lg border border-gray-600">
                            <div className="text-xs text-gray-400 mb-1">Feedback</div>
                            <p className="text-sm text-gray-300">{attempt.grade.feedback}</p>
                          </div>
                        )}
                      </div>

                      <div className="ml-6 flex flex-col gap-2">
                        {attempt.status === 'in-progress' && (
                          <Link
                            href={`/assessment/${attempt._id}`}
                            className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white rounded text-sm transition-all text-center"
                          >
                            Continue
                          </Link>
                        )}
                        {(attempt.status === 'submitted' || attempt.status === 'graded') && (
                          <Link
                            href={`/assessment/${attempt._id}/results`}
                            className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded text-sm transition-all text-center"
                          >
                            View Results
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
