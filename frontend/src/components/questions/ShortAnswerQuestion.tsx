import React from 'react';

interface IQuestion {
  id: string;
  type: 'MCQ' | 'Multi-Select' | 'Short-Answer' | 'Long-Answer' | 'Coding' | 'File-Upload';
  title: string;
  content: string;
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface ShortAnswerQuestionProps {
  question: IQuestion;
  currentAnswer?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function ShortAnswerQuestion({
  question,
  currentAnswer = '',
  onChange,
  readOnly = false,
}: ShortAnswerQuestionProps) {
  const maxLength = 500;
  const remaining = maxLength - (currentAnswer?.length || 0);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={currentAnswer || ''}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        placeholder="Enter your answer..."
        maxLength={maxLength}
        disabled={readOnly}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-dark-700/50 border border-dark-600
          text-white placeholder-gray-500
          focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/20
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      />
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Single line answer</span>
        <span className={remaining < 50 ? 'text-neon-yellow' : ''}>
          {remaining} / {maxLength} characters
        </span>
      </div>
    </div>
  );
}
