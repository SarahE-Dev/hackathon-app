'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useAuthStore } from '@/store/authStore';
import { hackathonSessionsAPI } from '@/lib/api';

interface ProctorStats {
  activeSessions: number;
  activeTeams: number;
  totalViolations: number;
  pausedTeams: number;
}

function ProctorDashboardContent() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ProctorStats>({
    activeSessions: 0,
    activeTeams: 0,
    totalViolations: 0,
    pausedTeams: 0,
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all sessions
      const sessionsResponse = await hackathonSessionsAPI.getAll();
      const allSessions = sessionsResponse.data.sessions || [];
      const activeSessions = allSessions.filter(
        (s: any) => s.status === 'active' || s.status === 'paused'
      );

      setSessions(activeSessions);

      // Get active team sessions
      if (activeSessions.length > 0) {
        const activeTeamsResponse = await hackathonSessionsAPI.getActiveSessions();
        const teamSessions = activeTeamsResponse.data.teamSessions || [];

        const totalViolations = teamSessions.reduce((sum: number, ts: any) => {
          return (
            sum +
            ts.tabSwitchCount +
            ts.copyPasteCount +
            ts.fullscreenExitCount +
            ts.idleCount
          );
        }, 0);

        const pausedTeams = teamSessions.filter((ts: any) => ts.isPaused).length;

        setStats({
          activeSessions: activeSessions.length,
          activeTeams: teamSessions.length,
          totalViolations,
          pausedTeams,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Proctor Dashboard</h1>
              <p className="text-gray-600 mt-1">Monitor and manage hackathon sessions</p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-all"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Active Sessions */}
          <div className="bg-white rounded-xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Active Sessions</h3>
              <svg
                className="w-8 h-8 text-blue-600"
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
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats.activeSessions}</p>
          </div>

          {/* Active Teams */}
          <div className="bg-white rounded-xl p-6 border-2 border-green-200 hover:border-green-400 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Active Teams</h3>
              <svg
                className="w-8 h-8 text-green-600"
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
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats.activeTeams}</p>
          </div>

          {/* Total Violations */}
          <div className="bg-white rounded-xl p-6 border-2 border-red-200 hover:border-red-400 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Total Violations</h3>
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats.totalViolations}</p>
          </div>

          {/* Paused Teams */}
          <div className="bg-white rounded-xl p-6 border-2 border-yellow-200 hover:border-yellow-400 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 text-sm font-medium">Paused Teams</h3>
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats.pausedTeams}</p>
          </div>
        </div>

        {/* Active Sessions List */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Sessions</h2>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active sessions</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{session.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>
                        {session.teams?.length || 0} team{session.teams?.length !== 1 ? 's' : ''}
                      </span>
                      <span>
                        {session.problems?.length || 0} problem
                        {session.problems?.length !== 1 ? 's' : ''}
                      </span>
                      <span>{session.duration} minutes</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        session.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {session.status}
                    </span>
                    <Link
                      href={`/leaderboard/${session._id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Leaderboard
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/proctor/monitor"
              className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg text-white transition-all shadow-md hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <div>
                  <div className="font-semibold">Monitor Teams</div>
                  <div className="text-sm opacity-90">Real-time oversight</div>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/sessions"
              className="p-6 bg-gray-700 hover:bg-gray-800 rounded-lg text-white transition-all shadow-md hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <div className="font-semibold">Manage Sessions</div>
                  <div className="text-sm opacity-90">View all sessions</div>
                </div>
              </div>
            </Link>

            <Link
              href="/hackathon/teams"
              className="p-6 bg-gray-700 hover:bg-gray-800 rounded-lg text-white transition-all shadow-md hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <div>
                  <div className="font-semibold">View Teams</div>
                  <div className="text-sm opacity-90">Browse all teams</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProctorDashboard() {
  return (
    <RoleGuard allowedRoles={['Admin', 'Proctor']}>
      <ProctorDashboardContent />
    </RoleGuard>
  );
}
