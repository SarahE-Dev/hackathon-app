'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  submittedAt: string;
  timeSpent: number;
  gradeStatus: 'pending' | 'draft' | 'submitted' | 'released';
  gradeId?: string;
}

interface GradingStats {
  totalSubmitted: number;
  pending: number;
  draft: number;
  submitted: number;
  released: number;
  gradingProgress: number;
}

export default function GradingDashboard() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [stats, setStats] = useState<GradingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAttempts();
    fetchStats();
  }, [filterStatus, page]);

  const fetchAttempts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const params: any = { page, limit: 20 };
      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const response = await axios.get(`${BACKEND_URL}/api/grades/ungraded`, {
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

      const response = await axios.get(`${BACKEND_URL}/api/grades/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      draft: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      submitted: 'bg-green-500/20 text-green-400 border-green-500/50',
      released: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    };
    return badges[status as keyof typeof badges] || badges.pending;
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
          <p className="text-gray-400">Loading grading dashboard...</p>
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
              <h1 className="text-3xl font-bold">Assessment Grading</h1>
              <p className="text-gray-400 mt-1">Review and grade student submissions</p>
            </div>
            <Link
              href="/judge"
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Submitted</div>
              <div className="text-3xl font-bold text-white mt-1">{stats.totalSubmitted}</div>
            </div>
            <div className="bg-dark-800 border border-yellow-500/30 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Pending</div>
              <div className="text-3xl font-bold text-yellow-400 mt-1">{stats.pending}</div>
            </div>
            <div className="bg-dark-800 border border-blue-500/30 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Draft</div>
              <div className="text-3xl font-bold text-blue-400 mt-1">{stats.draft}</div>
            </div>
            <div className="bg-dark-800 border border-green-500/30 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Graded</div>
              <div className="text-3xl font-bold text-green-400 mt-1">{stats.submitted}</div>
            </div>
            <div className="bg-dark-800 border border-purple-500/30 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Released</div>
              <div className="text-3xl font-bold text-purple-400 mt-1">{stats.released}</div>
            </div>
          </div>
          <div className="mt-4 bg-dark-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Grading Progress</span>
              <span className="text-white font-medium">{stats.gradingProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-neon-blue to-neon-purple h-2 rounded-full transition-all"
                style={{ width: `${stats.gradingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-dark-800 border border-gray-700 rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by student name, email, or assessment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
              />
            </div>

            {/* Status Filter */}
            <div className="md:w-48">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="released">Released</option>
              </select>
            </div>
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-400 text-lg">No submissions found</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm ? 'Try adjusting your search' : 'Check back later for new submissions'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAttempts.map((attempt) => (
              <div
                key={attempt._id}
                className="bg-dark-800 border border-gray-700 rounded-lg p-6 hover:border-neon-blue transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white group-hover:text-neon-blue transition-colors">
                        {attempt.assessmentId.title}
                      </h3>
                      <span
                        className={`px-3 py-1 text-xs font-medium border rounded-full ${getStatusBadge(
                          attempt.gradeStatus
                        )}`}
                      >
                        {attempt.gradeStatus.charAt(0).toUpperCase() +
                          attempt.gradeStatus.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-gray-400 text-sm">Student</p>
                        <p className="text-white font-medium">{attempt.userId.name}</p>
                        <p className="text-gray-500 text-sm">{attempt.userId.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Submitted</p>
                        <p className="text-white">{formatDate(attempt.submittedAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Time Spent</p>
                        <p className="text-white">{formatTime(attempt.timeSpent)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Link
                      href={`/judge/grading/${attempt._id}`}
                      className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-blue/80 hover:to-neon-purple/80 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-neon-blue/50"
                    >
                      {attempt.gradeStatus === 'pending'
                        ? 'Start Grading'
                        : attempt.gradeStatus === 'draft'
                        ? 'Continue Grading'
                        : 'View Grade'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
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
