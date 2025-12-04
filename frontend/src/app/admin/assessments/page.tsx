'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useAuthStore } from '@/store/authStore';
import { assessmentsAPI } from '@/lib/api';

interface Assessment {
  id: string;
  title: string;
  description: string;
  totalPoints: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'archived';
}

function AdminAssessmentsContent() {
  const { user } = useAuthStore();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');

  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => {
    filterAssessments();
  }, [assessments, searchQuery, statusFilter]);

  const filterAssessments = () => {
    let filtered = assessments;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(assessment => assessment.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(assessment =>
        assessment.title.toLowerCase().includes(query) ||
        assessment.description.toLowerCase().includes(query)
      );
    }

    setFilteredAssessments(filtered);
  };

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const response = await assessmentsAPI.getAll();
      const assessmentsData = Array.isArray(response.data?.assessments)
        ? response.data.assessments
        : [];
      // Map _id to id for consistency
      const mappedAssessments = assessmentsData.map((a: any) => ({
        ...a,
        id: a.id || a._id,
      }));
      setAssessments(mappedAssessments);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assessmentsAPI.create({
        title: formData.title,
        description: formData.description,
        settings: {
          timeLimit: 60, // Default 60 minutes
          proctoring: {
            enabled: false,
            requireWebcam: false,
            detectTabSwitch: false,
            preventCopyPaste: false,
          },
        },
        questions: [],
      });
      setShowCreateModal(false);
      setFormData({ title: '', description: '' });
      loadAssessments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to create assessment');
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    try {
      await assessmentsAPI.delete(id);
      loadAssessments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete assessment');
    }
  };

  const handlePublishAssessment = async (id: string) => {
    if (!confirm('Publish this assessment? Students will be able to take it.')) return;

    try {
      await assessmentsAPI.update(id, { status: 'published' });
      loadAssessments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to publish assessment');
    }
  };

  const handleArchiveAssessment = async (id: string) => {
    if (!confirm('Archive this assessment? It will be hidden from students.')) return;

    try {
      await assessmentsAPI.update(id, { status: 'archived' });
      loadAssessments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to archive assessment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-neon-green/20 text-neon-green border border-neon-green/50';
      case 'draft':
        return 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50';
      case 'archived':
        return 'bg-gray-600/20 text-gray-400 border border-gray-600/50';
      default:
        return 'bg-gray-600/20 text-gray-400 border border-gray-600/50';
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient mb-2">Assessment Builder</h1>
              <p className="text-gray-400">Create and manage coding assessments</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90 transition-all"
              >
                Create Assessment
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-xl p-6 border-2 border-neon-blue/20 hover:border-neon-blue transition-all">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Total Assessments</h3>
            <p className="text-4xl font-bold text-neon-blue">{assessments.length}</p>
          </div>

          <div className="glass rounded-xl p-6 border-2 border-neon-green/20 hover:border-neon-green transition-all">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Published</h3>
            <p className="text-4xl font-bold text-neon-green">
              {assessments.filter(a => a.status === 'published').length}
            </p>
          </div>

          <div className="glass rounded-xl p-6 border-2 border-neon-purple/20 hover:border-neon-purple transition-all">
            <h3 className="text-gray-400 text-sm font-medium mb-2">Drafts</h3>
            <p className="text-4xl font-bold text-neon-purple">
              {assessments.filter(a => a.status === 'draft').length}
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search assessments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All', count: assessments.length },
              { key: 'published', label: 'Published', count: assessments.filter(a => a.status === 'published').length },
              { key: 'draft', label: 'Drafts', count: assessments.filter(a => a.status === 'draft').length },
              { key: 'archived', label: 'Archived', count: assessments.filter(a => a.status === 'archived').length },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === filter.key
                    ? 'bg-neon-blue text-white'
                    : 'bg-dark-700 text-gray-300 hover:bg-dark-600 border border-gray-600'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>

        {/* Assessments List */}
        <div className="glass rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 bg-dark-800">
            <h2 className="text-lg font-semibold text-white">Assessments</h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-blue"></div>
              <p className="mt-4 text-gray-400">Loading assessments...</p>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-50">📋</div>
              <p className="text-gray-400 mb-4">No assessments yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90 transition-all"
              >
                Create Your First Assessment
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="p-6 hover:bg-dark-800 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{assessment.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(assessment.status)}`}>
                          {assessment.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{assessment.description}</p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>{assessment.questionCount || 0} questions</span>
                        <span>{assessment.totalPoints} points</span>
                        <span>Updated {new Date(assessment.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/assessments/${assessment.id}/builder`}
                        className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white rounded text-sm transition-all"
                      >
                        Edit
                      </Link>
                      <div className="flex gap-2">
                        {assessment.status === 'published' && (
                          <>
                            <Link
                              href={`/admin/assessments/${assessment.id}/grading`}
                              className="px-3 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded text-sm transition-all"
                            >
                              Grade
                            </Link>
                            <button
                              onClick={() => handleArchiveAssessment(assessment.id)}
                              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-all"
                            >
                              Archive
                            </button>
                          </>
                        )}
                        {assessment.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handlePublishAssessment(assessment.id)}
                              className="px-3 py-2 bg-neon-green hover:bg-neon-green/80 text-white rounded text-sm transition-all"
                            >
                              Publish
                            </button>
                            <button
                              onClick={() => handleDeleteAssessment(assessment.id)}
                              className="px-3 py-2 bg-red-500 hover:bg-red-500/80 text-white rounded text-sm transition-all"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {assessment.status === 'archived' && (
                          <>
                            <button
                              onClick={() => handlePublishAssessment(assessment.id)}
                              className="px-3 py-2 bg-neon-green hover:bg-neon-green/80 text-white rounded text-sm transition-all"
                            >
                              Unarchive
                            </button>
                            <button
                              onClick={() => handleDeleteAssessment(assessment.id)}
                              className="px-3 py-2 bg-red-500 hover:bg-red-500/80 text-white rounded text-sm transition-all"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="glass rounded-lg border border-gray-800 shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Create Assessment</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateAssessment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg text-gray-300 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90 transition-all"
                  >
                    Create Assessment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAssessmentsPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AdminAssessmentsContent />
    </RoleGuard>
  );
}
