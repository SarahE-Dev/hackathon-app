'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalAssessments: number;
  publishedAssessments: number;
  activeSessions: number;
  totalAttempts: number;
  todayAttempts: number;
  averageScore: number;
}

interface RecentActivity {
  type: 'user-registered' | 'assessment-created' | 'session-started' | 'attempt-submitted';
  user: string;
  message: string;
  timestamp: Date;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // Check if user is admin
        const isAdmin = user.roles?.some((r: any) => r.role === 'admin');
        if (!isAdmin) {
          router.push('/dashboard');
          return;
        }

        // TODO: Replace with actual API calls
        // For now, using mock data
        const mockStats: DashboardStats = {
          totalUsers: 1247,
          activeUsers: 342,
          totalAssessments: 89,
          publishedAssessments: 64,
          activeSessions: 12,
          totalAttempts: 3456,
          todayAttempts: 87,
          averageScore: 78.5,
        };

        const mockActivity: RecentActivity[] = [
          {
            type: 'attempt-submitted',
            user: 'John Doe',
            message: 'completed "Web Development Quiz"',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
          },
          {
            type: 'session-started',
            user: 'Admin',
            message: 'started session for "Data Structures Final"',
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
          },
          {
            type: 'user-registered',
            user: 'Jane Smith',
            message: 'registered as a new student',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
          },
          {
            type: 'assessment-created',
            user: 'Prof. Wilson',
            message: 'created "Algorithm Design Assessment"',
            timestamp: new Date(Date.now() - 45 * 60 * 1000),
          },
        ];

        setStats(mockStats);
        setRecentActivity(mockActivity);
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400">Failed to load dashboard</p>
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
              <h1 className="text-3xl font-bold text-gradient">Admin Dashboard</h1>
              <p className="text-gray-400 mt-1">Platform overview and management</p>
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
          {/* Total Users */}
          <div className="glass rounded-2xl p-6 border-2 border-neon-blue/20 relative overflow-hidden group hover:border-neon-blue/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Total Users</h3>
                <svg className="w-8 h-8 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-4xl font-bold mb-1">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-sm text-green-400">
                +{stats.activeUsers} active now
              </p>
            </div>
          </div>

          {/* Assessments */}
          <div className="glass rounded-2xl p-6 border-2 border-neon-purple/20 relative overflow-hidden group hover:border-neon-purple/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Assessments</h3>
                <svg className="w-8 h-8 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-4xl font-bold mb-1">{stats.totalAssessments}</p>
              <p className="text-sm text-neon-purple">
                {stats.publishedAssessments} published
              </p>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="glass rounded-2xl p-6 border-2 border-neon-pink/20 relative overflow-hidden group hover:border-neon-pink/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/5 to-transparent opacity-0 group-hover:opacity-100 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Active Sessions</h3>
                <svg className="w-8 h-8 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <p className="text-4xl font-bold mb-1">{stats.activeSessions}</p>
              <p className="text-sm text-gray-400">
                Running now
              </p>
            </div>
          </div>

          {/* Attempts */}
          <div className="glass rounded-2xl p-6 border-2 border-neon-green/20 relative overflow-hidden group hover:border-neon-green/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Total Attempts</h3>
                <svg className="w-8 h-8 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p className="text-4xl font-bold mb-1">{stats.totalAttempts.toLocaleString()}</p>
              <p className="text-sm text-green-400">
                +{stats.todayAttempts} today
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 glass rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-gradient">Recent Activity</span>
              <div className="w-2 h-2 bg-neon-blue rounded-full animate-pulse"></div>
            </h2>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-all"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'attempt-submitted'
                      ? 'bg-green-500/20 text-green-400'
                      : activity.type === 'session-started'
                      ? 'bg-blue-500/20 text-blue-400'
                      : activity.type === 'user-registered'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-pink-500/20 text-pink-400'
                  }`}>
                    {activity.type === 'attempt-submitted' && '✓'}
                    {activity.type === 'session-started' && '▶'}
                    {activity.type === 'user-registered' && '+'}
                    {activity.type === 'assessment-created' && '📝'}
                  </div>
                  <div className="flex-1">
                    <p className="text-white">
                      <span className="font-semibold">{activity.user}</span>{' '}
                      {activity.message}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4 text-gradient">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/admin/users"
                className="block p-4 bg-dark-700 hover:bg-dark-600 rounded-lg border border-gray-600 hover:border-neon-blue transition-all"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="font-medium">Manage Users</span>
                </div>
              </Link>

              <Link
                href="/admin/assessments"
                className="block p-4 bg-dark-700 hover:bg-dark-600 rounded-lg border border-gray-600 hover:border-neon-purple transition-all"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">Manage Assessments</span>
                </div>
              </Link>

              <Link
                href="/admin/sessions"
                className="block p-4 bg-dark-700 hover:bg-dark-600 rounded-lg border border-gray-600 hover:border-neon-pink transition-all"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Manage Sessions</span>
                </div>
              </Link>

              <Link
                href="/admin/analytics"
                className="block p-4 bg-dark-700 hover:bg-dark-600 rounded-lg border border-gray-600 hover:border-neon-green transition-all"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="font-medium">View Analytics</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="mt-6 glass rounded-2xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4 text-gradient">Performance Overview</h2>
          <div className="bg-dark-700 rounded-lg p-12 text-center border-2 border-dashed border-gray-600">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-400">Performance charts and analytics will be displayed here</p>
            <p className="text-sm text-gray-500 mt-2">Average score: {stats.averageScore}%</p>
          </div>
        </div>
      </main>
    </div>
  );
}
