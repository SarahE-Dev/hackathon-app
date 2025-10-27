import React from 'react';

interface IQuestion {
  id: string;
  type: 'MCQ' | 'Multi-Select' | 'Short-Answer' | 'Long-Answer' | 'Coding' | 'File-Upload';
  title: string;
  content: string;
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface MultipleChoiceQuestionProps {
  question: IQuestion;
  currentAnswer?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function MultipleChoiceQuestion({
  question,
  currentAnswer,
  onChange,
  readOnly = false,
}: MultipleChoiceQuestionProps) {
  if (!question.options) {
    return <div className="text-gray-400">No options available</div>;
  }

  return (
    <div className="space-y-3">
      {question.options.map((option, idx) => (
        <label
          key={idx}
          className={`
            block p-4 rounded-lg border-2 cursor-pointer transition-all
            ${
              currentAnswer === option
                ? 'bg-neon-blue/20 border-neon-blue shadow-lg shadow-neon-blue/20'
                : 'bg-dark-700/50 border-dark-600 hover:border-neon-blue/50 hover:bg-dark-700'
            }
            ${readOnly ? 'opacity-75 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option}
              checked={currentAnswer === option}
              onChange={(e) => onChange(e.target.value)}
              disabled={readOnly}
              className="w-5 h-5 text-neon-blue focus:ring-neon-blue focus:ring-2 cursor-pointer"
            />
            <span className="text-white font-medium flex-1">{option}</span>
            {currentAnswer === option && !readOnly && (
              <svg className="w-5 h-5 text-neon-blue" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
