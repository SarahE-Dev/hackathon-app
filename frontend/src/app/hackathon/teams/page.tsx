'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

interface Team {
  _id: string;
  name: string;
  projectTitle: string;
  description: string;
  memberIds: any[];
  track?: string;
  submittedAt?: string;
  disqualified: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function HackathonTeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initializePage = async () => {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        router.push('/auth/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      try {
        // Fetch all teams
        const response = await axios.get(`${API_URL}/api/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        setTeams(response.data.data.teams || []);
      } catch (error) {
        console.error('Error loading teams:', error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
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
              <h1 className="text-3xl font-bold text-gradient">JTC Hackathon</h1>
              <p className="text-gray-400 mt-1">Team Collaboration & Live Coding</p>
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Teams ({teams.length})</h2>
          <p className="text-gray-400">Select a team to join the live coding session</p>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No teams found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Link
                key={team._id}
                href={`/hackathon/teams/${team._id}`}
              >
                <div className="glass rounded-2xl p-6 border-2 border-neon-blue/20 hover:border-neon-blue/60 transition-all cursor-pointer group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-all"></div>

                  <div className="relative z-10">
                    {/* Team Status */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gradient">{team.name}</h3>
                      {team.submittedAt && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                          Submitted
                        </span>
                      )}
                      {team.disqualified && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                          Disqualified
                        </span>
                      )}
                    </div>

                    {/* Project Info */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-400 mb-1">Project</p>
                      <p className="text-white font-medium">{team.projectTitle}</p>
                    </div>

                    {/* Members */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-400 mb-2">Members ({team.memberIds.length})</p>
                      <div className="space-y-1">
                        {team.memberIds.slice(0, 3).map((member: any) => (
                          <p key={member._id} className="text-sm text-gray-300">
                            {member.firstName} {member.lastName}
                          </p>
                        ))}
                        {team.memberIds.length > 3 && (
                          <p className="text-sm text-gray-500">
                            +{team.memberIds.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-6 pt-4 border-t border-gray-700">
                      <button className="w-full py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg font-medium hover:shadow-lg hover:shadow-neon-blue/50 transition-all">
                        Join Live Session →
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
