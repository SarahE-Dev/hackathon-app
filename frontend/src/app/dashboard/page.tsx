'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { teamsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface TeamMember {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

interface Team {
  _id: string;
  name: string;
  organizationId: string;
  memberIds: (string | TeamMember)[];
  projectTitle?: string;
  description?: string;
  track?: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  submittedAt?: string;
  disqualified: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser, isAuthenticated, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);

  // Compute roles without function calls to avoid dependency issues
  const userRoles = authUser?.roles?.map(r => r.role) || [];
  const userIsAdmin = userRoles.includes('admin');
  const userIsProctor = userRoles.includes('proctor');
  const userIsJudge = userRoles.includes('judge');

  useEffect(() => {
    if (hasRedirected.current) return;

    const initializeDashboard = async () => {
      // Small delay to let Zustand rehydrate
      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (!isAuthenticated || !authUser) {
        hasRedirected.current = true;
        router.replace('/auth/login');
        return;
      }

      // Role-based redirect for admin/proctor/judge
      if (userIsAdmin) {
        hasRedirected.current = true;
        router.replace('/admin');
        return;
      }
      if (userIsProctor) {
        hasRedirected.current = true;
        router.replace('/proctor');
        return;
      }
      if (userIsJudge) {
        hasRedirected.current = true;
        router.replace('/judge');
        return;
      }

      try {
        // Fetch user's team
        try {
          const teamsData = await teamsAPI.getAllTeams();
          const teams = teamsData.data?.teams || teamsData || [];
          const teamsList = Array.isArray(teams) ? teams : [];
          
          // Get user ID in various formats for comparison
          const userId = authUser.id?.toString() || '';
          const userIdAlt = (authUser as any)._id?.toString() || '';
          
          const userTeamData = teamsList.find((team: Team) => {
            // memberIds might be populated objects or just IDs
            const memberIdStrings = team.memberIds?.map((m: any) => {
              if (typeof m === 'string') return m;
              if (m._id) return m._id.toString();
              if (m.id) return m.id.toString();
              return m.toString();
            }) || [];
            
            return memberIdStrings.includes(userId) || memberIdStrings.includes(userIdAlt);
          });
          
          setUserTeam(userTeamData || null);
        } catch (teamErr) {
          console.warn('Could not load team data:', teamErr);
          setUserTeam(null);
        }

      } catch (err: any) {
        console.error('Error loading dashboard:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [router, isAuthenticated, authUser, userIsAdmin, userIsProctor, userIsJudge]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  // Helper to get member display info
  const getTeamMembers = (): TeamMember[] => {
    if (!userTeam?.memberIds) return [];
    return userTeam.memberIds.map((m: any) => {
      if (typeof m === 'string') {
        return { _id: m, email: 'Loading...', firstName: '', lastName: '' };
      }
      return m as TeamMember;
    });
  };

  const teamMembers = getTeamMembers();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-green mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚡</span>
                <div>
                  <h1 className="text-2xl font-bold text-gradient">JTC CodeJam 2025</h1>
                  <p className="text-gray-400 text-sm">Welcome, {authUser?.firstName} {authUser?.lastName}!</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-dark-700 border border-gray-600 text-gray-400 rounded-lg hover:bg-dark-600 hover:text-white transition-all text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-sm underline">Dismiss</button>
          </div>
        )}

        {userTeam ? (
          <div className="space-y-6">
            {/* Team Card */}
            <div className="glass rounded-2xl p-8 border border-neon-purple/30 bg-gradient-to-br from-neon-purple/5 to-neon-blue/5">
              {/* Team Header */}
              <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-neon-purple to-neon-blue rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-neon-purple/20">
                  🏆
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white">{userTeam.name}</h2>
                  {userTeam.track && (
                    <span className="inline-block mt-2 px-3 py-1 bg-neon-blue/20 text-neon-blue text-sm rounded-full">
                      {userTeam.track}
                    </span>
                  )}
                </div>
              </div>

              {/* Main Action */}
              <Link
                href={`/hackathon/teams/${userTeam._id}`}
                className="block w-full py-5 bg-gradient-to-r from-neon-purple to-neon-blue text-white text-center rounded-xl font-bold text-xl transition-all hover:shadow-lg hover:shadow-neon-purple/30 hover:scale-[1.01]"
              >
                🚀 Enter Team Space
              </Link>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Members */}
              <div className="glass rounded-xl p-6 border border-gray-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span>👥</span> Your Teammates
                </h3>
                <div className="space-y-3">
                  {teamMembers.map((member, index) => {
                    const isCurrentUser = member._id === authUser?.id || member._id === (authUser as any)?._id;
                    const displayName = member.firstName && member.lastName 
                      ? `${member.firstName} ${member.lastName}`
                      : member.email?.split('@')[0] || 'Team Member';
                    
                    return (
                      <div
                        key={member._id || index}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isCurrentUser 
                            ? 'bg-neon-green/10 border border-neon-green/30' 
                            : 'bg-dark-700/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                          isCurrentUser
                            ? 'bg-neon-green/20 text-neon-green'
                            : 'bg-neon-purple/20 text-neon-purple'
                        }`}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {displayName}
                            {isCurrentUser && <span className="ml-2 text-xs text-neon-green">(You)</span>}
                          </p>
                          {member.email && member.email !== 'Loading...' && (
                            <p className="text-xs text-gray-500 truncate">{member.email}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {teamMembers.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No team members found</p>
                  )}
                </div>
              </div>

              {/* Quick Actions & Info */}
              <div className="space-y-6">
                {/* Leaderboard Link */}
                <Link
                  href="/hackathon/leaderboard"
                  className="block glass rounded-xl p-6 border border-yellow-500/30 hover:border-yellow-500/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      🏆
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-yellow-400 transition-colors">
                        Leaderboard
                      </h3>
                      <p className="text-sm text-gray-400">See how your team ranks</p>
                    </div>
                    <div className="ml-auto text-gray-500 group-hover:text-yellow-400 transition-colors">
                      →
                    </div>
                  </div>
                </Link>

                {/* Tips Card */}
                <div className="glass rounded-xl p-6 border border-gray-700">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <span>💡</span> How It Works
                  </h3>
                  <ul className="text-sm text-gray-400 space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="text-neon-green mt-0.5">▶</span>
                      <span><strong className="text-gray-300">Run Code</strong> - Test visible cases (unlimited)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-neon-blue mt-0.5">🔬</span>
                      <span><strong className="text-gray-300">Run All Tests</strong> - Hidden tests (5 team runs)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-neon-purple mt-0.5">📝</span>
                      <span><strong className="text-gray-300">Submit</strong> - Lock in your solution + explanation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">⚠️</span>
                      <span><strong className="text-gray-300">One shot</strong> - Each problem can only be submitted once!</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Motivational Footer */}
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">
                💪 Good luck, <span className="text-neon-purple font-medium">{userTeam.name}</span>! Show them what you've got!
              </p>
            </div>
          </div>
        ) : (
          /* No Team State */
          <div className="max-w-lg mx-auto">
            <div className="glass rounded-2xl p-12 border border-gray-700 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-2xl font-bold text-gray-300 mb-3">No Team Assigned Yet</h2>
              <p className="text-gray-400 mb-6">
                You'll be assigned to a team when the hackathon begins. Check back soon or contact an admin if you think this is a mistake.
              </p>
              <Link
                href="/hackathon/leaderboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 text-gray-300 rounded-xl transition-all"
              >
                🏆 View Leaderboard
              </Link>
            </div>

            {/* Still show tips */}
            <div className="mt-6 glass rounded-xl p-6 border border-gray-700">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span>💡</span> What to Expect
              </h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• You'll be assigned to a team of fellow coders</li>
                <li>• Work together to solve coding challenges</li>
                <li>• Each problem can only be submitted once per team</li>
                <li>• Judges will review your solutions and explanations</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
