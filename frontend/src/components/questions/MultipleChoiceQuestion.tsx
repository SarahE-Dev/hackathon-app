interface MultipleChoiceQuestionProps {
  question: {
    content: {
      options: Array<{
        id: string;
        text: string;
      }>;
    };
  };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function MultipleChoiceQuestion({
  question,
  value,
  onChange,
  disabled = false,
}: MultipleChoiceQuestionProps) {
  return (
    <div className="space-y-3">
      {question.content.options.map((option) => (
        <label
          key={option.id}
          className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
            value === option.id
              ? 'bg-neon-blue/10 border-neon-blue'
              : 'bg-dark-700 border-gray-600 hover:border-gray-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="answer"
              value={option.id}
              checked={value === option.id}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="w-5 h-5 text-neon-blue focus:ring-neon-blue focus:ring-2"
            />
            <span className="text-white">{option.text}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
