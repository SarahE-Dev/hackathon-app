'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { assessmentsAPI, attemptsAPI, gradesAPI, teamsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useNotifications } from '@/contexts/NotificationContext';
import { IQuestion } from '@/components/questions/QuestionRenderer';

interface Assessment {
  id: string;
  title: string;
  description?: string;
  settings?: {
    timeLimit?: number;
    proctoring?: {
      enabled: boolean;
      requireWebcam: boolean;
      detectTabSwitch: boolean;
      preventCopyPaste: boolean;
    };
  };
  questions?: IQuestion[];
  totalPoints: number;
  createdAt: string;
}

interface Attempt {
  id: string;
  assessmentId: string;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  status: 'in_progress' | 'submitted' | 'graded';
}

interface Team {
  id: string;
  name: string;
  memberIds: string[];
  leaderId: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser, isAdmin, isProctor, isJudge, isAuthenticated, logout } = useAuthStore();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<Map<string, Attempt>>(new Map());
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'in_progress' | 'completed'>('available');

  useEffect(() => {
    const initializeDashboard = async () => {
      // Use authStore instead of manual localStorage reads
      if (!isAuthenticated || !authUser) {
        router.push('/auth/login');
        return;
      }

      try {
        // Fetch assessments
        const assessmentsData = await assessmentsAPI.getAll();
        const assessmentsList = assessmentsData.data?.assessments || [];
        setAssessments(Array.isArray(assessmentsList) ? assessmentsList : []);

        // Fetch user's attempts to determine status
        try {
          const attemptsData = await attemptsAPI.getAll();

          const attemptsMap = new Map();
          const attemptsList = attemptsData.data?.attempts || attemptsData.data || [];
          if (Array.isArray(attemptsList)) {
            attemptsList.forEach((attempt: Attempt) => {
              attemptsMap.set(attempt.assessmentId, attempt);
            });
          }
          setAttempts(attemptsMap);

          // Check for newly graded assessments and show notifications
          const gradedAttempts = attemptsList.filter((a: Attempt) => a.status === 'graded') || [];
          if (gradedAttempts.length > 0) {
            gradedAttempts.forEach((attempt: Attempt) => {
              const assessment = assessmentsList.find((a: Assessment) => a.id === attempt.assessmentId);
              if (assessment) {
                addNotification({
                  type: 'success',
                  title: 'Assessment Graded',
                  message: `${assessment.title} has been graded. Click to view results.`,
                  action: {
                    label: 'View Results',
                    onClick: () => router.push(`/assessment/${attempt.id}/results`)
                  }
                });
              }
            });
          }
        } catch (attemptsErr) {
          console.warn('Could not load attempts, treating all as available:', attemptsErr);
          setAttempts(new Map());
        }

        // Fetch user's team (if any)
        try {
          const teamsData = await teamsAPI.getAllTeams();
          const teams = teamsData.data?.teams || [];
          const userTeamData = teams.find((team: Team) => team.memberIds?.includes(authUser.id) || team.leaderId === authUser.id);
          setUserTeam(userTeamData || null);
        } catch (teamErr) {
          console.warn('Could not load team data:', teamErr);
          setUserTeam(null);
        }
      } catch (err: any) {
        console.error('Error loading dashboard:', err);
        setError(err.response?.data?.message || 'Failed to load assessments');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [router, isAuthenticated, authUser, addNotification]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even on error
      router.push('/auth/login');
    }
  };

  const handleStartAssessment = async (assessmentId: string) => {
    try {
      const response = await attemptsAPI.start(assessmentId);
      console.log('Start assessment response:', response);

      const attemptId = response.data?.id || response.data?.attempt?._id;
      if (attemptId) {
        // Redirect to the correct assessment page with attempt ID
        router.push(`/assessment/${attemptId}`);
      } else {
        throw new Error('No attempt ID returned from server');
      }
    } catch (err: any) {
      console.error('Start assessment error:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to start assessment');
    }
  };

  const getAssessmentStatus = (assessmentId: string) => {
    const attempt = attempts.get(assessmentId);
    if (!attempt) return 'available';
    if (attempt.status === 'in_progress') return 'in_progress';
    return 'completed';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'border-neon-blue/40 bg-neon-blue/5';
      case 'in_progress':
        return 'border-neon-purple/40 bg-neon-purple/5';
      case 'completed':
        return 'border-neon-green/40 bg-neon-green/5';
      default:
        return 'border-gray-600/40 bg-gray-600/5';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50';
      case 'in_progress':
        return 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50';
      case 'completed':
        return 'bg-neon-green/20 text-neon-green border border-neon-green/50';
      default:
        return 'bg-gray-600/20 text-gray-300 border border-gray-600/50';
    }
  };

  const filterAssessments = (status: string) => {
    return assessments.filter((assessment) => getAssessmentStatus(assessment.id) === status);
  };

  const availableCount = filterAssessments('available').length;
  const inProgressCount = filterAssessments('in_progress').length;
  const completedCount = filterAssessments('completed').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Render different dashboards based on role
  const renderDashboard = () => {
    if (isAdmin()) {
      return <AdminDashboard />;
    } else if (isProctor()) {
      return <ProctorDashboard />;
    } else if (isJudge()) {
      return <JudgeDashboard />;
    } else {
      return <StudentDashboard />;
    }
  };

  // Admin Dashboard Component
  const AdminDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">⚙️ Admin Control Panel</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/assessments">
          <div className="glass p-6 rounded-xl border border-red-500/30 hover:border-red-500 transition-all cursor-pointer">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-xl font-bold mb-2">Manage Assessments</h3>
            <p className="text-gray-400 text-sm">Create, edit, and publish assessments</p>
          </div>
        </Link>
        <Link href="/admin/sessions">
          <div className="glass p-6 rounded-xl border border-orange-500/30 hover:border-orange-500 transition-all cursor-pointer">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-xl font-bold mb-2">Manage Sessions</h3>
            <p className="text-gray-400 text-sm">Control live coding sessions</p>
          </div>
        </Link>
        <Link href="/admin/analytics">
          <div className="glass p-6 rounded-xl border border-purple-500/30 hover:border-purple-500 transition-all cursor-pointer">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-bold mb-2">Analytics</h3>
            <p className="text-gray-400 text-sm">View platform statistics</p>
          </div>
        </Link>
      </div>
    </div>
  );

  // Proctor Dashboard Component
  const ProctorDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">👁️ Proctor Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/proctor/monitor">
          <div className="glass p-6 rounded-xl border border-orange-500/30 hover:border-orange-500 transition-all cursor-pointer">
            <div className="text-4xl mb-3">📹</div>
            <h3 className="text-xl font-bold mb-2">Monitor Sessions</h3>
            <p className="text-gray-400 text-sm">Watch live assessment attempts</p>
          </div>
        </Link>
        <Link href="/admin/assessments">
          <div className="glass p-6 rounded-xl border border-blue-500/30 hover:border-blue-500 transition-all cursor-pointer">
            <div className="text-4xl mb-3">✍️</div>
            <h3 className="text-xl font-bold mb-2">Grade Submissions</h3>
            <p className="text-gray-400 text-sm">Review and grade assessments</p>
          </div>
        </Link>
      </div>
    </div>
  );

  // Judge Dashboard Component
  const JudgeDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">⚖️ Judge Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/judge">
          <div className="glass p-6 rounded-xl border border-purple-500/30 hover:border-purple-500 transition-all cursor-pointer">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="text-xl font-bold mb-2">View Submissions</h3>
            <p className="text-gray-400 text-sm">Evaluate hackathon projects</p>
          </div>
        </Link>
        <Link href="/hackathon/sessions">
          <div className="glass p-6 rounded-xl border border-green-500/30 hover:border-green-500 transition-all cursor-pointer">
            <div className="text-4xl mb-3">🎮</div>
            <h3 className="text-xl font-bold mb-2">Active Sessions</h3>
            <p className="text-gray-400 text-sm">Monitor ongoing competitions</p>
          </div>
        </Link>
      </div>
    </div>
  );

  // Student Dashboard Component
  const StudentDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🎓 Student Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/assessments">
          <div className="glass p-6 rounded-xl border border-neon-blue/40 hover:border-neon-blue transition-all cursor-pointer">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-xl font-bold mb-2">Available Assessments</h3>
            <p className="text-gray-400 text-sm">{assessments.length} assessments ready</p>
          </div>
        </Link>
        {userTeam ? (
          <Link href="/hackathon/teams">
            <div className="glass p-6 rounded-xl border border-neon-purple/40 hover:border-neon-purple transition-all cursor-pointer">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="text-xl font-bold mb-2">Team: {userTeam.name}</h3>
              <p className="text-gray-400 text-sm">Join your team hackathon</p>
            </div>
          </Link>
        ) : (
          <div className="glass p-6 rounded-xl border border-yellow-500/40">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-xl font-bold mb-2">No Team</h3>
            <p className="text-gray-400 text-sm">Contact admin to join a team</p>
          </div>
        )}
      </div>
      <div className="glass p-6 rounded-xl border border-neon-green/30">
        <h3 className="text-lg font-bold mb-4">📈 Your Progress</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Attempts:</span>
            <span className="font-bold">{attempts.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">In Progress:</span>
            <span className="font-bold text-neon-purple">{inProgressCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Completed:</span>
            <span className="font-bold text-neon-green">{completedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-dark-800 to-dark-900 border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gradient">Dashboard</h1>
              <p className="text-gray-400 mt-1">
                Welcome back, {authUser?.firstName}! 
                {isAdmin() && <span className="ml-2 text-red-400">(Admin)</span>}
                {isProctor() && !isAdmin() && <span className="ml-2 text-orange-400">(Proctor)</span>}
                {isJudge() && !isAdmin() && !isProctor() && <span className="ml-2 text-purple-400">(Judge)</span>}
                {!isAdmin() && !isProctor() && !isJudge() && <span className="ml-2 text-green-400">(Student)</span>}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <button
                onClick={handleLogout}
                className="px-6 py-2 bg-dark-700 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Role-Based Dashboard Content */}
        {renderDashboard()}

        {/* Quick Links */}
        <div className="text-center pb-8 mt-8">
          <div className="flex justify-center gap-4 text-sm text-gray-400">
            <Link href="/assessments" className="hover:text-neon-blue transition-colors">
              View Assessments
            </Link>
            <span>•</span>
            <Link href="/hackathon/teams" className="hover:text-neon-blue transition-colors">
              Team Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
