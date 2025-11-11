'use client';

import React from 'react';

interface MCQOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface MCQQuestionProps {
  question: {
    _id: string;
    content: {
      prompt: string;
      options: MCQOption[];
      correctAnswer?: string;
    };
  };
  answer: string | null;
  onChange: (answer: string) => void;
  disabled?: boolean;
}

export function MCQQuestion({ question, answer, onChange, disabled = false }: MCQQuestionProps) {
  return (
    <div className="space-y-4">
      <div className="text-gray-300 mb-6">{question.content.prompt}</div>

      <div className="space-y-3">
        {question.content.options.map((option) => (
          <label
            key={option.id}
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
              answer === option.id
                ? 'border-neon-blue bg-neon-blue/10'
                : 'border-gray-600 bg-dark-700 hover:border-gray-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name={`question-${question._id}`}
                value={option.id}
                checked={answer === option.id}
                onChange={() => !disabled && onChange(option.id)}
                disabled={disabled}
                className="w-5 h-5"
              />
              <span className="text-white flex-1">{option.text}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
