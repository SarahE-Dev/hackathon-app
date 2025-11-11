'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { hackathonSessionsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  totalScore: number;
  maxScore: number;
  problemsSolved: number;
  totalProblems: number;
  submittedAt?: string;
  incidentCount: number;
}

interface SessionData {
  _id: string;
  title: string;
  description: string;
  status: string;
  duration: number;
}

export default function LeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { isAuthenticated, hasRole } = useAuthStore();
  const [session, setSession] = useState<SessionData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const isAdminOrProctor = hasRole('Admin') || hasRole('Proctor');

  useEffect(() => {
    if (isAuthenticated) {
      loadLeaderboard();
    }
  }, [isAuthenticated, sessionId]);

  useEffect(() => {
    if (autoRefresh && isAuthenticated) {
      const interval = setInterval(loadLeaderboard, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isAuthenticated, sessionId]);

  const loadLeaderboard = async () => {
    try {
      const [sessionResponse, leaderboardResponse] = await Promise.all([
        hackathonSessionsAPI.getById(sessionId),
        hackathonSessionsAPI.getLeaderboard(sessionId),
      ]);

      setSession(sessionResponse.data.session);
      setLeaderboard(leaderboardResponse.data.leaderboard);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load leaderboard');
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-600 font-bold text-2xl';
      case 2:
        return 'text-gray-400 font-bold text-xl';
      case 3:
        return 'text-orange-600 font-bold text-xl';
      default:
        return 'text-gray-700 font-medium';
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-300';
      case 3:
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getScorePercentage = (score: number, maxScore: number) => {
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  };

  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            <div className="text-6xl">🏆</div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{session?.title}</h1>
          <p className="text-gray-600 mb-4">{session?.description}</p>
          <div className="flex justify-center items-center gap-4">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                session?.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : session?.status === 'completed'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {session?.status}
            </span>
            <span className="text-sm text-gray-600">
              {leaderboard.length} team{leaderboard.length !== 1 ? 's' : ''} competing
            </span>
          </div>
        </div>

        {/* Controls */}
        {isAdminOrProctor && (
          <div className="mb-6 bg-white rounded-lg shadow p-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Auto-refresh (10s)</span>
              </label>
              <button
                onClick={loadLeaderboard}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Refresh Now
              </button>
            </div>
            <button
              onClick={() => setRevealed(!revealed)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                revealed
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {revealed ? 'Hide Details' : 'Reveal Details'}
            </button>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No teams have started yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry) => (
              <div
                key={entry.teamId}
                className={`${getRankBg(
                  entry.rank
                )} border-2 rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    {/* Rank and Team Info */}
                    <div className="flex items-center gap-6 flex-1">
                      <div className={`w-12 text-center ${getRankColor(entry.rank)}`}>
                        {entry.rank <= 3 ? (
                          <span className="text-3xl">
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <span className="text-2xl">#{entry.rank}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {entry.teamName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            {entry.problemsSolved} / {entry.totalProblems} problems
                          </span>
                          {revealed && entry.submittedAt && (
                            <span>
                              Submitted: {new Date(entry.submittedAt).toLocaleTimeString()}
                            </span>
                          )}
                          {revealed && entry.incidentCount > 0 && (
                            <span className="text-red-600">
                              ⚠️ {entry.incidentCount} incidents
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">{entry.totalScore}</div>
                      <div className="text-sm text-gray-600">
                        {getScorePercentage(entry.totalScore, entry.maxScore)}% ({entry.maxScore}{' '}
                        max)
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          entry.rank === 1
                            ? 'bg-yellow-500'
                            : entry.rank === 2
                            ? 'bg-gray-400'
                            : entry.rank === 3
                            ? 'bg-orange-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{
                          width: `${getScorePercentage(entry.totalScore, entry.maxScore)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 shadow"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
