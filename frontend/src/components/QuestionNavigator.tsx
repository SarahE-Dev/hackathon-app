'use client';

import { useState, useMemo } from 'react';

export interface Question {
  _id: string;
  title: string;
  type: string;
  points: number;
}

interface QuestionNavigatorProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, any>;
  flaggedQuestions: Set<string>;
  onNavigate: (index: number) => void;
  onToggleFlag: (questionId: string) => void;
}

type FilterType = 'all' | 'answered' | 'flagged' | 'unanswered';

export const QuestionNavigator = ({
  questions,
  currentIndex,
  answers,
  flaggedQuestions,
  onNavigate,
  onToggleFlag,
}: QuestionNavigatorProps) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and search questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q, index) => {
      // Apply filter
      if (filter === 'answered' && !answers[q._id]) return false;
      if (filter === 'unanswered' && answers[q._id]) return false;
      if (filter === 'flagged' && !flaggedQuestions.has(q._id)) return false;

      // Apply search
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          q.title.toLowerCase().includes(searchLower) ||
          q.type.toLowerCase().includes(searchLower) ||
          (index + 1).toString().includes(searchLower)
        );
      }

      return true;
    });
  }, [questions, filter, searchQuery, answers, flaggedQuestions]);

  // Calculate stats
  const stats = useMemo(() => {
    const answeredCount = questions.filter((q) => answers[q._id]).length;
    const flaggedCount = flaggedQuestions.size;
    const unansweredCount = questions.length - answeredCount;

    return {
      answered: answeredCount,
      flagged: flaggedCount,
      unanswered: unansweredCount,
      total: questions.length,
    };
  }, [questions, answers, flaggedQuestions]);

  return (
    <div className="glass rounded-2xl p-6 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white">Questions</h3>
        <span className="text-sm text-gray-400">
          {stats.answered} / {stats.total}
        </span>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full px-4 py-2 pl-10 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            filter === 'all'
              ? 'bg-neon-blue text-white'
              : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter('answered')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            filter === 'answered'
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
          }`}
        >
          Answered ({stats.answered})
        </button>
        <button
          onClick={() => setFilter('flagged')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            filter === 'flagged'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
              : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
          }`}
        >
          Flagged ({stats.flagged})
        </button>
        <button
          onClick={() => setFilter('unanswered')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            filter === 'unanswered'
              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
              : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
          }`}
        >
          Unanswered ({stats.unanswered})
        </button>
      </div>

      {/* Question Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {filteredQuestions.map((q) => {
          const index = questions.findIndex((question) => question._id === q._id);
          const isAnswered = answers[q._id] !== undefined;
          const isFlagged = flaggedQuestions.has(q._id);
          const isCurrent = index === currentIndex;

          return (
            <button
              key={q._id}
              onClick={() => onNavigate(index)}
              className={`relative w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                isCurrent
                  ? 'bg-neon-blue text-white ring-2 ring-neon-blue/50 scale-110'
                  : isFlagged
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30'
                  : isAnswered
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                  : 'bg-dark-700 text-gray-400 border border-gray-600 hover:bg-dark-600'
              }`}
              title={`${index + 1}. ${q.title} (${q.points}pts)`}
            >
              {index + 1}
              {isFlagged && !isCurrent && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* No results message */}
      {filteredQuestions.length === 0 && (
        <div className="text-center py-6 text-gray-400">
          <p>No questions match your filters</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs border-t border-gray-700 pt-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-neon-blue"></div>
          <span className="text-gray-400">Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50"></div>
          <span className="text-gray-400">Answered</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/50"></div>
          <span className="text-gray-400">Flagged</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-dark-700 border border-gray-600"></div>
          <span className="text-gray-400">Not answered</span>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Progress</span>
          <span className="text-white font-medium">
            {Math.round((stats.answered / stats.total) * 100)}%
          </span>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-300"
            style={{ width: `${(stats.answered / stats.total) * 100}%` }}
          ></div>
        </div>

        {stats.flagged > 0 && (
          <div className="flex justify-between text-sm text-yellow-400">
            <span>⚠️ Review flagged questions</span>
            <span className="font-medium">{stats.flagged}</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
        <button
          onClick={() => {
            const currentQuestion = questions[currentIndex];
            onToggleFlag(currentQuestion._id);
          }}
          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            flaggedQuestions.has(questions[currentIndex]._id)
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30'
              : 'bg-dark-700 text-gray-400 border border-gray-600 hover:bg-dark-600'
          }`}
        >
          {flaggedQuestions.has(questions[currentIndex]._id) ? '🚩 Unflag' : '🚩 Flag'} Current Question
        </button>

        {stats.unanswered > 0 && (
          <button
            onClick={() => {
              const firstUnanswered = questions.findIndex((q) => !answers[q._id]);
              if (firstUnanswered !== -1) {
                onNavigate(firstUnanswered);
              }
            }}
            className="w-full py-2 px-4 bg-neon-purple/20 text-neon-purple border border-neon-purple/50 rounded-lg text-sm font-medium hover:bg-neon-purple/30 transition-all"
          >
            → Jump to Next Unanswered
          </button>
        )}
      </div>
    </div>
  );
};
