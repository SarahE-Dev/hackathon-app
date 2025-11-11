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
    <RoleGuard allowedRoles={['Admin', 'Proctor']}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Proctor Monitoring</h1>
            <p className="text-gray-600">Monitor active hackathon sessions in real-time</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {/* Session Selector */}
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading team sessions...</p>
            </div>
          ) : teamSessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No active team sessions found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {/* Team Sessions List */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Active Team Sessions</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Team
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Violations
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teamSessions.map((session) => (
                        <tr
                          key={session._id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            getTotalViolations(session) > 5 ? 'bg-red-50' : ''
                          }`}
                          onClick={() => setSelectedTeam(session)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {session.teamId.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {session.teamId.memberIds.length} members
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {session.isPaused ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Paused
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {session.totalScore} / {session.maxScore}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
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
                                className="text-green-600 hover:text-green-900"
                              >
                                Resume
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTeam(session);
                                }}
                                className="text-yellow-600 hover:text-yellow-900"
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
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedTeam.teamId.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Started: {new Date(selectedTeam.startedAt).toLocaleString()}
                      </p>
                      {selectedTeam.isPaused && selectedTeam.pauseReason && (
                        <p className="text-sm text-yellow-600 mt-1">
                          Paused: {selectedTeam.pauseReason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedTeam(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Problem Progress */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Problem Progress
                    </h4>
                    <div className="space-y-2">
                      {selectedTeam.problemProgress.map((problem, index) => (
                        <div
                          key={problem.problemId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded"
                        >
                          <span className="text-sm text-gray-700">Problem {index + 1}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{problem.status}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {problem.score} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Events */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Events</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedTeam.events
                        .slice()
                        .reverse()
                        .slice(0, 10)
                        .map((event, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded"
                          >
                            <span
                              className={`text-xs font-medium ${getSeverityColor(
                                event.severity
                              )}`}
                            >
                              {event.type}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm text-gray-700">{event.details}</p>
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
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pause Team Session
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pauseReason}
                          onChange={(e) => setPauseReason(e.target.value)}
                          placeholder="Reason for pausing..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => handlePauseTeam(selectedTeam.teamId._id)}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
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
