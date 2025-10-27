'use client';

import { useState } from 'react';
import Editor from '@monaco-editor/react';

interface CodingQuestionProps {
  question: {
    content: {
      language: string;
      starterCode?: string;
      testCases?: Array<{
        input: string;
        expectedOutput: string;
        isHidden?: boolean;
      }>;
    };
  };
  value: {
    code: string;
    language: string;
  } | null;
  onChange: (value: { code: string; language: string }) => void;
  disabled?: boolean;
}

export default function CodingQuestion({
  question,
  value,
  onChange,
  disabled = false,
}: CodingQuestionProps) {
  const [code, setCode] = useState(
    value?.code || question.content.starterCode || ''
  );
  const [language, setLanguage] = useState(
    value?.language || question.content.language || 'javascript'
  );
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const handleCodeChange = (newCode: string | undefined) => {
    if (newCode !== undefined) {
      setCode(newCode);
      onChange({ code: newCode, language });
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    onChange({ code, language: newLanguage });
  };

  const runCode = async () => {
    setRunning(true);
    setOutput('Running code...');

    try {
      // TODO: Integrate with code execution service (Judge0)
      setTimeout(() => {
        setOutput('Code execution feature coming soon!\nIntegrate with Judge0 CE API.');
        setRunning(false);
      }, 1000);
    } catch (error) {
      setOutput('Error running code: ' + error);
      setRunning(false);
    }
  };

  const supportedLanguages = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'cpp', name: 'C++' },
    { id: 'c', name: 'C' },
    { id: 'go', name: 'Go' },
    { id: 'rust', name: 'Rust' },
    { id: 'typescript', name: 'TypeScript' },
  ];

  return (
    <div className="space-y-4">
      {/* Language selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-400">Language:</label>
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={disabled}
          className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue transition-all"
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Code editor */}
      <div className="border-2 border-gray-700 rounded-lg overflow-hidden">
        <Editor
          height="400px"
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            readOnly: disabled,
          }}
        />
      </div>

      {/* Test cases */}
      {question.content.testCases && question.content.testCases.length > 0 && (
        <div className="glass rounded-lg p-4 border border-gray-700">
          <h4 className="font-semibold mb-3 text-neon-blue">Test Cases</h4>
          <div className="space-y-2">
            {question.content.testCases
              .filter((tc) => !tc.isHidden)
              .map((testCase, index) => (
                <div key={index} className="bg-dark-700 rounded p-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-400 mb-1">Input:</div>
                      <code className="text-green-400">{testCase.input}</code>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Expected Output:</div>
                      <code className="text-blue-400">{testCase.expectedOutput}</code>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Run button */}
      <div className="flex gap-3">
        <button
          onClick={runCode}
          disabled={running || disabled}
          className="px-6 py-2 bg-gradient-to-r from-neon-green to-green-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? 'Running...' : '▶ Run Code'}
        </button>
      </div>

      {/* Output */}
      {output && (
        <div className="glass rounded-lg p-4 border border-gray-700">
          <h4 className="font-semibold mb-2 text-gray-400">Output:</h4>
          <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap bg-dark-800 p-3 rounded">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
