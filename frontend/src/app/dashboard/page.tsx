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
  id: string;
  _id?: string;
  name: string;
  memberIds: string[];
  leaderId: string;
  projectTitle?: string;
  track?: string;
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
  const [activeSessions, setActiveSessions] = useState<HackathonSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      if (!isAuthenticated || !authUser) {
        router.push('/auth/login');
        return;
      }

      // Role-based redirect for admin/judge
      if (isAdmin()) {
        router.push('/admin');
        return;
      }
      if (isJudge() || isProctor()) {
        router.push('/judge');
        return;
      }

      try {
        // Fetch assessments
        const assessmentsData = await assessmentsAPI.getAll();
        const assessmentsList = assessmentsData.data?.assessments || [];
        setAssessments(Array.isArray(assessmentsList) ? assessmentsList : []);

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
          const userTeamData = teamsList.find((team: Team) =>
            team.memberIds?.includes(authUser.id) || team.leaderId === authUser.id
          );
          setUserTeam(userTeamData || null);
        } catch (teamErr) {
          console.warn('Could not load team data:', teamErr);
          setUserTeam(null);
        }

        // Fetch active hackathon sessions
        try {
          const sessionsResponse = await hackathonSessionsAPI.getAll();
          const sessions = sessionsResponse.data?.sessions || [];
          const active = sessions.filter((s: HackathonSession) => s.status === 'active');
          setActiveSessions(active);
        } catch (sessionErr) {
          console.warn('Could not load sessions:', sessionErr);
          setActiveSessions([]);
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
      const response = await attemptsAPI.start(assessmentId);
      const attemptId = response.data?.id || response.data?.attempt?._id;
      if (attemptId) {
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
                  <p className="text-gray-400 text-sm">Welcome back, {authUser?.firstName}!</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-dark-700 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-all text-sm"
              >
                Logout
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

        {/* Progress Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-5 border border-neon-blue/20">
            <div className="text-2xl mb-2">📋</div>
            <p className="text-3xl font-bold text-neon-blue">{availableCount}</p>
            <p className="text-sm text-gray-400">Available</p>
          </div>
          <div className="glass rounded-xl p-5 border border-neon-purple/20">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-3xl font-bold text-neon-purple">{inProgressCount}</p>
            <p className="text-sm text-gray-400">In Progress</p>
          </div>
          <div className="glass rounded-xl p-5 border border-neon-green/20">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-3xl font-bold text-neon-green">{completedCount}</p>
            <p className="text-sm text-gray-400">Completed</p>
          </div>
          <div className="glass rounded-xl p-5 border border-orange-500/20">
            <div className="text-2xl mb-2">🔴</div>
            <p className="text-3xl font-bold text-orange-400">{activeSessions.length}</p>
            <p className="text-sm text-gray-400">Live Sessions</p>
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
                <div className="p-4 bg-neon-purple/10 rounded-lg border border-neon-purple/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-neon-purple">{userTeam.name}</h3>
                      {userTeam.projectTitle && (
                        <p className="text-sm text-gray-400 mt-1">Project: {userTeam.projectTitle}</p>
                      )}
                      {userTeam.track && (
                        <span className="inline-block mt-2 px-2 py-1 bg-neon-blue/20 text-neon-blue text-xs rounded-full">
                          {userTeam.track}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/hackathon/teams/${userTeam._id || userTeam.id}`}
                      className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded-lg text-sm transition-all"
                    >
                      View Team →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-yellow-500/10 rounded-lg border border-yellow-500/30 text-center">
                  <div className="text-4xl mb-3">⚠️</div>
                  <h3 className="text-lg font-bold text-yellow-400 mb-2">Not on a Team</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    You haven't been assigned to a hackathon team yet. Contact an admin to get added to a team.
                  </p>
                  <Link
                    href="/hackathon/teams"
                    className="inline-block px-4 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg text-sm transition-all"
                  >
                    Browse Teams
                  </Link>
                </div>
              )}
            </div>

            {/* Available Assessments */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>📝</span> Assessments
                </h2>
                <Link href="/assessments" className="text-neon-blue hover:underline text-sm">
                  View All →
                </Link>
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

          {/* Right Column - Quick Actions & Sessions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/assessments"
                  className="block p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neon-blue/20 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      📋
                    </div>
                    <div>
                      <p className="font-semibold">Browse Assessments</p>
                      <p className="text-xs text-gray-400">View all available tests</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/hackathon/teams"
                  className="block p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neon-purple/20 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      👥
                    </div>
                    <div>
                      <p className="font-semibold">Hackathon Teams</p>
                      <p className="text-xs text-gray-400">View all teams</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/hackathon/sessions"
                  className="block p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neon-green/20 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      🎯
                    </div>
                    <div>
                      <p className="font-semibold">Coding Sessions</p>
                      <p className="text-xs text-gray-400">Join live challenges</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/assessments/history"
                  className="block p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neon-pink/20 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      📈
                    </div>
                    <div>
                      <p className="font-semibold">My History</p>
                      <p className="text-xs text-gray-400">View past attempts</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-red-500 animate-pulse">●</span> Live Sessions
              </h2>
              {activeSessions.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <p className="text-sm">No active sessions right now</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <Link
                      key={session._id}
                      href={`/hackathon/session/${session._id}`}
                      className="block p-4 bg-gradient-to-r from-neon-green/10 to-neon-blue/10 rounded-lg border border-neon-green/30 hover:border-neon-green transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{session.title}</h3>
                          <p className="text-xs text-gray-400 mt-1">
                            {session.description?.slice(0, 50)}...
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full animate-pulse">
                          LIVE
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                href="/hackathon/sessions"
                className="block mt-4 text-center text-sm text-neon-blue hover:underline"
              >
                View All Sessions →
              </Link>
            </div>

            {/* Help */}
            <div className="glass rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Need Help?</h2>
              <div className="space-y-3 text-sm text-gray-400">
                <p className="flex items-start gap-2">
                  <span>❓</span>
                  <span>Contact your instructor or admin if you have questions about assessments.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span>👥</span>
                  <span>If you need to join a team, ask an admin to add you.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span>🐛</span>
                  <span>Report any technical issues to the platform administrators.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
