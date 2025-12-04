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

  // Split into ranked (has judge points) and not yet ranked
  const rankedTeams = leaderboard
    .filter(t => t.reviewedSubmissions > 0 && t.totalJudgePoints > 0)
    .sort((a, b) => b.totalJudgePoints - a.totalJudgePoints)
    .map((t, idx) => ({ ...t, rank: idx + 1 }));
  
  const pendingReviewTeams = leaderboard.filter(
    t => t.totalSubmissions > 0 && (t.reviewedSubmissions === 0 || t.totalJudgePoints === 0)
  );
  
  const noSubmissionsTeams = leaderboard.filter(t => t.totalSubmissions === 0);

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
          <Link 
            href={user?.roles?.some(r => r.role === 'judge') ? '/judge' : '/dashboard'} 
            className="text-gray-400 hover:text-white text-sm mb-4 inline-block"
          >
            ← Back to {user?.roles?.some(r => r.role === 'judge') ? 'Judge Dashboard' : 'Dashboard'}
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
            <p className="text-xl mb-2">No teams yet</p>
            <p>Teams will appear here once they're added to the session</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Main Leaderboard - Ranked Teams */}
            {rankedTeams.length > 0 ? (
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>🏅</span> Rankings
                </h2>
                <div className="space-y-3">
                  {rankedTeams.map((entry) => (
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
                            {entry.memberCount} member{entry.memberCount !== 1 ? 's' : ''} • {entry.reviewedSubmissions} reviewed
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6">
                          {/* Test Pass Rate */}
                          <div className="text-center hidden sm:block">
                            <div className="text-sm text-gray-400">Tests</div>
                            <div className={`text-lg font-bold ${
                              entry.passRate >= 80 ? 'text-green-400' :
                              entry.passRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {entry.passRate}%
                            </div>
                          </div>

                          {/* Avg Judge Score */}
                          <div className="text-center hidden md:block">
                            <div className="text-sm text-gray-400">Avg Score</div>
                            <div className={`text-lg font-bold ${
                              entry.avgJudgeScore === null ? 'text-gray-500' :
                              entry.avgJudgeScore >= 75 ? 'text-green-400' :
                              entry.avgJudgeScore >= 50 ? 'text-yellow-400' : 'text-orange-400'
                            }`}>
                              {entry.avgJudgeScore !== null ? `${entry.avgJudgeScore}%` : '-'}
                            </div>
                          </div>

                          {/* Total Points */}
                          <div className="text-center min-w-[100px]">
                            <div className="text-sm text-gray-400">Points</div>
                            <div className="text-2xl font-bold text-neon-green">
                              {Math.round(entry.totalJudgePoints)}
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
              </div>
            ) : (
              <div className="text-center py-12 glass rounded-xl border border-gray-700">
                <div className="text-5xl mb-4">🏆</div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">No Rankings Yet</h3>
                <p className="text-gray-500">Teams will appear here once judges review their submissions</p>
              </div>
            )}

            {/* Pending Review Section */}
            {pendingReviewTeams.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-400 mb-3 flex items-center gap-2">
                  <span>⏳</span> Awaiting Review ({pendingReviewTeams.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendingReviewTeams.map((entry) => (
                    <div
                      key={entry.teamId}
                      className={`p-4 rounded-xl bg-dark-800/30 border border-gray-700 ${
                        entry.teamId === myTeamId ? 'ring-2 ring-neon-purple' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white">{entry.teamName}</h3>
                        {entry.teamId === myTeamId && (
                          <span className="px-2 py-0.5 text-xs bg-neon-purple/20 text-neon-purple rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {entry.totalSubmissions} submission{entry.totalSubmissions !== 1 ? 's' : ''} • {entry.passRate}% tests passed
                      </p>
                      <div className="mt-2 text-xs text-yellow-400">
                        ⏳ Waiting for judge review...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Submissions Section */}
            {noSubmissionsTeams.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-500 mb-3 flex items-center gap-2">
                  <span>📭</span> No Submissions Yet ({noSubmissionsTeams.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {noSubmissionsTeams.map((entry) => (
                    <div
                      key={entry.teamId}
                      className={`px-4 py-2 rounded-lg bg-dark-800/20 border border-gray-800 text-gray-500 ${
                        entry.teamId === myTeamId ? 'ring-2 ring-neon-purple' : ''
                      }`}
                    >
                      {entry.teamName}
                      {entry.teamId === myTeamId && (
                        <span className="ml-2 text-xs text-neon-purple">(You)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 p-4 bg-dark-800/50 rounded-lg border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-2">📊 How Points Work</h3>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• <strong className="text-gray-400">Easy problems:</strong> 100 pts max</li>
            <li>• <strong className="text-gray-400">Medium problems:</strong> 200 pts max</li>
            <li>• <strong className="text-gray-400">Hard problems:</strong> 300 pts max</li>
            <li>• Judges score using a rubric (Correctness 40%, Code Quality 20%, Efficiency 20%, Explanation 20%)</li>
            <li>• Your points = Judge Score % × Problem Max Points</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
