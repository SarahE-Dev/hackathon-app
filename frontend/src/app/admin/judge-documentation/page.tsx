'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { judgeDocumentationAPI, hackathonSessionsAPI } from '@/lib/api';

interface RubricCriterion {
  name: string;
  description: string;
  maxPoints: number;
  scoringGuide: Array<{ points: number; description: string }>;
}

interface FAQ {
  question: string;
  answer: string;
  order: number;
}

interface JudgeDoc {
  _id: string;
  hackathonSessionId?: { _id: string; title: string };
  organizationId: { _id: string; name: string };
  title: string;
  type: 'rubric' | 'faq' | 'guide' | 'general';
  rubricCriteria?: RubricCriterion[];
  totalPoints?: number;
  faqs?: FAQ[];
  content?: string;
  isActive: boolean;
  isDefault: boolean;
  createdBy: { firstName: string; lastName: string };
  lastUpdatedBy: { firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

interface HackathonSession {
  _id: string;
  title: string;
  status: string;
}

const DOC_TYPES = [
  { value: 'rubric', label: 'Rubric', icon: '📊', description: 'Scoring criteria for judges' },
  { value: 'faq', label: 'FAQ', icon: '❓', description: 'Frequently asked questions' },
  { value: 'guide', label: 'Guide', icon: '📖', description: 'Step-by-step instructions' },
  { value: 'general', label: 'General', icon: '📝', description: 'General information' },
];

function JudgeDocumentationContent() {
  const [documentation, setDocumentation] = useState<JudgeDoc[]>([]);
  const [sessions, setSessions] = useState<HackathonSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<JudgeDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSession, setFilterSession] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'rubric' as 'rubric' | 'faq' | 'guide' | 'general',
    hackathonSessionId: '',
    isDefault: false,
    isActive: true,
    content: '',
    rubricCriteria: [] as RubricCriterion[],
    faqs: [] as FAQ[],
  });

  // Default organization ID (you might want to get this from user context)
  const DEFAULT_ORG_ID = '000000000000000000000001';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsResponse, sessionsResponse] = await Promise.all([
        judgeDocumentationAPI.getAllDocumentation(),
        hackathonSessionsAPI.getAll(),
      ]);
      setDocumentation(docsResponse.data?.documentation || []);
      setSessions(sessionsResponse.data?.sessions || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'rubric',
      hackathonSessionId: '',
      isDefault: false,
      isActive: true,
      content: '',
      rubricCriteria: [],
      faqs: [],
    });
    setEditingDoc(null);
  };

  const handleEdit = (doc: JudgeDoc) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      type: doc.type,
      hackathonSessionId: doc.hackathonSessionId?._id || '',
      isDefault: doc.isDefault,
      isActive: doc.isActive,
      content: doc.content || '',
      rubricCriteria: doc.rubricCriteria || [],
      faqs: doc.faqs || [],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        organizationId: DEFAULT_ORG_ID,
        hackathonSessionId: formData.hackathonSessionId || undefined,
      };

      if (editingDoc) {
        await judgeDocumentationAPI.update(editingDoc._id, payload);
      } else {
        await judgeDocumentationAPI.create(payload);
      }

      await loadData();
      setShowForm(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving documentation:', error);
      alert(error.response?.data?.error?.message || 'Failed to save documentation');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this documentation?')) return;

    try {
      await judgeDocumentationAPI.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting documentation:', error);
      alert('Failed to delete documentation');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await judgeDocumentationAPI.toggle(id);
      await loadData();
    } catch (error) {
      console.error('Error toggling documentation:', error);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await judgeDocumentationAPI.duplicate(id);
      await loadData();
    } catch (error) {
      console.error('Error duplicating documentation:', error);
    }
  };

  // Rubric criteria management
  const addCriterion = () => {
    setFormData({
      ...formData,
      rubricCriteria: [
        ...formData.rubricCriteria,
        {
          name: '',
          description: '',
          maxPoints: 5,
          scoringGuide: [
            { points: 0, description: 'Not demonstrated' },
            { points: 5, description: 'Excellent' },
          ],
        },
      ],
    });
  };

  const updateCriterion = (index: number, field: string, value: any) => {
    const updated = [...formData.rubricCriteria];
    (updated[index] as any)[field] = value;
    setFormData({ ...formData, rubricCriteria: updated });
  };

  const removeCriterion = (index: number) => {
    setFormData({
      ...formData,
      rubricCriteria: formData.rubricCriteria.filter((_, i) => i !== index),
    });
  };

  const addScoringLevel = (criterionIndex: number) => {
    const updated = [...formData.rubricCriteria];
    updated[criterionIndex].scoringGuide.push({ points: 0, description: '' });
    setFormData({ ...formData, rubricCriteria: updated });
  };

  const updateScoringLevel = (criterionIndex: number, levelIndex: number, field: string, value: any) => {
    const updated = [...formData.rubricCriteria];
    (updated[criterionIndex].scoringGuide[levelIndex] as any)[field] = value;
    setFormData({ ...formData, rubricCriteria: updated });
  };

  const removeScoringLevel = (criterionIndex: number, levelIndex: number) => {
    const updated = [...formData.rubricCriteria];
    updated[criterionIndex].scoringGuide = updated[criterionIndex].scoringGuide.filter((_, i) => i !== levelIndex);
    setFormData({ ...formData, rubricCriteria: updated });
  };

  // FAQ management
  const addFAQ = () => {
    setFormData({
      ...formData,
      faqs: [
        ...formData.faqs,
        { question: '', answer: '', order: formData.faqs.length },
      ],
    });
  };

  const updateFAQ = (index: number, field: string, value: any) => {
    const updated = [...formData.faqs];
    (updated[index] as any)[field] = value;
    setFormData({ ...formData, faqs: updated });
  };

  const removeFAQ = (index: number) => {
    setFormData({
      ...formData,
      faqs: formData.faqs.filter((_, i) => i !== index),
    });
  };

  // Filter documentation
  const filteredDocs = documentation.filter((doc) => {
    if (filterType !== 'all' && doc.type !== filterType) return false;
    if (filterSession !== 'all') {
      if (filterSession === 'default' && !doc.isDefault) return false;
      if (filterSession !== 'default' && doc.hackathonSessionId?._id !== filterSession) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📚</span>
              <div>
                <h1 className="text-2xl font-bold text-gradient">Judge Documentation</h1>
                <p className="text-gray-400 text-sm">Manage rubrics, FAQs, and guides for judges</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all text-sm"
              >
                Back to Admin
              </Link>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 rounded-lg transition-all text-sm font-medium"
              >
                + New Documentation
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Filter by Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              {DOC_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Filter by Session</label>
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="default">Default (All Hackathons)</option>
              {sessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Documentation Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {DOC_TYPES.map((type) => {
            const count = documentation.filter((d) => d.type === type.value).length;
            return (
              <div
                key={type.value}
                className={`glass rounded-xl p-4 border cursor-pointer transition-all ${
                  filterType === type.value
                    ? 'border-neon-blue bg-neon-blue/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => setFilterType(filterType === type.value ? 'all' : type.value)}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <h3 className="font-semibold">{type.label}</h3>
                <p className="text-xs text-gray-400">{type.description}</p>
                <p className="text-lg font-bold text-neon-blue mt-2">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Documentation List */}
        {filteredDocs.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center border border-gray-700">
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-xl font-bold mb-2">No Documentation Found</h3>
            <p className="text-gray-400 mb-4">
              {filterType !== 'all' || filterSession !== 'all'
                ? 'Try adjusting your filters or create new documentation.'
                : 'Create your first documentation to help judges grade projects.'}
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-6 py-2 bg-neon-blue hover:bg-neon-blue/80 rounded-lg transition-all font-medium"
            >
              Create Documentation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc._id}
                className={`glass rounded-xl p-6 border transition-all ${
                  doc.isActive ? 'border-gray-700' : 'border-red-500/30 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {DOC_TYPES.find((t) => t.value === doc.type)?.icon}
                      </span>
                      <div>
                        <h3 className="text-lg font-bold">{doc.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-dark-600 rounded text-xs">
                            {DOC_TYPES.find((t) => t.value === doc.type)?.label}
                          </span>
                          {doc.isDefault && (
                            <span className="px-2 py-0.5 bg-neon-purple/20 text-neon-purple rounded text-xs">
                              Default
                            </span>
                          )}
                          {!doc.isActive && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                              Inactive
                            </span>
                          )}
                          {doc.hackathonSessionId && (
                            <span className="px-2 py-0.5 bg-neon-blue/20 text-neon-blue rounded text-xs">
                              {doc.hackathonSessionId.title}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Type-specific preview */}
                    {doc.type === 'rubric' && doc.rubricCriteria && (
                      <div className="mt-3 text-sm text-gray-400">
                        <p>{doc.rubricCriteria.length} criteria | Total: {doc.totalPoints} points</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {doc.rubricCriteria.slice(0, 3).map((c, i) => (
                            <span key={i} className="px-2 py-1 bg-dark-600 rounded text-xs">
                              {c.name} ({c.maxPoints}pts)
                            </span>
                          ))}
                          {doc.rubricCriteria.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{doc.rubricCriteria.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {doc.type === 'faq' && doc.faqs && (
                      <p className="mt-3 text-sm text-gray-400">
                        {doc.faqs.length} questions
                      </p>
                    )}

                    {(doc.type === 'guide' || doc.type === 'general') && doc.content && (
                      <p className="mt-3 text-sm text-gray-400 line-clamp-2">
                        {doc.content.substring(0, 150)}...
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mt-3">
                      Last updated by {doc.lastUpdatedBy.firstName} {doc.lastUpdatedBy.lastName} on{' '}
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(doc._id)}
                      className={`px-3 py-1.5 rounded text-sm transition-all ${
                        doc.isActive
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {doc.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDuplicate(doc._id)}
                      className="px-3 py-1.5 bg-dark-600 hover:bg-dark-500 rounded text-sm transition-all"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleEdit(doc)}
                      className="px-3 py-1.5 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 rounded text-sm transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-sm transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-dark-800 p-6 border-b border-gray-700 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingDoc ? 'Edit Documentation' : 'Create New Documentation'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  &times;
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2"
                    placeholder="e.g., Hackathon Judging Rubric"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2"
                  >
                    {DOC_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Hackathon Session</label>
                  <select
                    value={formData.hackathonSessionId}
                    onChange={(e) => setFormData({ ...formData, hackathonSessionId: e.target.value })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-2"
                  >
                    <option value="">None (Organization-wide)</option>
                    {sessions.map((session) => (
                      <option key={session._id} value={session._id}>
                        {session.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty to make this available for all hackathons
                  </p>
                </div>
                <div className="flex items-center gap-6 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Set as default</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>

              {/* Type-specific content */}
              {formData.type === 'rubric' && (
                <div className="border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">Rubric Criteria</h3>
                    <button
                      type="button"
                      onClick={addCriterion}
                      className="px-3 py-1 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 rounded text-sm"
                    >
                      + Add Criterion
                    </button>
                  </div>

                  {formData.rubricCriteria.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                      No criteria added yet. Click "Add Criterion" to start building your rubric.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {formData.rubricCriteria.map((criterion, cIndex) => (
                        <div key={cIndex} className="bg-dark-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium">Criterion {cIndex + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeCriterion(cIndex)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <input
                              type="text"
                              value={criterion.name}
                              onChange={(e) => updateCriterion(cIndex, 'name', e.target.value)}
                              placeholder="Criterion name (e.g., Technical Depth)"
                              className="bg-dark-600 border border-gray-600 rounded px-3 py-2 text-sm"
                            />
                            <input
                              type="number"
                              value={criterion.maxPoints}
                              onChange={(e) => updateCriterion(cIndex, 'maxPoints', parseInt(e.target.value) || 0)}
                              placeholder="Max points"
                              className="bg-dark-600 border border-gray-600 rounded px-3 py-2 text-sm"
                              min="1"
                            />
                          </div>

                          <textarea
                            value={criterion.description}
                            onChange={(e) => updateCriterion(cIndex, 'description', e.target.value)}
                            placeholder="Description of what this criterion measures..."
                            className="w-full bg-dark-600 border border-gray-600 rounded px-3 py-2 text-sm mb-3"
                            rows={2}
                          />

                          <div className="border-t border-gray-600 pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-400">Scoring Guide</span>
                              <button
                                type="button"
                                onClick={() => addScoringLevel(cIndex)}
                                className="text-xs text-neon-blue hover:underline"
                              >
                                + Add Level
                              </button>
                            </div>
                            <div className="space-y-2">
                              {criterion.scoringGuide.map((level, lIndex) => (
                                <div key={lIndex} className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={level.points}
                                    onChange={(e) =>
                                      updateScoringLevel(cIndex, lIndex, 'points', parseInt(e.target.value) || 0)
                                    }
                                    className="w-16 bg-dark-600 border border-gray-600 rounded px-2 py-1 text-sm"
                                    placeholder="Pts"
                                    min="0"
                                    max={criterion.maxPoints}
                                  />
                                  <input
                                    type="text"
                                    value={level.description}
                                    onChange={(e) => updateScoringLevel(cIndex, lIndex, 'description', e.target.value)}
                                    className="flex-1 bg-dark-600 border border-gray-600 rounded px-2 py-1 text-sm"
                                    placeholder="Description for this score level"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeScoringLevel(cIndex, lIndex)}
                                    className="text-red-400 hover:text-red-300 text-sm px-2"
                                  >
                                    &times;
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.rubricCriteria.length > 0 && (
                    <div className="mt-4 p-3 bg-dark-600 rounded-lg">
                      <p className="text-sm">
                        <span className="text-gray-400">Total Points:</span>{' '}
                        <span className="font-bold text-neon-blue">
                          {formData.rubricCriteria.reduce((sum, c) => sum + c.maxPoints, 0)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {formData.type === 'faq' && (
                <div className="border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">FAQ Entries</h3>
                    <button
                      type="button"
                      onClick={addFAQ}
                      className="px-3 py-1 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 rounded text-sm"
                    >
                      + Add Question
                    </button>
                  </div>

                  {formData.faqs.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                      No FAQs added yet. Click "Add Question" to start building your FAQ.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {formData.faqs.map((faq, index) => (
                        <div key={index} className="bg-dark-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm text-gray-400">Question {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeFAQ(index)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                            placeholder="Enter the question..."
                            className="w-full bg-dark-600 border border-gray-600 rounded px-3 py-2 text-sm mb-2"
                          />
                          <textarea
                            value={faq.answer}
                            onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                            placeholder="Enter the answer..."
                            className="w-full bg-dark-600 border border-gray-600 rounded px-3 py-2 text-sm"
                            rows={3}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(formData.type === 'guide' || formData.type === 'general') && (
                <div>
                  <label className="block text-sm font-medium mb-2">Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3"
                    rows={12}
                    placeholder="Enter your guide content here... You can use markdown formatting."
                    required={formData.type === 'guide' || formData.type === 'general'}
                  />
                  <p className="text-xs text-gray-400 mt-1">Supports markdown formatting</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-dark-600 hover:bg-dark-500 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-neon-blue hover:bg-neon-blue/80 rounded-lg transition-all font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingDoc ? 'Update Documentation' : 'Create Documentation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JudgeDocumentationPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <JudgeDocumentationContent />
    </RoleGuard>
  );
}
