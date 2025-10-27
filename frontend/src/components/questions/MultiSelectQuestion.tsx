interface MultiSelectQuestionProps {
  question: {
    content: {
      options: Array<{
        id: string;
        text: string;
      }>;
    };
  };
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export default function MultiSelectQuestion({
  question,
  value = [],
  onChange,
  disabled = false,
}: MultiSelectQuestionProps) {
  const handleToggle = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter((id) => id !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400 mb-4">Select all that apply</p>
      {question.content.options.map((option) => (
        <label
          key={option.id}
          className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
            value.includes(option.id)
              ? 'bg-neon-purple/10 border-neon-purple'
              : 'bg-dark-700 border-gray-600 hover:border-gray-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={value.includes(option.id)}
              onChange={() => handleToggle(option.id)}
              disabled={disabled}
              className="w-5 h-5 text-neon-purple focus:ring-neon-purple focus:ring-2 rounded"
            />
            <span className="text-white">{option.text}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
