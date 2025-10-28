'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { assessmentsAPI, attemptsAPI, gradesAPI } from '@/lib/api';

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
      if (response.data?.id) {
        router.push(`/assessments/${assessmentId}/attempt`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start assessment');
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
            <div className="flex gap-3">
              <Link
                href="/hackathon/teams"
                className="px-6 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:shadow-lg hover:shadow-neon-blue/50 transition-all font-medium"
              >
                🚀 JTC Hackathon
              </Link>
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
                          <div>📌 {assessment.totalPoints} points</div>
                          <div>📅 {dueDate.toLocaleDateString()}</div>
                          {attempt && status !== 'available' && (
                            <div>
                              ⏱️ Started {new Date(attempt.startedAt).toLocaleDateString()}
                            </div>
                          )}
                          {attempt?.status === 'graded' && attempt?.score !== undefined && (
                            <div className="text-neon-green font-medium">
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
                        {status === 'in_progress' && (
                          <button
                            onClick={() =>
                              router.push(`/assessments/${assessment.id}/attempt`)
                            }
                            className="px-4 py-2 bg-neon-purple/20 border border-neon-purple text-neon-purple rounded-lg text-sm font-medium hover:bg-neon-purple/30 transition-all"
                          >
                            Continue
                          </button>
                        )}
                        {status === 'completed' && (
                          <button
                            onClick={() =>
                              router.push(`/assessments/${assessment.id}/results`)
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
