'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useAuthStore } from '@/store/authStore';
import { teamsAPI } from '@/lib/api';
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

function JudgeDashboardContent() {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [myScores, setMyScores] = useState<Map<string, JudgeScore>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [scoring, setScoring] = useState(false);

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

      // Only show submitted teams
      const submittedTeams = teamsData.filter((t: Team) => t.submittedAt);
      setTeams(submittedTeams);

      // Fetch judge's existing scores
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
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-purple"></div>
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
              <h1 className="text-3xl font-bold text-gradient">Judge Dashboard</h1>
              <p className="text-gray-400 mt-1">Review and score hackathon projects</p>
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
        {/* Scoring Stats */}
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

        {/* Teams to Score */}
        <div className="glass rounded-2xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold mb-6 text-gradient">Projects to Review</h2>

          {teams.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
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
                    className={`p-6 rounded-lg border-2 transition-all ${
                      hasScored
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-dark-700 border-gray-700 hover:border-neon-purple/40'
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
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>Impact: {score.scores.impact}/10</div>
                          <div>Technical: {score.scores.technicalDepth}/10</div>
                          <div>Execution: {score.scores.execution}/10</div>
                          <div>UX: {score.scores.ux}/10</div>
                          <div>Innovation: {score.scores.innovation}/10</div>
                          <div className="col-span-2 font-bold text-neon-purple mt-1">
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
        </div>
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
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Scoring Criteria */}
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
                      value={scores[key as keyof typeof scores]}
                      onChange={(e) =>
                        setScores({ ...scores, [key]: parseInt(e.target.value) })
                      }
                      className="flex-1"
                    />
                    <span className="text-xl font-bold text-neon-purple w-12 text-right">
                      {scores[key as keyof typeof scores]}
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
                  className="w-4 h-4"
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
    <RoleGuard allowedRoles={['judge', 'admin']}>
      <JudgeDashboardContent />
    </RoleGuard>
  );
}
