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
  status: string;
  createdAt: string;
}

function QuestionBankContent() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterTag, setFilterTag] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchQuestions();
  }, [page, filterType, filterDifficulty, filterTag]);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const params: any = { page, limit: 20 };
      if (filterType) params.type = filterType;
      if (filterDifficulty) params.difficulty = filterDifficulty;
      if (filterTag) params.tags = filterTag;

      const response = await axios.get(`${BACKEND_URL}/api/questions`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setQuestions(response.data.data.questions);
      setTotalPages(response.data.data.pagination.totalPages);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching questions:', err);
      setError(err.response?.data?.message || 'Failed to load questions');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${BACKEND_URL}/api/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('Question deleted successfully');
      fetchQuestions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`${BACKEND_URL}/api/questions/${id}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('Question duplicated successfully');
      fetchQuestions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to duplicate question');
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Multiple-Choice': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      'Coding': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      'True-False': 'bg-green-500/20 text-green-400 border-green-500/50',
      'Short-Answer': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      'Essay': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      'File-Upload': 'bg-pink-500/20 text-pink-400 border-pink-500/50',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'text-green-400',
      medium: 'text-yellow-400',
      hard: 'text-red-400',
    };
    return colors[difficulty] || 'text-gray-400';
  };

  const filteredQuestions = questions.filter((q) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      q.title.toLowerCase().includes(searchLower) ||
      q.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Question Bank</h1>
              <p className="text-gray-400 mt-1">Create and manage assessment questions</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin"
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/admin/questions/new"
                className="px-6 py-2 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-blue/80 hover:to-neon-purple/80 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-neon-blue/50"
              >
                + New Question
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-dark-800 border border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
            />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
            >
              <option value="">All Types</option>
              <option value="Multiple-Choice">Multiple Choice</option>
              <option value="Coding">Coding</option>
              <option value="True-False">True/False</option>
              <option value="Short-Answer">Short Answer</option>
              <option value="Essay">Essay</option>
              <option value="File-Upload">File Upload</option>
            </select>
            <select
              value={filterDifficulty}
              onChange={(e) => {
                setFilterDifficulty(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('');
                setFilterDifficulty('');
                setFilterTag('');
                setPage(1);
              }}
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {filteredQuestions.length === 0 ? (
          <div className="bg-dark-800 border border-gray-700 rounded-lg p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-400 text-lg">No questions found</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm || filterType || filterDifficulty
                ? 'Try adjusting your filters'
                : 'Create your first question to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <div
                key={question._id}
                className="bg-dark-800 border border-gray-700 rounded-lg p-6 hover:border-neon-blue transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{question.title}</h3>
                      <span className={`px-3 py-1 text-xs font-medium border rounded-full ${getTypeColor(question.type)}`}>
                        {question.type}
                      </span>
                      <span className={`text-sm font-medium ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{question.points} points</span>
                      <span>•</span>
                      <span>{question.status}</span>
                      {question.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex gap-2">
                            {question.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-dark-700 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                            {question.tags.length > 3 && (
                              <span className="px-2 py-1 bg-dark-700 text-xs rounded">
                                +{question.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    <Link
                      href={`/admin/questions/${question._id}`}
                      className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 text-white rounded-lg transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDuplicate(question._id)}
                      className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 text-white rounded-lg transition-colors"
                    >
                      Duplicate
                    </button>
                    {question.status === 'draft' && (
                      <button
                        onClick={() => handleDelete(question._id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuestionBank() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <QuestionBankContent />
    </RoleGuard>
  );
}
