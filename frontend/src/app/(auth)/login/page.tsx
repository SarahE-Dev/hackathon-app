'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);

      // Store tokens
      localStorage.setItem('accessToken', response.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (type: 'admin' | 'proctor' | 'student') => {
    const accounts = {
      admin: { email: 'admin@demo.edu', password: 'Admin123!' },
      proctor: { email: 'proctor@demo.edu', password: 'Proctor123!' },
      student: { email: 'student@demo.edu', password: 'Student123!' },
    };
    setEmail(accounts[type].email);
    setPassword(accounts[type].password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-neon-blue/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-neon-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 text-gradient">
            HackProctor
          </h1>
          <p className="text-gray-400">Next-gen hackathon assessment platform</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-2xl p-8 border-2 border-neon-blue/20 relative overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 shimmer opacity-20"></div>

          <h2 className="text-2xl font-bold mb-6 text-white">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed glow-blue"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-400 mb-3 text-center">Quick demo accounts:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => fillDemoAccount('admin')}
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-neon-blue/30 rounded text-xs text-gray-300 hover:text-neon-blue transition-all"
              >
                Admin
              </button>
              <button
                onClick={() => fillDemoAccount('proctor')}
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-neon-purple/30 rounded text-xs text-gray-300 hover:text-neon-purple transition-all"
              >
                Proctor
              </button>
              <button
                onClick={() => fillDemoAccount('student')}
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-neon-pink/30 rounded text-xs text-gray-300 hover:text-neon-pink transition-all"
              >
                Student
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-neon-blue hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href="/" className="hover:text-neon-blue transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
