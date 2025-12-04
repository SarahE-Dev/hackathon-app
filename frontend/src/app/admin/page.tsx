'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useAuthStore } from '@/store/authStore';
import { teamsAPI, usersAPI, assessmentsAPI, hackathonSessionsAPI, attemptsAPI } from '@/lib/api';

interface DashboardStats {
  totalTeams: number;
  totalParticipants: number;
  totalJudges: number;
  submittedProjects: number;
  totalAssessments: number;
  activeSessions: number;
}

interface Team {
  _id: string;
  name: string;
  memberIds: any[];
  projectTitle?: string;
  submittedAt?: string;
  track?: string;
}

interface Assessment {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  totalPoints: number;
  settings?: {
    timeLimit?: number;
  };
}

interface HackathonSession {
  _id: string;
  title: string;
  status: string;
  description?: string;
  problems?: any[];
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
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalTeams: 0,
    totalParticipants: 0,
    totalJudges: 0,
    submittedProjects: 0,
    totalAssessments: 0,
    activeSessions: 0,
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [sessions, setSessions] = useState<HackathonSession[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'manage' | 'test'>('overview');
  const [startingTest, setStartingTest] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch teams
      const teamsResponse = await teamsAPI.getAllTeams();
      const teamsData = teamsResponse?.data?.teams || teamsResponse?.teams || (Array.isArray(teamsResponse) ? teamsResponse : []);

      // Fetch users
      const usersResponse = await usersAPI.getAllUsers();
      const usersData = usersResponse?.data?.users || usersResponse?.users || (Array.isArray(usersResponse) ? usersResponse : []);

      // Fetch assessments
      let assessmentsCount = 0;
      let assessmentsList: Assessment[] = [];
      try {
        const assessmentsResponse = await assessmentsAPI.getAll();
        assessmentsList = assessmentsResponse.data?.assessments || [];
        assessmentsCount = Array.isArray(assessmentsList) ? assessmentsList.length : 0;
        setAssessments(Array.isArray(assessmentsList) ? assessmentsList : []);
      } catch (e) {
        console.warn('Could not load assessments count');
      }

      // Fetch sessions
      let activeSessionsCount = 0;
      let sessionsList: HackathonSession[] = [];
      try {
        const sessionsResponse = await hackathonSessionsAPI.getAll();
        sessionsList = sessionsResponse.data?.sessions || [];
        activeSessionsCount = sessionsList.filter((s: any) => s.status === 'active' || s.status === 'paused').length;
        setSessions(sessionsList);
      } catch (e) {
        console.warn('Could not load sessions count');
      }

      // Calculate stats
      const submittedProjects = teamsData.filter((t: Team) => t.submittedAt).length;
      const totalParticipants = teamsData.reduce((sum: number, t: Team) => sum + (t.memberIds?.length || 0), 0);
      const totalJudges = usersData.filter((u: User) =>
        u.roles?.some(r => r.role === 'judge' || r.role === 'Judge')
      ).length;

      setAllUsers(usersData);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setStats({
        totalTeams: teamsData.length,
        totalParticipants,
        totalJudges,
        submittedProjects,
        totalAssessments: assessmentsCount,
        activeSessions: activeSessionsCount,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to start testing an assessment
  const handleTestAssessment = async (assessmentId: string) => {
    try {
      setStartingTest(assessmentId);
      const response = await attemptsAPI.start(assessmentId);
      const attemptId = response.data?.id || response.data?.attempt?._id;
      if (attemptId) {
        router.push(`/assessment/${attemptId}`);
      } else {
        throw new Error('No attempt ID returned');
      }
    } catch (err: any) {
      console.error('Error starting test:', err);
      alert(err.response?.data?.error?.message || 'Failed to start assessment test');
    } finally {
      setStartingTest(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin dashboard...</p>
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
              <div className="flex items-center gap-3">
                <span className="text-3xl">👑</span>
                <div>
                  <h1 className="text-3xl font-bold text-gradient">Admin Dashboard</h1>
                  <p className="text-gray-400 text-sm">JTC Staff Control Panel</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all text-sm"
              >
                ← Main Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'create', label: 'Create New', icon: '➕' },
              { id: 'manage', label: 'Manage', icon: '⚙️' },
              { id: 'test', label: 'Test Mode', icon: '🧪' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-4 font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-neon-blue text-neon-blue bg-neon-blue/5'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="glass rounded-xl p-4 border border-neon-blue/20">
                <div className="text-2xl mb-1">👥</div>
                <p className="text-3xl font-bold text-neon-blue">{stats.totalTeams}</p>
                <p className="text-xs text-gray-400">Teams</p>
              </div>
              <div className="glass rounded-xl p-4 border border-neon-purple/20">
                <div className="text-2xl mb-1">🎓</div>
                <p className="text-3xl font-bold text-neon-purple">{stats.totalParticipants}</p>
                <p className="text-xs text-gray-400">Participants</p>
              </div>
              <div className="glass rounded-xl p-4 border border-neon-pink/20">
                <div className="text-2xl mb-1">⚖️</div>
                <p className="text-3xl font-bold text-neon-pink">{stats.totalJudges}</p>
                <p className="text-xs text-gray-400">Judges</p>
              </div>
              <div className="glass rounded-xl p-4 border border-neon-green/20">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-3xl font-bold text-neon-green">{stats.submittedProjects}</p>
                <p className="text-xs text-gray-400">Submitted</p>
              </div>
              <div className="glass rounded-xl p-4 border border-yellow-500/20">
                <div className="text-2xl mb-1">📝</div>
                <p className="text-3xl font-bold text-yellow-400">{stats.totalAssessments}</p>
                <p className="text-xs text-gray-400">Assessments</p>
              </div>
              <div className="glass rounded-xl p-4 border border-orange-500/20">
                <div className="text-2xl mb-1">🔴</div>
                <p className="text-3xl font-bold text-orange-400">{stats.activeSessions}</p>
                <p className="text-xs text-gray-400">Live Sessions</p>
              </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Link href="/admin/sessions" className="glass rounded-xl p-5 border border-neon-purple/30 hover:border-neon-purple transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-neon-purple/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    🎯
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Hackathons</h3>
                    <p className="text-xs text-gray-400">Manage live sessions</p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/questions" className="glass rounded-xl p-5 border border-yellow-500/30 hover:border-yellow-500 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    📚
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Question Bank</h3>
                    <p className="text-xs text-gray-400">View all problems</p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/questions/new" className="glass rounded-xl p-5 border border-neon-green/30 hover:border-neon-green transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-neon-green/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    💡
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Add Problem</h3>
                    <p className="text-xs text-gray-400">Create new problem</p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/teams" className="glass rounded-xl p-5 border border-neon-pink/30 hover:border-neon-pink transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-neon-pink/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    👥
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Manage Teams</h3>
                    <p className="text-xs text-gray-400">Assign fellows</p>
                  </div>
                </div>
              </Link>

              <Link href="/admin/users" className="glass rounded-xl p-5 border border-neon-blue/30 hover:border-neon-blue transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-neon-blue/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    👤
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Users & Roles</h3>
                    <p className="text-xs text-gray-400">Manage access</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Admin Capabilities */}
            <h2 className="text-xl font-bold mb-4">Your Admin Capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Content Management */}
              <div className="glass rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-neon-blue">📚</span> Content Management
                </h3>
                <div className="space-y-2">
                  <Link href="/admin/assessments" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Assessments</span>
                      <span className="text-neon-blue">→</span>
                    </div>
                  </Link>
                  <Link href="/admin/questions" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Question Bank</span>
                      <span className="text-neon-blue">→</span>
                    </div>
                  </Link>
                  <Link href="/admin/sessions" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Hackathon Sessions</span>
                      <span className="text-neon-blue">→</span>
                    </div>
                  </Link>
                  <Link href="/admin/judge-documentation" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Judge Documentation</span>
                      <span className="text-neon-blue">→</span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* User & Team Management */}
              <div className="glass rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-neon-purple">👥</span> People Management
                </h3>
                <div className="space-y-2">
                  <Link href="/admin/users?filter=fellow" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Fellows</span>
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                          {allUsers.filter(u => u.roles?.some(r => r.role === 'fellow')).length}
                        </span>
                      </div>
                      <span className="text-neon-purple">→</span>
                    </div>
                  </Link>
                  <Link href="/admin/users?filter=judge" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Judges</span>
                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                          {stats.totalJudges}
                        </span>
                      </div>
                      <span className="text-neon-purple">→</span>
                    </div>
                  </Link>
                  <Link href="/admin/teams" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Teams</span>
                        <span className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded-full">
                          {teams.length}
                        </span>
                      </div>
                      <span className="text-neon-purple">→</span>
                    </div>
                  </Link>
                  <Link href="/admin/users" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">All Users & Roles</span>
                      <span className="text-neon-purple">→</span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Judging & Leaderboard */}
              <div className="glass rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-neon-green">⚖️</span> Judging & Results
                </h3>
                <div className="space-y-2">
                  <Link href="/judge" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Judge Submissions</span>
                      <span className="text-neon-green">→</span>
                    </div>
                  </Link>
                  <Link href="/hackathon/leaderboard" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Leaderboard</span>
                      <span className="text-neon-green">→</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Teams */}
            <h2 className="text-xl font-bold mb-4">Recent Teams</h2>
            <div className="glass rounded-xl border border-gray-700 overflow-hidden">
              {teams.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-3">👥</div>
                  <p>No teams created yet</p>
                  <Link href="/admin/teams" className="text-neon-blue hover:underline text-sm mt-2 inline-block">
                    Create a team →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {teams.slice(0, 5).map((team) => (
                    <div key={team._id} className="p-4 hover:bg-dark-700 transition-all flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        {team.projectTitle && <p className="text-sm text-gray-400">{team.projectTitle}</p>}
                        <p className="text-xs text-gray-500">{team.memberIds?.length || 0} members</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {team.submittedAt && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                            Submitted
                          </span>
                        )}
                        <Link
                          href={`/hackathon/teams/${team._id}`}
                          className="px-3 py-1 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 rounded text-sm transition-all"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {teams.length > 5 && (
                <div className="p-4 bg-dark-800 text-center">
                  <Link href="/admin/teams" className="text-neon-blue hover:underline text-sm">
                    View all {teams.length} teams →
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'create' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Assessment */}
            <Link href="/admin/assessments/new" className="glass rounded-2xl p-8 border-2 border-neon-blue/30 hover:border-neon-blue transition-all group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📝</div>
              <h3 className="text-2xl font-bold mb-2 text-neon-blue">Create Assessment</h3>
              <p className="text-gray-400 mb-4">
                Build a new coding assessment with multiple question types, time limits, and proctoring settings.
              </p>
              <ul className="text-sm text-gray-400 space-y-1 mb-4">
                <li>• Multiple choice & coding questions</li>
                <li>• Time limits & attempt restrictions</li>
                <li>• Proctoring & anti-cheating measures</li>
                <li>• Auto-grading for coding problems</li>
              </ul>
              <div className="inline-flex items-center gap-2 text-neon-blue font-medium">
                Get Started <span>→</span>
              </div>
            </Link>

            {/* Create Hackathon Session */}
            <Link href="/admin/sessions" className="glass rounded-2xl p-8 border-2 border-neon-purple/30 hover:border-neon-purple transition-all group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎯</div>
              <h3 className="text-2xl font-bold mb-2 text-neon-purple">Create Hackathon</h3>
              <p className="text-gray-400 mb-4">
                Start a live coding competition where teams solve problems in real-time.
              </p>
              <ul className="text-sm text-gray-400 space-y-1 mb-4">
                <li>• Live coding sessions</li>
                <li>• Team-based competitions</li>
                <li>• Real-time leaderboards</li>
                <li>• Session monitoring & control</li>
              </ul>
              <div className="inline-flex items-center gap-2 text-neon-purple font-medium">
                Get Started <span>→</span>
              </div>
            </Link>

            {/* Add Problem */}
            <Link href="/admin/questions/new" className="glass rounded-2xl p-8 border-2 border-neon-green/30 hover:border-neon-green transition-all group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">💡</div>
              <h3 className="text-2xl font-bold mb-2 text-neon-green">Add Problem</h3>
              <p className="text-gray-400 mb-4">
                Create a new coding problem for assessments or hackathon sessions.
              </p>
              <ul className="text-sm text-gray-400 space-y-1 mb-4">
                <li>• Python coding challenges</li>
                <li>• Test case validation</li>
                <li>• Difficulty levels</li>
                <li>• Solution templates</li>
              </ul>
              <div className="inline-flex items-center gap-2 text-neon-green font-medium">
                Get Started <span>→</span>
              </div>
            </Link>

            {/* Manage Teams */}
            <Link href="/admin/teams" className="glass rounded-2xl p-8 border-2 border-neon-pink/30 hover:border-neon-pink transition-all group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👥</div>
              <h3 className="text-2xl font-bold mb-2 text-neon-pink">Manage Teams</h3>
              <p className="text-gray-400 mb-4">
                Organize fellows into teams for hackathon competitions.
              </p>
              <ul className="text-sm text-gray-400 space-y-1 mb-4">
                <li>• Create and name teams</li>
                <li>• Drag-and-drop assignment</li>
                <li>• Move fellows between teams</li>
                <li>• Track assignment status</li>
              </ul>
              <div className="inline-flex items-center gap-2 text-neon-pink font-medium">
                Get Started <span>→</span>
              </div>
            </Link>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-6">
            {/* Content Management */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">📚 Content Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/admin/assessments" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neon-blue/20 rounded-lg flex items-center justify-center text-xl">📝</div>
                    <div>
                      <h4 className="font-semibold">Assessments</h4>
                      <p className="text-xs text-gray-400">View & edit all assessments</p>
                    </div>
                  </div>
                </Link>
                <Link href="/admin/questions" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neon-purple/20 rounded-lg flex items-center justify-center text-xl">💡</div>
                    <div>
                      <h4 className="font-semibold">Question Bank</h4>
                      <p className="text-xs text-gray-400">Manage all problems</p>
                    </div>
                  </div>
                </Link>
                <Link href="/admin/sessions" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neon-green/20 rounded-lg flex items-center justify-center text-xl">🎯</div>
                    <div>
                      <h4 className="font-semibold">Hackathon Sessions</h4>
                      <p className="text-xs text-gray-400">Control live sessions</p>
                    </div>
                  </div>
                </Link>
                <Link href="/admin/judge-documentation" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center text-xl">📚</div>
                    <div>
                      <h4 className="font-semibold">Judge Docs</h4>
                      <p className="text-xs text-gray-400">Rubrics, FAQs & guides</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* People Management */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">👥 People Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/admin/users" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neon-pink/20 rounded-lg flex items-center justify-center text-xl">👤</div>
                    <div>
                      <h4 className="font-semibold">Users</h4>
                      <p className="text-xs text-gray-400">Manage users & assign roles</p>
                    </div>
                  </div>
                </Link>
                <Link href="/admin/teams" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center text-xl">👥</div>
                    <div>
                      <h4 className="font-semibold">Teams</h4>
                      <p className="text-xs text-gray-400">Manage team assignments</p>
                    </div>
                  </div>
                </Link>
                <Link href="/admin/analytics" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center text-xl">📊</div>
                    <div>
                      <h4 className="font-semibold">Analytics</h4>
                      <p className="text-xs text-gray-400">View platform statistics</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Judging & Results */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">⚖️ Judging & Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/judge" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-xl">⚖️</div>
                    <div>
                      <h4 className="font-semibold">Judge Submissions</h4>
                      <p className="text-xs text-gray-400">Review & score team code</p>
                    </div>
                  </div>
                </Link>
                <Link href="/hackathon/leaderboard" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center text-xl">🏆</div>
                    <div>
                      <h4 className="font-semibold">Leaderboard</h4>
                      <p className="text-xs text-gray-400">View rankings by team</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="space-y-8">
            {/* Test Mode Header */}
            <div className="glass rounded-xl p-6 border border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🧪</span>
                <div>
                  <h2 className="text-xl font-bold text-yellow-400">Admin Test Mode</h2>
                  <p className="text-sm text-gray-400">Test assessments and hackathon setups as if you were a student</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">
                Use this section to verify that assessments and hackathon sessions are set up correctly before students access them.
                Your test attempts will be recorded but clearly marked as admin tests.
              </p>
            </div>

            {/* Test Assessments */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-neon-blue">📝</span> Test Assessments
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Take any assessment to verify questions, time limits, and scoring work correctly.
              </p>

              {assessments.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-dark-800 rounded-lg">
                  <div className="text-4xl mb-3">📋</div>
                  <p>No assessments created yet</p>
                  <Link href="/admin/assessments/new" className="text-neon-blue hover:underline text-sm mt-2 inline-block">
                    Create your first assessment →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.id || assessment._id}
                      className="p-4 bg-dark-700 rounded-lg border border-gray-600 hover:border-neon-blue/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{assessment.title}</h4>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            {assessment.settings?.timeLimit && (
                              <span>⏱️ {assessment.settings.timeLimit} min</span>
                            )}
                            <span>📊 {assessment.totalPoints} pts</span>
                          </div>
                          {assessment.description && (
                            <p className="text-sm text-gray-400 mt-2 line-clamp-1">{assessment.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/assessments/${assessment.id || assessment._id}/builder`}
                            className="px-3 py-2 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded text-sm transition-all"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleTestAssessment(assessment.id || assessment._id || '')}
                            disabled={startingTest === (assessment.id || assessment._id)}
                            className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white rounded text-sm font-medium transition-all disabled:opacity-50"
                          >
                            {startingTest === (assessment.id || assessment._id) ? 'Starting...' : 'Take Test'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test Hackathon Sessions */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-neon-purple">🎯</span> Hackathon Sessions
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Manage your hackathon sessions. To test the live coding experience, view a team's space below.
              </p>

              {sessions.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-dark-800 rounded-lg">
                  <div className="text-4xl mb-3">🎯</div>
                  <p>No hackathon sessions created yet</p>
                  <Link href="/admin/sessions" className="text-neon-purple hover:underline text-sm mt-2 inline-block">
                    Create a hackathon session →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session._id}
                      className="p-4 bg-dark-700 rounded-lg border border-gray-600 hover:border-neon-purple/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white">{session.title}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              session.status === 'active'
                                ? 'bg-green-500/20 text-green-400'
                                : session.status === 'paused'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            <span>💡 {session.problems?.length || 0} problems</span>
                          </div>
                          {session.description && (
                            <p className="text-sm text-gray-400 mt-2 line-clamp-1">{session.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/hackathons/${session._id}`}
                            className="px-3 py-2 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded text-sm transition-all"
                          >
                            Roster
                          </Link>
                          <Link
                            href={`/admin/sessions`}
                            className="px-4 py-2 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/50 text-neon-purple rounded text-sm font-medium transition-all"
                          >
                            Manage Sessions
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test Teams - View Team Space */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-neon-green">👥</span> Preview Team Spaces
              </h3>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-400">
                  ⚠️ <strong>Note:</strong> Viewing a team space as admin will join you to that team's chat/presence. 
                  However, problem access is tracked per-user in localStorage, so your actions won't affect the team's actual progress.
                </p>
              </div>

              {teams.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-dark-800 rounded-lg">
                  <div className="text-4xl mb-3">👥</div>
                  <p>No teams created yet</p>
                  <Link href="/admin/teams" className="text-neon-green hover:underline text-sm mt-2 inline-block">
                    Create a team →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.slice(0, 6).map((team) => (
                    <div
                      key={team._id}
                      className="p-4 bg-dark-700 rounded-lg border border-gray-600 hover:border-neon-green/50 transition-all"
                    >
                      <h4 className="font-semibold text-white mb-2">{team.name}</h4>
                      {team.track && (
                        <span className="inline-block px-2 py-0.5 bg-neon-blue/20 text-neon-blue text-xs rounded-full mb-2">
                          {team.track}
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mb-3">{team.memberIds?.length || 0} members</p>
                      <Link
                        href={`/hackathon/teams/${team._id}`}
                        className="inline-block px-3 py-1.5 bg-neon-green/20 hover:bg-neon-green/30 border border-neon-green/50 text-neon-green rounded text-sm transition-all"
                      >
                        Preview Team Space →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              {teams.length > 6 && (
                <div className="mt-4 text-center">
                  <Link href="/admin/teams" className="text-neon-green hover:underline text-sm">
                    View all {teams.length} teams →
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Test Links */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-neon-pink">⚡</span> Quick Test Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/admin/teams" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all text-center">
                  <div className="text-2xl mb-2">👥</div>
                  <p className="font-medium">Team Management</p>
                  <p className="text-xs text-gray-400 mt-1">Assign fellows to teams</p>
                </Link>
                <Link href="/judge" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all text-center">
                  <div className="text-2xl mb-2">⚖️</div>
                  <p className="font-medium">Judge View</p>
                  <p className="text-xs text-gray-400 mt-1">Review submissions</p>
                </Link>
                <Link href="/hackathon/leaderboard" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all text-center">
                  <div className="text-2xl mb-2">🏆</div>
                  <p className="font-medium">Leaderboard</p>
                  <p className="text-xs text-gray-400 mt-1">View rankings</p>
                </Link>
                <Link href="/dashboard" className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all text-center">
                  <div className="text-2xl mb-2">🎓</div>
                  <p className="font-medium">Fellow Dashboard</p>
                  <p className="text-xs text-gray-400 mt-1">See fellow view</p>
                </Link>
              </div>
            </div>
          </div>
        )}
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
