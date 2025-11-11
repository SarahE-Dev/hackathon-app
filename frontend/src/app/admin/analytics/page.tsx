'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { assessmentsAPI, teamsAPI, usersAPI } from '@/lib/api';
import axios from 'axios';

interface AnalyticsData {
  // Assessment metrics
  totalAssessments: number;
  publishedAssessments: number;
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  averageCompletionTime: number;

  // Hackathon metrics
  totalTeams: number;
  activeTeams: number;
  submittedProjects: number;
  totalParticipants: number;

  // User metrics
  totalUsers: number;
  activeUsers: number;
  judgesCount: number;
  proctorsCount: number;

  // Proctoring metrics
  totalViolations: number;
  tabSwitches: number;
  copyPasteEvents: number;
  idleEvents: number;

  // Time-based metrics
  recentAttempts: Array<{
    date: string;
    count: number;
  }>;
  assessmentCompletion: Array<{
    assessmentId: string;
    title: string;
    completionRate: number;
    averageScore: number;
  }>;
}

function AnalyticsDashboardContent() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load data from various APIs
      const [assessmentsRes, attemptsRes, teamsRes, usersRes] = await Promise.all([
        assessmentsAPI.getAll(),
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/analytics`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          params: { timeRange }
        }).catch(() => ({ data: { data: [] } })), // Fallback if endpoint doesn't exist
        teamsAPI.getAllTeams(),
        usersAPI.getAllUsers(),
      ]);

      const assessments = assessmentsRes.data?.assessments || [];
      const attempts = attemptsRes.data?.data || [];
      const teams = Array.isArray(teamsRes) ? teamsRes : [];
      const users = Array.isArray(usersRes) ? usersRes : [];

      // Calculate metrics
      const publishedAssessments = assessments.filter((a: any) => a.status === 'published');
      const completedAttempts = attempts.filter((a: any) => a.status === 'submitted' || a.status === 'graded');
      const totalScore = completedAttempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0);
      const averageScore = completedAttempts.length > 0 ? totalScore / completedAttempts.length : 0;

      const activeTeams = teams.filter((t: any) => t.members && t.members.length > 0);
      const submittedProjects = teams.filter((t: any) => t.submittedAt);
      const totalParticipants = teams.reduce((sum: number, t: any) => sum + (t.memberIds?.length || 0), 0);

      const judges = users.filter((u: any) => u.roles?.some((r: any) => r.role === 'Judge'));
      const proctors = users.filter((u: any) => u.roles?.some((r: any) => r.role === 'Proctor'));
      const activeUsers = users.filter((u: any) => {
        // Consider users active if they have recent activity (simplified)
        return u.createdAt && new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      });

      // Mock proctoring data (would come from actual proctoring API)
      const mockProctoringData = {
        totalViolations: Math.floor(Math.random() * 50) + 10,
        tabSwitches: Math.floor(Math.random() * 30) + 5,
        copyPasteEvents: Math.floor(Math.random() * 20) + 2,
        idleEvents: Math.floor(Math.random() * 15) + 3,
      };

      // Mock time-based data
      const recentAttempts = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) + 5
      })).reverse();

      const assessmentCompletion = publishedAssessments.map((assessment: any) => {
        const assessmentAttempts = attempts.filter((a: any) => a.assessmentId === assessment.id);
        const completed = assessmentAttempts.filter((a: any) => a.status === 'submitted' || a.status === 'graded');
        const completionRate = assessmentAttempts.length > 0 ? (completed.length / assessmentAttempts.length) * 100 : 0;
        const avgScore = completed.length > 0
          ? completed.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / completed.length
          : 0;

        return {
          assessmentId: assessment.id,
          title: assessment.title,
          completionRate,
          averageScore: avgScore
        };
      });

      setAnalytics({
        totalAssessments: assessments.length,
        publishedAssessments: publishedAssessments.length,
        totalAttempts: attempts.length,
        completedAttempts: completedAttempts.length,
        averageScore,
        averageCompletionTime: 45, // Mock data
        totalTeams: teams.length,
        activeTeams: activeTeams.length,
        submittedProjects: submittedProjects.length,
        totalParticipants,
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        judgesCount: judges.length,
        proctorsCount: proctors.length,
        ...mockProctoringData,
        recentAttempts,
        assessmentCompletion
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Failed to load analytics</p>
          <Link href="/admin" className="text-neon-blue hover:text-neon-blue/80 mt-4 inline-block">
            ← Back to Admin
          </Link>
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
              <Link
                href="/admin"
                className="text-neon-blue hover:text-neon-blue/80 transition-all mb-2 inline-block"
              >
                ← Back to Admin
              </Link>
              <h1 className="text-3xl font-bold text-gradient">Analytics Dashboard</h1>
              <p className="text-gray-400 mt-1">Platform performance and user engagement metrics</p>
            </div>
            <div className="flex gap-2">
              {[
                { key: '7d', label: 'Last 7 days' },
                { key: '30d', label: 'Last 30 days' },
                { key: '90d', label: 'Last 90 days' },
              ].map((range) => (
                <button
                  key={range.key}
                  onClick={() => setTimeRange(range.key as any)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    timeRange === range.key
                      ? 'bg-neon-blue text-white'
                      : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Assessments */}
          <div className="glass rounded-xl p-6 border border-neon-blue/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-medium">Assessments</h3>
              <div className="text-2xl">📋</div>
            </div>
            <div className="text-3xl font-bold text-neon-blue mb-2">{analytics.totalAssessments}</div>
            <div className="text-sm text-gray-400">
              {analytics.publishedAssessments} published
            </div>
          </div>

          {/* Attempts */}
          <div className="glass rounded-xl p-6 border border-neon-purple/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-medium">Attempts</h3>
              <div className="text-2xl">📝</div>
            </div>
            <div className="text-3xl font-bold text-neon-purple mb-2">{analytics.totalAttempts}</div>
            <div className="text-sm text-gray-400">
              {analytics.completedAttempts} completed ({analytics.totalAttempts > 0 ? Math.round((analytics.completedAttempts / analytics.totalAttempts) * 100) : 0}%)
            </div>
          </div>

          {/* Teams */}
          <div className="glass rounded-xl p-6 border border-neon-green/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-medium">Teams</h3>
              <div className="text-2xl">👥</div>
            </div>
            <div className="text-3xl font-bold text-neon-green mb-2">{analytics.totalTeams}</div>
            <div className="text-sm text-gray-400">
              {analytics.submittedProjects} submissions
            </div>
          </div>

          {/* Users */}
          <div className="glass rounded-xl p-6 border border-neon-pink/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-medium">Users</h3>
              <div className="text-2xl">👤</div>
            </div>
            <div className="text-3xl font-bold text-neon-pink mb-2">{analytics.totalUsers}</div>
            <div className="text-sm text-gray-400">
              {analytics.activeUsers} active
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Assessment Performance */}
          <div className="glass rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Assessment Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Average Score</span>
                <span className="font-semibold">{Math.round(analytics.averageScore)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. Completion Time</span>
                <span className="font-semibold">{analytics.averageCompletionTime} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Judges</span>
                <span className="font-semibold">{analytics.judgesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Proctors</span>
                <span className="font-semibold">{analytics.proctorsCount}</span>
              </div>
            </div>
          </div>

          {/* Proctoring Overview */}
          <div className="glass rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Proctoring Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Violations</span>
                <span className="font-semibold text-red-400">{analytics.totalViolations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tab Switches</span>
                <span className="font-semibold text-yellow-400">{analytics.tabSwitches}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Copy/Paste Events</span>
                <span className="font-semibold text-orange-400">{analytics.copyPasteEvents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Idle Events</span>
                <span className="font-semibold text-blue-400">{analytics.idleEvents}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="glass rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Recent Assessment Activity</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {analytics.recentAttempts.map((day) => (
                <div key={day.date} className="flex justify-between items-center">
                  <span className="text-gray-400">{new Date(day.date).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-700 rounded">
                      <div
                        className="h-full bg-neon-blue rounded"
                        style={{ width: `${Math.min((day.count / 25) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{day.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment Completion Rates */}
          <div className="glass rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Assessment Completion</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {analytics.assessmentCompletion.map((assessment) => (
                <div key={assessment.assessmentId} className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{assessment.title}</div>
                    <div className="text-xs text-gray-400">
                      Avg Score: {Math.round(assessment.averageScore)}%
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-sm font-semibold">{Math.round(assessment.completionRate)}%</div>
                    <div className="w-16 h-2 bg-gray-700 rounded">
                      <div
                        className="h-full bg-neon-green rounded"
                        style={{ width: `${assessment.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 glass rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/assessments"
              className="p-4 bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 hover:from-neon-blue/30 hover:to-neon-purple/30 rounded-lg border border-neon-blue/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">📋</div>
                <div>
                  <div className="font-medium">Manage Assessments</div>
                  <div className="text-xs text-gray-400">Create and edit assessments</div>
                </div>
              </div>
            </Link>

            <Link
              href="/admin"
              className="p-4 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 hover:from-neon-purple/30 hover:to-neon-pink/30 rounded-lg border border-neon-purple/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">👥</div>
                <div>
                  <div className="font-medium">Team Management</div>
                  <div className="text-xs text-gray-400">Manage hackathon teams</div>
                </div>
              </div>
            </Link>

            <Link
              href="/proctor/monitor"
              className="p-4 bg-gradient-to-br from-neon-green/20 to-neon-blue/20 hover:from-neon-green/30 hover:to-neon-blue/30 rounded-lg border border-neon-green/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">👁️</div>
                <div>
                  <div className="font-medium">Proctor Monitor</div>
                  <div className="text-xs text-gray-400">Monitor assessment sessions</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AnalyticsDashboard() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AnalyticsDashboardContent />
    </RoleGuard>
  );
}
