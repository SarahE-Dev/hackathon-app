'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { assessmentsAPI, attemptsAPI, teamsAPI, hackathonSessionsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useNotifications } from '@/contexts/NotificationContext';

interface Assessment {
  id: string;
  title: string;
  description?: string;
  settings?: {
    timeLimit?: number;
    proctoring?: {
      enabled: boolean;
    };
  };
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
  _id: string;
  name: string;
  organizationId: string;
  memberIds: string[];
  projectTitle?: string;
  description?: string;
  track?: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  submittedAt?: string;
  disqualified: boolean;
}

interface HackathonSession {
  _id: string;
  title: string;
  status: string;
  description?: string;
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

  useEffect(() => {
    const initializeDashboard = async () => {
      if (!isAuthenticated || !authUser) {
        router.push('/auth/login');
        return;
      }

      // Role-based redirect for admin/proctor/judge
      if (isAdmin()) {
        router.push('/admin');
        return;
      }
      if (isProctor()) {
        router.push('/proctor');
        return;
      }
      if (isJudge()) {
        router.push('/judge');
        return;
      }

      try {
        // Fetch assessments
        const assessmentsData = await assessmentsAPI.getAll();
        const assessmentsList = assessmentsData.data?.assessments || [];
        // Map _id to id if needed
        const mappedAssessments = (Array.isArray(assessmentsList) ? assessmentsList : []).map((a: any) => ({
          ...a,
          id: a.id || a._id,
        }));
        setAssessments(mappedAssessments);

        // Fetch user's attempts
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

          // Notify about graded assessments
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
          console.warn('Could not load attempts:', attemptsErr);
          setAttempts(new Map());
        }

        // Fetch user's team
        try {
          const teamsData = await teamsAPI.getAllTeams();
          const teams = teamsData.data?.teams || teamsData || [];
          const teamsList = Array.isArray(teams) ? teams : [];
          const userTeamData = teamsList.find((team: Team) => {
            // memberIds might be populated objects or just IDs
            const memberIdStrings = team.memberIds?.map((m: any) =>
              typeof m === 'string' ? m : m._id?.toString() || m.toString()
            ) || [];
            return memberIdStrings.includes(authUser.id?.toString());
          });
          setUserTeam(userTeamData || null);
        } catch (teamErr) {
          console.warn('Could not load team data:', teamErr);
          setUserTeam(null);
        }

      } catch (err: any) {
        console.error('Error loading dashboard:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [router, isAuthenticated, authUser, addNotification, isAdmin, isJudge, isProctor]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  const handleStartAssessment = async (assessmentId: string) => {
    try {
      console.log('Starting assessment with ID:', assessmentId);
      if (!assessmentId) {
        throw new Error('Assessment ID is required');
      }
      const response = await attemptsAPI.start(assessmentId);
      const attemptId = response.data?.id || response.data?.attempt?._id || response.data?._id;
      console.log('Start response:', response);
      if (attemptId) {
        router.push(`/assessment/${attemptId}`);
      } else {
        throw new Error('No attempt ID returned from server');
      }
    } catch (err: any) {
      console.error('Start assessment error:', err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to start assessment');
    }
  };

  const getAssessmentStatus = (assessmentId: string) => {
    const attempt = attempts.get(assessmentId);
    if (!attempt) return 'available';
    if (attempt.status === 'in_progress') return 'in_progress';
    return 'completed';
  };

  const availableCount = assessments.filter(a => getAssessmentStatus(a.id) === 'available').length;
  const inProgressCount = assessments.filter(a => getAssessmentStatus(a.id) === 'in_progress').length;
  const completedCount = assessments.filter(a => getAssessmentStatus(a.id) === 'completed').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-green mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your dashboard...</p>
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
                <span className="text-3xl">🎓</span>
                <div>
                  <h1 className="text-3xl font-bold text-gradient">Fellow Dashboard</h1>
                  <p className="text-gray-400 text-sm">Welcome back, {authUser?.firstName}! Ready to code?</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-dark-700 border border-gray-600 text-gray-400 rounded-lg hover:bg-dark-600 hover:text-white transition-all text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Welcome Banner - Action-oriented */}
        {inProgressCount > 0 && (
          <div className="glass rounded-xl p-5 border border-neon-green/30 bg-neon-green/5 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="font-semibold text-neon-green">You have {inProgressCount} assessment{inProgressCount !== 1 ? 's' : ''} in progress</p>
                  <p className="text-sm text-gray-400">Continue where you left off</p>
                </div>
              </div>
              <Link
                href="/assessments"
                className="px-4 py-2 bg-neon-green hover:bg-neon-green/80 text-white rounded-lg font-medium transition-all text-sm"
              >
                Continue Assessment
              </Link>
            </div>
          </div>
        )}

        {/* Progress Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-5 border border-neon-blue/20 hover:border-neon-blue/40 transition-all">
            <div className="text-2xl mb-2">📋</div>
            <p className="text-3xl font-bold text-neon-blue">{availableCount}</p>
            <p className="text-sm text-gray-400">Available Assessments</p>
          </div>
          <div className="glass rounded-xl p-5 border border-neon-purple/20 hover:border-neon-purple/40 transition-all">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-3xl font-bold text-neon-purple">{inProgressCount}</p>
            <p className="text-sm text-gray-400">In Progress</p>
          </div>
          <div className="glass rounded-xl p-5 border border-neon-green/20 hover:border-neon-green/40 transition-all">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-3xl font-bold text-neon-green">{completedCount}</p>
            <p className="text-sm text-gray-400">Completed</p>
          </div>
          <div className="glass rounded-xl p-5 border border-orange-500/20 hover:border-orange-500/40 transition-all">
            <div className="text-2xl mb-2">🏆</div>
            <p className="text-3xl font-bold text-orange-400">{userTeam ? 1 : 0}</p>
            <p className="text-sm text-gray-400">Team{userTeam ? '' : 's'}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Assessments & Team */}
          <div className="lg:col-span-2 space-y-6">
            {/* Your Team */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>👥</span> Your Team
              </h2>
              {userTeam ? (
                <div className="p-5 bg-gradient-to-r from-neon-purple/10 to-neon-blue/10 rounded-xl border border-neon-purple/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-neon-purple/20 rounded-xl flex items-center justify-center text-2xl">
                        🏆
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{userTeam.name}</h3>
                        <p className="text-sm text-gray-400">
                          {userTeam.memberIds?.length || 0} team member{userTeam.memberIds?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/hackathon/teams/${userTeam._id}`}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-lg font-medium transition-all shadow-lg shadow-neon-purple/20"
                    >
                      <span>🚀</span> Join Team Space
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-dark-700/30 rounded-lg border border-gray-600 text-center">
                  <div className="text-4xl mb-3">👥</div>
                  <h3 className="text-lg font-bold text-gray-300 mb-2">No Team Yet</h3>
                  <p className="text-sm text-gray-400">
                    You'll be assigned to a team when the hackathon begins. Stay tuned!
                  </p>
                </div>
              )}
            </div>

            {/* Available Assessments */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>📝</span> Your Assessments
                </h2>
                <span className="text-sm text-gray-500">{assessments.length} total</span>
              </div>

              {assessments.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <div className="text-4xl mb-3">📋</div>
                  <p>No assessments available yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assessments.slice(0, 5).map((assessment) => {
                    const status = getAssessmentStatus(assessment.id);
                    const attempt = attempts.get(assessment.id);

                    return (
                      <div
                        key={assessment.id}
                        className={`p-4 rounded-lg border transition-all ${
                          status === 'completed'
                            ? 'bg-green-500/5 border-green-500/30'
                            : status === 'in_progress'
                            ? 'bg-purple-500/5 border-purple-500/30'
                            : 'bg-dark-700 border-gray-600 hover:border-neon-blue/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{assessment.title}</h3>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                              {assessment.settings?.timeLimit && (
                                <span>⏱️ {assessment.settings.timeLimit} min</span>
                              )}
                              <span>📊 {assessment.totalPoints} pts</span>
                              {assessment.settings?.proctoring?.enabled && (
                                <span className="text-yellow-400">📹 Proctored</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {status === 'completed' && (
                              <>
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                  {attempt?.score !== undefined ? `${attempt.score}/${assessment.totalPoints}` : 'Completed'}
                                </span>
                                {attempt && (
                                  <Link
                                    href={`/assessment/${attempt.id}/results`}
                                    className="px-3 py-1 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 rounded text-sm transition-all"
                                  >
                                    Results
                                  </Link>
                                )}
                              </>
                            )}
                            {status === 'in_progress' && attempt && (
                              <>
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                                  In Progress
                                </span>
                                <Link
                                  href={`/assessment/${attempt.id}`}
                                  className="px-3 py-1 bg-neon-purple hover:bg-neon-purple/80 text-white rounded text-sm transition-all"
                                >
                                  Continue
                                </Link>
                              </>
                            )}
                            {status === 'available' && (
                              <button
                                onClick={() => handleStartAssessment(assessment.id)}
                                className="px-3 py-1 bg-neon-green hover:bg-neon-green/80 text-white rounded text-sm transition-all"
                              >
                                Start
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Progress & Resources */}
          <div className="space-y-6">
            {/* Progress Summary */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Your Progress</h2>
              <div className="space-y-4">
                <div className="p-4 bg-neon-blue/10 rounded-lg border border-neon-blue/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Assessments</span>
                    <span className="text-xl font-bold text-neon-blue">{completedCount}/{assessments.length}</span>
                  </div>
                  <div className="w-full bg-dark-700 rounded-full h-2">
                    <div
                      className="bg-neon-blue h-2 rounded-full transition-all"
                      style={{ width: `${assessments.length > 0 ? (completedCount / assessments.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {userTeam && (
                  <div className="p-4 bg-neon-purple/10 rounded-lg border border-neon-purple/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-400">Hackathon Team</span>
                        <p className="font-semibold text-white mt-1">{userTeam.name}</p>
                      </div>
                      <span className="text-2xl">👥</span>
                    </div>
                  </div>
                )}

                {inProgressCount > 0 && (
                  <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-400">In Progress</span>
                        <p className="font-semibold text-yellow-400 mt-1">{inProgressCount} assessment{inProgressCount !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="text-2xl">⏱️</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tips & Info */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Tips for Success</h2>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-neon-blue/10 rounded-lg border border-neon-blue/20">
                  <p className="flex items-start gap-2">
                    <span>💡</span>
                    <span className="text-gray-300">Read each question carefully before coding. Plan your approach first!</span>
                  </p>
                </div>
                <div className="p-3 bg-neon-purple/10 rounded-lg border border-neon-purple/20">
                  <p className="flex items-start gap-2">
                    <span>⏱️</span>
                    <span className="text-gray-300">Remember: you can only view each problem once. Choose wisely!</span>
                  </p>
                </div>
                <div className="p-3 bg-neon-green/10 rounded-lg border border-neon-green/20">
                  <p className="flex items-start gap-2">
                    <span>🧪</span>
                    <span className="text-gray-300">Test your code with edge cases before submitting.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="glass rounded-xl p-5 border border-gray-700 bg-dark-800/50">
              <p className="text-sm text-gray-400 text-center">
                Need help? Contact your instructor or program admin for assistance.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
