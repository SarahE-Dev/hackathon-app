'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface AttemptDetails {
  attempt: {
    _id: string;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
    assessmentId: {
      _id: string;
      title: string;
      description: string;
      settings: any;
    };
    status: string;
    startedAt: string;
    submittedAt?: string;
    timeSpent: number;
    answers: any[];
  };
  timeRemaining: number | null;
  violations: {
    tabSwitch: number;
    copyPaste: number;
    fullscreenExit: number;
    webcamIssues: number;
  };
  recentEvents: Array<{
    type: string;
    timestamp: string;
    metadata?: any;
  }>;
}

function AttemptMonitoringContent() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const router = useRouter();

  const [details, setDetails] = useState<AttemptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showForceSubmit, setShowForceSubmit] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  // Form states
  const [forceSubmitReason, setForceSubmitReason] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'low' | 'medium' | 'high'>('medium');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAttemptDetails();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchAttemptDetails, 5000);
    return () => clearInterval(interval);
  }, [attemptId]);

  const fetchAttemptDetails = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `${BACKEND_URL}/api/proctoring/attempts/${attemptId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setDetails(response.data.data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching attempt details:', err);
      setError(err.response?.data?.message || 'Failed to load attempt details');
      setLoading(false);
    }
  };

  const handleForceSubmit = async () => {
    if (!forceSubmitReason.trim()) {
      alert('Please provide a reason for force submit');
      return;
    }

    if (!confirm('Are you sure you want to force submit this attempt? This action cannot be undone.')) {
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('accessToken');

      await axios.post(
        `${BACKEND_URL}/api/proctoring/attempts/${attemptId}/force-submit`,
        { reason: forceSubmitReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Attempt force submitted successfully');
      setShowForceSubmit(false);
      setForceSubmitReason('');
      router.push('/proctor/assessments');
    } catch (err: any) {
      console.error('Error force submitting:', err);
      alert(err.response?.data?.message || 'Failed to force submit attempt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddIncident = async () => {
    if (!incidentType.trim() || !incidentDescription.trim()) {
      alert('Please fill in all incident fields');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('accessToken');

      await axios.post(
        `${BACKEND_URL}/api/proctoring/attempts/${attemptId}/incident`,
        {
          incidentType,
          severity: incidentSeverity,
          description: incidentDescription,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Incident report added successfully');
      setShowIncident(false);
      setIncidentType('');
      setIncidentDescription('');
      setIncidentSeverity('medium');
      fetchAttemptDetails();
    } catch (err: any) {
      console.error('Error adding incident:', err);
      alert(err.response?.data?.message || 'Failed to add incident report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAlert = async () => {
    if (!alertMessage.trim()) {
      alert('Please enter an alert message');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('accessToken');

      await axios.post(
        `${BACKEND_URL}/api/proctoring/attempts/${attemptId}/alert`,
        {
          message: alertMessage,
          severity: alertSeverity,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Alert sent to student');
      setShowAlert(false);
      setAlertMessage('');
      setAlertSeverity('medium');
      fetchAttemptDetails();
    } catch (err: any) {
      console.error('Error sending alert:', err);
      alert(err.response?.data?.message || 'Failed to send alert');
    } finally {
      setSubmitting(false);
    }
  };

  const getEventColor = (type: string) => {
    if (type.includes('violation') || type.includes('hidden') || type.includes('exit')) {
      return 'text-red-400';
    }
    if (type.includes('incident')) {
      return 'text-orange-400';
    }
    if (type.includes('alert')) {
      return 'text-yellow-400';
    }
    return 'text-blue-400';
  };

  const formatTime = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading attempt details...</p>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error || 'Attempt not found'}</p>
          <Link
            href="/proctor/assessments"
            className="px-4 py-2 bg-neon-blue text-white rounded-lg hover:bg-neon-blue/80 transition-colors"
          >
            Back to Proctoring
          </Link>
        </div>
      </div>
    );
  }

  const { attempt, timeRemaining, violations, recentEvents } = details;
  const totalViolations = violations.tabSwitch + violations.copyPaste + violations.fullscreenExit + violations.webcamIssues;

  return (
    <RoleGuard allowedRoles={['proctor', 'admin', 'judge']}>
      <div className="min-h-screen bg-dark-900 text-white">
        {/* Header */}
        <div className="bg-dark-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">{attempt.assessmentId.title}</h1>
                <p className="text-gray-400 mt-1">Monitoring: {attempt.userId.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-medium border rounded-full ${
                  attempt.status === 'in_progress'
                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                }`}>
                  {attempt.status.toUpperCase().replace('_', ' ')}
                </span>
                <Link
                  href="/proctor/assessments"
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
                >
                  Back to List
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Violation Summary */}
              <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Violation Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-dark-700 border border-red-500/30 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Tab Switch</div>
                    <div className="text-2xl font-bold text-red-400 mt-1">{violations.tabSwitch}</div>
                  </div>
                  <div className="bg-dark-700 border border-orange-500/30 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Copy/Paste</div>
                    <div className="text-2xl font-bold text-orange-400 mt-1">{violations.copyPaste}</div>
                  </div>
                  <div className="bg-dark-700 border border-yellow-500/30 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Fullscreen</div>
                    <div className="text-2xl font-bold text-yellow-400 mt-1">{violations.fullscreenExit}</div>
                  </div>
                  <div className="bg-dark-700 border border-purple-500/30 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Webcam</div>
                    <div className="text-2xl font-bold text-purple-400 mt-1">{violations.webcamIssues}</div>
                  </div>
                </div>
              </div>

              {/* Recent Events */}
              <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentEvents.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No events recorded</p>
                  ) : (
                    recentEvents.map((event, idx) => (
                      <div key={idx} className="bg-dark-700 border border-gray-600 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${getEventColor(event.type)}`}>
                              {event.type.replace(/-/g, ' ').toUpperCase()}
                            </span>
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                {JSON.stringify(event.metadata)}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Student Info */}
              <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Student Information</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <p className="text-white font-medium">{attempt.userId.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <p className="text-white">{attempt.userId.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Started:</span>
                    <p className="text-white">{new Date(attempt.startedAt).toLocaleString()}</p>
                  </div>
                  {attempt.submittedAt && (
                    <div>
                      <span className="text-gray-400">Submitted:</span>
                      <p className="text-white">{new Date(attempt.submittedAt).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Time Remaining:</span>
                    <p className="text-white font-medium">{formatTime(timeRemaining)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Violations:</span>
                    <p className={`font-bold ${totalViolations >= 10 ? 'text-red-400' : totalViolations >= 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {totalViolations}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-dark-800 border border-gray-700 rounded-lg p-6 space-y-3">
                <h3 className="text-lg font-semibold mb-4">Proctor Actions</h3>

                <button
                  onClick={() => setShowAlert(true)}
                  disabled={attempt.status !== 'in_progress'}
                  className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Alert to Student
                </button>

                <button
                  onClick={() => setShowIncident(true)}
                  className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Report Incident
                </button>

                <button
                  onClick={() => setShowForceSubmit(true)}
                  disabled={attempt.status !== 'in_progress'}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Force Submit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Force Submit Modal */}
        {showForceSubmit && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Force Submit Attempt</h2>
              <p className="text-gray-400 mb-4">
                This will immediately submit the student's attempt. This action cannot be undone.
              </p>
              <textarea
                value={forceSubmitReason}
                onChange={(e) => setForceSubmitReason(e.target.value)}
                placeholder="Reason for force submit (required)..."
                rows={4}
                className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white resize-none focus:outline-none focus:border-neon-blue mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowForceSubmit(false)}
                  className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForceSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Force Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Incident Report Modal */}
        {showIncident && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Report Incident</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Incident Type</label>
                  <input
                    type="text"
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    placeholder="e.g., Cheating, Technical Issue"
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                  <select
                    value={incidentSeverity}
                    onChange={(e) => setIncidentSeverity(e.target.value as any)}
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    placeholder="Detailed description of the incident..."
                    rows={4}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white resize-none focus:outline-none focus:border-neon-blue"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowIncident(false)}
                  className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddIncident}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Alert Modal */}
        {showAlert && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Send Alert to Student</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                  <select
                    value={alertSeverity}
                    onChange={(e) => setAlertSeverity(e.target.value as any)}
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                  <textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Alert message to send to the student..."
                    rows={4}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white resize-none focus:outline-none focus:border-neon-blue"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAlert(false)}
                  className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendAlert}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Alert'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

export default AttemptMonitoringContent;
