'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useAuthStore } from '@/store/authStore';
import { teamsAPI, hackathonSessionsAPI } from '@/lib/api';
import axios from 'axios';

interface Team {
  _id: string;
  name: string;
  memberIds: any[];
  projectTitle?: string;
  description?: string;
  submittedAt?: string;
  track?: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
}

interface JudgeScore {
  teamId: string;
  scores: {
    impact: number;
    technicalDepth: number;
    execution: number;
    ux: number;
    innovation: number;
  };
  totalScore: number;
  notes?: string;
  submittedAt?: string;
}

interface SessionStats {
  activeSessions: number;
  activeTeams: number;
  totalViolations: number;
}

function JudgeDashboardContent() {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [myScores, setMyScores] = useState<Map<string, JudgeScore>>(new Map());
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    activeSessions: 0,
    activeTeams: 0,
    totalViolations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [scoring, setScoring] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'grading' | 'monitoring'>('overview');

  // Scoring state
  const [scores, setScores] = useState({
    impact: 0,
    technicalDepth: 0,
    execution: 0,
    ux: 0,
    innovation: 0,
  });
  const [notes, setNotes] = useState('');
  const [conflictOfInterest, setConflictOfInterest] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch all teams
      const teamsResponse = await teamsAPI.getAllTeams();
      const teamsData = Array.isArray(teamsResponse) ? teamsResponse : [];
      const submittedTeams = teamsData.filter((t: Team) => t.submittedAt);
      setTeams(submittedTeams);

      // Fetch judge's existing scores
      try {
        const scoresResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/judge-scores/judge/${user.id}`
        );
        const scoresMap = new Map<string, JudgeScore>();
        if (scoresResponse.data && Array.isArray(scoresResponse.data)) {
          scoresResponse.data.forEach((score: any) => {
            scoresMap.set(score.teamId, score);
          });
        }
        setMyScores(scoresMap);
      } catch (e) {
        console.warn('Could not load judge scores');
      }

      // Fetch session stats for proctoring
      try {
        const sessionsResponse = await hackathonSessionsAPI.getAll();
        const sessions = sessionsResponse.data?.sessions || [];
        const activeSessions = sessions.filter((s: any) => s.status === 'active' || s.status === 'paused');

        let activeTeams = 0;
        let totalViolations = 0;

        if (activeSessions.length > 0) {
          const activeTeamsResponse = await hackathonSessionsAPI.getActiveSessions();
          const teamSessions = activeTeamsResponse.data?.teamSessions || [];
          activeTeams = teamSessions.length;
          totalViolations = teamSessions.reduce((sum: number, ts: any) => {
            return sum + (ts.tabSwitchCount || 0) + (ts.copyPasteCount || 0) + (ts.fullscreenExitCount || 0) + (ts.idleCount || 0);
          }, 0);
        }

        setSessionStats({
          activeSessions: activeSessions.length,
          activeTeams,
          totalViolations,
        });
      } catch (e) {
        console.warn('Could not load session stats');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreTeam = (team: Team) => {
    setSelectedTeam(team);
    const existingScore = myScores.get(team._id);

    if (existingScore) {
      setScores(existingScore.scores);
      setNotes(existingScore.notes || '');
    } else {
      setScores({
        impact: 0,
        technicalDepth: 0,
        execution: 0,
        ux: 0,
        innovation: 0,
      });
      setNotes('');
    }
    setConflictOfInterest(false);
  };

  const handleSubmitScore = async () => {
    if (!selectedTeam || !user) return;

    if (conflictOfInterest) {
      alert('Please mark your conflict of interest in the notes and do not score this team.');
      return;
    }

    const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);

    if (totalScore === 0) {
      alert('Please provide at least one score before submitting.');
      return;
    }

    try {
      setScoring(true);

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/judge-scores`,
        {
          teamId: selectedTeam._id,
          judgeId: user.id,
          scores,
          notes,
          conflictOfInterest,
        }
      );

      alert('Score submitted successfully!');
      setSelectedTeam(null);
      await loadData();
    } catch (error) {
      console.error('Error submitting score:', error);
      alert('Failed to submit score. Please try again.');
    } finally {
      setScoring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-purple mx-auto mb-4"></div>
          <p className="text-gray-400">Loading judge dashboard...</p>
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
                <span className="text-3xl">⚖️</span>
                <div>
                  <h1 className="text-3xl font-bold text-gradient">Judge Dashboard</h1>
                  <p className="text-gray-400 text-sm">Evaluate & Monitor Submissions</p>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all text-sm"
            >
              ← Main Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'grading', label: 'Grade Projects', icon: '⚖️' },
              { id: 'monitoring', label: 'Monitor Sessions', icon: '👁️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-4 font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-neon-purple text-neon-purple bg-neon-purple/5'
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-xl p-5 border border-neon-purple/20">
                <div className="text-2xl mb-2">📦</div>
                <p className="text-3xl font-bold text-neon-purple">{teams.length}</p>
                <p className="text-sm text-gray-400">Submitted Projects</p>
              </div>
              <div className="glass rounded-xl p-5 border border-neon-blue/20">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-3xl font-bold text-neon-blue">{myScores.size}</p>
                <p className="text-sm text-gray-400">Your Scores</p>
              </div>
              <div className="glass rounded-xl p-5 border border-neon-green/20">
                <div className="text-2xl mb-2">⏳</div>
                <p className="text-3xl font-bold text-neon-green">{teams.length - myScores.size}</p>
                <p className="text-sm text-gray-400">Remaining</p>
              </div>
              <div className="glass rounded-xl p-5 border border-orange-500/20">
                <div className="text-2xl mb-2">🔴</div>
                <p className="text-3xl font-bold text-orange-400">{sessionStats.activeSessions}</p>
                <p className="text-sm text-gray-400">Live Sessions</p>
              </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-xl font-bold mb-4">Your Responsibilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Grading Section */}
              <div className="glass rounded-xl p-6 border border-neon-purple/30">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-neon-purple">⚖️</span> Grading
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Review and score submissions from hackathon teams and assessment attempts.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('grading')}
                    className="w-full p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🏆</span>
                      <div className="text-left">
                        <p className="font-medium">Hackathon Projects</p>
                        <p className="text-xs text-gray-400">{teams.length - myScores.size} awaiting review</p>
                      </div>
                    </div>
                    <span className="text-neon-purple">→</span>
                  </button>
                  <Link href="/judge/grading" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📝</span>
                        <div>
                          <p className="font-medium">Assessment Submissions</p>
                          <p className="text-xs text-gray-400">Review student assessments</p>
                        </div>
                      </div>
                      <span className="text-neon-purple">→</span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Monitoring Section */}
              <div className="glass rounded-xl p-6 border border-neon-green/30">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-neon-green">👁️</span> Monitoring
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Monitor live sessions, track participant progress, and flag any violations.
                </p>
                <div className="space-y-3">
                  <Link href="/proctor/monitor" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔴</span>
                        <div>
                          <p className="font-medium">Live Session Monitor</p>
                          <p className="text-xs text-gray-400">{sessionStats.activeSessions} active sessions</p>
                        </div>
                      </div>
                      <span className="text-neon-green">→</span>
                    </div>
                  </Link>
                  <Link href="/proctor/assessments" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📹</span>
                        <div>
                          <p className="font-medium">Assessment Proctoring</p>
                          <p className="text-xs text-gray-400">Monitor exam attempts</p>
                        </div>
                      </div>
                      <span className="text-neon-green">→</span>
                    </div>
                  </Link>
                  <Link href="/hackathon/sessions" className="block p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎯</span>
                        <div>
                          <p className="font-medium">Session Leaderboards</p>
                          <p className="text-xs text-gray-400">View team rankings</p>
                        </div>
                      </div>
                      <span className="text-neon-green">→</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <h2 className="text-xl font-bold mb-4">Recent Projects to Review</h2>
            <div className="glass rounded-xl border border-gray-700 overflow-hidden">
              {teams.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-3">📦</div>
                  <p>No submitted projects yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {teams.slice(0, 5).map((team) => {
                    const hasScored = myScores.has(team._id);
                    return (
                      <div key={team._id} className="p-4 hover:bg-dark-700 transition-all flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{team.name}</h3>
                          {team.projectTitle && <p className="text-sm text-neon-purple">{team.projectTitle}</p>}
                          {team.track && <span className="text-xs text-gray-500">{team.track}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          {hasScored ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Scored</span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Pending</span>
                          )}
                          <button
                            onClick={() => {
                              handleScoreTeam(team);
                            }}
                            className="px-3 py-1 bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 rounded text-sm transition-all"
                          >
                            {hasScored ? 'Update' : 'Score'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {teams.length > 5 && (
                <div className="p-4 bg-dark-800 text-center">
                  <button onClick={() => setActiveTab('grading')} className="text-neon-purple hover:underline text-sm">
                    View all {teams.length} projects →
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'grading' && (
          <>
            {/* Grading Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass rounded-2xl p-6 border-2 border-neon-purple/20">
                <h3 className="text-gray-400 text-sm font-medium mb-2">Submitted Projects</h3>
                <p className="text-4xl font-bold">{teams.length}</p>
              </div>
              <div className="glass rounded-2xl p-6 border-2 border-neon-blue/20">
                <h3 className="text-gray-400 text-sm font-medium mb-2">Your Scores</h3>
                <p className="text-4xl font-bold">{myScores.size}</p>
              </div>
              <div className="glass rounded-2xl p-6 border-2 border-neon-green/20">
                <h3 className="text-gray-400 text-sm font-medium mb-2">Remaining</h3>
                <p className="text-4xl font-bold">{teams.length - myScores.size}</p>
              </div>
            </div>

            {/* Projects to Score */}
            <h2 className="text-2xl font-bold mb-6">Projects to Review</h2>
            {teams.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center border border-gray-700">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-gray-400">No submitted projects yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => {
                  const hasScored = myScores.has(team._id);
                  const score = myScores.get(team._id);

                  return (
                    <div
                      key={team._id}
                      className={`glass rounded-xl p-6 border-2 transition-all ${
                        hasScored
                          ? 'border-green-500/20 bg-green-500/5'
                          : 'border-gray-700 hover:border-neon-purple/40'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{team.name}</h3>
                          {team.track && (
                            <span className="inline-block px-2 py-1 bg-neon-blue/20 text-neon-blue text-xs rounded-full mt-2">
                              {team.track}
                            </span>
                          )}
                        </div>
                        {hasScored && (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                            Scored
                          </span>
                        )}
                      </div>

                      {team.projectTitle && (
                        <p className="text-lg font-semibold text-neon-purple mb-2">{team.projectTitle}</p>
                      )}

                      {team.description && (
                        <p className="text-gray-300 text-sm mb-4 line-clamp-3">{team.description}</p>
                      )}

                      <div className="flex gap-2 mb-4 flex-wrap">
                        {team.repoUrl && (
                          <a
                            href={team.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-all"
                          >
                            📁 Repository
                          </a>
                        )}
                        {team.demoUrl && (
                          <a
                            href={team.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-all"
                          >
                            🌐 Demo
                          </a>
                        )}
                        {team.videoUrl && (
                          <a
                            href={team.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-all"
                          >
                            🎥 Video
                          </a>
                        )}
                      </div>

                      {hasScored && score && (
                        <div className="mb-4 p-3 bg-dark-800 rounded">
                          <p className="text-sm text-gray-400 mb-2">Your Score:</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>Impact: {score.scores.impact}/10</div>
                            <div>Technical: {score.scores.technicalDepth}/10</div>
                            <div>Execution: {score.scores.execution}/10</div>
                            <div>UX: {score.scores.ux}/10</div>
                            <div>Innovation: {score.scores.innovation}/10</div>
                            <div className="font-bold text-neon-purple">
                              Total: {score.totalScore}/50
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleScoreTeam(team)}
                        className={`w-full py-2 rounded-lg font-medium transition-all ${
                          hasScored
                            ? 'bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30'
                            : 'bg-neon-purple hover:bg-neon-purple/80 text-white'
                        }`}
                      >
                        {hasScored ? 'Update Score' : 'Score Project'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Assessment Grading Link */}
            <div className="mt-8 glass rounded-xl p-6 border border-neon-blue/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">Assessment Grading</h3>
                  <p className="text-sm text-gray-400">Review and grade student assessment submissions</p>
                </div>
                <Link
                  href="/judge/grading"
                  className="px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-lg font-medium transition-all"
                >
                  Grade Assessments →
                </Link>
              </div>
            </div>
          </>
        )}

        {activeTab === 'monitoring' && (
          <>
            {/* Monitoring Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass rounded-2xl p-6 border-2 border-neon-blue/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Active Sessions</h3>
                  <span className="text-2xl">🔴</span>
                </div>
                <p className="text-4xl font-bold text-neon-blue">{sessionStats.activeSessions}</p>
              </div>
              <div className="glass rounded-2xl p-6 border-2 border-neon-green/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Active Teams</h3>
                  <span className="text-2xl">👥</span>
                </div>
                <p className="text-4xl font-bold text-neon-green">{sessionStats.activeTeams}</p>
              </div>
              <div className="glass rounded-2xl p-6 border-2 border-red-500/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Violations</h3>
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-4xl font-bold text-red-400">{sessionStats.totalViolations}</p>
              </div>
            </div>

            {/* Monitoring Actions */}
            <h2 className="text-2xl font-bold mb-6">Monitoring Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/proctor/monitor" className="glass rounded-2xl p-8 border-2 border-neon-green/30 hover:border-neon-green transition-all group">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👁️</div>
                <h3 className="text-2xl font-bold mb-2 text-neon-green">Live Session Monitor</h3>
                <p className="text-gray-400 mb-4">
                  Watch active hackathon sessions in real-time. Monitor team progress, view code submissions, and track violations.
                </p>
                <ul className="text-sm text-gray-400 space-y-1 mb-4">
                  <li>• Real-time session tracking</li>
                  <li>• Violation alerts</li>
                  <li>• Team progress monitoring</li>
                  <li>• Session controls</li>
                </ul>
                <div className="inline-flex items-center gap-2 text-neon-green font-medium">
                  Open Monitor <span>→</span>
                </div>
              </Link>

              <Link href="/proctor/assessments" className="glass rounded-2xl p-8 border-2 border-neon-blue/30 hover:border-neon-blue transition-all group">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📹</div>
                <h3 className="text-2xl font-bold mb-2 text-neon-blue">Assessment Proctoring</h3>
                <p className="text-gray-400 mb-4">
                  Monitor student assessment attempts. View webcam feeds, track suspicious activity, and ensure exam integrity.
                </p>
                <ul className="text-sm text-gray-400 space-y-1 mb-4">
                  <li>• Tab switch detection</li>
                  <li>• Copy/paste monitoring</li>
                  <li>• Webcam verification</li>
                  <li>• Force submit controls</li>
                </ul>
                <div className="inline-flex items-center gap-2 text-neon-blue font-medium">
                  Open Proctoring <span>→</span>
                </div>
              </Link>

              <Link href="/hackathon/sessions" className="glass rounded-2xl p-8 border-2 border-neon-purple/30 hover:border-neon-purple transition-all group">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
                <h3 className="text-2xl font-bold mb-2 text-neon-purple">Session Leaderboards</h3>
                <p className="text-gray-400 mb-4">
                  View real-time leaderboards for active sessions. See which teams are leading and track problem completion rates.
                </p>
                <ul className="text-sm text-gray-400 space-y-1 mb-4">
                  <li>• Live rankings</li>
                  <li>• Score tracking</li>
                  <li>• Problem completion stats</li>
                </ul>
                <div className="inline-flex items-center gap-2 text-neon-purple font-medium">
                  View Leaderboards <span>→</span>
                </div>
              </Link>

              <Link href="/hackathon/teams" className="glass rounded-2xl p-8 border-2 border-neon-pink/30 hover:border-neon-pink transition-all group">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👥</div>
                <h3 className="text-2xl font-bold mb-2 text-neon-pink">Browse Teams</h3>
                <p className="text-gray-400 mb-4">
                  View all registered teams, their members, and project submissions. Check team status and activity.
                </p>
                <ul className="text-sm text-gray-400 space-y-1 mb-4">
                  <li>• Team rosters</li>
                  <li>• Project submissions</li>
                  <li>• Activity history</li>
                </ul>
                <div className="inline-flex items-center gap-2 text-neon-pink font-medium">
                  View Teams <span>→</span>
                </div>
              </Link>
            </div>
          </>
        )}
      </main>

      {/* Scoring Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="glass rounded-2xl p-8 max-w-2xl w-full border border-gray-700 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gradient">Score: {selectedTeam.name}</h2>
                {selectedTeam.projectTitle && (
                  <p className="text-gray-400 mt-1">{selectedTeam.projectTitle}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Scoring Guidelines */}
            <div className="mb-6 p-4 bg-neon-blue/10 rounded-lg border border-neon-blue/30">
              <h3 className="font-semibold mb-2 text-neon-blue">Scoring Guidelines:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li><strong>Impact & Usefulness (0-10):</strong> Addresses a real problem; practical value</li>
                <li><strong>Technical Depth (0-10):</strong> Code quality; architecture; complexity handled</li>
                <li><strong>Execution Quality (0-10):</strong> Polish; completeness; bug-free experience</li>
                <li><strong>User Experience (0-10):</strong> Intuitive; accessible; pleasant to use</li>
                <li><strong>Innovation (0-10):</strong> Novel approach; creativity; unique solution</li>
              </ul>
            </div>

            {/* Scoring Sliders */}
            <div className="space-y-6 mb-6">
              {Object.entries({
                impact: 'Impact & Usefulness',
                technicalDepth: 'Technical Depth',
                execution: 'Execution Quality',
                ux: 'User Experience',
                innovation: 'Innovation',
              }).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-2">{label}</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={scores[key as keyof typeof scores]}
                      onChange={(e) =>
                        setScores({ ...scores, [key]: parseFloat(e.target.value) })
                      }
                      className="flex-1 h-2 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                    />
                    <span className="text-xl font-bold text-neon-purple w-16 text-right">
                      {scores[key as keyof typeof scores]}/10
                    </span>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-700">
                <p className="text-lg font-bold">
                  Total Score:{' '}
                  <span className="text-neon-purple text-2xl">
                    {Object.values(scores).reduce((sum, val) => sum + val, 0)}/50
                  </span>
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-dark-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-neon-purple focus:outline-none"
                placeholder="Add any feedback or notes about this project..."
              />
            </div>

            {/* Conflict of Interest */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={conflictOfInterest}
                  onChange={(e) => setConflictOfInterest(e.target.checked)}
                  className="w-4 h-4 accent-neon-purple"
                />
                <span className="text-sm">I have a conflict of interest with this team</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setSelectedTeam(null)}
                className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitScore}
                disabled={scoring || conflictOfInterest}
                className="flex-1 py-3 bg-neon-purple hover:bg-neon-purple/80 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scoring ? 'Submitting...' : 'Submit Score'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JudgeDashboard() {
  return (
    <RoleGuard allowedRoles={['judge', 'admin', 'proctor']}>
      <JudgeDashboardContent />
    </RoleGuard>
  );
}
