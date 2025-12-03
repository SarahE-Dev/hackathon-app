'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import LiveCodingSession from '@/components/LiveCodingSession';
import { teamsAPI, hackathonSessionsAPI, questionsAPI } from '@/lib/api';

interface TeamMember {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Team {
  _id: string;
  name: string;
  projectTitle: string;
  description: string;
  memberIds: TeamMember[];
  track?: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  projectExplanation?: string;
  technicalApproach?: string;
  challengesOvercome?: string;
  submittedAt?: string;
  disqualified: boolean;
}

interface Problem {
  _id: string;
  title: string;
  difficulty: string;
  points: number;
  content: {
    prompt: string;
    language: string;
    codeTemplate?: string;
    testCases?: Array<{
      id: string;
      input: string;
      expectedOutput: string;
      isHidden: boolean;
      points: number;
      timeLimit?: number;
      memoryLimit?: number;
    }>;
  };
  tags?: string[];
  metadata?: {
    codewarsId?: string;
    codewarsDifficulty?: number;
    codewarsStats?: {
      totalAttempts: number;
      totalCompleted: number;
      successRate: string;
    };
  };
}

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'code'>('overview');
  const [viewedProblems, setViewedProblems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Fetch team details through shared API client so auth headers are attached
        const teamResponse = await teamsAPI.getTeamById(teamId);
        const teamData = teamResponse.data?.team || teamResponse.data?.data?.team;

        if (!teamData) {
          throw new Error('Team not found');
        }
        setTeam(teamData);

        // Fetch active hackathon session for this team
        const sessionsResponse = await hackathonSessionsAPI.getAll();
        const sessions = sessionsResponse.data?.sessions || sessionsResponse.data?.data?.sessions || [];
        const activeSession = sessions.find((s: any) => {
          if (s.status !== 'active') return false;
          // Teams can be populated objects or just IDs
          const teamIds = s.teams?.map((t: any) => typeof t === 'string' ? t : t._id?.toString() || t.toString()) || [];
          return teamIds.includes(teamId);
        });

        if (activeSession) {
          // Fetch full problem details for each problem in the session
          const problemIds = activeSession.problems.map((p: any) => p.problemId);
          const problemPromises = problemIds.map((id: string) => questionsAPI.getById(id));

          const problemResponses = await Promise.all(problemPromises);
          const sessionProblems = problemResponses.map((res, index) => ({
            ...(res.data?.question || res.data?.data?.question),
            order: activeSession.problems[index].order,
            points: activeSession.problems[index].points,
          }));

          // Sort by order
          sessionProblems.sort((a: any, b: any) => a.order - b.order);
          setProblems(sessionProblems);

          // Don't auto-select first problem - user must explicitly choose
        } else {
          console.warn('No active session found for this team');
          setProblems([]);
        }
      } catch (error: any) {
        console.error('Error loading team:', error);
        const message = error.response?.data?.error?.message || error.message || 'Failed to load team data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [teamId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <p className="text-gray-400 text-sm mb-4">Your session may have expired.</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-2 bg-neon-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">Team not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-neon-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
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
              <h1 className="text-3xl font-bold text-gradient">{team.name}</h1>
              <p className="text-gray-400 mt-1">{team.projectTitle}</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Team Info */}
          <div className="lg:col-span-1">
            {/* Team Members */}
            <div className="glass rounded-2xl p-6 border border-gray-800 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gradient">Team Members</h2>
              <div className="space-y-3">
                {team.memberIds.map((member) => (
                  <div
                    key={member._id}
                    className="p-3 bg-dark-700 rounded-lg border border-gray-700"
                  >
                    <p className="font-medium text-white">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                    <div className="mt-2 w-2 h-2 bg-green-500 rounded-full inline-block"></div>
                    <span className="text-xs text-green-400 ml-2">Online</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Tabs */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b border-gray-800">
              {(['overview', 'problems', 'code'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-medium transition-all ${
                    activeTab === tab
                      ? 'text-neon-blue border-b-2 border-neon-blue'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Team Overview Card */}
                <div className="glass rounded-2xl p-6 border border-gray-800">
                  <h3 className="text-2xl font-bold mb-2">{team.name}</h3>
                  <p className="text-gray-400 mb-4">{team.description}</p>

                  {/* Live Coding CTA */}
                  <div className="mt-6 p-5 bg-gradient-to-r from-neon-green/10 to-neon-blue/10 rounded-xl border border-neon-green/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-neon-green mb-1">Ready to Code Together?</h4>
                        <p className="text-sm text-gray-400">
                          Start a live collaborative coding session with your team
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('code')}
                        className="px-6 py-3 bg-neon-green hover:bg-neon-green/80 text-white rounded-lg font-medium transition-all whitespace-nowrap"
                      >
                        Start Live Coding →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="glass rounded-2xl p-6 border border-gray-800">
                  <h3 className="text-xl font-bold mb-4">Team Members</h3>
                  <div className="space-y-3">
                    {team.memberIds.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-4 bg-dark-700 rounded-lg border border-gray-700"
                      >
                        <div>
                          <p className="font-medium">{member.firstName} {member.lastName}</p>
                          <p className="text-sm text-gray-400">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-400">Active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'problems' && (
              <div className="glass rounded-2xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Coding Problems</h3>
                <p className="text-sm text-gray-400 mb-4">
                  ⚠️ You can only view each problem once. Choose carefully!
                </p>
                <div className="space-y-3">
                  {problems.map((problem, index) => {
                    const isViewed = viewedProblems.has(problem._id);
                    const isLocked = isViewed && selectedProblem?._id !== problem._id;

                    return (
                      <div
                        key={problem._id}
                        className={`p-4 rounded-lg border transition-all ${
                          isLocked
                            ? 'bg-dark-800/50 border-gray-800 opacity-50 cursor-not-allowed'
                            : selectedProblem?._id === problem._id
                              ? 'border-neon-blue bg-neon-blue/10 cursor-pointer'
                              : 'bg-dark-700 border-gray-700 hover:border-gray-500 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!isLocked) {
                            setSelectedProblem(problem);
                            setViewedProblems(prev => new Set(prev).add(problem._id));
                            setActiveTab('code'); // Auto-switch to code tab
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-500">#{index + 1}</span>
                              <h4 className="font-semibold text-white">{problem.title}</h4>
                              {isViewed && (
                                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                                  ✓ Viewed
                                </span>
                              )}
                            </div>
                            {!isLocked && (
                              <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                {problem.content?.prompt?.substring(0, 150)}...
                              </p>
                            )}
                            {isLocked && (
                              <p className="text-gray-500 text-sm mt-1">
                                🔒 Problem already viewed. You cannot view it again.
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                problem.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                problem.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {problem.difficulty.toUpperCase()}
                              </span>
                              <span className="text-xs bg-neon-blue/20 text-neon-blue px-2 py-1 rounded">
                                {problem.points} points
                              </span>
                            </div>
                          </div>
                          {selectedProblem?._id === problem._id && !isLocked && (
                            <div className="ml-4 text-neon-green">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {isLocked && (
                            <div className="ml-4 text-gray-600">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {problems.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p>No problems assigned to this team's session yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'code' && team && (
              <LiveCodingSession
                teamId={team._id}
                problemTitle={selectedProblem?.title || team.projectTitle}
                problem={selectedProblem || undefined}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
