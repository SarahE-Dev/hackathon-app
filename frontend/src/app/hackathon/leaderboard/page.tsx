'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { teamSubmissionsAPI, hackathonSessionsAPI } from '@/lib/api';

interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  memberCount: number;
  totalSubmissions: number;
  reviewedSubmissions: number;
  totalJudgePoints: number;
  maxPossiblePoints: number;
  avgJudgeScore: number | null;
  passedTests: number;
  totalTests: number;
  passRate: number;
}

interface Session {
  _id: string;
  title: string;
  status: string;
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await hackathonSessionsAPI.getAllSessions();
        const activeSessions = response.data.sessions.filter(
          (s: Session) => s.status === 'active' || s.status === 'completed'
        );
        setSessions(activeSessions);
        
        if (activeSessions.length > 0) {
          setSelectedSession(activeSessions[0]._id);
        } else {
          // No active sessions, stop loading
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
        setLoading(false);
      }
    };
    loadSessions();
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!selectedSession) return;
      
      setLoading(true);
      try {
        const response = await teamSubmissionsAPI.getHackathonLeaderboard(selectedSession);
        setLeaderboard(response.data.leaderboard);
        setSessionTitle(response.data.sessionTitle);
        
        // Find user's team from localStorage
        const storedTeamId = localStorage.getItem('myTeamId');
        if (storedTeamId) {
          setMyTeamId(storedTeamId);
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadLeaderboard();
  }, [selectedSession]);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/30 to-yellow-600/10 border-yellow-500/50';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/30 to-gray-500/10 border-gray-400/50';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/30 to-amber-700/10 border-amber-600/50';
    return 'bg-dark-800/50 border-gray-700';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">🏆 Hackathon Leaderboard</h1>
          <p className="text-gray-400">Rankings based on judge-reviewed submissions</p>
        </div>

        {/* Session Selector */}
        {sessions.length > 1 && (
          <div className="mb-6">
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-neon-purple"
            >
              {sessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-purple"></div>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl mb-2">No submissions yet</p>
            <p>Teams will appear here once they submit solutions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry) => (
              <div
                key={entry.teamId}
                className={`p-4 rounded-xl border transition-all ${getRankStyle(entry.rank)} ${
                  entry.teamId === myTeamId ? 'ring-2 ring-neon-purple' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-16 text-center">
                    <div className={`text-3xl ${entry.rank <= 3 ? '' : 'text-gray-500 font-bold'}`}>
                      {getRankIcon(entry.rank)}
                    </div>
                  </div>

                  {/* Team Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{entry.teamName}</h3>
                      {entry.teamId === myTeamId && (
                        <span className="px-2 py-0.5 text-xs bg-neon-purple/20 text-neon-purple rounded-full">
                          Your Team
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {entry.memberCount} member{entry.memberCount !== 1 ? 's' : ''} • {entry.totalSubmissions} submission{entry.totalSubmissions !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    {/* Test Pass Rate */}
                    <div className="text-center">
                      <div className="text-sm text-gray-400">Tests</div>
                      <div className={`text-lg font-bold ${
                        entry.passRate >= 80 ? 'text-green-400' :
                        entry.passRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {entry.passRate}%
                      </div>
                    </div>

                    {/* Avg Judge Score */}
                    <div className="text-center">
                      <div className="text-sm text-gray-400">Avg Score</div>
                      <div className={`text-lg font-bold ${
                        entry.avgJudgeScore === null ? 'text-gray-500' :
                        entry.avgJudgeScore >= 75 ? 'text-green-400' :
                        entry.avgJudgeScore >= 50 ? 'text-yellow-400' : 'text-orange-400'
                      }`}>
                        {entry.avgJudgeScore !== null ? `${entry.avgJudgeScore}%` : '-'}
                      </div>
                    </div>

                    {/* Reviewed */}
                    <div className="text-center">
                      <div className="text-sm text-gray-400">Reviewed</div>
                      <div className="text-lg font-bold text-gray-300">
                        {entry.reviewedSubmissions}/{entry.totalSubmissions}
                      </div>
                    </div>

                    {/* Total Points */}
                    <div className="text-center min-w-[100px]">
                      <div className="text-sm text-gray-400">Points</div>
                      <div className="text-2xl font-bold text-neon-green">
                        {entry.totalJudgePoints}
                        <span className="text-sm text-gray-500">/{entry.maxPossiblePoints}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 bg-dark-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-purple to-neon-blue transition-all"
                    style={{ 
                      width: entry.maxPossiblePoints > 0 
                        ? `${(entry.totalJudgePoints / entry.maxPossiblePoints) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 p-4 bg-dark-800/50 rounded-lg border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-2">📊 How Points Work</h3>
          <p className="text-sm text-gray-500">
            Each problem has a max point value. Judges score submissions using a rubric (Correctness 40%, 
            Code Quality 20%, Efficiency 20%, Explanation 20%). Your final points = Judge Score % × Problem Points.
          </p>
        </div>
      </div>
    </div>
  );
}

