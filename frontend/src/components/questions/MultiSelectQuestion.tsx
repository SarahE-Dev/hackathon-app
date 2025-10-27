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

interface MultiSelectQuestionProps {
  question: IQuestion;
  currentAnswer?: string[];
  onChange: (value: string[]) => void;
  readOnly?: boolean;
}

export default function MultiSelectQuestion({
  question,
  currentAnswer = [],
  onChange,
  readOnly = false,
}: MultiSelectQuestionProps) {
  if (!question.options) {
    return <div className="text-gray-400">No options available</div>;
  }

  const handleToggle = (option: string) => {
    if (currentAnswer.includes(option)) {
      onChange(currentAnswer.filter((o) => o !== option));
    } else {
      onChange([...currentAnswer, option]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-neon-purple/70 mb-4">Select all that apply</p>
      {question.options.map((option, idx) => (
        <label
          key={idx}
          className={`
            block p-4 rounded-lg border-2 cursor-pointer transition-all
            ${
              currentAnswer.includes(option)
                ? 'bg-neon-purple/20 border-neon-purple shadow-lg shadow-neon-purple/20'
                : 'bg-dark-700/50 border-dark-600 hover:border-neon-purple/50 hover:bg-dark-700'
            }
            ${readOnly ? 'opacity-75 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={currentAnswer.includes(option)}
              onChange={() => !readOnly && handleToggle(option)}
              disabled={readOnly}
              className="w-5 h-5 text-neon-purple focus:ring-neon-purple focus:ring-2 rounded cursor-pointer"
            />
            <span className="text-white font-medium flex-1">{option}</span>
            {currentAnswer.includes(option) && (
              <svg className="w-5 h-5 text-neon-purple" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
