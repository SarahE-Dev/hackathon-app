'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import axios from 'axios';

// Utility function to convert data to CSV
function convertToCSV(data: any[], headers: string[]): string {
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in CSV
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// Function to download CSV file
function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

interface Attempt {
  _id: string;
  userId: string;
  userName?: string;
  startedAt: string;
  submittedAt?: string;
  status: 'in-progress' | 'submitted' | 'graded';
  score?: number;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  totalPoints: number;
  status: 'draft' | 'published' | 'archived';
}

function GradingOverviewContent() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssessmentAndAttempts();
  }, [assessmentId]);

  const loadAssessmentAndAttempts = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('accessToken');

      // Load assessment
      const assessmentResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/assessments/${assessmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAssessment(assessmentResponse.data.data.assessment);

      // Load attempts - This endpoint might need to be added to backend
      try {
        const attemptsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/assessment/${assessmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const attemptsData = attemptsResponse.data.data || [];
        setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
      } catch (attemptsErr) {
        // Attempts endpoint might not exist yet
        console.log('Attempts endpoint not available:', attemptsErr);
        setAttempts([]);
      }

    } catch (err: any) {
      console.error('Error loading assessment:', err);
      setError(err.response?.data?.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-neon-green/20 text-neon-green border border-neon-green/50';
      case 'submitted':
        return 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50';
      case 'in-progress':
        return 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50';
      default:
        return 'bg-gray-600/20 text-gray-400 border border-gray-600/50';
    }
  };

  const getSubmittedCount = () => {
    return attempts.filter(a => a.status === 'submitted' || a.status === 'graded').length;
  };

  const getGradedCount = () => {
    return attempts.filter(a => a.status === 'graded').length;
  };

  const exportToCSV = () => {
    const exportData = attempts.map(attempt => ({
      'Student Name': attempt.userName || `Student ${attempt.userId.slice(-8)}`,
      'Status': attempt.status.replace('-', ' ').toUpperCase(),
      'Started': new Date(attempt.startedAt).toLocaleString(),
      'Submitted': attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'Not submitted',
      'Score': attempt.score !== undefined ? `${attempt.score}/${assessment?.totalPoints || 0}` : 'Not graded',
      'Percentage': attempt.score !== undefined && assessment?.totalPoints
        ? `${Math.round((attempt.score / assessment.totalPoints) * 100)}%`
        : 'N/A'
    }));

    const headers = ['Student Name', 'Status', 'Started', 'Submitted', 'Score', 'Percentage'];
    const csvContent = convertToCSV(exportData, headers);

    const filename = `${assessment?.title || 'Assessment'}_Results_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading grading overview...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Assessment not found</p>
          <Link href="/admin/assessments" className="text-neon-blue hover:text-neon-blue/80 mt-4 inline-block">
            ← Back to Assessments
          </Link>
        </div>
      </div>
    );
  }

  const submittedCount = getSubmittedCount();
  const gradedCount = getGradedCount();

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin/assessments"
                className="text-neon-blue hover:text-neon-blue/80 transition-all mb-2 inline-block"
              >
                ← Back to Assessments
              </Link>
              <h1 className="text-2xl font-bold text-gradient">{assessment.title}</h1>
              <p className="text-gray-400 mt-1">Grade Submissions</p>
            </div>
            <div className="text-right flex items-center gap-4">
              <div>
                <div className="text-lg font-semibold">{submittedCount} Submitted</div>
                <div className="text-sm text-gray-400">{gradedCount} Graded</div>
              </div>
              <button
                onClick={exportToCSV}
                disabled={attempts.length === 0}
                className="px-4 py-2 bg-neon-green hover:bg-neon-green/80 text-white rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📊 Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-xl p-6 border-2 border-neon-blue/20">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Submissions</h3>
            <p className="text-4xl font-bold text-neon-blue">{attempts.length}</p>
          </div>

          <div className="glass rounded-xl p-6 border-2 border-neon-purple/20">
            <h3 className="text-gray-400 text-sm font-medium mb-2">In Progress</h3>
            <p className="text-4xl font-bold text-neon-purple">
              {attempts.filter(a => a.status === 'in-progress').length}
            </p>
          </div>

          <div className="glass rounded-xl p-6 border-2 border-neon-green/20">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Submitted</h3>
            <p className="text-4xl font-bold text-neon-green">{submittedCount}</p>
          </div>

          <div className="glass rounded-xl p-6 border-2 border-neon-pink/20">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Graded</h3>
            <p className="text-4xl font-bold text-neon-pink">{gradedCount}</p>
          </div>
        </div>

        {/* Submissions List */}
        <div className="glass rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 bg-dark-800">
            <h2 className="text-lg font-semibold text-white">Student Submissions</h2>
          </div>

          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-50">📝</div>
              <p className="text-gray-400">No submissions yet</p>
              <p className="text-sm text-gray-500 mt-2">Students need to complete the assessment first</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {attempts.map((attempt) => (
                <div
                  key={attempt._id}
                  className="p-6 hover:bg-dark-800 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {attempt.userName || `Student ${attempt.userId.slice(-8)}`}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(attempt.status)}`}>
                          {attempt.status.replace('-', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>Started: {new Date(attempt.startedAt).toLocaleString()}</span>
                        {attempt.submittedAt && (
                          <span>Submitted: {new Date(attempt.submittedAt).toLocaleString()}</span>
                        )}
                        {attempt.score !== undefined && (
                          <span className="text-neon-green font-medium">
                            Score: {attempt.score}/{assessment.totalPoints}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {(attempt.status === 'submitted' || attempt.status === 'graded') && (
                        <Link
                          href={`/grading/${attempt._id}`}
                          className="px-4 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded text-sm transition-all"
                        >
                          {attempt.status === 'graded' ? 'Review Grades' : 'Grade'}
                        </Link>
                      )}
                      {attempt.status === 'in-progress' && (
                        <span className="px-4 py-2 bg-gray-600 text-gray-400 rounded text-sm">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function GradingOverviewPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'proctor']}>
      <GradingOverviewContent />
    </RoleGuard>
  );
}
