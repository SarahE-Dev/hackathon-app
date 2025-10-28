'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import LiveCodingSession from '@/components/LiveCodingSession';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'code' | 'problems' | 'submit'>('code');

  useEffect(() => {
    const initializePage = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        router.push('/auth/login');
        return;
      }

      try {
        // Fetch team details
        const teamResponse = await axios.get(`${API_URL}/api/teams/${teamId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setTeam(teamResponse.data.data.team);

        // Fetch coding problems for hackathon
        const problemsResponse = await axios.get(`${API_URL}/api/assessments/questions/list`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const codingProblems = (problemsResponse.data.data?.questions || [])
          .filter((q: any) => q.type === 'coding')
          .slice(0, 5);
        setProblems(codingProblems);
        
        // Set the first problem as selected by default
        if (codingProblems.length > 0) {
          setSelectedProblem(codingProblems[0]);
        }
      } catch (error) {
        console.error('Error loading team:', error);
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

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <p className="text-red-400">Team not found</p>
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
              href="/hackathon/teams"
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
            >
              ← Back to Teams
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

            {/* Available Problems */}
            <div className="glass rounded-2xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4 text-gradient">Problems</h2>
              <div className="space-y-2">
                {problems.map((problem) => (
                  <div
                    key={problem._id}
                    className="p-3 bg-dark-700 rounded-lg border border-gray-700 hover:border-neon-blue/50 cursor-pointer transition-all"
                  >
                    <p className="font-medium text-sm text-white truncate">{problem.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs font-medium ${
                        problem.difficulty === 'easy' ? 'text-green-400' :
                        problem.difficulty === 'medium' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {problem.difficulty.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">{problem.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Tabs */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b border-gray-800">
              {(['members', 'code', 'problems', 'submit'] as const).map((tab) => (
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
            {activeTab === 'code' && team && (
              <LiveCodingSession
                teamId={team.name}
                problemTitle={selectedProblem?.title || team.projectTitle}
                problem={selectedProblem || undefined}
              />
            )}

            {activeTab === 'members' && (
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
            )}

            {activeTab === 'problems' && (
              <div className="glass rounded-2xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Available Problems</h3>
                <div className="space-y-3">
                  {problems.map((problem) => (
                    <div
                      key={problem._id}
                      className={`p-4 bg-dark-700 rounded-lg border transition-all cursor-pointer ${
                        selectedProblem?._id === problem._id 
                          ? 'border-neon-blue bg-neon-blue/10' 
                          : 'border-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedProblem(problem)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{problem.title}</h4>
                          <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                            {problem.content?.prompt?.substring(0, 150)}...
                          </p>
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
                            <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                              {problem.content?.language || 'Python'}
                            </span>
                            {problem.metadata?.codewarsId && (
                              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                                Codewars
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedProblem?._id === problem._id && (
                          <div className="ml-4 text-neon-blue">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedProblem && (
                  <div className="mt-6 p-4 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
                    <h4 className="font-semibold text-neon-blue mb-2">Selected Problem</h4>
                    <p className="text-gray-300 text-sm">
                      {selectedProblem.title} - Ready to code! Switch to the Code tab to start working.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'submit' && (
              <div className="glass rounded-2xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold mb-4">Submit Project</h3>
                {team.submittedAt ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <p className="text-green-400 font-medium">✓ Project Submitted</p>
                    <p className="text-sm text-gray-300 mt-2">
                      Submitted at: {new Date(team.submittedAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Repository URL</label>
                      <input
                        type="url"
                        placeholder="https://github.com/..."
                        className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Demo URL</label>
                      <input
                        type="url"
                        placeholder="https://your-demo.com"
                        className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Video URL</label>
                      <input
                        type="url"
                        placeholder="https://youtube.com/..."
                        className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none"
                      />
                    </div>
                    <button className="w-full py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg font-medium hover:shadow-lg hover:shadow-neon-blue/50 transition-all">
                      Submit Project
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

