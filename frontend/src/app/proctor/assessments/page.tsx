'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

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
  };
  status: string;
  startedAt: string;
  timeSpent: number;
  violations: {
    tabSwitch: number;
    copyPaste: number;
    fullscreenExit: number;
    total: number;
  };
}

interface ProctoringStats {
  activeAttempts: number;
  submittedAttempts: number;
  totalViolations: number;
  highRiskAttempts: number;
}

function AssessmentProctoringContent() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [stats, setStats] = useState<ProctoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAssessment, setFilterAssessment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAttempts();
    fetchStats();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchAttempts();
      fetchStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [filterAssessment, page]);

  const fetchAttempts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const params: any = { page, limit: 20 };
      if (filterAssessment) {
        params.assessmentId = filterAssessment;
      }

      const response = await axios.get(`${BACKEND_URL}/api/proctoring/attempts`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setAttempts(response.data.data.attempts);
      setTotalPages(response.data.data.pagination.pages);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching attempts:', err);
      setError(err.response?.data?.message || 'Failed to load attempts');
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get(`${BACKEND_URL}/api/proctoring/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const getRiskLevel = (violations: number) => {
    if (violations >= 10) return { level: 'critical', color: 'text-red-400 bg-red-500/20 border-red-500/50' };
    if (violations >= 5) return { level: 'high', color: 'text-orange-400 bg-orange-500/20 border-orange-500/50' };
    if (violations >= 2) return { level: 'medium', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50' };
    return { level: 'low', color: 'text-green-400 bg-green-500/20 border-green-500/50' };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const filteredAttempts = attempts.filter((attempt) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      attempt.userId.name.toLowerCase().includes(searchLower) ||
      attempt.userId.email.toLowerCase().includes(searchLower) ||
      attempt.assessmentId.title.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading proctoring dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Assessment Proctoring</h1>
              <p className="text-gray-400 mt-1">Monitor student assessments in real-time</p>
            </div>
            <Link
              href="/proctor"
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-dark-800 border border-green-500/30 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Active Attempts</div>
              <div className="text-3xl font-bold text-green-400 mt-1">{stats.activeAttempts}</div>
            </div>
            <div className="bg-dark-800 border border-blue-500/30 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Submitted</div>
              <div className="text-3xl font-bold text-blue-400 mt-1">{stats.submittedAttempts}</div>
            </div>
            <div className="bg-dark-800 border border-yellow-500/30 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Violations</div>
              <div className="text-3xl font-bold text-yellow-400 mt-1">{stats.totalViolations}</div>
            </div>
            <div className="bg-dark-800 border border-red-500/30 rounded-lg p-4">
              <div className="text-gray-400 text-sm">High Risk</div>
              <div className="text-3xl font-bold text-red-400 mt-1">{stats.highRiskAttempts}</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-dark-800 border border-gray-700 rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by student name, email, or assessment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
              />
            </div>
            <button
              onClick={() => {
                fetchAttempts();
                fetchStats();
              }}
              className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Attempts List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {filteredAttempts.length === 0 ? (
          <div className="bg-dark-800 border border-gray-700 rounded-lg p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <p className="text-gray-400 text-lg">No active attempts</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm ? 'Try adjusting your search' : 'Check back when students start assessments'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAttempts.map((attempt) => {
              const risk = getRiskLevel(attempt.violations.total);
              return (
                <div
                  key={attempt._id}
                  className="bg-dark-800 border border-gray-700 rounded-lg p-6 hover:border-neon-blue transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          {attempt.assessmentId.title}
                        </h3>
                        <span className={`px-3 py-1 text-xs font-medium border rounded-full ${risk.color}`}>
                          {risk.level.toUpperCase()} RISK
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-gray-400 text-sm">Student</p>
                          <p className="text-white font-medium">{attempt.userId.name}</p>
                          <p className="text-gray-500 text-sm">{attempt.userId.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Started</p>
                          <p className="text-white">{new Date(attempt.startedAt).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Time Spent</p>
                          <p className="text-white">{formatTime(attempt.timeSpent)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Violations:</span>
                          <span className="text-red-400 font-medium">{attempt.violations.total}</span>
                        </div>
                        <div className="text-gray-500">|</div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400">Tab: {attempt.violations.tabSwitch}</span>
                          <span className="text-gray-400">Copy/Paste: {attempt.violations.copyPaste}</span>
                          <span className="text-gray-400">Fullscreen: {attempt.violations.fullscreenExit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <Link
                        href={`/proctor/assessments/${attempt._id}`}
                        className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-blue/80 hover:to-neon-purple/80 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-neon-blue/50"
                      >
                        Monitor
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssessmentProctoring() {
  return (
    <RoleGuard allowedRoles={['proctor', 'admin', 'judge']}>
      <AssessmentProctoringContent />
    </RoleGuard>
  );
}
