'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  track?: string;
  averageScore: number;
  judgeScores: number[];
  tiebreakScore?: number;
  submittedAt: string;
}

interface LeaderboardData {
  standings: LeaderboardEntry[];
  lastUpdated: string;
  isPublic: boolean;
  revealAt?: string;
}

interface LiveLeaderboardProps {
  eventId?: string;
  showAdminControls?: boolean;
}

export default function LiveLeaderboard({ eventId, showAdminControls = false }: LiveLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    loadLeaderboard();
    connectToLiveUpdates();
  }, [eventId]);

  const loadLeaderboard = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/api/leaderboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { eventId },
      });

      if (response.data.success) {
        const data = response.data.data.leaderboard;
        setLeaderboard(data);
        setIsRevealed(data.isPublic || new Date() >= new Date(data.revealAt || 0));
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectToLiveUpdates = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const newSocket = io(`${API_URL}/leaderboard`, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('Connected to leaderboard updates');
    });

    newSocket.on('leaderboard-updated', (data: LeaderboardData) => {
      setLeaderboard(data);
      setIsRevealed(data.isPublic || new Date() >= new Date(data.revealAt || 0));
    });

    newSocket.on('leaderboard-revealed', () => {
      setIsRevealed(true);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  };

  const togglePublicReveal = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(`${API_URL}/api/leaderboard/toggle-public`, {}, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { eventId },
      });
    } catch (error) {
      console.error('Error toggling leaderboard visibility:', error);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
      </div>
    );
  }

  if (!leaderboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold mb-2">Leaderboard Not Available</h2>
          <p className="text-gray-400">No leaderboard data found for this event.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {isRevealed ? '🏆 Live Leaderboard' : '⏳ Leaderboard Coming Soon'}
          </h1>
          <p className="text-gray-400">
            {isRevealed
              ? 'Real-time hackathon standings'
              : 'Results will be revealed at the end of the event'
            }
          </p>
          {leaderboard.lastUpdated && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {new Date(leaderboard.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>

        {/* Admin Controls */}
        {showAdminControls && (
          <div className="mb-6 text-center">
            <button
              onClick={togglePublicReveal}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                isRevealed
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRevealed ? '🔒 Hide Leaderboard' : '🔓 Reveal Leaderboard'}
            </button>
          </div>
        )}

        {/* Leaderboard */}
        {isRevealed ? (
          <div className="space-y-4">
            {leaderboard.standings.map((entry, index) => (
              <div
                key={entry.teamId}
                className={`glass rounded-2xl p-6 border transition-all ${
                  index < 3
                    ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-transparent'
                    : 'border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`text-2xl font-bold ${getRankColor(entry.rank)}`}>
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Team Info */}
                    <div>
                      <h3 className="text-xl font-bold text-white">{entry.teamName}</h3>
                      {entry.track && (
                        <span className="inline-block mt-1 px-3 py-1 bg-neon-blue/20 text-neon-blue rounded-full text-sm">
                          {entry.track}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-3xl font-bold text-neon-blue">
                      {entry.averageScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {entry.judgeScores.length} judge{entry.judgeScores.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Judge Scores Breakdown */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-400">Judge Scores:</span>
                    {entry.judgeScores.map((score, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-dark-700 rounded text-sm text-gray-300"
                      >
                        {score}
                      </span>
                    ))}
                  </div>

                  <div className="text-sm text-gray-500">
                    Submitted: {new Date(entry.submittedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}

            {leaderboard.standings.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold mb-2">No Submissions Yet</h3>
                <p className="text-gray-400">Teams haven't submitted their projects yet.</p>
              </div>
            )}
          </div>
        ) : (
          /* Hidden Leaderboard */
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold mb-2">Results Coming Soon</h2>
            <p className="text-gray-400 mb-4">
              The leaderboard will be revealed after all teams have presented.
            </p>
            {leaderboard.revealAt && (
              <p className="text-sm text-gray-500">
                Scheduled reveal: {new Date(leaderboard.revealAt).toLocaleString()}
              </p>
            )}

            {/* Show submission count for admins */}
            {showAdminControls && (
              <div className="mt-6 p-4 bg-dark-800 rounded-lg">
                <p className="text-gray-300">
                  <strong>{leaderboard.standings.length}</strong> team{leaderboard.standings.length !== 1 ? 's' : ''} have submitted
                </p>
              </div>
            )}
          </div>
        )}

        {/* Live Update Indicator */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-full">
            <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-400">
              {socket?.connected ? 'Live Updates' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
