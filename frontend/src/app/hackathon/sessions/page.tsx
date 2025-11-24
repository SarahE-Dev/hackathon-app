'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hackathonSessionsAPI, teamsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface Problem {
  _id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  tags: string[];
  acceptanceRate?: number;
  solved?: boolean;
}

interface HackathonSession {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  teams: any[];
  problems: Problem[];
  participantCount?: number;
  liveParticipantCount?: number;
}

export default function HackathonSessionsListPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [sessions, setSessions] = useState<HackathonSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<HackathonSession[]>([]);
  const [userTeam, setUserTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard' | 'expert'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'active' | 'paused' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    loadData();
  }, [isAuthenticated, router]);

  useEffect(() => {
    filterSessions();
  }, [sessions, difficultyFilter, statusFilter, searchQuery]);

  const filterSessions = () => {
    let filtered = sessions;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(session => session.status === statusFilter);
    }

    // Filter by difficulty (check if session has problems of this difficulty)
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(session =>
        session.problems.some(problem => problem.difficulty === difficultyFilter)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session =>
        session.title.toLowerCase().includes(query) ||
        session.description.toLowerCase().includes(query) ||
        session.problems.some(problem =>
          problem.title.toLowerCase().includes(query) ||
          problem.tags.some(tag => tag.toLowerCase().includes(query))
        )
      );
    }

    setFilteredSessions(filtered);
  };

  const loadData = async () => {
    try {
      // Load sessions
      const sessionsResponse = await hackathonSessionsAPI.getAll();
      const sessionsData = sessionsResponse.data.sessions || [];

      // Enhance sessions with mock data for better demo
      const enhancedSessions = sessionsData.map((session: any) => ({
        ...session,
        participantCount: session.teams?.length * 3 || Math.floor(Math.random() * 20) + 5,
        liveParticipantCount: session.status === 'active' ? Math.floor(Math.random() * 15) + 3 : 0,
        problems: session.problems?.map((problem: any) => ({
          ...problem,
          acceptanceRate: Math.floor(Math.random() * 40) + 20, // Mock acceptance rate
          solved: Math.random() > 0.7 // Mock solved status
        })) || []
      }));

      setSessions(enhancedSessions);

      // Load user's team
      const teamsResponse = await teamsAPI.getAllTeams();
      const teams = teamsResponse.data.teams || [];

      // Find team the user belongs to
      const team = teams.find((t: any) =>
        t.memberIds?.some((m: any) => m._id === user?.id || m === user?.id)
      );
      setUserTeam(team);

      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load sessions');
      setLoading(false);
    }
  };

  const handleJoinSession = (sessionId: string) => {
    if (!userTeam) {
      alert('You must be part of a team to join a session');
      return;
    }
    router.push(`/hackathon/session/${sessionId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-neon-blue/20 text-neon-blue border-neon-blue/50';
      case 'active':
        return 'bg-neon-green/20 text-neon-green border-neon-green/50';
      case 'paused':
        return 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/50';
      case 'completed':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      case 'cancelled':
        return 'bg-neon-pink/20 text-neon-pink border-neon-pink/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-neon-green bg-neon-green/20 border-neon-green/50';
      case 'medium':
        return 'text-neon-yellow bg-neon-yellow/20 border-neon-yellow/50';
      case 'hard':
        return 'text-neon-pink bg-neon-pink/20 border-neon-pink/50';
      case 'expert':
        return 'text-neon-purple bg-neon-purple/20 border-neon-purple/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getDifficultyStats = (problems: Problem[]) => {
    const stats = { easy: 0, medium: 0, hard: 0, expert: 0 };
    problems.forEach(problem => {
      stats[problem.difficulty]++;
    });
    return stats;
  };

  const canJoinSession = (session: HackathonSession) => {
    if (!userTeam) return false;
    if (session.status !== 'active' && session.status !== 'paused') return false;
    // Check if user's team is registered for this session
    return session.teams.some((t: any) => t._id === userTeam._id || t === userTeam._id);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading sessions...</p>
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
              <h1 className="text-3xl font-bold text-gradient">🚀 Hackathon Sessions</h1>
              <p className="text-gray-400 mt-1">Discover and compete in live coding challenges</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
              >
                ← Dashboard
              </button>
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

        {/* Team Status */}
        {!userTeam && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-400">
              <span className="font-semibold">⚠️ No Team Found:</span> You need to be part of a team to participate in hackathon sessions.
            </p>
          </div>
        )}

        {userTeam && (
          <div className="mb-6 p-4 bg-neon-blue/10 border border-neon-blue/50 rounded-lg">
            <p className="text-neon-blue">
              <span className="font-semibold">👥 Your Team:</span> {userTeam.name}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search sessions or problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All', icon: '📋' },
                { key: 'active', label: 'Live', icon: '🔴' },
                { key: 'scheduled', label: 'Upcoming', icon: '⏰' },
                { key: 'completed', label: 'Finished', icon: '✅' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key as any)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    statusFilter === filter.key
                      ? 'bg-neon-blue text-white shadow-lg shadow-neon-blue/25'
                      : 'bg-dark-800 text-gray-300 hover:bg-dark-700 border border-gray-700'
                  }`}
                >
                  {filter.icon} {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-gray-400 text-sm self-center mr-2">Difficulty:</span>
            {[
              { key: 'all', label: 'All' },
              { key: 'easy', label: 'Easy', color: 'text-green-400' },
              { key: 'medium', label: 'Medium', color: 'text-yellow-400' },
              { key: 'hard', label: 'Hard', color: 'text-red-400' },
              { key: 'expert', label: 'Expert', color: 'text-purple-400' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setDifficultyFilter(filter.key as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  difficultyFilter === filter.key
                    ? `bg-neon-blue text-white`
                    : `bg-dark-800 text-gray-300 hover:bg-dark-700 border border-gray-700`
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center border border-gray-800">
            <div className="text-6xl mb-4 opacity-50">🎯</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Sessions Found</h3>
            <p className="text-gray-400 mb-4">
              {searchQuery || difficultyFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters to see more sessions.'
                : 'No hackathon sessions are currently available.'
              }
            </p>
            {(searchQuery || difficultyFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDifficultyFilter('all');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-lg transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Sessions List */}
            {filteredSessions.map((session) => {
              const difficultyStats = getDifficultyStats(session.problems);
              const totalProblems = session.problems.length;

              return (
                <div
                  key={session._id}
                  className="glass rounded-xl border border-gray-800 overflow-hidden hover:border-neon-blue/50 transition-all"
                >
                  <div className="p-6">
                    {/* Session Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h2 className="text-2xl font-bold text-gradient">{session.title}</h2>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(session.status)}`}>
                            {session.status === 'active' && '🔴'} {session.status === 'scheduled' && '⏰'} {session.status === 'completed' && '✅'} {session.status}
                          </span>
                          {session.liveParticipantCount && session.liveParticipantCount > 0 && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/50">
                              {session.liveParticipantCount} coding live
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 mb-4">{session.description}</p>

                        {/* Session Stats */}
                        <div className="flex flex-wrap gap-6 text-sm text-gray-400 mb-4">
                          <div className="flex items-center gap-2">
                            <span>⏱️</span>
                            <span>{session.duration} minutes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>👥</span>
                            <span>{session.participantCount} participants</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>🎯</span>
                            <span>{totalProblems} problems</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>🏆</span>
                            <span>{session.teams.length} teams</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 ml-6">
                        {canJoinSession(session) ? (
                          <button
                            onClick={() => handleJoinSession(session._id)}
                            className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90 font-semibold shadow-lg shadow-neon-blue/25 transition-all"
                          >
                            {session.status === 'active' ? '🚀 Join Live Session' : '👁️ View Session'}
                          </button>
                        ) : session.status === 'active' || session.status === 'paused' ? (
                          <div className="px-6 py-3 bg-gray-600/50 text-gray-400 rounded-lg border border-gray-600">
                            Not registered
                          </div>
                        ) : (
                          <div className="px-6 py-3 bg-gray-600/50 text-gray-400 rounded-lg border border-gray-600">
                            Session unavailable
                          </div>
                        )}
                        <button
                          onClick={() => router.push(`/leaderboard/${session._id}`)}
                          className="px-4 py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 hover:text-white rounded-lg border border-gray-600 transition-all"
                        >
                          🏆 Leaderboard
                        </button>
                      </div>
                    </div>

                    {/* Problems Preview */}
                    {session.problems.length > 0 && (
                      <div className="border-t border-gray-700 pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white">Problems</h3>
                          <div className="flex gap-2">
                            {difficultyStats.easy > 0 && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/50">{difficultyStats.easy} Easy</span>}
                            {difficultyStats.medium > 0 && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/50">{difficultyStats.medium} Medium</span>}
                            {difficultyStats.hard > 0 && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/50">{difficultyStats.hard} Hard</span>}
                            {difficultyStats.expert > 0 && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/50">{difficultyStats.expert} Expert</span>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {session.problems.slice(0, 6).map((problem, index) => (
                            <div
                              key={problem._id}
                              className="p-4 bg-dark-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all cursor-pointer group"
                              onClick={() => setSelectedProblem(problem)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-sm">#{index + 1}</span>
                                  {problem.solved && <span className="text-green-400 text-sm">✓</span>}
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getDifficultyColor(problem.difficulty)}`}>
                                  {problem.difficulty}
                                </span>
                              </div>
                              <h4 className="font-semibold text-white mb-1 group-hover:text-neon-blue transition-colors">
                                {problem.title}
                              </h4>
                              {problem.acceptanceRate && (
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>Acceptance: {problem.acceptanceRate}%</span>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {problem.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                                    {tag}
                                  </span>
                                ))}
                                {problem.tags.length > 2 && (
                                  <span className="text-gray-500 text-xs">+{problem.tags.length - 2} more</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {session.problems.length > 6 && (
                            <div className="p-4 bg-dark-800/50 rounded-lg border border-gray-700 border-dashed flex items-center justify-center">
                              <span className="text-gray-400 text-sm">+{session.problems.length - 6} more problems</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Problem Preview Modal */}
        {selectedProblem && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedProblem(null)}>
            <div className="glass rounded-xl border border-gray-700 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{selectedProblem.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(selectedProblem.difficulty)}`}>
                        {selectedProblem.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      {selectedProblem.acceptanceRate && <span>Acceptance: {selectedProblem.acceptanceRate}%</span>}
                      <span>Tags: {selectedProblem.tags.join(', ')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProblem(null)}
                    className="text-gray-400 hover:text-white p-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="text-gray-300">
                  <p className="mb-4">Problem description would appear here with detailed requirements, examples, and constraints.</p>
                  <div className="bg-dark-800 p-4 rounded-lg border border-gray-700 mb-4">
                    <h4 className="font-semibold text-white mb-2">Example:</h4>
                    <pre className="text-sm text-gray-300">
{`Input: [1, 2, 3, 4]
Output: [1, 3, 6, 10]`}
                    </pre>
                  </div>
                  <p className="text-sm text-gray-400 italic">Click "Join Session" to start solving this problem!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
