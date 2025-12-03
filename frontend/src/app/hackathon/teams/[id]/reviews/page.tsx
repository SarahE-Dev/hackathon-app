'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { teamSubmissionsAPI } from '@/lib/api';
import Editor from '@monaco-editor/react';

interface RubricScores {
  correctness: number;
  codeQuality: number;
  efficiency: number;
  explanation: number;
}

interface JudgeFeedback {
  rubricScores?: RubricScores;
  totalJudgeScore: number;
  feedback?: string;
  flagged: boolean;
  reviewedAt: string;
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
  explanation?: string;
  passedTests: number;
  totalTests: number;
  status: string;
  submittedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  submittedAt: string;
  judgeFeedback: JudgeFeedback | null;
}

interface Stats {
  totalSubmissions: number;
  reviewedSubmissions: number;
  totalJudgePoints: number;
  maxPossiblePoints: number;
  flaggedSubmissions: number;
}

const RUBRIC_LABELS: Record<keyof RubricScores, { name: string; weight: string }> = {
  correctness: { name: 'Correctness', weight: '40%' },
  codeQuality: { name: 'Code Quality', weight: '20%' },
  efficiency: { name: 'Efficiency', weight: '20%' },
  explanation: { name: 'Explanation', weight: '20%' },
};

export default function TeamReviewsPage() {
  const params = useParams();
  const teamId = params.id as string;
  const { user } = useAuthStore();
  
  const [teamName, setTeamName] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const response = await teamSubmissionsAPI.getMyTeamReviews(teamId);
        setTeamName(response.data.team.name);
        setStats(response.data.stats);
        setSubmissions(response.data.submissions);
        
        // Store team ID for leaderboard highlighting
        localStorage.setItem('myTeamId', teamId);
      } catch (err: any) {
        console.error('Error loading reviews:', err);
        setError(err.response?.data?.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    
    loadReviews();
  }, [teamId]);

  const getScoreColor = (score: number | undefined) => {
    if (score === undefined) return 'text-gray-500';
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'hard': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-purple"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href="/dashboard" className="text-neon-purple hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/hackathon/teams/${teamId}`} className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
            ← Back to Team Space
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">📋 Judge Reviews - {teamName}</h1>
          <p className="text-gray-400">View feedback from judges on your submissions</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-dark-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-sm text-gray-400">Total Submissions</div>
              <div className="text-2xl font-bold text-white">{stats.totalSubmissions}</div>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-sm text-gray-400">Reviewed</div>
              <div className="text-2xl font-bold text-neon-blue">{stats.reviewedSubmissions}</div>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-sm text-gray-400">Points Earned</div>
              <div className="text-2xl font-bold text-neon-green">{stats.totalJudgePoints}</div>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4 border border-gray-700">
              <div className="text-sm text-gray-400">Max Points</div>
              <div className="text-2xl font-bold text-gray-300">{stats.maxPossiblePoints}</div>
            </div>
            {stats.flaggedSubmissions > 0 && (
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                <div className="text-sm text-red-400">Flagged</div>
                <div className="text-2xl font-bold text-red-400">{stats.flaggedSubmissions}</div>
              </div>
            )}
          </div>
        )}

        {/* Submissions List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white mb-4">Your Submissions</h2>
            {submissions.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                No submissions yet
              </div>
            ) : (
              submissions.map((sub) => (
                <div
                  key={sub._id}
                  onClick={() => setSelectedSubmission(sub)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedSubmission?._id === sub._id
                      ? 'bg-neon-purple/10 border-neon-purple'
                      : sub.judgeFeedback?.flagged
                      ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                      : sub.judgeFeedback
                      ? 'bg-dark-800/50 border-green-500/30 hover:border-green-500/50'
                      : 'bg-dark-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{sub.problem.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${getDifficultyColor(sub.problem.difficulty)}`}>
                          {sub.problem.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {sub.passedTests}/{sub.totalTests} tests • {sub.problem.points} pts max
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        by {sub.submittedBy.firstName} {sub.submittedBy.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      {sub.judgeFeedback ? (
                        <>
                          <div className={`text-2xl font-bold ${getScoreColor(sub.judgeFeedback.totalJudgeScore)}`}>
                            {sub.judgeFeedback.totalJudgeScore}%
                          </div>
                          <div className="text-xs text-gray-400">
                            {Math.round((sub.judgeFeedback.totalJudgeScore / 100) * sub.problem.points)} pts
                          </div>
                          {sub.judgeFeedback.flagged && (
                            <span className="text-red-400 text-sm">🚩 Flagged</span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">Pending Review</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail View */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            {selectedSubmission ? (
              <div className="bg-dark-800/50 rounded-xl border border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-lg font-bold text-white">{selectedSubmission.problem.title}</h3>
                  <p className="text-sm text-gray-400">
                    Submitted {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  </p>
                </div>

                {/* Judge Feedback */}
                {selectedSubmission.judgeFeedback ? (
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-white">Judge Feedback</h4>
                      <div className={`text-2xl font-bold ${getScoreColor(selectedSubmission.judgeFeedback.totalJudgeScore)}`}>
                        {selectedSubmission.judgeFeedback.totalJudgeScore}%
                      </div>
                    </div>

                    {/* Rubric Breakdown */}
                    {selectedSubmission.judgeFeedback.rubricScores && (
                      <div className="space-y-2 mb-4">
                        {(Object.entries(selectedSubmission.judgeFeedback.rubricScores) as [keyof RubricScores, number][]).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">
                              {RUBRIC_LABELS[key].name} ({RUBRIC_LABELS[key].weight})
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-dark-900 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    value >= 75 ? 'bg-green-500' :
                                    value >= 50 ? 'bg-yellow-500' :
                                    value >= 25 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${value}%` }}
                                />
                              </div>
                              <span className={getScoreColor(value)}>{value}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Written Feedback */}
                    {selectedSubmission.judgeFeedback.feedback && (
                      <div className="p-3 bg-dark-900 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Judge Notes:</div>
                        <p className="text-sm text-gray-300">{selectedSubmission.judgeFeedback.feedback}</p>
                      </div>
                    )}

                    {/* Points Earned */}
                    <div className="mt-4 p-3 bg-neon-green/10 border border-neon-green/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-neon-green">Points Earned</span>
                        <span className="text-xl font-bold text-neon-green">
                          {Math.round((selectedSubmission.judgeFeedback.totalJudgeScore / 100) * selectedSubmission.problem.points)} / {selectedSubmission.problem.points}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-b border-gray-700 text-center text-gray-400">
                    <div className="text-3xl mb-2">⏳</div>
                    <p>Awaiting judge review</p>
                  </div>
                )}

                {/* Your Explanation */}
                {selectedSubmission.explanation && (
                  <div className="p-4 border-b border-gray-700">
                    <h4 className="font-medium text-white mb-2">Your Explanation</h4>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedSubmission.explanation}</p>
                  </div>
                )}

                {/* Code */}
                <div className="h-64">
                  <Editor
                    height="100%"
                    language="python"
                    value={selectedSubmission.code}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-dark-800/50 rounded-xl border border-gray-700 p-8 text-center text-gray-400">
                <div className="text-4xl mb-3">👈</div>
                <p>Select a submission to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Link to Leaderboard */}
        <div className="mt-8 text-center">
          <Link 
            href="/hackathon/leaderboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-blue rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
          >
            🏆 View Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}

