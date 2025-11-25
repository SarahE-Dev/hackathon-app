'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import LiveCodingSession from '@/components/LiveCodingSession';
import { teamsAPI } from '@/lib/api';

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

interface SubmitFormData {
  repoUrl: string;
  demoUrl: string;
  videoUrl: string;
  track: string;
  projectExplanation: string;
  technicalApproach: string;
  challengesOvercome: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState<SubmitFormData>({
    repoUrl: '',
    demoUrl: '',
    videoUrl: '',
    track: '',
    projectExplanation: '',
    technicalApproach: '',
    challengesOvercome: '',
  });

  useEffect(() => {
    const initializePage = async () => {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        router.push('/auth/login');
        return;
      }

      const user = JSON.parse(userData);

      try {
        // Fetch team details
        const teamResponse = await axios.get(`${API_URL}/api/teams/${teamId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const teamData = teamResponse.data.data.team;
        setTeam(teamData);

        // Populate form with existing data
        setFormData({
          repoUrl: teamData.repoUrl || '',
          demoUrl: teamData.demoUrl || '',
          videoUrl: teamData.videoUrl || '',
          track: teamData.track || '',
          projectExplanation: teamData.projectExplanation || '',
          technicalApproach: teamData.technicalApproach || '',
          challengesOvercome: teamData.challengesOvercome || '',
        });


        // Fetch coding problems for hackathon
        const problemsResponse = await axios.get(`${API_URL}/api/questions`, {
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
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <p className="text-green-400 font-medium">✓ Project Submitted</p>
                      <p className="text-sm text-gray-300 mt-2">
                        Submitted at: {new Date(team.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    {/* Show submitted details */}
                    <div className="space-y-3">
                      {team.repoUrl && (
                        <div>
                          <span className="text-gray-400 text-sm">Repository:</span>
                          <a href={team.repoUrl} target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline ml-2">{team.repoUrl}</a>
                        </div>
                      )}
                      {team.demoUrl && (
                        <div>
                          <span className="text-gray-400 text-sm">Demo:</span>
                          <a href={team.demoUrl} target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline ml-2">{team.demoUrl}</a>
                        </div>
                      )}
                      {team.videoUrl && (
                        <div>
                          <span className="text-gray-400 text-sm">Video:</span>
                          <a href={team.videoUrl} target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline ml-2">{team.videoUrl}</a>
                        </div>
                      )}
                      {team.projectExplanation && (
                        <div className="mt-4">
                          <h4 className="text-gray-400 text-sm mb-2">Project Explanation:</h4>
                          <div className="bg-dark-700 p-4 rounded-lg whitespace-pre-wrap text-gray-300 text-sm">{team.projectExplanation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setSubmitting(true);
                    setSubmitError('');
                    try {
                      await teamsAPI.submitProject(teamId, formData);
                      // Refresh team data to show submitted state
                      const teamResponse = await axios.get(`${API_URL}/api/teams/${teamId}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
                      });
                      setTeam(teamResponse.data.data.team);
                    } catch (err: any) {
                      setSubmitError(err.response?.data?.error?.message || 'Failed to submit project');
                    } finally {
                      setSubmitting(false);
                    }
                  }} className="space-y-6">
                    {submitError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400">
                        {submitError}
                      </div>
                    )}

                    {/* URL Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Repository URL *</label>
                        <input
                          type="url"
                          required
                          placeholder="https://github.com/..."
                          value={formData.repoUrl}
                          onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                          className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Demo URL</label>
                        <input
                          type="url"
                          placeholder="https://your-demo.com"
                          value={formData.demoUrl}
                          onChange={(e) => setFormData({ ...formData, demoUrl: e.target.value })}
                          className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Video URL</label>
                        <input
                          type="url"
                          placeholder="https://youtube.com/..."
                          value={formData.videoUrl}
                          onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                          className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Track/Category</label>
                        <input
                          type="text"
                          placeholder="e.g., Social Impact, Education, Health"
                          value={formData.track}
                          onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                          className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none"
                        />
                      </div>
                    </div>

                    {/* Markdown Explanation Fields */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Project Explanation *
                        <span className="text-gray-400 font-normal ml-2">(Markdown supported)</span>
                      </label>
                      <p className="text-xs text-gray-400 mb-2">
                        Describe what your project does, the problem it solves, and how users can benefit from it.
                      </p>
                      <textarea
                        required
                        rows={6}
                        placeholder="# My Project&#10;&#10;## What it does&#10;Describe your project...&#10;&#10;## Problem it solves&#10;Explain the problem..."
                        value={formData.projectExplanation}
                        onChange={(e) => setFormData({ ...formData, projectExplanation: e.target.value })}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Technical Approach
                        <span className="text-gray-400 font-normal ml-2">(Markdown supported)</span>
                      </label>
                      <p className="text-xs text-gray-400 mb-2">
                        Explain your technical architecture, key design decisions, and technologies used.
                      </p>
                      <textarea
                        rows={5}
                        placeholder="## Architecture&#10;- Frontend: React + Next.js&#10;- Backend: Node.js + Express&#10;&#10;## Key Design Decisions&#10;..."
                        value={formData.technicalApproach}
                        onChange={(e) => setFormData({ ...formData, technicalApproach: e.target.value })}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Challenges Overcome
                        <span className="text-gray-400 font-normal ml-2">(Markdown supported)</span>
                      </label>
                      <p className="text-xs text-gray-400 mb-2">
                        Describe the challenges you faced during development and how you solved them.
                      </p>
                      <textarea
                        rows={4}
                        placeholder="## Challenge 1: Real-time sync&#10;We faced issues with...&#10;&#10;## Solution&#10;We implemented..."
                        value={formData.challengesOvercome}
                        onChange={(e) => setFormData({ ...formData, challengesOvercome: e.target.value })}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none font-mono text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg font-medium hover:shadow-lg hover:shadow-neon-blue/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Submit Project'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

