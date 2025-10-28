'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Team {
  _id: string;
  name: string;
  projectTitle: string;
  description: string;
  track?: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  submittedAt: string;
}

interface JudgeScore {
  teamId: string;
  scores: Record<string, number>;
  totalScore: number;
  notes?: string;
  conflictOfInterest: boolean;
  submittedAt?: string;
}

interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight?: number;
}

const DEFAULT_RUBRIC: RubricCriteria[] = [
  {
    id: 'impact',
    name: 'Impact & Relevance',
    description: 'How impactful and relevant is this solution?',
    maxScore: 5,
  },
  {
    id: 'technical',
    name: 'Technical Depth',
    description: 'Quality of technical implementation and complexity',
    maxScore: 5,
  },
  {
    id: 'execution',
    name: 'Execution & Stability',
    description: 'How well is the solution built and tested?',
    maxScore: 5,
  },
  {
    id: 'ux',
    name: 'UX & Presentation',
    description: 'User experience and presentation quality',
    maxScore: 5,
  },
  {
    id: 'innovation',
    name: 'Innovation',
    description: 'Creativity and innovative thinking',
    maxScore: 5,
  },
];

interface JudgeScoringInterfaceProps {
  eventId?: string;
  judgeId?: string;
}

export default function JudgeScoringInterface({ eventId, judgeId }: JudgeScoringInterfaceProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [conflictOfInterest, setConflictOfInterest] = useState(false);
  const [submittedScores, setSubmittedScores] = useState<Record<string, JudgeScore>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/teams`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Filter teams that have submitted projects
      const submittedTeams = response.data.data.teams.filter((team: Team) => team.submittedAt);
      setTeams(submittedTeams);

      // Load existing scores
      await loadExistingScores(submittedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingScores = async (teams: Team[]) => {
    try {
      const token = localStorage.getItem('accessToken');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const scoresMap: Record<string, JudgeScore> = {};

      for (const team of teams) {
        try {
          const response = await axios.get(`${API_URL}/api/judge-scores/${team._id}/${user.userId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.data.success) {
            scoresMap[team._id] = response.data.data.score;
          }
        } catch (error) {
          // Score doesn't exist yet, that's fine
        }
      }

      setSubmittedScores(scoresMap);
    } catch (error) {
      console.error('Error loading existing scores:', error);
    }
  };

  const handleScoreChange = (criteriaId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: score,
    }));
  };

  const calculateTotalScore = () => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  };

  const submitScore = async () => {
    if (!selectedTeam) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const scoreData = {
        teamId: selectedTeam._id,
        judgeId: user.userId,
        scores,
        totalScore: calculateTotalScore(),
        notes,
        conflictOfInterest,
        track: selectedTeam.track,
      };

      await axios.post(`${API_URL}/api/judge-scores`, scoreData, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Update submitted scores
      setSubmittedScores(prev => ({
        ...prev,
        [selectedTeam._id]: {
          ...scoreData,
          submittedAt: new Date().toISOString(),
        },
      }));

      // Reset form
      setScores({});
      setNotes('');
      setConflictOfInterest(false);
      setSelectedTeam(null);

      alert('Score submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting score:', error);
      alert(error.response?.data?.message || 'Error submitting score');
    } finally {
      setSubmitting(false);
    }
  };

  const getTeamStatus = (team: Team) => {
    if (submittedScores[team._id]) {
      return 'completed';
    }
    if (selectedTeam?._id === team._id) {
      return 'in-progress';
    }
    return 'pending';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🏆 Judge Dashboard</h1>
          <p className="text-gray-400">Evaluate hackathon teams and their projects</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams List */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4">Submitted Teams ({teams.length})</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {teams.map((team) => {
                  const status = getTeamStatus(team);
                  return (
                    <div
                      key={team._id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        status === 'completed'
                          ? 'bg-green-500/10 border-green-500/30'
                          : status === 'in-progress'
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-dark-700 border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{team.name}</h3>
                          <p className="text-sm text-gray-400 mb-1">{team.projectTitle}</p>
                          {team.track && (
                            <span className="text-xs bg-neon-blue/20 text-neon-blue px-2 py-1 rounded">
                              {team.track}
                            </span>
                          )}
                        </div>
                        <div className="ml-3">
                          {status === 'completed' && (
                            <span className="text-green-400 text-sm">✓ Done</span>
                          )}
                          {status === 'in-progress' && (
                            <span className="text-blue-400 text-sm">In Progress</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Scoring Interface */}
          <div className="lg:col-span-2">
            {selectedTeam ? (
              <div className="space-y-6">
                {/* Team Details */}
                <div className="glass rounded-2xl p-6 border border-gray-800">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
                      <h3 className="text-xl text-gray-300">{selectedTeam.projectTitle}</h3>
                      {selectedTeam.track && (
                        <span className="inline-block mt-2 px-3 py-1 bg-neon-blue/20 text-neon-blue rounded-full text-sm">
                          {selectedTeam.track}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedTeam(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-gray-300 mb-4">{selectedTeam.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTeam.repoUrl && (
                      <a
                        href={selectedTeam.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-neon-blue hover:text-blue-400"
                      >
                        📁 Repository
                      </a>
                    )}
                    {selectedTeam.demoUrl && (
                      <a
                        href={selectedTeam.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-neon-green hover:text-green-400"
                      >
                        🌐 Live Demo
                      </a>
                    )}
                    {selectedTeam.videoUrl && (
                      <a
                        href={selectedTeam.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
                      >
                        🎥 Demo Video
                      </a>
                    )}
                  </div>
                </div>

                {/* Rubric Scoring */}
                <div className="glass rounded-2xl p-6 border border-gray-800">
                  <h3 className="text-xl font-bold mb-4">📊 Scoring Rubric</h3>

                  <div className="space-y-6">
                    {DEFAULT_RUBRIC.map((criteria) => (
                      <div key={criteria.id} className="border-b border-gray-700 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{criteria.name}</h4>
                            <p className="text-sm text-gray-400">{criteria.description}</p>
                          </div>
                          <span className="text-sm text-gray-500">0-{criteria.maxScore}</span>
                        </div>

                        <div className="flex gap-2 mt-3">
                          {Array.from({ length: criteria.maxScore + 1 }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => handleScoreChange(criteria.id, i)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                scores[criteria.id] === i
                                  ? 'bg-neon-blue border-neon-blue text-white'
                                  : 'border-gray-600 text-gray-400 hover:border-gray-400'
                              }`}
                            >
                              {i}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Score */}
                  <div className="mt-6 p-4 bg-dark-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">Total Score:</span>
                      <span className="text-2xl font-bold text-neon-blue">
                        {calculateTotalScore()}/{DEFAULT_RUBRIC.reduce((sum, c) => sum + c.maxScore, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes & Conflict of Interest */}
                <div className="glass rounded-2xl p-6 border border-gray-800">
                  <h3 className="text-xl font-bold mb-4">📝 Additional Information</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional comments or feedback..."
                        className="w-full h-24 px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="conflict"
                        checked={conflictOfInterest}
                        onChange={(e) => setConflictOfInterest(e.target.checked)}
                        className="mr-3"
                      />
                      <label htmlFor="conflict" className="text-sm">
                        I have a conflict of interest with this team
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    onClick={submitScore}
                    disabled={submitting || Object.keys(scores).length !== DEFAULT_RUBRIC.length}
                    className="px-8 py-3 bg-gradient-to-r from-neon-green to-green-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-neon-green/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Score'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 border border-gray-800 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-bold mb-2">Select a Team to Judge</h3>
                <p className="text-gray-400">
                  Choose a team from the list to evaluate their hackathon project
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
