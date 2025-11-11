'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { assessmentsAPI, attemptsAPI, gradesAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Assessment {
  id: string;
  title: string;
  description?: string;
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

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser, isAdmin, isProctor, isJudge, isAuthenticated } = useAuthStore();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<Map<string, Attempt>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'in_progress' | 'completed'>('available');

  useEffect(() => {
    const initializeDashboard = async () => {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        router.push('/auth/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      try {
        // Fetch assessments
        const assessmentsData = await assessmentsAPI.getAll();
        const assessmentsList = assessmentsData.data?.assessments || [];
        setAssessments(Array.isArray(assessmentsList) ? assessmentsList : []);

        // Fetch user's attempts to determine status
        try {
          const attemptsData = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/attempts/my-attempts`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
          }).then(r => r.json());

          const attemptsMap = new Map();
          if (attemptsData.data && Array.isArray(attemptsData.data)) {
            attemptsData.data.forEach((attempt: Attempt) => {
              attemptsMap.set(attempt.assessmentId, attempt);
            });
          }
          setAttempts(attemptsMap);
        } catch (attemptsErr) {
          console.warn('Could not load attempts, treating all as available:', attemptsErr);
          setAttempts(new Map());
        }
      } catch (err: any) {
        console.error('Error loading dashboard:', err);
        setError(err.response?.data?.message || 'Failed to load assessments');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('auth-storage');
    router.push('/auth/login');
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

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-dark-800 to-dark-900 border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gradient">Dashboard</h1>
              <p className="text-gray-400 mt-1">Welcome back, {user?.firstName}!</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-dark-700 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
            >
              Logout
            </button>
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

        {/* Role-Based Quick Actions */}
        {(isAdmin() || isProctor() || isJudge()) && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isAdmin() && (
                <>
                  <Link href="/admin">
                    <div className="glass rounded-xl p-6 border border-neon-blue/40 hover:border-neon-blue transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-neon-blue/20 rounded-lg flex items-center justify-center text-2xl">
                          ⚙️
                        </div>
                        <h3 className="text-lg font-bold">Admin Dashboard</h3>
                      </div>
                      <p className="text-gray-400 text-sm">Manage users, teams, and judges</p>
                    </div>
                  </Link>
                  <Link href="/admin/sessions">
                    <div className="glass rounded-xl p-6 border border-neon-blue/40 hover:border-neon-blue transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-neon-blue/20 rounded-lg flex items-center justify-center text-2xl">
                          💻
                        </div>
                        <h3 className="text-lg font-bold">Hackathon Sessions</h3>
                      </div>
                      <p className="text-gray-400 text-sm">Manage live coding sessions</p>
                    </div>
                  </Link>
                  <Link href="/judge">
                    <div className="glass rounded-xl p-6 border border-neon-purple/40 hover:border-neon-purple transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-neon-purple/20 rounded-lg flex items-center justify-center text-2xl">
                          ⚖️
                        </div>
                        <h3 className="text-lg font-bold">Judge Dashboard</h3>
                      </div>
                      <p className="text-gray-400 text-sm">Review and score projects</p>
                    </div>
                  </Link>
                </>
              )}
              {isProctor() && !isAdmin() && (
                <Link href="/proctor">
                  <div className="glass rounded-xl p-6 border border-neon-pink/40 hover:border-neon-pink transition-all cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-neon-pink/20 rounded-lg flex items-center justify-center text-2xl">
                        👁️
                      </div>
                      <h3 className="text-lg font-bold">Proctor Dashboard</h3>
                    </div>
                    <p className="text-gray-400 text-sm">Monitor hackathon sessions</p>
                  </div>
                </Link>
              )}
              {isJudge() && !isAdmin() && !isProctor() && (
                <Link href="/judge">
                  <div className="glass rounded-xl p-6 border border-neon-purple/40 hover:border-neon-purple transition-all cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-neon-purple/20 rounded-lg flex items-center justify-center text-2xl">
                        ⚖️
                      </div>
                      <h3 className="text-lg font-bold">Judge Dashboard</h3>
                    </div>
                    <p className="text-gray-400 text-sm">Review and score hackathon projects</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* JTC Hackathon Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">🚀 JTC Hackathon 2025</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/hackathon/sessions">
              <div className="glass rounded-xl p-8 border border-neon-blue/40 hover:border-neon-blue/70 transition-all cursor-pointer group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/10 to-neon-purple/10 opacity-0 group-hover:opacity-100 transition-all"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gradient mb-3">Live Coding Sessions</h3>
                      <p className="text-gray-300 mb-4">
                        Join active hackathon sessions and compete with your team in real-time coding challenges.
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                        <div className="flex items-center gap-2">
                          <span>💻</span>
                          <span>Live Coding</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🎯</span>
                          <span>Multiple Problems</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📊</span>
                          <span>Live Leaderboard</span>
                        </div>
                      </div>
                      <button className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg font-medium hover:shadow-lg hover:shadow-neon-blue/50 transition-all group-hover:scale-105">
                        View Sessions →
                      </button>
                    </div>
                    <div className="text-5xl opacity-60 group-hover:opacity-100 transition-all">💻</div>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/hackathon/teams">
              <div className="glass rounded-xl p-8 border border-neon-purple/40 hover:border-neon-purple/70 transition-all cursor-pointer group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 opacity-0 group-hover:opacity-100 transition-all"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gradient mb-3">Teams & Projects</h3>
                      <p className="text-gray-300 mb-4">
                        Browse all teams, view submitted projects, and check out what other teams are building.
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                        <div className="flex items-center gap-2">
                          <span>👥</span>
                          <span>7 Teams</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🚀</span>
                          <span>Project Showcase</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🏆</span>
                          <span>Competition</span>
                        </div>
                      </div>
                      <button className="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-lg font-medium hover:shadow-lg hover:shadow-neon-purple/50 transition-all group-hover:scale-105">
                        Browse Teams →
                      </button>
                    </div>
                    <div className="text-5xl opacity-60 group-hover:opacity-100 transition-all">👥</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Assessments Section Header */}
        <h2 className="text-2xl font-bold text-white mb-6">📋 Assessments</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-xl p-4 border border-neon-blue/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Available</p>
                <p className="text-3xl font-bold text-neon-blue">{availableCount}</p>
              </div>
              <div className="text-4xl opacity-50">📋</div>
            </div>
          </div>

          <div className="glass rounded-xl p-4 border border-neon-purple/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">In Progress</p>
                <p className="text-3xl font-bold text-neon-purple">{inProgressCount}</p>
              </div>
              <div className="text-4xl opacity-50">⏳</div>
            </div>
          </div>

          <div className="glass rounded-xl p-4 border border-neon-green/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-3xl font-bold text-neon-green">{completedCount}</p>
              </div>
              <div className="text-4xl opacity-50">✓</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10">
          {[
            { key: 'available', label: 'Available', count: availableCount },
            { key: 'in_progress', label: 'In Progress', count: inProgressCount },
            { key: 'completed', label: 'Completed', count: completedCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-3 border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-neon-blue text-neon-blue'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label} {tab.count > 0 && <span className="ml-1 text-xs">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Assessments Section */}
        <div className="mb-12">
          {filterAssessments(activeTab).length === 0 ? (
            <div className="glass rounded-xl p-8 border border-white/10 text-center">
              <div className="text-4xl mb-3 opacity-50">🎯</div>
              <p className="text-gray-400">No {activeTab} assessments</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filterAssessments(activeTab).map((assessment) => {
                const status = getAssessmentStatus(assessment.id);
                const attempt = attempts.get(assessment.id);
                const dueDate = new Date(assessment.createdAt);

                return (
                  <div
                    key={assessment.id}
                    className={`glass rounded-xl p-6 border transition-all hover:border-opacity-100 ${getStatusColor(
                      status
                    )}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-white">{assessment.title}</h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                              status
                            )}`}
                          >
                            {status === 'available'
                              ? 'Available'
                              : status === 'in_progress'
                              ? 'In Progress'
                              : 'Completed'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-3">
                          {assessment.description || 'No description provided'}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <div key={`${assessment.id}-points`}>📌 {assessment.totalPoints} points</div>
                          <div key={`${assessment.id}-date`}>📅 {dueDate.toLocaleDateString()}</div>
                          {attempt && status !== 'available' && (
                            <div key={`${assessment.id}-started`}>
                              ⏱️ Started {new Date(attempt.startedAt).toLocaleDateString()}
                            </div>
                          )}
                          {attempt?.status === 'graded' && attempt?.score !== undefined && (
                            <div key={`${assessment.id}-score`} className="text-neon-green font-medium">
                              ✓ Score: {attempt.score}/{assessment.totalPoints}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        {status === 'available' && (
                          <button
                            onClick={() => handleStartAssessment(assessment.id)}
                            className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all glow-blue"
                          >
                            Start
                          </button>
                        )}
                        {status === 'in_progress' && attempt && (
                          <button
                            onClick={() =>
                              router.push(`/assessment/${attempt.id}`)
                            }
                            className="px-4 py-2 bg-neon-purple/20 border border-neon-purple text-neon-purple rounded-lg text-sm font-medium hover:bg-neon-purple/30 transition-all"
                          >
                            Continue
                          </button>
                        )}
                        {status === 'completed' && attempt && (
                          <button
                            onClick={() =>
                              router.push(`/assessment/${attempt.id}`)
                            }
                            className="px-4 py-2 bg-neon-green/20 border border-neon-green text-neon-green rounded-lg text-sm font-medium hover:bg-neon-green/30 transition-all"
                          >
                            View Results
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

        {/* Results Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">📊 Results Summary</h2>
          <div className="glass rounded-xl p-8 border border-neon-pink/20">
            <div className="text-center">
              <div className="text-5xl mb-3">📈</div>
              <h3 className="text-xl font-semibold text-white mb-2">Results Coming Soon</h3>
              <p className="text-gray-400">
                Complete an assessment to see your detailed results, scores, and feedback here.
              </p>
            </div>
          </div>
        </div>


        {/* Back Link */}
        <div className="text-center pb-8">
          <Link href="/" className="text-neon-blue hover:text-neon-blue/80 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
