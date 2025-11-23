'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hackathonSessionsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { RoleGuard } from '@/components/guards/RoleGuard';

interface TeamSession {
  _id: string;
  sessionId: {
    _id: string;
    title: string;
  };
  teamId: {
    _id: string;
    name: string;
    memberIds: string[];
  };
  status: string;
  startedAt: string;
  isPaused: boolean;
  pauseReason?: string;
  totalScore: number;
  maxScore: number;
  tabSwitchCount: number;
  copyPasteCount: number;
  fullscreenExitCount: number;
  idleCount: number;
  warningCount: number;
  problemProgress: Array<{
    problemId: string;
    status: string;
    score: number;
  }>;
  events: Array<{
    type: string;
    timestamp: string;
    details?: string;
    severity?: string;
  }>;
}

export default function ProctorMonitorPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [teamSessions, setTeamSessions] = useState<TeamSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<TeamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pauseReason, setPauseReason] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedSession) {
      loadActiveSessions();
      const interval = setInterval(loadActiveSessions, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      const response = await hackathonSessionsAPI.getAll();
      const activeSessions = response.data.sessions.filter(
        (s: any) => s.status === 'active' || s.status === 'paused'
      );
      setSessions(activeSessions);
      if (activeSessions.length > 0 && !selectedSession) {
        setSelectedSession(activeSessions[0]._id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load sessions');
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await hackathonSessionsAPI.getActiveSessions(selectedSession);
      setTeamSessions(response.data.teamSessions);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load active sessions');
      setLoading(false);
    }
  };

  const handlePauseTeam = async (teamId: string) => {
    if (!pauseReason.trim()) {
      alert('Please provide a reason for pausing');
      return;
    }

    try {
      await hackathonSessionsAPI.pauseTeamSession(selectedSession, teamId, pauseReason);
      setPauseReason('');
      setSelectedTeam(null);
      loadActiveSessions();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to pause team session');
    }
  };

  const handleResumeTeam = async (teamId: string) => {
    try {
      await hackathonSessionsAPI.resumeTeamSession(selectedSession, teamId);
      setSelectedTeam(null);
      loadActiveSessions();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to resume team session');
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
      default:
        return 'text-blue-600';
    }
  };

  const getTotalViolations = (session: TeamSession) => {
    return (
      session.tabSwitchCount +
      session.copyPasteCount +
      session.fullscreenExitCount +
      session.idleCount
    );
  };

  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  return (
    <RoleGuard allowedRoles={['admin', 'proctor', 'judge']}>
      <div className="min-h-screen bg-dark-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gradient mb-2">Proctor Monitoring</h1>
            <p className="text-gray-400">Monitor active hackathon sessions in real-time</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Session Selector */}
          <div className="mb-6 glass rounded-lg p-4 border border-gray-800">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
            >
              <option value="">Select a session...</option>
              {sessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.title} - {session.status}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-blue"></div>
              <p className="mt-4 text-gray-400">Loading team sessions...</p>
            </div>
          ) : teamSessions.length === 0 ? (
            <div className="glass rounded-lg p-8 border border-gray-800 text-center">
              <p className="text-gray-400">No active team sessions found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* Team Sessions List */}
              <div className="glass rounded-lg border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700 bg-dark-800">
                  <h2 className="text-lg font-semibold text-white">Active Team Sessions</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-dark-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Team
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Violations
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-dark-900 divide-y divide-gray-700">
                      {teamSessions.map((session) => (
                        <tr
                          key={session._id}
                          className={`hover:bg-dark-800 cursor-pointer transition-all ${
                            getTotalViolations(session) > 5 ? 'bg-red-500/5' : ''
                          }`}
                          onClick={() => setSelectedTeam(session)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {session.teamId.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {session.teamId.memberIds.length} members
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {session.isPaused ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-neon-purple/20 text-neon-purple border border-neon-purple/50">
                                Paused
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-neon-green/20 text-neon-green border border-neon-green/50">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {session.totalScore} / {session.maxScore}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              Total: {getTotalViolations(session)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Tab: {session.tabSwitchCount} | Copy: {session.copyPasteCount} |
                              FS: {session.fullscreenExitCount}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {session.isPaused ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResumeTeam(session.teamId._id);
                                }}
                                className="text-neon-green hover:text-neon-green/80"
                              >
                                Resume
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTeam(session);
                                }}
                                className="text-neon-purple hover:text-neon-purple/80"
                              >
                                Pause
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected Team Details */}
              {selectedTeam && (
                <div className="glass rounded-lg border border-gray-800 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {selectedTeam.teamId.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Started: {new Date(selectedTeam.startedAt).toLocaleString()}
                      </p>
                      {selectedTeam.isPaused && selectedTeam.pauseReason && (
                        <p className="text-sm text-neon-purple mt-1">
                          Paused: {selectedTeam.pauseReason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedTeam(null)}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Problem Progress */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Problem Progress
                    </h4>
                    <div className="space-y-2">
                      {selectedTeam.problemProgress.map((problem, index) => (
                        <div
                          key={problem.problemId}
                          className="flex items-center justify-between p-3 bg-dark-700 rounded"
                        >
                          <span className="text-sm text-gray-300">Problem {index + 1}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">{problem.status}</span>
                            <span className="text-sm font-medium text-white">
                              {problem.score} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Events */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Recent Events</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedTeam.events
                        .slice()
                        .reverse()
                        .slice(0, 10)
                        .map((event, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-dark-700 rounded"
                          >
                            <span
                              className={`text-xs font-medium ${getSeverityColor(
                                event.severity
                              )}`}
                            >
                              {event.type}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm text-gray-300">{event.details}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Pause Team Action */}
                  {!selectedTeam.isPaused && (
                    <div className="border-t border-gray-700 pt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Pause Team Session
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pauseReason}
                          onChange={(e) => setPauseReason(e.target.value)}
                          placeholder="Reason for pausing..."
                          className="flex-1 px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all"
                        />
                        <button
                          onClick={() => handlePauseTeam(selectedTeam.teamId._id)}
                          className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-lg transition-all"
                        >
                          Pause
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
