'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

type RoleType = 'admin' | 'judge' | 'student';

interface RoleInfo {
  title: string;
  subtitle: string;
  description: string;
  capabilities: string[];
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  email: string;
  password: string;
}

const roleInfo: Record<RoleType, RoleInfo> = {
  admin: {
    title: 'Admin',
    subtitle: 'JTC Staff',
    description: 'Full platform control and management',
    capabilities: [
      'Create & manage assessments',
      'Create hackathons & coding sessions',
      'Add problems & questions',
      'Manage teams & users',
      'Monitor sessions (Proctor)',
      'Grade submissions (Judge)',
      'View analytics & reports',
    ],
    icon: '👑',
    color: 'text-neon-blue',
    borderColor: 'border-neon-blue',
    bgColor: 'bg-neon-blue/10',
    email: 'admin@codearena.edu',
    password: 'password123',
  },
  judge: {
    title: 'Judge',
    subtitle: 'Evaluator & Proctor',
    description: 'Grade submissions and monitor sessions',
    capabilities: [
      'Grade assessment submissions',
      'Score hackathon projects',
      'Monitor live sessions',
      'View participant progress',
      'Flag violations',
      'Provide feedback',
    ],
    icon: '⚖️',
    color: 'text-neon-purple',
    borderColor: 'border-neon-purple',
    bgColor: 'bg-neon-purple/10',
    email: 'judge@codearena.edu',
    password: 'password123',
  },
  student: {
    title: 'Fellow',
    subtitle: 'Student / Participant',
    description: 'Take assessments and join hackathons',
    capabilities: [
      'Take coding assessments',
      'Join hackathon teams',
      'Participate in live sessions',
      'View your progress & scores',
      'Submit hackathon projects',
    ],
    icon: '🎓',
    color: 'text-neon-green',
    borderColor: 'border-neon-green',
    bgColor: 'bg-neon-green/10',
    email: 'student@codearena.edu',
    password: 'password123',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      console.log('Login successful');

      // Role-based redirect
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const roles = user.roles || [];

        // Check roles in priority order: admin > judge > applicant
        if (roles.some((r: any) => r.role === 'admin')) {
          router.push('/admin');
        } else if (roles.some((r: any) => r.role === 'judge' || r.role === 'proctor')) {
          router.push('/judge');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoRole = (role: RoleType) => {
    setSelectedRole(role);
    setEmail(roleInfo[role].email);
    setPassword(roleInfo[role].password);
    setShowRoleSelector(false);
    setError('');
  };

  const handleBackToRoles = () => {
    setShowRoleSelector(true);
    setSelectedRole(null);
    setEmail('');
    setPassword('');
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

      <div className="w-full max-w-4xl relative z-10 animate-slide-up">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 text-gradient">
            CodeArena
          </h1>
          <p className="text-gray-400">Justice Through Code Challenge Platform</p>
        </div>

        {showRoleSelector ? (
          /* Role Selection Screen */
          <div className="glass rounded-2xl p-8 border-2 border-neon-blue/20 relative overflow-hidden">
            <div className="absolute inset-0 shimmer opacity-20 pointer-events-none"></div>

            <h2 className="text-2xl font-bold mb-2 text-white text-center relative z-10">Welcome! Choose Your Role</h2>
            <p className="text-gray-400 text-center mb-8 relative z-10">Select how you want to sign in to the platform</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {(Object.keys(roleInfo) as RoleType[]).map((role) => {
                const info = roleInfo[role];
                return (
                  <button
                    key={role}
                    onClick={() => selectDemoRole(role)}
                    className={`p-6 rounded-xl border-2 ${info.borderColor}/30 hover:${info.borderColor} ${info.bgColor} transition-all hover:scale-105 text-left group`}
                  >
                    <div className="text-4xl mb-3">{info.icon}</div>
                    <h3 className={`text-xl font-bold ${info.color} mb-1`}>{info.title}</h3>
                    <p className="text-sm text-gray-400 mb-3">{info.subtitle}</p>
                    <p className="text-xs text-gray-500 mb-4">{info.description}</p>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-400 mb-2">What you can do:</p>
                      {info.capabilities.slice(0, 4).map((cap, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
                          <span className={info.color}>✓</span>
                          <span>{cap}</span>
                        </div>
                      ))}
                      {info.capabilities.length > 4 && (
                        <p className="text-xs text-gray-500 italic">+{info.capabilities.length - 4} more...</p>
                      )}
                    </div>

                    <div className={`mt-4 py-2 px-4 rounded-lg ${info.bgColor} border ${info.borderColor}/50 text-center`}>
                      <span className={`text-sm font-medium ${info.color}`}>Sign in as {info.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="relative mt-8 relative z-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-800 text-gray-400">Or sign in with your credentials</span>
              </div>
            </div>

            <button
              onClick={() => setShowRoleSelector(false)}
              className="w-full mt-6 py-3 bg-dark-700 border border-gray-600 text-gray-300 font-medium rounded-lg hover:bg-dark-600 transition-all relative z-10"
            >
              Sign in with Email & Password
            </button>

            <p className="mt-6 text-center text-sm text-gray-400 relative z-10">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-neon-blue hover:underline">
                Sign up as a Fellow
              </Link>
            </p>
          </div>
        ) : (
          /* Login Form */
          <div className="max-w-md mx-auto glass rounded-2xl p-8 border-2 border-neon-blue/20 relative overflow-hidden">
            <div className="absolute inset-0 shimmer opacity-20 pointer-events-none"></div>

            {selectedRole && (
              <div className={`mb-6 p-4 rounded-lg ${roleInfo[selectedRole].bgColor} border ${roleInfo[selectedRole].borderColor}/30 relative z-10`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{roleInfo[selectedRole].icon}</span>
                  <div>
                    <h3 className={`font-bold ${roleInfo[selectedRole].color}`}>
                      Signing in as {roleInfo[selectedRole].title}
                    </h3>
                    <p className="text-xs text-gray-400">{roleInfo[selectedRole].subtitle}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-2xl font-bold text-white">Sign In</h2>
              <button
                onClick={handleBackToRoles}
                className="text-sm text-neon-blue hover:underline"
              >
                ← Back to roles
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm relative z-10">
                {error}
              </div>
            )}

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

            {selectedRole && (
              <div className="mt-6 pt-6 border-t border-gray-700 relative z-10">
                <p className="text-xs text-gray-400 mb-3">Demo credentials pre-filled:</p>
                <div className="p-3 bg-dark-700 rounded-lg text-xs">
                  <p className="text-gray-400">Email: <span className="text-white">{roleInfo[selectedRole].email}</span></p>
                  <p className="text-gray-400">Password: <span className="text-white">{roleInfo[selectedRole].password}</span></p>
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-gray-400 relative z-10">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-neon-blue hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        )}

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
