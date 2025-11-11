'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use the authStore login method which handles everything
      await login(email, password);
      console.log('Login successful');

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (type: 'admin' | 'judge' | 'proctor' | 'student') => {
    const accounts = {
      admin: { email: 'admin@codearena.edu', password: 'password123' },
      judge: { email: 'judge@codearena.edu', password: 'password123' },
      proctor: { email: 'proctor@codearena.edu', password: 'password123' },
      student: { email: 'student@codearena.edu', password: 'password123' },
    };
    const account = accounts[type];
    setEmail(account.email);
    setPassword(account.password);
    setError(''); // Clear any previous errors
  };

  const quickDemoLogin = () => {
    // Just prefill with student demo account
    setEmail('student@codearena.edu');
    setPassword('password123');
    setError('');
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
            CodeArena
          </h1>
          <p className="text-gray-400">Justice Through Code Challenge Platform</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-2xl p-8 border-2 border-neon-blue/20 relative overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 shimmer opacity-20 pointer-events-none"></div>

          <h2 className="text-2xl font-bold mb-6 text-white relative z-10">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm relative z-10">
              {error}
            </div>
          )}

          {/* Quick Demo Login Button */}
          <button
            onClick={quickDemoLogin}
            disabled={loading}
            className="w-full mb-6 py-3 bg-gradient-to-r from-neon-green to-neon-blue text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed glow-green relative z-10"
          >
            🚀 Quick Start (Student Demo)
          </button>

          <div className="relative mb-6 relative z-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-dark-800 text-gray-400">Or sign in manually</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
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
          <div className="mt-6 pt-6 border-t border-gray-700 relative z-10">
            <p className="text-xs text-gray-400 mb-3 text-center">Quick demo accounts (click to prefill):</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fillDemoAccount('admin')}
                disabled={loading}
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-neon-blue/30 rounded text-xs text-gray-300 hover:text-neon-blue transition-all disabled:opacity-50"
              >
                👑 Admin
              </button>
              <button
                onClick={() => fillDemoAccount('judge')}
                disabled={loading}
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-neon-purple/30 rounded text-xs text-gray-300 hover:text-neon-purple transition-all disabled:opacity-50"
              >
                ⚖️ Judge
              </button>
              <button
                onClick={() => fillDemoAccount('proctor')}
                disabled={loading}
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-neon-pink/30 rounded text-xs text-gray-300 hover:text-neon-pink transition-all disabled:opacity-50"
              >
                👁️ Proctor
              </button>
              <button
                onClick={() => fillDemoAccount('student')}
                disabled={loading}
                className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-neon-green/30 rounded text-xs text-gray-300 hover:text-neon-green transition-all disabled:opacity-50"
              >
                🎓 Student
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-400 relative z-10">
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
