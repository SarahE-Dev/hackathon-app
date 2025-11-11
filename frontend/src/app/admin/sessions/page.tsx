'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hackathonSessionsAPI, teamsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { RoleGuard } from '@/components/guards/RoleGuard';

interface HackathonSession {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  teams: any[];
  problems: Array<{
    problemId: string;
    points: number;
  }>;
  proctoring: {
    enabled: boolean;
    requireFullscreen: boolean;
    detectTabSwitch: boolean;
    detectCopyPaste: boolean;
    detectIdle: boolean;
    idleTimeoutMinutes: number;
  };
}

export default function AdminSessionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [sessions, setSessions] = useState<HackathonSession[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    duration: 180,
    teams: [] as string[],
    proctoring: {
      enabled: true,
      requireFullscreen: true,
      detectTabSwitch: true,
      detectCopyPaste: true,
      detectIdle: true,
      idleTimeoutMinutes: 10,
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
      loadTeams();
    }
  }, [isAuthenticated]);

  const loadSessions = async () => {
    try {
      const response = await hackathonSessionsAPI.getAll();
      setSessions(response.data.sessions);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load sessions');
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await teamsAPI.getAllTeams();
      setTeams(response.data.teams || []);
    } catch (err: any) {
      console.error('Failed to load teams:', err);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hackathonSessionsAPI.create({
        ...formData,
        problems: [], // Will be added separately through problem selection
      });
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        duration: 180,
        teams: [],
        proctoring: {
          enabled: true,
          requireFullscreen: true,
          detectTabSwitch: true,
          detectCopyPaste: true,
          detectIdle: true,
          idleTimeoutMinutes: 10,
        },
      });
      loadSessions();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create session');
    }
  };

  const handleStartSession = async (id: string) => {
    if (confirm('Are you sure you want to start this session?')) {
      try {
        await hackathonSessionsAPI.start(id);
        loadSessions();
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Failed to start session');
      }
    }
  };

  const handlePauseSession = async (id: string) => {
    const reason = prompt('Enter reason for pausing:');
    if (reason) {
      try {
        await hackathonSessionsAPI.pause(id, reason);
        loadSessions();
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Failed to pause session');
      }
    }
  };

  const handleResumeSession = async (id: string) => {
    if (confirm('Resume this session?')) {
      try {
        await hackathonSessionsAPI.resume(id);
        loadSessions();
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Failed to resume session');
      }
    }
  };

  const handleCompleteSession = async (id: string) => {
    if (confirm('Complete this session? This will auto-submit all team sessions.')) {
      try {
        await hackathonSessionsAPI.complete(id);
        loadSessions();
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Failed to complete session');
      }
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      try {
        await hackathonSessionsAPI.delete(id);
        loadSessions();
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Failed to delete session');
      }
    }
  };

  const handleViewLeaderboard = (id: string) => {
    router.push(`/leaderboard/${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  return (
    <RoleGuard allowedRoles={['Admin', 'Proctor']}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Hackathon Sessions</h1>
              <p className="text-gray-600">Manage live coding challenge sessions</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Session
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">No hackathon sessions found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Your First Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {sessions.map((session) => (
                <div key={session._id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {session.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{session.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Duration: {session.duration} min</span>
                          <span>Teams: {session.teams.length}</span>
                          <span>Problems: {session.problems.length}</span>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          session.status
                        )}`}
                      >
                        {session.status}
                      </span>
                    </div>

                    {/* Proctoring Settings */}
                    {session.proctoring.enabled && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          Proctoring Enabled
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                          {session.proctoring.requireFullscreen && <span>✓ Fullscreen</span>}
                          {session.proctoring.detectTabSwitch && <span>✓ Tab Detection</span>}
                          {session.proctoring.detectCopyPaste && <span>✓ Copy/Paste Detection</span>}
                          {session.proctoring.detectIdle && <span>✓ Idle Detection</span>}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {session.status === 'scheduled' && (
                        <button
                          onClick={() => handleStartSession(session._id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Start Session
                        </button>
                      )}
                      {session.status === 'active' && (
                        <>
                          <button
                            onClick={() => handlePauseSession(session._id)}
                            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                          >
                            Pause
                          </button>
                          <button
                            onClick={() => handleCompleteSession(session._id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            Complete
                          </button>
                        </>
                      )}
                      {session.status === 'paused' && (
                        <button
                          onClick={() => handleResumeSession(session._id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Resume
                        </button>
                      )}
                      {(session.status === 'active' ||
                        session.status === 'paused' ||
                        session.status === 'completed') && (
                        <button
                          onClick={() => handleViewLeaderboard(session._id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                        >
                          Leaderboard
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/admin/sessions/${session._id}/edit`)}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                      >
                        Edit
                      </button>
                      {session.status === 'scheduled' && (
                        <button
                          onClick={() => handleDeleteSession(session._id)}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Session Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Create Hackathon Session</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateSession} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.duration}
                        onChange={(e) =>
                          setFormData({ ...formData, duration: parseInt(e.target.value) })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teams</label>
                    <select
                      multiple
                      value={formData.teams}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          teams: Array.from(e.target.selectedOptions, (option) => option.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      size={5}
                    >
                      {teams.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Hold Ctrl/Cmd to select multiple teams
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Proctoring Settings
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.proctoring.enabled}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              proctoring: {
                                ...formData.proctoring,
                                enabled: e.target.checked,
                              },
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Enable Proctoring</span>
                      </label>

                      {formData.proctoring.enabled && (
                        <>
                          <label className="flex items-center ml-6">
                            <input
                              type="checkbox"
                              checked={formData.proctoring.requireFullscreen}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  proctoring: {
                                    ...formData.proctoring,
                                    requireFullscreen: e.target.checked,
                                  },
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Require Fullscreen</span>
                          </label>
                          <label className="flex items-center ml-6">
                            <input
                              type="checkbox"
                              checked={formData.proctoring.detectTabSwitch}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  proctoring: {
                                    ...formData.proctoring,
                                    detectTabSwitch: e.target.checked,
                                  },
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Detect Tab Switches</span>
                          </label>
                          <label className="flex items-center ml-6">
                            <input
                              type="checkbox"
                              checked={formData.proctoring.detectCopyPaste}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  proctoring: {
                                    ...formData.proctoring,
                                    detectCopyPaste: e.target.checked,
                                  },
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Detect Copy/Paste
                            </span>
                          </label>
                          <label className="flex items-center ml-6">
                            <input
                              type="checkbox"
                              checked={formData.proctoring.detectIdle}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  proctoring: {
                                    ...formData.proctoring,
                                    detectIdle: e.target.checked,
                                  },
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Detect Idle</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Create Session
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
