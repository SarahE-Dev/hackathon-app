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
          <div className="glass rounded-2xl p-6 border-2 border-neon-blue/20 hover:border-neon-blue/40 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Total Teams</h3>
              <svg className="w-8 h-8 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-4xl font-bold">{stats.totalTeams}</p>
          </div>

          {/* Total Participants */}
          <div className="glass rounded-2xl p-6 border-2 border-neon-purple/20 hover:border-neon-purple/40 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Participants</h3>
              <svg className="w-8 h-8 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-4xl font-bold">{stats.totalParticipants}</p>
          </div>

          {/* Total Judges */}
          <div className="glass rounded-2xl p-6 border-2 border-neon-pink/20 hover:border-neon-pink/40 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Judges</h3>
              <svg className="w-8 h-8 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <p className="text-4xl font-bold">{stats.totalJudges}</p>
          </div>

          {/* Submitted Projects */}
          <div className="glass rounded-2xl p-6 border-2 border-neon-green/20 hover:border-neon-green/40 transition-all">
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
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teams Management */}
          <div className="glass rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gradient">Teams</h2>
              <Link
                href="/hackathon/teams"
                className="text-sm text-neon-blue hover:text-neon-blue/80"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {teams.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No teams yet</p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team._id}
                    className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{team.name}</h3>
                        {team.submittedAt && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                            Submitted
                          </span>
                        )}
                      </div>
                      {team.projectTitle && (
                        <p className="text-sm text-gray-400 mt-1">{team.projectTitle}</p>
                      )}
                      {team.track && (
                        <p className="text-xs text-neon-blue mt-1">{team.track}</p>
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
                      <button
                        onClick={() => handleDeleteTeam(team._id)}
                        className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-sm transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Management */}
          <div className="glass rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4 text-gradient">User Management</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No users found</p>
              ) : (
                users.map((user) => {
                  const isJudge = user.roles?.some(r => r.role === 'Judge');
                  const isAdmin = user.roles?.some(r => r.role === 'Admin');

                  return (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-4 bg-dark-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-400">{user.email}</p>
                        <div className="flex gap-2 mt-1">
                          {isAdmin && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                              Admin
                            </span>
                          )}
                          {isJudge && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                              Judge
                            </span>
                          )}
                        </div>
                      </div>
                      {!isJudge && !isAdmin && (
                        <button
                          onClick={() => handleAssignJudge(user._id)}
                          className="px-3 py-1 bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 rounded text-sm transition-all"
                        >
                          Make Judge
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 glass rounded-2xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4 text-gradient">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <AdminDashboardContent />
    </RoleGuard>
  );
}
