import React from 'react';

interface IQuestion {
  id: string;
  type: 'MCQ' | 'Multi-Select' | 'Short-Answer' | 'Long-Answer' | 'Coding' | 'File-Upload';
  title: string;
  content: string;
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface LongAnswerQuestionProps {
  question: IQuestion;
  currentAnswer?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function LongAnswerQuestion({
  question,
  currentAnswer = '',
  onChange,
  readOnly = false,
}: LongAnswerQuestionProps) {
  const maxLength = 5000;
  const remaining = maxLength - (currentAnswer?.length || 0);
  const wordCount = currentAnswer ? currentAnswer.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="space-y-3">
      <textarea
        value={currentAnswer || ''}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        placeholder="Enter your detailed answer here..."
        maxLength={maxLength}
        disabled={readOnly}
        rows={10}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-dark-700/50 border border-dark-600
          text-white placeholder-gray-500
          focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-y min-h-[240px] max-h-96 font-mono text-sm
        `}
      />
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="space-x-4">
          <span>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        </div>
        <span className={remaining < 100 ? 'text-neon-yellow' : ''}>
          {remaining} / {maxLength} characters
        </span>
      </div>
    </div>
  );
}
