'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/guards/RoleGuard';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
  timeLimit: number;
  memoryLimit: number;
}

interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

function NewQuestionContent() {
  const router = useRouter();

  // Basic fields
  const [type, setType] = useState('Multiple-Choice');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [points, setPoints] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [tags, setTags] = useState('');

  // Multiple Choice / True-False
  const [options, setOptions] = useState<MCQOption[]>([
    { id: '1', text: '', isCorrect: false },
    { id: '2', text: '', isCorrect: false },
  ]);

  // Coding
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [codeTemplate, setCodeTemplate] = useState('');
  const [language, setLanguage] = useState('python'); // Default to Python

  // File Upload
  const [allowedFileTypes, setAllowedFileTypes] = useState('.zip,.tar.gz');
  const [maxFileSize, setMaxFileSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleAddOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: '', isCorrect: false }]);
  };

  const handleRemoveOption = (id: string) => {
    setOptions(options.filter((opt) => opt.id !== id));
  };

  const handleOptionChange = (id: string, field: 'text' | 'isCorrect', value: string | boolean) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt)));
  };

  const handleAddTestCase = () => {
    setTestCases([
      ...testCases,
      {
        id: Date.now().toString(),
        input: '',
        expectedOutput: '',
        isHidden: false,
        points: 5,
        timeLimit: 1000,
        memoryLimit: 256,
      },
    ]);
  };

  const handleRemoveTestCase = (id: string) => {
    setTestCases(testCases.filter((tc) => tc.id !== id));
  };

  const handleTestCaseChange = (id: string, field: keyof TestCase, value: any) => {
    setTestCases(testCases.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc)));
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    try {
      setLoading(true);
      setError('');

      // Validate required fields
      if (!title.trim() || !prompt.trim()) {
        throw new Error('Title and prompt are required');
      }

      // Build content object based on type
      const content: any = { prompt };

      if (type === 'Multiple-Choice' || type === 'True-False') {
        if (options.length < 2) {
          throw new Error('At least 2 options are required');
        }
        if (!options.some((opt) => opt.isCorrect)) {
          throw new Error('At least one option must be marked as correct');
        }
        content.options = options;
        content.correctAnswer = options.find((opt) => opt.isCorrect)?.id;
      }

      if (type === 'Coding') {
        if (testCases.length === 0) {
          throw new Error('At least one test case is required for coding questions');
        }
        content.testCases = testCases;
        content.codeTemplate = codeTemplate;
        content.language = language;
      }

      if (type === 'File-Upload') {
        content.allowedFileTypes = allowedFileTypes.split(',').map((t) => t.trim());
        content.maxFileSize = maxFileSize * 1024 * 1024; // Convert MB to bytes
      }

      const token = localStorage.getItem('accessToken');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const payload = {
        type,
        title: title.trim(),
        content,
        points,
        difficulty,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        organizationId: user.organizationId || '000000000000000000000000', // Placeholder
        status: status === 'published' ? 'published' : 'draft',
      };

      await axios.post(`${BACKEND_URL}/api/questions`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(`Question ${status === 'published' ? 'published' : 'saved as draft'} successfully!`);
      router.push('/admin/questions');
    } catch (err: any) {
      console.error('Error creating question:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create New Question</h1>
              <p className="text-gray-400 mt-1">Build assessment questions with markdown support</p>
            </div>
            <Link
              href="/admin/questions"
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
            >
              Back to Questions
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Question Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                  >
                    <option value="Multiple-Choice">Multiple Choice</option>
                    <option value="Coding">Coding</option>
                    <option value="True-False">True/False</option>
                    <option value="Short-Answer">Short Answer</option>
                    <option value="Essay">Essay</option>
                    <option value="File-Upload">File Upload</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Question Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Two Sum Algorithm"
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Points *</label>
                    <input
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value))}
                      min="0"
                      className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty *</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., arrays, hash-table, algorithms"
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                  />
                </div>
              </div>
            </div>

            {/* Question Content */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Question Content *</h2>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-3 py-1 text-sm bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded transition-colors"
                >
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>

              {showPreview ? (
                <div className="prose prose-invert max-w-none bg-dark-700 border border-gray-600 rounded-lg p-4">
                  <div dangerouslySetInnerHTML={{ __html: prompt.replace(/\n/g, '<br />') }} />
                </div>
              ) : (
                <>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Write your question using Markdown...

# Example Markdown

Use **bold**, *italic*, or `code` formatting.

```python
# Code blocks are supported
def example():
    return True
```

- Bullet points
- Are supported

1. Numbered lists
2. Work too"
                    rows={15}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:border-neon-blue"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Supports Markdown formatting: headers (#), lists (- or 1.), code blocks (```), inline code (`), bold (**), italic (*)
                  </p>
                </>
              )}
            </div>

            {/* Type-specific content */}
            {(type === 'Multiple-Choice' || type === 'True-False') && (
              <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Answer Options</h2>

                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={option.isCorrect}
                        onChange={(e) => handleOptionChange(option.id, 'isCorrect', e.target.checked)}
                        className="w-5 h-5"
                      />
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleOptionChange(option.id, 'text', e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOption(option.id)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {type === 'Multiple-Choice' && options.length < 6 && (
                  <button
                    onClick={handleAddOption}
                    className="mt-4 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
                  >
                    + Add Option
                  </button>
                )}
              </div>
            )}

            {type === 'Coding' && (
              <>
                <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Code Template</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                      <div className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white">
                        Python (Only Python is supported)
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Starter Code</label>
                      <textarea
                        value={codeTemplate}
                        onChange={(e) => setCodeTemplate(e.target.value)}
                        placeholder="def solution():\n    # Your code here\n    pass"
                        rows={10}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:border-neon-blue"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Test Cases</h2>

                  <div className="space-y-4">
                    {testCases.map((testCase, index) => (
                      <div key={testCase.id} className="bg-dark-700 border border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium">Test Case {index + 1}</h3>
                          <button
                            onClick={() => handleRemoveTestCase(testCase.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Input</label>
                            <textarea
                              value={testCase.input}
                              onChange={(e) => handleTestCaseChange(testCase.id, 'input', e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 bg-dark-800 border border-gray-600 rounded text-white font-mono text-sm resize-none focus:outline-none focus:border-neon-blue"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Expected Output</label>
                            <textarea
                              value={testCase.expectedOutput}
                              onChange={(e) => handleTestCaseChange(testCase.id, 'expectedOutput', e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 bg-dark-800 border border-gray-600 rounded text-white font-mono text-sm resize-none focus:outline-none focus:border-neon-blue"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Points</label>
                            <input
                              type="number"
                              value={testCase.points}
                              onChange={(e) => handleTestCaseChange(testCase.id, 'points', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-dark-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-neon-blue"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Time (ms)</label>
                            <input
                              type="number"
                              value={testCase.timeLimit}
                              onChange={(e) => handleTestCaseChange(testCase.id, 'timeLimit', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-dark-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-neon-blue"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Memory (MB)</label>
                            <input
                              type="number"
                              value={testCase.memoryLimit}
                              onChange={(e) => handleTestCaseChange(testCase.id, 'memoryLimit', Number(e.target.value))}
                              className="w-full px-3 py-2 bg-dark-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-neon-blue"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={testCase.isHidden}
                                onChange={(e) => handleTestCaseChange(testCase.id, 'isHidden', e.target.checked)}
                                className="w-4 h-4"
                              />
                              <span className="text-xs text-gray-400">Hidden</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleAddTestCase}
                    className="mt-4 px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-colors"
                  >
                    + Add Test Case
                  </button>
                </div>
              </>
            )}

            {type === 'File-Upload' && (
              <div className="bg-dark-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">File Upload Settings</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Allowed File Types</label>
                    <input
                      type="text"
                      value={allowedFileTypes}
                      onChange={(e) => setAllowedFileTypes(e.target.value)}
                      placeholder=".zip,.tar.gz,.pdf"
                      className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated file extensions</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max File Size (MB)</label>
                    <input
                      type="number"
                      value={maxFileSize}
                      onChange={(e) => setMaxFileSize(Number(e.target.value))}
                      min="1"
                      max="100"
                      className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-neon-blue"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview Card */}
            <div className="bg-dark-800 border border-gray-700 rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold mb-4">Question Summary</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Type:</span>
                  <p className="text-white font-medium">{type}</p>
                </div>
                <div>
                  <span className="text-gray-400">Points:</span>
                  <p className="text-white font-medium">{points}</p>
                </div>
                <div>
                  <span className="text-gray-400">Difficulty:</span>
                  <p className="text-white font-medium capitalize">{difficulty}</p>
                </div>
                {tags && (
                  <div>
                    <span className="text-gray-400">Tags:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {tags.split(',').map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-dark-700 text-xs rounded">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
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
                  {loading ? 'Publishing...' : 'Publish Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewQuestion() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <NewQuestionContent />
    </RoleGuard>
  );
}
