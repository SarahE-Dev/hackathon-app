'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { hackathonSessionsAPI } from '@/lib/api';

interface HackathonSession {
  _id: string;
  title: string;
  description?: string;
  status: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  proctoring: {
    enabled: boolean;
    requireFullscreen: boolean;
    detectTabSwitch: boolean;
    detectCopyPaste: boolean;
    detectIdle: boolean;
    idleTimeoutMinutes: number;
  };
}

function EditSessionContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<HackathonSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    duration: 180,
    proctoring: {
      enabled: true,
      requireFullscreen: true,
      detectTabSwitch: true,
      detectCopyPaste: true,
      detectIdle: true,
      idleTimeoutMinutes: 10,
    },
  });

  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await hackathonSessionsAPI.getById(sessionId);
      const sessionData = response.data?.session;
      
      if (!sessionData) {
        setError('Session not found');
        return;
      }

      setSession(sessionData);
      setFormData({
        title: sessionData.title || '',
        description: sessionData.description || '',
        startTime: sessionData.startTime ? new Date(sessionData.startTime).toISOString().slice(0, 16) : '',
        endTime: sessionData.endTime ? new Date(sessionData.endTime).toISOString().slice(0, 16) : '',
        duration: sessionData.duration || 180,
        proctoring: {
          enabled: sessionData.proctoring?.enabled ?? true,
          requireFullscreen: sessionData.proctoring?.requireFullscreen ?? true,
          detectTabSwitch: sessionData.proctoring?.detectTabSwitch ?? true,
          detectCopyPaste: sessionData.proctoring?.detectCopyPaste ?? true,
          detectIdle: sessionData.proctoring?.detectIdle ?? true,
          idleTimeoutMinutes: sessionData.proctoring?.idleTimeoutMinutes ?? 10,
        },
      });
    } catch (err: any) {
      console.error('Error loading session:', err);
      setError(err.response?.data?.error?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId, loadSession]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await hackathonSessionsAPI.update(sessionId, {
        title: formData.title,
        description: formData.description,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : undefined,
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : undefined,
        duration: formData.duration,
        proctoring: formData.proctoring,
      });
      router.push('/admin/sessions');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-400 mb-4">{error || 'Session not found'}</p>
          <Link href="/admin/sessions" className="text-neon-blue hover:underline">
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <Link href="/admin" className="hover:text-white">Admin</Link>
                <span>/</span>
                <Link href="/admin/sessions" className="hover:text-white">Sessions</Link>
                <span>/</span>
                <span className="text-white">Edit</span>
              </div>
              <h1 className="text-2xl font-bold text-gradient">Edit Session</h1>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              session.status === 'active' ? 'bg-green-500/20 text-green-400' :
              session.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
              session.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {session.status}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Info */}
          <div className="glass rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all"
                  placeholder="e.g., JTC CodeJam 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all"
                  placeholder="Describe the hackathon session..."
                />
              </div>
            </div>
          </div>

          {/* Timing */}
          <div className="glass rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Timing</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 180 })}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                />
              </div>
            </div>
          </div>

          {/* Proctoring */}
          <div className="glass rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Proctoring Settings</h2>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.proctoring.enabled}
                  onChange={(e) => setFormData({
                    ...formData,
                    proctoring: { ...formData.proctoring, enabled: e.target.checked }
                  })}
                  className="h-5 w-5 text-neon-blue focus:ring-neon-blue border-gray-600 rounded bg-dark-700"
                />
                <span className="ml-3 text-gray-300">Enable Proctoring</span>
              </label>

              {formData.proctoring.enabled && (
                <div className="ml-8 space-y-3 pt-2 border-l-2 border-gray-700 pl-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.proctoring.requireFullscreen}
                      onChange={(e) => setFormData({
                        ...formData,
                        proctoring: { ...formData.proctoring, requireFullscreen: e.target.checked }
                      })}
                      className="h-4 w-4 text-neon-blue focus:ring-neon-blue border-gray-600 rounded bg-dark-700"
                    />
                    <span className="ml-3 text-sm text-gray-300">Require Fullscreen Mode</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.proctoring.detectTabSwitch}
                      onChange={(e) => setFormData({
                        ...formData,
                        proctoring: { ...formData.proctoring, detectTabSwitch: e.target.checked }
                      })}
                      className="h-4 w-4 text-neon-blue focus:ring-neon-blue border-gray-600 rounded bg-dark-700"
                    />
                    <span className="ml-3 text-sm text-gray-300">Detect Tab Switches</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.proctoring.detectCopyPaste}
                      onChange={(e) => setFormData({
                        ...formData,
                        proctoring: { ...formData.proctoring, detectCopyPaste: e.target.checked }
                      })}
                      className="h-4 w-4 text-neon-blue focus:ring-neon-blue border-gray-600 rounded bg-dark-700"
                    />
                    <span className="ml-3 text-sm text-gray-300">Detect Copy/Paste</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.proctoring.detectIdle}
                      onChange={(e) => setFormData({
                        ...formData,
                        proctoring: { ...formData.proctoring, detectIdle: e.target.checked }
                      })}
                      className="h-4 w-4 text-neon-blue focus:ring-neon-blue border-gray-600 rounded bg-dark-700"
                    />
                    <span className="ml-3 text-sm text-gray-300">Detect Idle Time</span>
                  </label>

                  {formData.proctoring.detectIdle && (
                    <div className="ml-7">
                      <label className="block text-sm text-gray-400 mb-1">
                        Idle Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.proctoring.idleTimeoutMinutes}
                        onChange={(e) => setFormData({
                          ...formData,
                          proctoring: { ...formData.proctoring, idleTimeoutMinutes: parseInt(e.target.value) || 10 }
                        })}
                        className="w-24 px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm"
                      />
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400">
                      📊 Proctoring tracks: tab switches, copy/paste events, window focus loss, and typing patterns.
                      These metrics help judges identify suspicious activity.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="glass rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Additional Settings</h2>
            <p className="text-gray-400 text-sm mb-4">
              To manage problems, teams, fellows, and judges, use the roster management page.
            </p>
            <Link
              href={`/admin/hackathons/${sessionId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neon-green/20 hover:bg-neon-green/30 border border-neon-green/50 text-neon-green rounded-lg transition-all"
            >
              🏗️ Manage Roster & Problems
            </Link>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            <Link
              href="/admin/sessions"
              className="px-6 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg text-gray-300 hover:text-white transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function EditSessionPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <EditSessionContent />
    </RoleGuard>
  );
}

