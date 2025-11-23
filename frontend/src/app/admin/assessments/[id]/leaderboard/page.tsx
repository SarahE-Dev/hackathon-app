'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { RoleGuard } from '@/components/guards/RoleGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  score: number;
  maxScore: number;
  percentage: number;
  attemptId: string;
  submittedAt: string;
  timeTaken: number | null;
}

function LeaderboardContent() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [assessmentId]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLeaderboard, 15000); // Refresh every 15 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, assessmentId]);

  const fetchLeaderboard = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `${BACKEND_URL}/api/assessments/${assessmentId}/leaderboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 },
        }
      );

      setLeaderboard(response.data.data.leaderboard);
      setAssessmentTitle(response.data.data.assessmentTitle);
      setTotalParticipants(response.data.data.totalParticipants);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.response?.data?.message || 'Failed to load leaderboard');
      setLoading(false);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-500 to-yellow-600';
      case 2:
        return 'from-gray-400 to-gray-500';
      case 3:
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading leaderboard...</p>
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
              <h1 className="text-3xl font-bold text-gradient mb-2">Assessment Leaderboard</h1>
              <p className="text-gray-400">{assessmentTitle}</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4"
                />
                Auto-refresh
              </label>
              <button
                onClick={fetchLeaderboard}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
              >
                🔄 Refresh
              </button>
              <Link
                href={`/admin/assessments/${assessmentId}/grading`}
                className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-lg transition-all"
              >
                Grade Submissions
              </Link>
              <Link
                href="/admin/assessments"
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
              >
                ← Back
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-xl p-6 border-2 border-neon-blue/20 hover:border-neon-blue transition-all">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Participants</h3>
            <p className="text-4xl font-bold text-neon-blue">{totalParticipants}</p>
          </div>

          <div className="glass rounded-xl p-6 border-2 border-neon-green/20 hover:border-neon-green transition-all">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Submissions</h3>
            <p className="text-4xl font-bold text-neon-green">{leaderboard.length}</p>
          </div>

          <div className="glass rounded-xl p-6 border-2 border-neon-purple/20 hover:border-neon-purple transition-all">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Average Score</h3>
            <p className="text-4xl font-bold text-neon-purple">
              {leaderboard.length > 0
                ? Math.round(leaderboard.reduce((sum, e) => sum + e.percentage, 0) / leaderboard.length)
                : 0}
              %
            </p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 bg-dark-800">
            <h2 className="text-lg font-semibold text-white">Rankings</h2>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-50">📊</div>
              <p className="text-gray-400">No submissions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {/* Top 3 podium */}
              {leaderboard.length >= 3 && (
                <div className="p-8 bg-gradient-to-b from-dark-800 to-dark-900">
                  <div className="flex items-end justify-center gap-8 max-w-3xl mx-auto">
                    {/* Second place */}
                    <div className="flex-1 text-center">
                      <div className="glass rounded-2xl p-6 border-2 border-gray-400/50 mb-4 transform hover:scale-105 transition-all">
                        <div className="text-5xl mb-3">🥈</div>
                        <h3 className="text-xl font-bold text-gray-300 mb-1">
                          {leaderboard[1].firstName} {leaderboard[1].lastName}
                        </h3>
                        <p className="text-2xl font-bold text-gray-400 mb-2">
                          {leaderboard[1].score}/{leaderboard[1].maxScore}
                        </p>
                        <div className="text-sm text-gray-500">
                          {leaderboard[1].percentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="h-24 bg-gradient-to-t from-gray-400/20 to-gray-400/10 rounded-t-lg"></div>
                    </div>

                    {/* First place */}
                    <div className="flex-1 text-center">
                      <div className="glass rounded-2xl p-6 border-2 border-yellow-500/50 mb-4 transform hover:scale-105 transition-all glow-yellow">
                        <div className="text-6xl mb-3">🥇</div>
                        <h3 className="text-2xl font-bold text-yellow-400 mb-1">
                          {leaderboard[0].firstName} {leaderboard[0].lastName}
                        </h3>
                        <p className="text-3xl font-bold text-yellow-500 mb-2">
                          {leaderboard[0].score}/{leaderboard[0].maxScore}
                        </p>
                        <div className="text-sm text-gray-400">
                          {leaderboard[0].percentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="h-32 bg-gradient-to-t from-yellow-500/20 to-yellow-500/10 rounded-t-lg"></div>
                    </div>

                    {/* Third place */}
                    <div className="flex-1 text-center">
                      <div className="glass rounded-2xl p-6 border-2 border-orange-500/50 mb-4 transform hover:scale-105 transition-all">
                        <div className="text-5xl mb-3">🥉</div>
                        <h3 className="text-xl font-bold text-orange-300 mb-1">
                          {leaderboard[2].firstName} {leaderboard[2].lastName}
                        </h3>
                        <p className="text-2xl font-bold text-orange-400 mb-2">
                          {leaderboard[2].score}/{leaderboard[2].maxScore}
                        </p>
                        <div className="text-sm text-gray-500">
                          {leaderboard[2].percentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="h-20 bg-gradient-to-t from-orange-500/20 to-orange-500/10 rounded-t-lg"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Full leaderboard table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-800 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Time Taken
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {leaderboard.map((entry) => (
                      <tr
                        key={entry.userId}
                        className="hover:bg-dark-800 transition-all"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r ${getRankColor(entry.rank)} text-white font-bold text-sm`}>
                            {getRankIcon(entry.rank)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-white font-medium">
                              {entry.firstName} {entry.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{entry.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-white font-semibold">
                            {entry.score} / {entry.maxScore}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-dark-700 rounded-full h-2 w-24">
                              <div
                                className={`h-full rounded-full ${
                                  entry.percentage >= 90
                                    ? 'bg-green-500'
                                    : entry.percentage >= 70
                                    ? 'bg-blue-500'
                                    : entry.percentage >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${entry.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-white font-medium text-sm">
                              {entry.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                          {formatTime(entry.timeTaken)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                          {new Date(entry.submittedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/admin/assessments/${assessmentId}/grading?attemptId=${entry.attemptId}`}
                            className="px-3 py-1 bg-neon-blue hover:bg-neon-blue/80 text-white text-sm rounded transition-all"
                          >
                            View Submission
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AssessmentLeaderboardPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'proctor', 'judge']}>
      <LeaderboardContent />
    </RoleGuard>
  );
}
