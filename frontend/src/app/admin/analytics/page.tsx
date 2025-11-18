'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Analytics {
  users: {
    total: number;
    byRole: Record<string, number>;
    activeToday: number;
    newThisWeek: number;
  };
  assessments: {
    total: number;
    published: number;
    draft: number;
    averageScore: number;
    completionRate: number;
  };
  teams: {
    total: number;
    submitted: number;
    averageSize: number;
  };
  hackathons: {
    active: number;
    completed: number;
    totalParticipants: number;
  };
  systemHealth: {
    dbStatus: 'healthy' | 'degraded' | 'down';
    apiResponseTime: number;
    activeConnections: number;
  };
}

function AnalyticsContent() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // Simulate API call - replace with real endpoint
      // const response = await axios.get(`${BACKEND_URL}/api/admin/analytics?range=${timeRange}`);
      
      // Mock data for now
      const mockAnalytics: Analytics = {
        users: {
          total: 150,
          byRole: {
            admin: 5,
            judge: 12,
            proctor: 8,
            grader: 15,
            applicant: 110,
          },
          activeToday: 45,
          newThisWeek: 12,
        },
        assessments: {
          total: 25,
          published: 18,
          draft: 7,
          averageScore: 78.5,
          completionRate: 85.3,
        },
        teams: {
          total: 30,
          submitted: 22,
          averageSize: 3.8,
        },
        hackathons: {
          active: 2,
          completed: 8,
          totalParticipants: 98,
        },
        systemHealth: {
          dbStatus: 'healthy',
          apiResponseTime: 145,
          activeConnections: 23,
        },
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
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
              <h1 className="text-3xl font-bold text-gradient">Platform Analytics</h1>
              <p className="text-gray-400 mt-1">Comprehensive system metrics and insights</p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Time Range Selector */}
        <div className="flex gap-2 mb-8">
          {['week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg transition-all ${
                timeRange === range
                  ? 'bg-neon-blue text-white'
                  : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {/* System Health */}
        <div className="glass rounded-2xl p-6 border-2 border-neon-green/30 mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span>🏥</span> System Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-gray-400 text-sm mb-2">Database Status</div>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                analytics.systemHealth.dbStatus === 'healthy' ? 'text-green-400' : 'text-yellow-400'
              }`}>
                <span className="w-3 h-3 rounded-full bg-current animate-pulse"></span>
                {analytics.systemHealth.dbStatus.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">API Response Time</div>
              <div className="text-2xl font-bold text-neon-blue">
                {analytics.systemHealth.apiResponseTime}ms
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-2">Active Connections</div>
              <div className="text-2xl font-bold text-neon-purple">
                {analytics.systemHealth.activeConnections}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6 border-2 border-neon-blue/20">
            <div className="text-gray-400 text-sm mb-2">Total Users</div>
            <div className="text-4xl font-bold mb-2">{analytics.users.total}</div>
            <div className="text-green-400 text-sm">
              +{analytics.users.newThisWeek} this week
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border-2 border-neon-purple/20">
            <div className="text-gray-400 text-sm mb-2">Active Today</div>
            <div className="text-4xl font-bold mb-2">{analytics.users.activeToday}</div>
            <div className="text-gray-400 text-sm">
              {Math.round((analytics.users.activeToday / analytics.users.total) * 100)}% of users
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border-2 border-neon-pink/20">
            <div className="text-gray-400 text-sm mb-2">Assessments</div>
            <div className="text-4xl font-bold mb-2">{analytics.assessments.published}</div>
            <div className="text-gray-400 text-sm">{analytics.assessments.draft} drafts</div>
          </div>

          <div className="glass rounded-2xl p-6 border-2 border-neon-green/20">
            <div className="text-gray-400 text-sm mb-2">Avg Score</div>
            <div className="text-4xl font-bold mb-2">{analytics.assessments.averageScore}%</div>
            <div className="text-gray-400 text-sm">
              {analytics.assessments.completionRate}% completion
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Users by Role */}
          <div className="glass rounded-2xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold mb-4">Users by Role</h3>
            <div className="space-y-4">
              {Object.entries(analytics.users.byRole).map(([role, count]) => {
                const percentage = (count / analytics.users.total) * 100;
                const colors: Record<string, string> = {
                  admin: 'bg-red-500',
                  judge: 'bg-purple-500',
                  proctor: 'bg-orange-500',
                  grader: 'bg-blue-500',
                  applicant: 'bg-green-500',
                };
                return (
                  <div key={role}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="capitalize font-medium">{role}</span>
                      <span className="text-gray-400">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-dark-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${colors[role] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hackathon Stats */}
          <div className="glass rounded-2xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold mb-4">Hackathon Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                <div>
                  <div className="text-gray-400 text-sm">Active Hackathons</div>
                  <div className="text-2xl font-bold text-neon-green">
                    {analytics.hackathons.active}
                  </div>
                </div>
                <div className="text-4xl">🚀</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                <div>
                  <div className="text-gray-400 text-sm">Completed</div>
                  <div className="text-2xl font-bold text-neon-blue">
                    {analytics.hackathons.completed}
                  </div>
                </div>
                <div className="text-4xl">✅</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                <div>
                  <div className="text-gray-400 text-sm">Total Participants</div>
                  <div className="text-2xl font-bold text-neon-purple">
                    {analytics.hackathons.totalParticipants}
                  </div>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Stats */}
        <div className="glass rounded-2xl p-6 border border-gray-800">
          <h3 className="text-xl font-bold mb-4">Team Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-dark-700 rounded-lg">
              <div className="text-gray-400 text-sm mb-2">Total Teams</div>
              <div className="text-4xl font-bold text-neon-blue">{analytics.teams.total}</div>
            </div>
            <div className="text-center p-6 bg-dark-700 rounded-lg">
              <div className="text-gray-400 text-sm mb-2">Submitted Projects</div>
              <div className="text-4xl font-bold text-neon-green">{analytics.teams.submitted}</div>
              <div className="text-sm text-gray-400 mt-2">
                {Math.round((analytics.teams.submitted / analytics.teams.total) * 100)}% submission rate
              </div>
            </div>
            <div className="text-center p-6 bg-dark-700 rounded-lg">
              <div className="text-gray-400 text-sm mb-2">Avg Team Size</div>
              <div className="text-4xl font-bold text-neon-purple">
                {analytics.teams.averageSize}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Analytics() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AnalyticsContent />
    </RoleGuard>
  );
}
