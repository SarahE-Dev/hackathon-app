interface ShortAnswerQuestionProps {
  question: {
    content: {
      placeholder?: string;
      maxLength?: number;
    };
  };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function ShortAnswerQuestion({
  question,
  value = '',
  onChange,
  disabled = false,
}: ShortAnswerQuestionProps) {
  const maxLength = question.content.maxLength || 500;
  const remaining = maxLength - (value?.length || 0);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.content.placeholder || 'Enter your answer...'}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all disabled:opacity-50"
      />
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          Single line answer (max {maxLength} characters)
        </span>
        <span className={`${remaining < 50 ? 'text-yellow-400' : 'text-gray-500'}`}>
          {remaining} characters remaining
        </span>
      </div>
    </div>
  );
}
