'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    setUser(JSON.parse(userData));
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold text-gradient mb-2">Dashboard</h1>
            <p className="text-gray-400">Welcome back, {user?.firstName}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-dark-700 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
          >
            Logout
          </button>
        </div>

        {/* User Info Card */}
        <div className="glass rounded-2xl p-6 border border-neon-blue/20 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Your Profile</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Email</p>
              <p className="text-white font-mono">{user?.email}</p>
            </div>
            <div>
              <p className="text-gray-400">Name</p>
              <p className="text-white">{user?.firstName} {user?.lastName}</p>
            </div>
            <div>
              <p className="text-gray-400">Roles</p>
              <div className="flex gap-2 mt-1">
                {user?.roles?.map((r: any, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-neon-blue/20 border border-neon-blue/50 text-neon-blue rounded text-xs"
                  >
                    {r.role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-2xl p-6 border border-neon-purple/20">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-white mb-2">Assessments</h3>
            <p className="text-sm text-gray-400 mb-4">
              View and take available assessments
            </p>
            <button className="px-4 py-2 bg-neon-purple/20 border border-neon-purple text-neon-purple rounded-lg text-sm hover:bg-neon-purple/30 transition-all">
              Coming Soon
            </button>
          </div>

          <div className="glass rounded-2xl p-6 border border-neon-pink/20">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-white mb-2">Results</h3>
            <p className="text-sm text-gray-400 mb-4">
              Check your scores and feedback
            </p>
            <button className="px-4 py-2 bg-neon-pink/20 border border-neon-pink text-neon-pink rounded-lg text-sm hover:bg-neon-pink/30 transition-all">
              Coming Soon
            </button>
          </div>

          <div className="glass rounded-2xl p-6 border border-neon-blue/20">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="text-lg font-semibold text-white mb-2">Hackathons</h3>
            <p className="text-sm text-gray-400 mb-4">
              Join or create hackathon teams
            </p>
            <button className="px-4 py-2 bg-neon-blue/20 border border-neon-blue text-neon-blue rounded-lg text-sm hover:bg-neon-blue/30 transition-all">
              Coming Soon
            </button>
          </div>
        </div>

        {/* Status Message */}
        <div className="glass rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">🚧 Platform Status</h3>
          <p className="text-gray-400 text-sm mb-4">
            The dashboard is currently under construction. Here's what's available:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">Authentication & User Management</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">Question Bank API</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">Assessment Builder API</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">○</span>
              <span className="text-gray-400">Session & Attempt System (In Progress)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">○</span>
              <span className="text-gray-400">Proctoring Dashboard (In Progress)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">○</span>
              <span className="text-gray-400">Code Execution Engine (In Progress)</span>
            </li>
          </ul>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-neon-blue hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
