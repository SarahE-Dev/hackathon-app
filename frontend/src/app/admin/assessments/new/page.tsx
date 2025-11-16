'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Question {
  _id: string;
  type: string;
  title: string;
  difficulty: string;
  points: number;
  tags: string[];
}

interface Section {
  id: string;
  title: string;
  description: string;
  questionIds: string[];
  timeLimit?: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
}

function AssessmentBuilderContent() {
  const router = useRouter();

  // Assessment basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalTimeLimit, setTotalTimeLimit] = useState<number | undefined>(undefined);

  // Sections
  const [sections, setSections] = useState<Section[]>([
    {
      id: Date.now().toString(),
      title: 'Section 1',
      description: '',
      questionIds: [],
      randomizeQuestions: false,
      randomizeOptions: false,
    },
  ]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Settings
  const [settings, setSettings] = useState({
    attemptsAllowed: 1,
    showResultsImmediately: false,
    allowReview: true,
    allowBackward: true,
    shuffleSections: false,
    proctoring: {
      enabled: false,
      detectTabSwitch: true,
      detectCopyPaste: true,
      fullscreenRequired: false,
      enableWebcam: false,
    },
  });

  // Question bank
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionFilter, setQuestionFilter] = useState({ type: '', difficulty: '' });
  const [showQuestionBank, setShowQuestionBank] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, [questionFilter]);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const params: any = { limit: 100, status: 'published' };
      if (questionFilter.type) params.type = questionFilter.type;
      if (questionFilter.difficulty) params.difficulty = questionFilter.difficulty;

      const response = await axios.get(`${BACKEND_URL}/api/questions`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setAvailableQuestions(response.data.data.questions);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  const handleAddSection = () => {
    setSections([
      ...sections,
      {
        id: Date.now().toString(),
        title: `Section ${sections.length + 1}`,
        description: '',
        questionIds: [],
        randomizeQuestions: false,
        randomizeOptions: false,
      },
    ]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length === 1) {
      alert('Assessment must have at least one section');
      return;
    }
    setSections(sections.filter((_, i) => i !== index));
    if (currentSectionIndex >= sections.length - 1) {
      setCurrentSectionIndex(Math.max(0, sections.length - 2));
    }
  };

  const handleUpdateSection = (index: number, field: string, value: any) => {
    setSections(
      sections.map((section, i) => (i === index ? { ...section, [field]: value } : section))
    );
  };

  const handleAddQuestionsToSection = () => {
    const currentSection = sections[currentSectionIndex];
    const newQuestionIds = Array.from(selectedQuestions);

    handleUpdateSection(currentSectionIndex, 'questionIds', [
      ...currentSection.questionIds,
      ...newQuestionIds,
    ]);

    setSelectedQuestions(new Set());
    setShowQuestionBank(false);
  };

  const handleRemoveQuestionFromSection = (sectionIndex: number, questionId: string) => {
    const section = sections[sectionIndex];
    handleUpdateSection(
      sectionIndex,
      'questionIds',
      section.questionIds.filter((id) => id !== questionId)
    );
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    try {
      setLoading(true);
      setError('');

      if (!title.trim()) {
        throw new Error('Title is required');
      }

      if (sections.every((s) => s.questionIds.length === 0)) {
        throw new Error('Add at least one question to the assessment');
      }

      const token = localStorage.getItem('accessToken');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Calculate total points
      const allQuestionIds = sections.flatMap((s) => s.questionIds);
      const totalPoints = allQuestionIds.reduce((sum, qId) => {
        const question = availableQuestions.find((q) => q._id === qId);
        return sum + (question?.points || 0);
      }, 0);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        organizationId: user.organizationId || '000000000000000000000000',
        sections: sections.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          questionIds: s.questionIds,
          timeLimit: s.timeLimit,
          randomizeQuestions: s.randomizeQuestions,
          randomizeOptions: s.randomizeOptions,
        })),
        settings: {
          ...settings,
          totalTimeLimit,
        },
        totalPoints,
        status: status === 'published' ? 'published' : 'draft',
      };

      await axios.post(`${BACKEND_URL}/api/assessments`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(`Assessment ${status === 'published' ? 'published' : 'saved as draft'} successfully!`);
      router.push('/admin/assessments');
    } catch (err: any) {
      console.error('Error creating assessment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create assessment');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = availableQuestions.filter((q) => {
    const searchLower = questionSearch.toLowerCase();
    return (
      q.title.toLowerCase().includes(searchLower) ||
      q.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  const currentSection = sections[currentSectionIndex];
  const sectionQuestions = currentSection.questionIds
    .map((qId) => availableQuestions.find((q) => q._id === qId))
    .filter(Boolean) as Question[];

  const totalQuestions = sections.reduce((sum, s) => sum + s.questionIds.length, 0);
  const totalPoints = sections.reduce((sum, s) => {
    return (
      sum +
      s.questionIds.reduce((sectionSum, qId) => {
        const q = availableQuestions.find((question) => question._id === qId);
        return sectionSum + (q?.points || 0);
      }, 0)
    );
  }, 0);

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Build Assessment</h1>
              <p className="text-gray-400 mt-1">Create a new assessment from your question bank</p>
            </div>
            <Link
              href="/admin/assessments"
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
            >
              Back to Assessments
            </Link>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Assessment Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Python Programming Assessment"
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this assessment covers..."
                    rows={3}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white resize-none focus:outline-none focus:border-neon-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={totalTimeLimit || ''}
                    onChange={(e) => setTotalTimeLimit(Number(e.target.value) || undefined)}
                    placeholder="Leave empty for no time limit"
                    min="1"
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Sections</h2>
                <button
                  onClick={handleAddSection}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors text-sm"
                >
                  + Add Section
                </button>
              </div>

              {/* Section Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSectionIndex(index)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                      index === currentSectionIndex
                        ? 'bg-neon-blue text-white'
                        : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                    }`}
                  >
                    {section.title} ({section.questionIds.length})
                  </button>
                ))}
              </div>

              {/* Current Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={currentSection.title}
                      onChange={(e) =>
                        handleUpdateSection(currentSectionIndex, 'title', e.target.value)
                      }
                      className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Time Limit (minutes)
                    </label>
                    <input
                      type="number"
                      value={currentSection.timeLimit || ''}
                      onChange={(e) =>
                        handleUpdateSection(
                          currentSectionIndex,
                          'timeLimit',
                          Number(e.target.value) || undefined
                        )
                      }
                      placeholder="Optional"
                      className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Section Description
                  </label>
                  <textarea
                    value={currentSection.description}
                    onChange={(e) =>
                      handleUpdateSection(currentSectionIndex, 'description', e.target.value)
                    }
                    rows={2}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white resize-none focus:outline-none focus:border-neon-blue"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSection.randomizeQuestions}
                      onChange={(e) =>
                        handleUpdateSection(
                          currentSectionIndex,
                          'randomizeQuestions',
                          e.target.checked
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">Randomize question order</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSection.randomizeOptions}
                      onChange={(e) =>
                        handleUpdateSection(
                          currentSectionIndex,
                          'randomizeOptions',
                          e.target.checked
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">Randomize MCQ options</span>
                  </label>
                </div>

                {/* Questions in Section */}
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">
                      Questions ({sectionQuestions.length})
                    </h3>
                    <button
                      onClick={() => setShowQuestionBank(true)}
                      className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-blue/80 hover:to-neon-purple/80 text-white text-sm rounded-lg transition-all"
                    >
                      + Add Questions
                    </button>
                  </div>

                  {sectionQuestions.length === 0 ? (
                    <div className="bg-dark-700 border border-gray-600 rounded-lg p-8 text-center">
                      <p className="text-gray-400">No questions added yet</p>
                      <button
                        onClick={() => setShowQuestionBank(true)}
                        className="mt-3 text-neon-blue hover:text-neon-blue/80 text-sm"
                      >
                        Browse Question Bank →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sectionQuestions.map((question) => (
                        <div
                          key={question._id}
                          className="flex items-center justify-between bg-dark-700 border border-gray-600 rounded-lg p-3"
                        >
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{question.title}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span className="px-2 py-1 bg-dark-800 rounded">{question.type}</span>
                              <span>{question.difficulty}</span>
                              <span>{question.points} pts</span>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleRemoveQuestionFromSection(currentSectionIndex, question._id)
                            }
                            className="ml-3 text-red-400 hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {sections.length > 1 && (
                  <button
                    onClick={() => handleRemoveSection(currentSectionIndex)}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Remove This Section
                  </button>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Attempts Allowed
                  </label>
                  <input
                    type="number"
                    value={settings.attemptsAllowed}
                    onChange={(e) =>
                      setSettings({ ...settings, attemptsAllowed: Number(e.target.value) || 1 })
                    }
                    min="1"
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showResultsImmediately}
                      onChange={(e) =>
                        setSettings({ ...settings, showResultsImmediately: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">Show results immediately after submission</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allowReview}
                      onChange={(e) => setSettings({ ...settings, allowReview: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">Allow students to review answers</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allowBackward}
                      onChange={(e) => setSettings({ ...settings, allowBackward: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">Allow backward navigation</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.shuffleSections}
                      onChange={(e) => setSettings({ ...settings, shuffleSections: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-300">Shuffle section order</span>
                  </label>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h3 className="font-medium mb-3">Proctoring</h3>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.proctoring.enabled}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            proctoring: { ...settings.proctoring, enabled: e.target.checked },
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-300 font-medium">Enable proctoring</span>
                    </label>

                    {settings.proctoring.enabled && (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer ml-6">
                          <input
                            type="checkbox"
                            checked={settings.proctoring.detectTabSwitch}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                proctoring: {
                                  ...settings.proctoring,
                                  detectTabSwitch: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-300">Detect tab switches</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer ml-6">
                          <input
                            type="checkbox"
                            checked={settings.proctoring.detectCopyPaste}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                proctoring: {
                                  ...settings.proctoring,
                                  detectCopyPaste: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-300">Detect copy/paste</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer ml-6">
                          <input
                            type="checkbox"
                            checked={settings.proctoring.fullscreenRequired}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                proctoring: {
                                  ...settings.proctoring,
                                  fullscreenRequired: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-300">Require fullscreen mode</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer ml-6">
                          <input
                            type="checkbox"
                            checked={settings.proctoring.enableWebcam}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                proctoring: {
                                  ...settings.proctoring,
                                  enableWebcam: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-300">Enable webcam monitoring</span>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold mb-4">Assessment Summary</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Total Questions:</span>
                  <p className="text-white font-medium text-lg">{totalQuestions}</p>
                </div>
                <div>
                  <span className="text-gray-400">Total Points:</span>
                  <p className="text-white font-medium text-lg">{totalPoints}</p>
                </div>
                <div>
                  <span className="text-gray-400">Sections:</span>
                  <p className="text-white font-medium">{sections.length}</p>
                </div>
                {totalTimeLimit && (
                  <div>
                    <span className="text-gray-400">Time Limit:</span>
                    <p className="text-white font-medium">{totalTimeLimit} minutes</p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => handleSubmit('draft')}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => handleSubmit('published')}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-blue/80 hover:to-neon-purple/80 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-neon-blue/50 disabled:opacity-50"
                >
                  {loading ? 'Publishing...' : 'Publish Assessment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Bank Modal */}
      {showQuestionBank && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-dark-800 border border-gray-700 rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Browse Question Bank</h2>
              <button
                onClick={() => setShowQuestionBank(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <input
                type="text"
                placeholder="Search questions..."
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
              />
              <select
                value={questionFilter.type}
                onChange={(e) => setQuestionFilter({ ...questionFilter, type: e.target.value })}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
              >
                <option value="">All Types</option>
                <option value="Multiple-Choice">Multiple Choice</option>
                <option value="Coding">Coding</option>
                <option value="True-False">True/False</option>
                <option value="Short-Answer">Short Answer</option>
                <option value="Essay">Essay</option>
              </select>
              <select
                value={questionFilter.difficulty}
                onChange={(e) =>
                  setQuestionFilter({ ...questionFilter, difficulty: e.target.value })
                }
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Question List */}
            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {filteredQuestions.map((question) => {
                const isSelected = selectedQuestions.has(question._id);
                const isAlreadyInSection = currentSection.questionIds.includes(question._id);

                return (
                  <div
                    key={question._id}
                    className={`flex items-center gap-3 p-4 border rounded-lg transition-all ${
                      isAlreadyInSection
                        ? 'bg-dark-700/50 border-gray-700 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-neon-blue/10 border-neon-blue'
                        : 'bg-dark-700 border-gray-600 hover:border-gray-500 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!isAlreadyInSection) {
                        const newSelected = new Set(selectedQuestions);
                        if (isSelected) {
                          newSelected.delete(question._id);
                        } else {
                          newSelected.add(question._id);
                        }
                        setSelectedQuestions(newSelected);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isAlreadyInSection}
                      onChange={() => {}}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{question.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="px-2 py-1 bg-dark-800 rounded">{question.type}</span>
                        <span>{question.difficulty}</span>
                        <span>{question.points} pts</span>
                      </div>
                    </div>
                    {isAlreadyInSection && (
                      <span className="text-xs text-gray-500">Already added</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuestionBank(false)}
                className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestionsToSection}
                disabled={selectedQuestions.size === 0}
                className="flex-1 px-4 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssessmentBuilder() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <AssessmentBuilderContent />
    </RoleGuard>
  );
}
