'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useAuthStore } from '@/store/authStore';
import { teamsAPI, usersAPI } from '@/lib/api';

interface HackathonStats {
  totalTeams: number;
  totalParticipants: number;
  totalJudges: number;
  submittedProjects: number;
}

interface Team {
  _id: string;
  name: string;
  memberIds: any[];
  projectTitle?: string;
  submittedAt?: string;
  track?: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Array<{
    role: string;
    organizationId?: string;
  }>;
}

function AdminDashboardContent() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<HackathonStats>({
    totalTeams: 0,
    totalParticipants: 0,
    totalJudges: 0,
    submittedProjects: 0,
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch teams
      const teamsResponse = await teamsAPI.getAllTeams();
      const teamsData = Array.isArray(teamsResponse) ? teamsResponse : [];

      // Fetch users
      const usersResponse = await usersAPI.getAllUsers();
      const usersData = Array.isArray(usersResponse) ? usersResponse : [];

      // Calculate stats
      const submittedProjects = teamsData.filter((t: Team) => t.submittedAt).length;
      const totalParticipants = teamsData.reduce((sum: number, t: Team) => sum + (t.memberIds?.length || 0), 0);
      const totalJudges = usersData.filter((u: User) =>
        u.roles?.some(r => r.role === 'Judge')
      ).length;

      setTeams(teamsData);
      setUsers(usersData);
      setStats({
        totalTeams: teamsData.length,
        totalParticipants,
        totalJudges,
        submittedProjects,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignJudge = async (userId: string) => {
    try {
      await usersAPI.addUserRole(userId, {
        role: 'Judge',
      });
      await loadDashboardData();
    } catch (error) {
      console.error('Error assigning judge role:', error);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      await teamsAPI.deleteTeam(teamId);
      await loadDashboardData();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
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
              <h1 className="text-3xl font-bold text-gradient">Hackathon Admin Dashboard</h1>
              <p className="text-gray-400 mt-1">Manage teams, judges, and participants</p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Teams */}
          <Link href="/hackathon/teams">
            <div className="glass rounded-2xl p-6 border-2 border-neon-blue/20 hover:border-neon-blue/40 transition-all cursor-pointer hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Total Teams</h3>
                <svg className="w-8 h-8 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-4xl font-bold">{stats.totalTeams}</p>
            </div>
          </Link>

          {/* Total Participants */}
          <Link href="/admin/users">
            <div className="glass rounded-2xl p-6 border-2 border-neon-purple/20 hover:border-neon-purple/40 transition-all cursor-pointer hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Participants</h3>
                <svg className="w-8 h-8 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-4xl font-bold">{stats.totalParticipants}</p>
            </div>
          </Link>

          {/* Total Judges */}
          <Link href="/admin/users">
            <div className="glass rounded-2xl p-6 border-2 border-neon-pink/20 hover:border-neon-pink/40 transition-all cursor-pointer hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Judges</h3>
                <svg className="w-8 h-8 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <p className="text-4xl font-bold">{stats.totalJudges}</p>
            </div>
          </Link>

          {/* Submitted Projects */}
          <Link href="/judge">
            <div className="glass rounded-2xl p-6 border-2 border-neon-green/20 hover:border-neon-green/40 transition-all cursor-pointer hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Submitted</h3>
                <svg className="w-8 h-8 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-4xl font-bold">{stats.submittedProjects}</p>
              <p className="text-sm text-gray-400 mt-1">
                {stats.totalTeams > 0 ? Math.round((stats.submittedProjects / stats.totalTeams) * 100) : 0}% complete
              </p>
            </div>
          </Link>
        </div>

        {/* Role-Based Admin Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* System Overview */}
          <div className="xl:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4">📊 System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-6 border border-neon-blue/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-neon-blue">Active Sessions</h3>
                    <p className="text-sm text-gray-400">Live coding challenges</p>
                  </div>
                  <div className="text-3xl">🔴</div>
                </div>
                <div className="text-2xl font-bold">3</div>
              </div>

              <div className="glass rounded-xl p-6 border border-neon-green/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-neon-green">Total Participants</h3>
                    <p className="text-sm text-gray-400">Across all sessions</p>
                  </div>
                  <div className="text-3xl">👥</div>
                </div>
                <div className="text-2xl font-bold">{stats.totalParticipants}</div>
              </div>

              <div className="glass rounded-xl p-6 border border-neon-purple/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-neon-purple">Submitted Projects</h3>
                    <p className="text-sm text-gray-400">Completed hackathons</p>
                  </div>
                  <div className="text-3xl">🚀</div>
                </div>
                <div className="text-2xl font-bold">{stats.submittedProjects}</div>
              </div>

              <div className="glass rounded-xl p-6 border border-neon-pink/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-neon-pink">System Health</h3>
                    <p className="text-sm text-gray-400">All services operational</p>
                  </div>
                  <div className="text-3xl">✅</div>
                </div>
                <div className="text-lg font-bold text-green-400">Online</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">⚡ Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/admin/analytics">
                <div className="glass rounded-lg p-4 border border-neon-yellow/30 hover:border-neon-yellow/60 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neon-yellow/20 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                      📊
                    </div>
                    <div>
                      <div className="font-semibold text-neon-yellow">View Analytics</div>
                      <div className="text-xs text-gray-400">Detailed system metrics</div>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/admin/users">
                <div className="glass rounded-lg p-4 border border-neon-purple/30 hover:border-neon-purple/60 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neon-purple/20 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                      👥
                    </div>
                    <div>
                      <div className="font-semibold text-neon-purple">Manage Users</div>
                      <div className="text-xs text-gray-400">User roles & permissions</div>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/admin/sessions">
                <div className="glass rounded-lg p-4 border border-neon-blue/30 hover:border-neon-blue/60 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neon-blue/20 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                      💻
                    </div>
                    <div>
                      <div className="font-semibold text-neon-blue">Manage Sessions</div>
                      <div className="text-xs text-gray-400">Control live events</div>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/proctor/monitor">
                <div className="glass rounded-lg p-4 border border-orange-500/30 hover:border-orange-500/60 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                      👁️
                    </div>
                    <div>
                      <div className="font-semibold text-orange-400">Proctor Monitor</div>
                      <div className="text-xs text-gray-400">Real-time oversight</div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Teams Management */}
          <div className="glass rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gradient">👥 Teams</h2>
              <Link
                href="/hackathon/teams"
                className="text-sm text-neon-blue hover:text-neon-blue/80"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {teams.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No teams registered yet</p>
              ) : (
                teams.slice(0, 5).map((team) => (
                  <div
                    key={team._id}
                    className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{team.name}</h3>
                        {team.submittedAt && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            ✅ Submitted
                          </span>
                        )}
                      </div>
                      {team.projectTitle && (
                        <p className="text-sm text-gray-400 mt-1">{team.projectTitle}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {team.memberIds?.length || 0} member(s)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/hackathon/teams/${team._id}`}
                        className="px-3 py-1 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 rounded text-sm transition-all"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4 text-gradient">📈 Recent Activity</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              <div className="flex items-start gap-3 p-3 bg-dark-700 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Session "Algorithm Challenge" started</div>
                  <div className="text-xs text-gray-400">2 minutes ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-dark-700 rounded-lg">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Team "Code Wizards" submitted project</div>
                  <div className="text-xs text-gray-400">15 minutes ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-dark-700 rounded-lg">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Assessment "Data Structures" completed</div>
                  <div className="text-xs text-gray-400">1 hour ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-dark-700 rounded-lg">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Judge scoring session opened</div>
                  <div className="text-xs text-gray-400">2 hours ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 glass rounded-2xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4 text-gradient">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/sessions"
              className="p-4 bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 hover:from-neon-blue/30 hover:to-neon-purple/30 rounded-lg border border-neon-blue/40 hover:border-neon-blue transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-medium">Hackathon Sessions</div>
                  <div className="text-xs text-gray-400">Manage live coding</div>
                </div>
              </div>
            </Link>

            <Link
              href="/proctor/monitor"
              className="p-4 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 hover:from-neon-purple/30 hover:to-neon-pink/30 rounded-lg border border-neon-purple/40 hover:border-neon-purple transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <div>
                  <div className="font-medium">Proctor Monitor</div>
                  <div className="text-xs text-gray-400">Real-time oversight</div>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/leaderboard"
              className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg border border-gray-600 hover:border-neon-blue transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium">View Leaderboard</span>
              </div>
            </Link>

            <Link
              href="/judge"
              className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg border border-gray-600 hover:border-neon-purple transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-medium">Judge Interface</span>
              </div>
            </Link>

            <Link
              href="/hackathon/teams"
              className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg border border-gray-600 hover:border-neon-green transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium">Browse Teams</span>
              </div>
            </Link>

            <Link
              href="/admin/analytics"
              className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg border border-gray-600 hover:border-neon-yellow transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-neon-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium">Analytics</span>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AdminDashboardContent />
    </RoleGuard>
  );
}
