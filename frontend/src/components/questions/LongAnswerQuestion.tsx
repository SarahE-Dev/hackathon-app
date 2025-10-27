interface LongAnswerQuestionProps {
  question: {
    content: {
      placeholder?: string;
      maxLength?: number;
      minLength?: number;
    };
  };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function LongAnswerQuestion({
  question,
  value = '',
  onChange,
  disabled = false,
}: LongAnswerQuestionProps) {
  const maxLength = question.content.maxLength || 5000;
  const minLength = question.content.minLength || 0;
  const remaining = maxLength - (value?.length || 0);
  const wordCount = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="space-y-2">
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.content.placeholder || 'Enter your detailed answer...'}
        maxLength={maxLength}
        disabled={disabled}
        rows={10}
        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue transition-all disabled:opacity-50 resize-y min-h-[200px]"
      />
      <div className="flex items-center justify-between text-xs">
        <div className="space-x-4">
          <span className="text-gray-500">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
          {minLength > 0 && (
            <span className={`${(value?.length || 0) < minLength ? 'text-yellow-400' : 'text-green-400'}`}>
              Minimum {minLength} characters
            </span>
          )}
        </div>
        <span className={`${remaining < 100 ? 'text-yellow-400' : 'text-gray-500'}`}>
          {remaining} characters remaining
        </span>
      </div>
    </div>
  );
}
