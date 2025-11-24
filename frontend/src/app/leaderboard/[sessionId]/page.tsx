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

  const isAdminOrProctor = hasRole('admin') || hasRole('proctor');

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
        return 'text-neon-yellow font-bold text-2xl';
      case 2:
        return 'text-gray-300 font-bold text-xl';
      case 3:
        return 'text-neon-orange font-bold text-xl';
      default:
        return 'text-gray-400 font-medium';
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-neon-yellow/10 border-neon-yellow/50';
      case 2:
        return 'bg-gray-500/10 border-gray-500/50';
      case 3:
        return 'bg-neon-orange/10 border-neon-orange/50';
      default:
        return 'bg-dark-800 border-gray-700';
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
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neon-pink mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white p-6">
      {/* Animated background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-neon-blue/10 blur-3xl animate-float"></div>
        <div className="absolute top-[60%] right-[10%] h-[420px] w-[420px] rounded-full bg-neon-purple/10 blur-3xl animate-float" style={{ animationDelay: '0.8s' }}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            <div className="text-6xl">🏆</div>
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">{session?.title}</h1>
          <p className="text-gray-400 mb-4">{session?.description}</p>
          <div className="flex justify-center items-center gap-4">
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium border ${
                session?.status === 'active'
                  ? 'bg-neon-green/20 text-neon-green border-neon-green/50'
                  : session?.status === 'completed'
                  ? 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                  : 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/50'
              }`}
            >
              {session?.status}
            </span>
            <span className="text-sm text-gray-400">
              {leaderboard.length} team{leaderboard.length !== 1 ? 's' : ''} competing
            </span>
          </div>
        </div>

        {/* Controls */}
        {isAdminOrProctor && (
          <div className="mb-6 glass rounded-xl p-4 flex justify-between items-center border border-gray-800">
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 text-neon-blue focus:ring-neon-blue border-gray-600 rounded bg-dark-700"
                />
                <span className="ml-2 text-sm text-gray-300">Auto-refresh (10s)</span>
              </label>
              <button
                onClick={loadLeaderboard}
                className="text-sm text-neon-blue hover:text-neon-blue/80 transition-colors"
              >
                Refresh Now
              </button>
            </div>
            <button
              onClick={() => setRevealed(!revealed)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                revealed
                  ? 'bg-dark-700 text-white hover:bg-dark-600 border border-gray-600'
                  : 'bg-gradient-to-r from-neon-blue to-neon-purple text-white hover:opacity-90'
              }`}
            >
              {revealed ? 'Hide Details' : 'Reveal Details'}
            </button>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center border border-gray-800">
            <p className="text-gray-400">No teams have started yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry) => (
              <div
                key={entry.teamId}
                className={`${getRankBg(
                  entry.rank
                )} border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.01] glass`}
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
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {entry.teamName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>
                            {entry.problemsSolved} / {entry.totalProblems} problems
                          </span>
                          {revealed && entry.submittedAt && (
                            <span>
                              Submitted: {new Date(entry.submittedAt).toLocaleTimeString()}
                            </span>
                          )}
                          {revealed && entry.incidentCount > 0 && (
                            <span className="text-neon-pink">
                              ⚠️ {entry.incidentCount} incidents
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gradient">{entry.totalScore}</div>
                      <div className="text-sm text-gray-400">
                        {getScorePercentage(entry.totalScore, entry.maxScore)}% ({entry.maxScore}{' '}
                        max)
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-dark-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          entry.rank === 1
                            ? 'bg-gradient-to-r from-neon-yellow to-neon-orange'
                            : entry.rank === 2
                            ? 'bg-gray-400'
                            : entry.rank === 3
                            ? 'bg-neon-orange'
                            : 'bg-gradient-to-r from-neon-blue to-neon-purple'
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
            className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg border border-gray-600 transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
