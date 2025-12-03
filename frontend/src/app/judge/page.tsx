'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useAuthStore } from '@/store/authStore';
import { teamSubmissionsAPI, hackathonSessionsAPI } from '@/lib/api';
import Editor from '@monaco-editor/react';

interface Session {
  _id: string;
  title: string;
  status: string;
}

interface Submission {
  _id: string;
  problem: {
    _id: string;
    title: string;
    difficulty: string;
    points: number;
  };
  code: string;
  language: string;
  explanation?: string;
  passedTests: number;
  totalTests: number;
  score: number;
  pointsEarned: number;
  maxPoints: number;
  status: string;
  allTestsPassed: boolean;
  submittedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  submittedAt: string;
  attempts: number;
  proctoringStats?: {
    copyCount: number;
    pasteCount: number;
    externalPasteCount: number;
    tabSwitchCount: number;
    windowBlurCount: number;
    riskScore: number;
    suspiciousPatterns: string[];
    largestPaste: number;
  };
  judgeFeedback?: {
    rubricScores?: {
      correctness: number;
      codeQuality: number;
      efficiency: number;
      explanation: number;
    };
    totalJudgeScore: number;
    feedback: string;
    flagged: boolean;
    flagReason?: string;
    reviewedAt: string;
  };
}

// Rubric criteria with weights
const RUBRIC_CRITERIA = [
  {
    id: 'correctness',
    name: 'Correctness',
    weight: 40,
    description: 'Does the code produce the correct output for all test cases?',
    guide: [
      { score: 100, label: 'All tests pass, handles edge cases' },
      { score: 75, label: 'Most tests pass, minor issues' },
      { score: 50, label: 'Some tests pass, logic errors' },
      { score: 25, label: 'Few tests pass, significant bugs' },
      { score: 0, label: 'Does not work or no attempt' },
    ],
  },
  {
    id: 'codeQuality',
    name: 'Code Quality',
    weight: 20,
    description: 'Is the code clean, readable, and well-organized?',
    guide: [
      { score: 100, label: 'Excellent - Clean, readable, follows best practices' },
      { score: 75, label: 'Good - Mostly clean with minor issues' },
      { score: 50, label: 'Acceptable - Works but messy or hard to read' },
      { score: 25, label: 'Poor - Difficult to understand' },
      { score: 0, label: 'Very poor - Incomprehensible' },
    ],
  },
  {
    id: 'efficiency',
    name: 'Efficiency',
    weight: 20,
    description: 'Is the time/space complexity appropriate for the problem?',
    guide: [
      { score: 100, label: 'Optimal solution with best complexity' },
      { score: 75, label: 'Good solution, near-optimal' },
      { score: 50, label: 'Acceptable but not optimal' },
      { score: 25, label: 'Inefficient, could be much better' },
      { score: 0, label: 'Very inefficient or brute force' },
    ],
  },
  {
    id: 'explanation',
    name: 'Explanation',
    weight: 20,
    description: 'Did they clearly explain their approach and reasoning?',
    guide: [
      { score: 100, label: 'Excellent - Clear, detailed explanation' },
      { score: 75, label: 'Good - Adequate explanation' },
      { score: 50, label: 'Basic - Some explanation provided' },
      { score: 25, label: 'Minimal - Brief or unclear' },
      { score: 0, label: 'No explanation provided' },
    ],
  },
];

interface TeamData {
  team: {
  _id: string;
    name: string;
    memberCount: number;
  };
  submissions: Submission[];
  stats: {
    totalSubmissions: number;
    passedSubmissions: number;
    totalPoints: number;
    avgRiskScore: number;
  };
}

function JudgeDashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [teamsData, setTeamsData] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    rubricScores: {
      correctness: 0,
      codeQuality: 0,
      efficiency: 0,
      explanation: 0,
    },
    feedback: '',
    flagged: false,
    flagReason: '',
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  // Calculate total score from rubric
  const calculateTotalScore = (scores: typeof feedbackForm.rubricScores) => {
    return Math.round(
      scores.correctness * 0.40 +
      scores.codeQuality * 0.20 +
      scores.efficiency * 0.20 +
      scores.explanation * 0.20
    );
  };
  const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'points' | 'risk' | 'submissions'>('points');

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await hackathonSessionsAPI.getAll();
        const allSessions = response.data?.sessions || [];
        setSessions(allSessions);
        
        const activeSession = allSessions.find((s: Session) => s.status === 'active');
        if (activeSession) {
          setSelectedSession(activeSession._id);
        } else if (allSessions.length > 0) {
          setSelectedSession(allSessions[0]._id);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSessions();
  }, []);

  // Load submissions when session changes
  useEffect(() => {
    if (!selectedSession) return;
    
    const loadSubmissions = async () => {
      setLoading(true);
      try {
        const response = await teamSubmissionsAPI.getAllSessionSubmissions(selectedSession);
        setTeamsData(response.data?.teams || []);
    } catch (error) {
        console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

    loadSubmissions();
  }, [selectedSession]);

  const handleSubmitFeedback = async () => {
    if (!selectedSubmission) return;
    
    setSubmittingFeedback(true);
    try {
      await teamSubmissionsAPI.addJudgeFeedback(selectedSubmission._id, {
        rubricScores: feedbackForm.rubricScores,
        feedback: feedbackForm.feedback,
        flagged: feedbackForm.flagged,
        flagReason: feedbackForm.flagReason,
      });
      
      const totalScore = calculateTotalScore(feedbackForm.rubricScores);
      
      setTeamsData(prev => prev.map(team => ({
        ...team,
        submissions: team.submissions.map(sub => 
          sub._id === selectedSubmission._id
            ? { 
                ...sub, 
                judgeFeedback: { 
                  rubricScores: feedbackForm.rubricScores,
                  totalJudgeScore: totalScore,
                  feedback: feedbackForm.feedback,
                  flagged: feedbackForm.flagged,
                  flagReason: feedbackForm.flagReason,
                  reviewedAt: new Date().toISOString() 
                } 
              }
            : sub
        ),
      })));
      
      setSelectedSubmission(null);
      setFeedbackForm({ 
        rubricScores: { correctness: 0, codeQuality: 0, efficiency: 0, explanation: 0 },
        feedback: '', 
        flagged: false, 
        flagReason: '' 
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Summary calculations
  const totalTeams = teamsData.length;
  const totalSubmissions = teamsData.reduce((sum, t) => sum + t.stats.totalSubmissions, 0);
  const passedSubmissions = teamsData.reduce((sum, t) => sum + t.stats.passedSubmissions, 0);
  const reviewedSubmissions = teamsData.reduce((sum, t) => 
    sum + t.submissions.filter(s => s.judgeFeedback?.reviewedAt).length, 0
  );
  const flaggedSubmissions = teamsData.reduce((sum, t) => 
    sum + t.submissions.filter(s => s.judgeFeedback?.flagged).length, 0
  );
  const highRiskSubmissions = teamsData.reduce((sum, t) => 
    sum + t.submissions.filter(s => (s.proctoringStats?.riskScore || 0) >= 50).length, 0
  );

  // Filter and sort teams
  const filteredTeams = teamsData.filter(team => {
    if (filterRisk === 'all') return true;
    if (filterRisk === 'high') return team.stats.avgRiskScore >= 50;
    if (filterRisk === 'medium') return team.stats.avgRiskScore >= 25 && team.stats.avgRiskScore < 50;
    return team.stats.avgRiskScore < 25;
  }).sort((a, b) => {
    if (sortBy === 'points') return b.stats.totalPoints - a.stats.totalPoints;
    if (sortBy === 'risk') return b.stats.avgRiskScore - a.stats.avgRiskScore;
    return b.stats.totalSubmissions - a.stats.totalSubmissions;
  });

  const getRiskColor = (score: number) => {
    if (score >= 50) return 'text-red-400';
    if (score >= 25) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRiskBg = (score: number) => {
    if (score >= 50) return 'bg-red-500/20 border-red-500/50';
    if (score >= 25) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-green-500/20 border-green-500/50';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-400 border-green-500/50';
      case 'medium': return 'text-yellow-400 border-yellow-500/50';
      case 'hard': return 'text-red-400 border-red-500/50';
      default: return 'text-gray-400 border-gray-500/50';
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
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
      <header className="bg-dark-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚖️</span>
                <div>
                <h1 className="text-2xl font-bold">Judge Dashboard</h1>
                <p className="text-gray-400 text-sm">Welcome, {user?.firstName} - Review Team Submissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-purple"
              >
                {sessions.map((session) => (
                  <option key={session._id} value={session._id}>
                    {session.title}
                  </option>
                ))}
              </select>
              <Link
                href="/hackathon/leaderboard"
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>🏆</span> Leaderboard
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push('/auth/login');
                }}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>🚪</span> Sign Out
              </button>
          </div>
        </div>
      </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-dark-800 border border-gray-700 rounded-xl p-4">
            <div className="text-3xl mb-1">👥</div>
            <div className="text-2xl font-bold text-white">{totalTeams}</div>
            <div className="text-xs text-gray-400">Teams</div>
                </div>
          <div className="bg-dark-800 border border-gray-700 rounded-xl p-4">
            <div className="text-3xl mb-1">📝</div>
            <div className="text-2xl font-bold text-neon-blue">{totalSubmissions}</div>
            <div className="text-xs text-gray-400">Submissions</div>
              </div>
          <div className="bg-dark-800 border border-green-500/30 rounded-xl p-4">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-2xl font-bold text-green-400">{passedSubmissions}</div>
            <div className="text-xs text-gray-400">Passed Tests</div>
            </div>
          <div className="bg-dark-800 border border-neon-purple/30 rounded-xl p-4">
            <div className="text-3xl mb-1">👁️</div>
            <div className="text-2xl font-bold text-neon-purple">{reviewedSubmissions}</div>
            <div className="text-xs text-gray-400">Reviewed</div>
              </div>
          <div className="bg-dark-800 border border-red-500/30 rounded-xl p-4">
            <div className="text-3xl mb-1">⚠️</div>
            <div className="text-2xl font-bold text-red-400">{highRiskSubmissions}</div>
            <div className="text-xs text-gray-400">High Risk</div>
              </div>
          <div className="bg-dark-800 border border-red-500/30 rounded-xl p-4">
            <div className="text-3xl mb-1">🚩</div>
            <div className="text-2xl font-bold text-red-400">{flaggedSubmissions}</div>
            <div className="text-xs text-gray-400">Flagged</div>
              </div>
              </div>
            </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 pb-4">
        <div className="bg-dark-800 border border-gray-700 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Filter by Risk:</span>
              <div className="flex gap-1">
                {(['all', 'high', 'medium', 'low'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setFilterRisk(level)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      filterRisk === level
                        ? level === 'high' ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                          : level === 'medium' ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                          : level === 'low' ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                          : 'bg-neon-purple/30 text-neon-purple border border-neon-purple/50'
                        : 'bg-dark-700 text-gray-400 border border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
                        </div>
                      </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 bg-dark-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-neon-purple"
              >
                <option value="points">Points (High to Low)</option>
                <option value="risk">Risk Score (High to Low)</option>
                <option value="submissions">Submissions (Most)</option>
              </select>
                    </div>
          </div>
                </div>
              </div>

      {/* Teams Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-purple"></div>
                        </div>
        ) : filteredTeams.length === 0 ? (
          <div className="bg-dark-800 border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-400 text-lg">No submissions found</p>
                      </div>
        ) : (
          <div className="grid gap-4">
            {filteredTeams.map((teamData) => (
              <div
                key={teamData.team._id}
                className="bg-dark-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors"
              >
                {/* Team Header */}
                <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-xl font-bold">
                        {teamData.team.name.charAt(0)}
                        </div>
                        <div>
                        <h3 className="text-lg font-bold text-white">{teamData.team.name}</h3>
                        <p className="text-gray-400 text-sm">{teamData.team.memberCount} members</p>
                        </div>
                      </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-xl font-bold text-neon-green">{teamData.stats.totalPoints}</div>
                        <div className="text-xs text-gray-400">Points</div>
                    </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-neon-blue">
                          {teamData.stats.passedSubmissions}/{teamData.stats.totalSubmissions}
                </div>
                        <div className="text-xs text-gray-400">Passed</div>
              </div>
                      <div className={`px-4 py-2 rounded-lg border ${getRiskBg(teamData.stats.avgRiskScore)}`}>
                        <div className={`text-lg font-bold ${getRiskColor(teamData.stats.avgRiskScore)}`}>
                          {teamData.stats.avgRiskScore}%
            </div>
                        <div className="text-xs text-gray-400">Risk</div>
                </div>
                        </div>
                        </div>
                      </div>

                {/* Submissions */}
                <div className="p-4">
                  <div className="grid gap-2">
                    {teamData.submissions.map((sub) => (
                      <div
                        key={sub._id}
                        onClick={() => {
                          setSelectedSubmission(sub);
                          if (sub.judgeFeedback?.rubricScores) {
                            setFeedbackForm({
                              rubricScores: sub.judgeFeedback.rubricScores,
                              feedback: sub.judgeFeedback.feedback || '',
                              flagged: sub.judgeFeedback.flagged || false,
                              flagReason: sub.judgeFeedback.flagReason || '',
                            });
                          } else {
                            // Pre-fill correctness based on test results
                            const correctnessScore = sub.totalTests > 0 
                              ? Math.round((sub.passedTests / sub.totalTests) * 100) 
                              : 0;
                            setFeedbackForm({ 
                              rubricScores: { 
                                correctness: correctnessScore, 
                                codeQuality: 0, 
                                efficiency: 0, 
                                explanation: sub.explanation ? 50 : 0 
                              },
                              feedback: '', 
                              flagged: false, 
                              flagReason: '' 
                            });
                          }
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-neon-purple/50 ${
                          sub.judgeFeedback?.flagged
                            ? 'bg-red-500/10 border-red-500/30'
                            : sub.judgeFeedback?.reviewedAt
                            ? 'bg-green-500/5 border-green-500/30'
                            : (sub.proctoringStats?.riskScore || 0) >= 50
                            ? 'bg-red-500/5 border-red-500/20'
                            : 'bg-dark-700/50 border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 text-xs border rounded ${getDifficultyColor(sub.problem?.difficulty)}`}>
                              {sub.problem?.difficulty}
                            </span>
                            <span className="font-medium text-white">{sub.problem?.title}</span>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              sub.allTestsPassed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {sub.passedTests}/{sub.totalTests} tests
                            </span>
                            <span className="text-neon-green text-sm">{sub.pointsEarned}/{sub.maxPoints} pts</span>
                        </div>
                          <div className="flex items-center gap-3">
                            {/* Proctoring indicators */}
                            {(sub.proctoringStats?.externalPasteCount || 0) > 0 && (
                              <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded" title="External pastes detected">
                                📋 {sub.proctoringStats?.externalPasteCount}
                          </span>
                        )}
                            {(sub.proctoringStats?.tabSwitchCount || 0) > 10 && (
                              <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded" title="Many tab switches">
                                🔄 {sub.proctoringStats?.tabSwitchCount}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded ${getRiskBg(sub.proctoringStats?.riskScore || 0)} ${getRiskColor(sub.proctoringStats?.riskScore || 0)}`}>
                              {sub.proctoringStats?.riskScore || 0}% risk
                            </span>
                            {sub.judgeFeedback?.flagged && (
                              <span className="text-red-400">🚩</span>
                            )}
                            {sub.judgeFeedback?.reviewedAt && !sub.judgeFeedback?.flagged && (
                              <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded font-medium">
                                ✓ {sub.judgeFeedback?.totalJudgeScore}%
                              </span>
                            )}
                            </div>
                            </div>
                        {/* Suspicious patterns preview */}
                        {sub.proctoringStats?.suspiciousPatterns && sub.proctoringStats.suspiciousPatterns.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {sub.proctoringStats.suspiciousPatterns.slice(0, 3).map((p, i) => (
                              <span key={i} className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-400/80 rounded">
                                ⚠️ {p}
                              </span>
                            ))}
                            {sub.proctoringStats.suspiciousPatterns.length > 3 && (
                              <span className="px-2 py-0.5 text-xs text-gray-500">
                                +{sub.proctoringStats.suspiciousPatterns.length - 3} more
                              </span>
                          )}
                        </div>
                        )}
                      </div>
                    ))}
                            </div>
                          </div>
                        </div>
            ))}
              </div>
            )}
                </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-dark-900">
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded border ${getDifficultyColor(selectedSubmission.problem?.difficulty)}`}>
                  {selectedSubmission.problem?.difficulty}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedSubmission.problem?.title}</h2>
                  <p className="text-gray-400 text-sm">
                    {selectedSubmission.submittedBy?.firstName} {selectedSubmission.submittedBy?.lastName} • 
                    {selectedSubmission.passedTests}/{selectedSubmission.totalTests} tests passed •
                    {selectedSubmission.pointsEarned}/{selectedSubmission.maxPoints} points
                  </p>
                </div>
              </div>
                                        <button
                onClick={() => setSelectedSubmission(null)}
                className="text-gray-400 hover:text-white text-2xl px-2"
                                        >
                ×
                                        </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto grid grid-cols-5 gap-0">
              {/* Left: Code (3 cols) */}
              <div className="col-span-3 border-r border-gray-700 flex flex-col">
                <div className="p-3 bg-dark-900 border-b border-gray-700 text-sm font-medium text-gray-400">
                  💻 Submitted Code ({selectedSubmission.language})
              </div>
                <div className="flex-1">
                  <Editor
                    height="400px"
                    language={selectedSubmission.language || 'python'}
                    value={selectedSubmission.code}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      scrollBeyondLastLine: false,
                      padding: { top: 10 },
                    }}
                  />
                            </div>
                {selectedSubmission.explanation && (
                  <div className="p-3 border-t border-gray-700">
                    <div className="text-sm font-medium text-gray-400 mb-2">📝 Explanation</div>
                    <div className="p-3 bg-dark-900 rounded-lg text-gray-300 text-sm max-h-24 overflow-auto">
                      {selectedSubmission.explanation}
                                        </div>
                                      </div>
                                    )}
                                  </div>

              {/* Right: Proctoring & Feedback (2 cols) */}
              <div className="col-span-2 flex flex-col overflow-auto">
                {/* Proctoring Stats */}
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                    🔍 Proctoring Analysis
                    <span className={`px-2 py-0.5 rounded text-xs ${getRiskBg(selectedSubmission.proctoringStats?.riskScore || 0)} ${getRiskColor(selectedSubmission.proctoringStats?.riskScore || 0)}`}>
                      {selectedSubmission.proctoringStats?.riskScore || 0}% Risk
                    </span>
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-dark-900 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">
                        {(selectedSubmission.proctoringStats?.copyCount || 0) + (selectedSubmission.proctoringStats?.pasteCount || 0)}
                                          </div>
                      <div className="text-xs text-gray-500">Copy/Paste</div>
                                      </div>
                    <div className={`bg-dark-900 rounded-lg p-3 text-center ${(selectedSubmission.proctoringStats?.externalPasteCount || 0) > 0 ? 'ring-1 ring-red-500/50' : ''}`}>
                      <div className={`text-lg font-bold ${(selectedSubmission.proctoringStats?.externalPasteCount || 0) > 0 ? 'text-red-400' : 'text-white'}`}>
                        {selectedSubmission.proctoringStats?.externalPasteCount || 0}
                              </div>
                      <div className="text-xs text-gray-500">External Paste</div>
                          </div>
                    <div className={`bg-dark-900 rounded-lg p-3 text-center ${(selectedSubmission.proctoringStats?.tabSwitchCount || 0) > 10 ? 'ring-1 ring-yellow-500/50' : ''}`}>
                      <div className={`text-lg font-bold ${(selectedSubmission.proctoringStats?.tabSwitchCount || 0) > 10 ? 'text-yellow-400' : 'text-white'}`}>
                        {selectedSubmission.proctoringStats?.tabSwitchCount || 0}
                    </div>
                      <div className="text-xs text-gray-500">Tab Switches</div>
                  </div>
                    <div className="bg-dark-900 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">
                        {selectedSubmission.proctoringStats?.windowBlurCount || 0}
                              </div>
                      <div className="text-xs text-gray-500">Window Blur</div>
                          </div>
                    <div className="bg-dark-900 rounded-lg p-3 text-center col-span-2">
                      <div className="text-lg font-bold text-white">
                        {selectedSubmission.proctoringStats?.largestPaste || 0} chars
                    </div>
                      <div className="text-xs text-gray-500">Largest Paste</div>
                  </div>
                              </div>

                  {selectedSubmission.proctoringStats?.suspiciousPatterns && 
                   selectedSubmission.proctoringStats.suspiciousPatterns.length > 0 && (
                    <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                      <div className="text-xs text-red-400 font-medium mb-2">⚠️ Suspicious Patterns Detected:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedSubmission.proctoringStats.suspiciousPatterns.map((p, i) => (
                          <span key={i} className="px-2 py-1 text-xs bg-red-500/20 text-red-300 rounded">
                            {p}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

                {/* Judge Feedback Form with Rubric */}
                <div className="p-4 flex-1 overflow-auto">
                  {/* Total Score Display */}
                  <div className="mb-4 p-4 bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 rounded-xl border border-neon-purple/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-400">Total Judge Score</div>
                        <div className="text-3xl font-bold text-white">
                          {calculateTotalScore(feedbackForm.rubricScores)}%
                </div>
              </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Problem Worth</div>
                        <div className="text-2xl font-bold text-neon-green">
                          {selectedSubmission?.maxPoints || 0} pts
                </div>
              </div>
                </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Points Earned: {Math.round((calculateTotalScore(feedbackForm.rubricScores) / 100) * (selectedSubmission?.maxPoints || 0))} / {selectedSubmission?.maxPoints || 0}
              </div>
            </div>

                  <h3 className="text-sm font-bold text-gray-400 mb-3">📋 Scoring Rubric</h3>
                  
                  {/* Rubric Criteria */}
                  <div className="space-y-4">
                    {RUBRIC_CRITERIA.map((criterion) => (
                      <div key={criterion.id} className="bg-dark-900 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
              <div>
                            <span className="font-medium text-white">{criterion.name}</span>
                            <span className="ml-2 text-xs text-neon-purple">({criterion.weight}%)</span>
              </div>
                          <span className={`text-lg font-bold ${
                            feedbackForm.rubricScores[criterion.id as keyof typeof feedbackForm.rubricScores] >= 75 ? 'text-green-400' :
                            feedbackForm.rubricScores[criterion.id as keyof typeof feedbackForm.rubricScores] >= 50 ? 'text-yellow-400' :
                            feedbackForm.rubricScores[criterion.id as keyof typeof feedbackForm.rubricScores] >= 25 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {feedbackForm.rubricScores[criterion.id as keyof typeof feedbackForm.rubricScores]}%
                          </span>
            </div>
                        <p className="text-xs text-gray-500 mb-2">{criterion.description}</p>
                    <input
                      type="range"
                      min="0"
                          max="100"
                          step="1"
                          value={feedbackForm.rubricScores[criterion.id as keyof typeof feedbackForm.rubricScores]}
                          onChange={(e) => setFeedbackForm(prev => ({
                            ...prev,
                            rubricScores: {
                              ...prev.rubricScores,
                              [criterion.id]: parseInt(e.target.value),
                            },
                          }))}
                          className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          {criterion.guide.map((g) => (
                            <span 
                              key={g.score} 
                              className={`cursor-pointer hover:text-gray-400 ${
                                feedbackForm.rubricScores[criterion.id as keyof typeof feedbackForm.rubricScores] === g.score ? 'text-neon-purple font-medium' : ''
                              }`}
                              onClick={() => setFeedbackForm(prev => ({
                                ...prev,
                                rubricScores: {
                                  ...prev.rubricScores,
                                  [criterion.id]: g.score,
                                },
                              }))}
                              title={g.label}
                            >
                              {g.score}
                    </span>
                          ))}
                  </div>
                </div>
              ))}
            </div>

                  {/* Feedback Notes */}
                  <div className="mt-4">
                    <label className="text-sm text-gray-400 block mb-2">
                      💬 Additional Feedback
                    </label>
              <textarea
                      value={feedbackForm.feedback}
                      onChange={(e) => setFeedbackForm(prev => ({
                        ...prev,
                        feedback: e.target.value,
                      }))}
                      rows={5}
                      placeholder="Optional comments on approach, suggestions for improvement, areas of strength, what could be better..."
                      className="w-full px-3 py-2 bg-dark-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-neon-purple resize-y"
              />
            </div>

                  {/* Flag for Cheating */}
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                        checked={feedbackForm.flagged}
                        onChange={(e) => setFeedbackForm(prev => ({
                          ...prev,
                          flagged: e.target.checked,
                        }))}
                        className="w-4 h-4"
                      />
                      <span className="text-red-400 text-sm font-medium">🚩 Flag for Academic Dishonesty</span>
              </label>
                    {feedbackForm.flagged && (
                      <input
                        type="text"
                        value={feedbackForm.flagReason}
                        onChange={(e) => setFeedbackForm(prev => ({
                          ...prev,
                          flagReason: e.target.value,
                        }))}
                        placeholder="Reason for flagging..."
                        className="w-full mt-2 px-3 py-2 bg-dark-900 border border-red-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-700 bg-dark-900 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedSubmission.judgeFeedback?.reviewedAt && (
                  <span>Last reviewed: {new Date(selectedSubmission.judgeFeedback.reviewedAt).toLocaleString()}</span>
                )}
              </div>
              <div className="flex gap-3">
              <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback}
                  className="px-6 py-2 bg-gradient-to-r from-neon-purple to-neon-blue hover:opacity-90 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                >
                  {submittingFeedback ? 'Saving...' : 'Save Review'}
              </button>
              </div>
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
