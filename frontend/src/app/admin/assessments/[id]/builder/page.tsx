'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { assessmentsAPI, questionsAPI } from '@/lib/api';
import { Timer } from '@/components/assessment/Timer';

interface Question {
  _id: string;
  type: 'multiple-choice' | 'short-answer' | 'long-answer' | 'coding' | 'file-upload' | 'multi-select';
  title: string;
  description: string;
  points: number;
  content: any;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  settings: {
    timeLimit?: number;
    proctoring: {
      enabled: boolean;
      requireWebcam: boolean;
      detectTabSwitch: boolean;
      preventCopyPaste: boolean;
    };
  };
  questions: Question[];
  totalPoints: number;
  status: 'draft' | 'published';
}

function AssessmentBuilderContent() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'preview'>('questions');
  const [showQuestionBank, setShowQuestionBank] = useState(false);

  useEffect(() => {
    loadAssessment();
    loadQuestionBank();
  }, [assessmentId]);

  const loadAssessment = async () => {
    try {
      const response = await assessmentsAPI.getById(assessmentId);
      setAssessment(response.data.assessment);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionBank = async () => {
    try {
      const response = await questionsAPI.getAll();
      setAvailableQuestions(Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error('Failed to load question bank:', err);
    }
  };

  const saveAssessment = async (updatedAssessment: Partial<Assessment>) => {
    try {
      setSaving(true);
      await assessmentsAPI.update(assessmentId, updatedAssessment);
      await loadAssessment();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const addQuestionToAssessment = async (questionId: string) => {
    if (!assessment) return;

    try {
      const question = availableQuestions.find(q => q._id === questionId);
      if (!question) return;

      const updatedQuestions = [...assessment.questions, question];
      await saveAssessment({ questions: updatedQuestions });
    } catch (err: any) {
      alert('Failed to add question to assessment');
    }
  };

  const removeQuestionFromAssessment = async (questionId: string) => {
    if (!assessment) return;

    const updatedQuestions = assessment.questions.filter(q => q._id !== questionId);
    await saveAssessment({ questions: updatedQuestions });
  };

  const updateSettings = async (settings: Partial<Assessment['settings']>) => {
    if (!assessment) return;
    await saveAssessment({ settings: { ...assessment.settings, ...settings } });
  };

  const publishAssessment = async () => {
    if (!confirm('Publish this assessment? It will become available to students.')) return;
    await saveAssessment({ status: 'published' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <p className="text-red-400">Assessment not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/assessments"
                className="text-neon-blue hover:text-neon-blue/80 transition-all"
              >
                ← Assessments
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gradient">{assessment.title}</h1>
                <p className="text-gray-400 text-sm">{assessment.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saving && (
                <div className="flex items-center gap-2 text-neon-blue">
                  <div className="w-4 h-4 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              )}
              {assessment.status === 'draft' && (
                <button
                  onClick={publishAssessment}
                  className="px-4 py-2 bg-neon-green hover:bg-neon-green/80 text-white rounded transition-all"
                >
                  Publish
                </button>
              )}
              <button
                onClick={() => saveAssessment({})}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded transition-all"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            {[
              { key: 'questions', label: 'Questions', count: assessment.questions.length },
              { key: 'settings', label: 'Settings' },
              { key: 'preview', label: 'Preview' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-3 border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-neon-blue text-neon-blue'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.label} {tab.count !== undefined && <span className="ml-1">({tab.count})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Assessment Questions</h2>
              <button
                onClick={() => setShowQuestionBank(true)}
                className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded hover:opacity-90 transition-all"
              >
                Add Questions
              </button>
            </div>

            {assessment.questions.length === 0 ? (
              <div className="glass rounded-xl p-8 border border-gray-800 text-center">
                <div className="text-4xl mb-3 opacity-50">📋</div>
                <p className="text-gray-400 mb-4">No questions added yet</p>
                <button
                  onClick={() => setShowQuestionBank(true)}
                  className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded hover:opacity-90 transition-all"
                >
                  Add Your First Question
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {assessment.questions.map((question, index) => (
                  <div
                    key={question._id}
                    className="glass rounded-xl p-6 border border-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs bg-neon-blue/20 text-neon-blue px-2 py-1 rounded">
                            Q{index + 1}
                          </span>
                          <span className="text-xs bg-gray-700 px-2 py-1 rounded capitalize">
                            {question.type.replace('-', ' ')}
                          </span>
                          <span className="text-xs text-neon-green font-medium">
                            {question.points} pts
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">{question.title}</h3>
                        {question.description && (
                          <p className="text-gray-400 text-sm">{question.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeQuestionFromAssessment(question._id)}
                        className="text-red-400 hover:text-red-300 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-xl font-bold">Assessment Settings</h2>

            <div className="glass rounded-xl p-6 border border-gray-800 space-y-6">
              {/* Time Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  value={assessment.settings.timeLimit || ''}
                  onChange={(e) => updateSettings({ timeLimit: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
                  placeholder="No time limit"
                />
                {assessment.settings.timeLimit && (
                  <div className="mt-3 p-4 bg-dark-800 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Timer Preview:</p>
                    <Timer
                      secondsRemaining={assessment.settings.timeLimit * 60}
                      onTimeUp={() => {}}
                      warningAt={300}
                    />
                  </div>
                )}
              </div>

              {/* Proctoring Settings */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Proctoring Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={assessment.settings.proctoring.enabled}
                      onChange={(e) => updateSettings({
                        proctoring: {
                          ...assessment.settings.proctoring,
                          enabled: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-neon-blue focus:ring-neon-blue border-gray-600 rounded bg-dark-700"
                    />
                    <span className="ml-2 text-sm text-gray-300">Enable Proctoring</span>
                  </label>

                  {assessment.settings.proctoring.enabled && (
                    <>
                      <label className="flex items-center ml-6">
                        <input
                          type="checkbox"
                          checked={assessment.settings.proctoring.requireWebcam}
                          onChange={(e) => updateSettings({
                            proctoring: {
                              ...assessment.settings.proctoring,
                              requireWebcam: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-neon-blue focus:ring-neon-blue border-gray-600 rounded bg-dark-700"
                        />
                        <span className="ml-2 text-sm text-gray-300">Require Webcam</span>
                      </label>
                      <label className="flex items-center ml-6">
                        <input
                          type="checkbox"
                          checked={assessment.settings.proctoring.detectTabSwitch}
                          onChange={(e) => updateSettings({
                            proctoring: {
                              ...assessment.settings.proctoring,
                              detectTabSwitch: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-neon-blue focus:ring-neon-blue border-gray-600 rounded bg-dark-700"
                        />
                        <span className="ml-2 text-sm text-gray-300">Detect Tab Switching</span>
                      </label>
                      <label className="flex items-center ml-6">
                        <input
                          type="checkbox"
                          checked={assessment.settings.proctoring.preventCopyPaste}
                          onChange={(e) => updateSettings({
                            proctoring: {
                              ...assessment.settings.proctoring,
                              preventCopyPaste: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-neon-blue focus:ring-neon-blue border-gray-600 rounded bg-dark-700"
                        />
                        <span className="ml-2 text-sm text-gray-300">Prevent Copy/Paste</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Assessment Preview</h2>

            <div className="glass rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">{assessment.title}</h3>
              {assessment.description && (
                <p className="text-gray-400 mb-4">{assessment.description}</p>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{assessment.questions.length} questions</span>
                  <span>{assessment.totalPoints} total points</span>
                  {assessment.settings.timeLimit && (
                    <span>{assessment.settings.timeLimit} minutes</span>
                  )}
                </div>

                {assessment.questions.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Add questions to see preview</p>
                ) : (
                  <div className="space-y-3">
                    {assessment.questions.map((question, index) => (
                      <div key={question._id} className="p-4 bg-dark-800 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-neon-blue font-medium">Q{index + 1}</span>
                          <span className="text-sm text-gray-400 capitalize">
                            {question.type.replace('-', ' ')}
                          </span>
                          <span className="text-sm text-neon-green">{question.points} pts</span>
                        </div>
                        <h4 className="text-white font-medium">{question.title}</h4>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Question Bank Modal */}
      {showQuestionBank && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="glass rounded-lg border border-gray-800 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Question Bank</h2>
                <button
                  onClick={() => setShowQuestionBank(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {availableQuestions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No questions available</p>
              ) : (
                <div className="grid gap-4">
                  {availableQuestions.map((question) => {
                    const isAdded = assessment.questions.some(q => q._id === question._id);
                    return (
                      <div
                        key={question._id}
                        className="p-4 bg-dark-700 rounded-lg border border-gray-600"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs bg-neon-blue/20 text-neon-blue px-2 py-1 rounded capitalize">
                                {question.type.replace('-', ' ')}
                              </span>
                              <span className="text-xs text-neon-green">{question.points} pts</span>
                            </div>
                            <h3 className="text-white font-medium">{question.title}</h3>
                            {question.description && (
                              <p className="text-gray-400 text-sm mt-1">{question.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => isAdded
                              ? removeQuestionFromAssessment(question._id)
                              : addQuestionToAssessment(question._id)
                            }
                            className={`px-3 py-1 rounded text-sm transition-all ${
                              isAdded
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-neon-blue hover:bg-neon-blue/80 text-white'
                            }`}
                          >
                            {isAdded ? 'Remove' : 'Add'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssessmentBuilderPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AssessmentBuilderContent />
    </RoleGuard>
  );
}
