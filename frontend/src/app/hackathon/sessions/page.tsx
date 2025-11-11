'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hackathonSessionsAPI, teamsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface HackathonSession {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  teams: any[];
  problems: any[];
}

export default function HackathonSessionsListPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [sessions, setSessions] = useState<HackathonSession[]>([]);
  const [userTeam, setUserTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      // Load sessions
      const sessionsResponse = await hackathonSessionsAPI.getAll();
      setSessions(sessionsResponse.data.sessions || []);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hackathon Sessions</h1>
              <p className="text-gray-600 mt-1">Browse and join live coding challenges</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-all"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {!userTeam && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            You are not part of any team yet. Join a team to participate in hackathon sessions.
          </div>
        )}

        {userTeam && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900">
              <span className="font-semibold">Your Team:</span> {userTeam.name}
            </p>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No hackathon sessions available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {sessions.map((session) => (
              <div
                key={session._id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-gray-900">{session.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            session.status
                          )}`}
                        >
                          {session.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{session.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{session.duration} minutes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          <span>{session.teams.length} teams</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>{session.problems.length} problems</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {canJoinSession(session) ? (
                      <button
                        onClick={() => handleJoinSession(session._id)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        {session.status === 'active' ? 'Join Session' : 'View Session'}
                      </button>
                    ) : session.status === 'active' || session.status === 'paused' ? (
                      <div className="px-6 py-3 bg-gray-100 text-gray-500 rounded-lg">
                        Not registered for this session
                      </div>
                    ) : (
                      <div className="px-6 py-3 bg-gray-100 text-gray-500 rounded-lg">
                        Session not available
                      </div>
                    )}
                    <button
                      onClick={() => router.push(`/leaderboard/${session._id}`)}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                    >
                      View Leaderboard
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
