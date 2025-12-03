'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { teamSubmissionsAPI, hackathonSessionsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { RoleGuard } from '@/components/guards/RoleGuard';
import Editor from '@monaco-editor/react';

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
  testResults: Array<{
    testCaseId: string;
    passed: boolean;
    actualOutput: string;
    expectedOutput: string;
    executionTime: number;
    error?: string;
  }>;
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
    email: string;
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
  };
  judgeFeedback?: {
    judgeId: string;
    codeQualityScore: number;
    feedback: string;
    flagged: boolean;
    flagReason?: string;
    reviewedAt: string;
  };
}

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

interface Session {
  _id: string;
  title: string;
  status: string;
}

function JudgeSubmissionsContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [teamsData, setTeamsData] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    codeQualityScore: 5,
    feedback: '',
    flagged: false,
    flagReason: '',
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await hackathonSessionsAPI.getAll();
        const allSessions = response.data?.sessions || [];
        setSessions(allSessions);
        
        // Select active session by default
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
      await teamSubmissionsAPI.addJudgeFeedback(selectedSubmission._id, feedbackForm);
      
      // Update local state
      setTeamsData(prev => prev.map(team => ({
        ...team,
        submissions: team.submissions.map(sub => 
          sub._id === selectedSubmission._id
            ? { ...sub, judgeFeedback: { ...feedbackForm, reviewedAt: new Date().toISOString(), judgeId: user?.id || '' } }
            : sub
        ),
      })));
      
      setSelectedSubmission(null);
      setFeedbackForm({ codeQualityScore: 5, feedback: '', flagged: false, flagReason: '' });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 50) return 'text-red-400 bg-red-500/20';
    if (score >= 25) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-green-400 bg-green-500/20';
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
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">📝 Team Submissions</h1>
              <p className="text-gray-400 mt-1">Review and grade hackathon submissions by team</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
              >
                {sessions.map((session) => (
                  <option key={session._id} value={session._id}>
                    {session.title} ({session.status})
                  </option>
                ))}
              </select>
              <Link
                href="/judge"
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-dark-800 border border-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Teams</div>
            <div className="text-3xl font-bold text-white mt-1">{teamsData.length}</div>
          </div>
          <div className="bg-dark-800 border border-green-500/30 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Submissions</div>
            <div className="text-3xl font-bold text-green-400 mt-1">
              {teamsData.reduce((sum, t) => sum + t.stats.totalSubmissions, 0)}
            </div>
          </div>
          <div className="bg-dark-800 border border-neon-blue/30 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Passed Submissions</div>
            <div className="text-3xl font-bold text-neon-blue mt-1">
              {teamsData.reduce((sum, t) => sum + t.stats.passedSubmissions, 0)}
            </div>
          </div>
          <div className="bg-dark-800 border border-neon-purple/30 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Reviewed</div>
            <div className="text-3xl font-bold text-neon-purple mt-1">
              {teamsData.reduce((sum, t) => 
                sum + t.submissions.filter(s => s.judgeFeedback?.reviewedAt).length, 0
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-blue"></div>
          </div>
        ) : teamsData.length === 0 ? (
          <div className="bg-dark-800 border border-gray-700 rounded-lg p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-400 text-lg">No submissions found</p>
            <p className="text-gray-500 text-sm mt-1">
              Teams haven't submitted any solutions yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {teamsData.map((teamData) => (
              <div
                key={teamData.team._id}
                className="bg-dark-800 border border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Team Header */}
                <div
                  onClick={() => setExpandedTeam(
                    expandedTeam === teamData.team._id ? null : teamData.team._id
                  )}
                  className="p-6 cursor-pointer hover:bg-dark-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">
                        {expandedTeam === teamData.team._id ? '📂' : '📁'}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {teamData.team.name}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {teamData.team.memberCount} members • {teamData.stats.totalSubmissions} submissions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-neon-green">
                          {teamData.stats.totalPoints}
                        </div>
                        <div className="text-xs text-gray-400">Points</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-neon-blue">
                          {teamData.stats.passedSubmissions}/{teamData.stats.totalSubmissions}
                        </div>
                        <div className="text-xs text-gray-400">Passed</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm ${getRiskColor(teamData.stats.avgRiskScore)}`}>
                        Risk: {teamData.stats.avgRiskScore}%
                      </div>
                      <div className="text-gray-400">
                        {expandedTeam === teamData.team._id ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Submissions */}
                {expandedTeam === teamData.team._id && (
                  <div className="border-t border-gray-700 p-4">
                    <div className="space-y-3">
                      {teamData.submissions.map((submission) => (
                        <div
                          key={submission._id}
                          className={`p-4 rounded-lg border ${
                            submission.judgeFeedback?.reviewedAt
                              ? 'bg-dark-700/50 border-green-500/30'
                              : 'bg-dark-700 border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-white">
                                  {submission.problem?.title || 'Unknown Problem'}
                                </h4>
                                <span className={`px-2 py-0.5 text-xs border rounded ${getDifficultyColor(submission.problem?.difficulty)}`}>
                                  {submission.problem?.difficulty}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  submission.allTestsPassed
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {submission.passedTests}/{submission.totalTests} tests
                                </span>
                                {submission.judgeFeedback?.reviewedAt && (
                                  <span className="px-2 py-0.5 text-xs bg-neon-purple/20 text-neon-purple rounded">
                                    ✓ Reviewed
                                  </span>
                                )}
                                {submission.judgeFeedback?.flagged && (
                                  <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                                    🚩 Flagged
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
                                <div>
                                  <span className="text-gray-500">Submitted by:</span>{' '}
                                  {submission.submittedBy?.firstName} {submission.submittedBy?.lastName}
                                </div>
                                <div>
                                  <span className="text-gray-500">Points:</span>{' '}
                                  <span className="text-neon-green">{submission.pointsEarned}/{submission.maxPoints}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Attempts:</span> {submission.attempts}
                                </div>
                                <div className={getRiskColor(submission.proctoringStats?.riskScore || 0)}>
                                  Risk: {submission.proctoringStats?.riskScore || 0}%
                                </div>
                              </div>

                              {/* Proctoring alerts */}
                              {submission.proctoringStats?.suspiciousPatterns && 
                               submission.proctoringStats.suspiciousPatterns.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {submission.proctoringStats.suspiciousPatterns.map((pattern, i) => (
                                    <span key={i} className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                                      ⚠️ {pattern}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setSelectedSubmission(submission);
                                if (submission.judgeFeedback) {
                                  setFeedbackForm({
                                    codeQualityScore: submission.judgeFeedback.codeQualityScore || 5,
                                    feedback: submission.judgeFeedback.feedback || '',
                                    flagged: submission.judgeFeedback.flagged || false,
                                    flagReason: submission.judgeFeedback.flagReason || '',
                                  });
                                } else {
                                  setFeedbackForm({ codeQualityScore: 5, feedback: '', flagged: false, flagReason: '' });
                                }
                              }}
                              className="px-4 py-2 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue rounded-lg transition-colors"
                            >
                              {submission.judgeFeedback?.reviewedAt ? 'View/Edit' : 'Review'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Review: {selectedSubmission.problem?.title}
                </h2>
                <p className="text-gray-400 text-sm">
                  Submitted by {selectedSubmission.submittedBy?.firstName} {selectedSubmission.submittedBy?.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-4">
              {/* Left: Code */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">💻 Submitted Code</h3>
                  <div className="rounded-lg overflow-hidden border border-gray-700">
                    <Editor
                      height="300px"
                      language={selectedSubmission.language || 'python'}
                      value={selectedSubmission.code}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                </div>

                {selectedSubmission.explanation && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">📝 Explanation</h3>
                    <div className="p-3 bg-dark-700 rounded-lg text-gray-300 text-sm">
                      {selectedSubmission.explanation}
                    </div>
                  </div>
                )}

                {/* Test Results */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">
                    🧪 Test Results ({selectedSubmission.passedTests}/{selectedSubmission.totalTests})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {selectedSubmission.testResults?.map((result, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded text-sm ${
                          result.passed ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}
                      >
                        <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                          {result.passed ? '✓' : '✗'} Test {i + 1}
                        </span>
                        {result.error && (
                          <div className="text-red-400 text-xs mt-1">{result.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Proctoring & Feedback */}
              <div className="space-y-4">
                {/* Proctoring Stats */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">🔍 Proctoring Data</h3>
                  <div className="p-3 bg-dark-700 rounded-lg">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Copy/Paste</div>
                        <div className="text-white">
                          {(selectedSubmission.proctoringStats?.copyCount || 0) + 
                           (selectedSubmission.proctoringStats?.pasteCount || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">External Pastes</div>
                        <div className={selectedSubmission.proctoringStats?.externalPasteCount ? 'text-red-400' : 'text-white'}>
                          {selectedSubmission.proctoringStats?.externalPasteCount || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Tab Switches</div>
                        <div className={selectedSubmission.proctoringStats?.tabSwitchCount || 0 > 10 ? 'text-yellow-400' : 'text-white'}>
                          {selectedSubmission.proctoringStats?.tabSwitchCount || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Window Blur</div>
                        <div className="text-white">
                          {selectedSubmission.proctoringStats?.windowBlurCount || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Risk Score</div>
                        <div className={getRiskColor(selectedSubmission.proctoringStats?.riskScore || 0)}>
                          {selectedSubmission.proctoringStats?.riskScore || 0}%
                        </div>
                      </div>
                    </div>
                    
                    {selectedSubmission.proctoringStats?.suspiciousPatterns && 
                     selectedSubmission.proctoringStats.suspiciousPatterns.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="text-gray-500 text-xs mb-2">Suspicious Patterns:</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedSubmission.proctoringStats.suspiciousPatterns.map((p, i) => (
                            <span key={i} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Judge Feedback Form */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">⭐ Your Feedback</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">
                        Code Quality Score (0-10)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={feedbackForm.codeQualityScore}
                        onChange={(e) => setFeedbackForm(prev => ({
                          ...prev,
                          codeQualityScore: parseInt(e.target.value),
                        }))}
                        className="w-full"
                      />
                      <div className="text-center text-xl font-bold text-neon-blue">
                        {feedbackForm.codeQualityScore}/10
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 block mb-1">
                        Written Feedback
                      </label>
                      <textarea
                        value={feedbackForm.feedback}
                        onChange={(e) => setFeedbackForm(prev => ({
                          ...prev,
                          feedback: e.target.value,
                        }))}
                        rows={4}
                        placeholder="Provide feedback on code quality, approach, etc..."
                        className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                      />
                    </div>

                    <div className="flex items-center gap-3">
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
                        <span className="text-red-400">🚩 Flag for cheating/suspicious activity</span>
                      </label>
                    </div>

                    {feedbackForm.flagged && (
                      <div>
                        <label className="text-sm text-gray-400 block mb-1">
                          Reason for flagging
                        </label>
                        <input
                          type="text"
                          value={feedbackForm.flagReason}
                          onChange={(e) => setFeedbackForm(prev => ({
                            ...prev,
                            flagReason: e.target.value,
                          }))}
                          placeholder="Explain why this submission is being flagged..."
                          className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback}
                className="px-6 py-2 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-blue/80 hover:to-neon-purple/80 text-white font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {submittingFeedback ? 'Saving...' : 'Save Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JudgeSubmissionsPage() {
  return (
    <RoleGuard allowedRoles={['judge', 'admin', 'proctor']}>
      <JudgeSubmissionsContent />
    </RoleGuard>
  );
}

