'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  points?: number;
}

interface CodingQuestionProps {
  question: {
    _id: string;
    content: {
      prompt: string;
      language: string;
      codeTemplate?: string;
      testCases: TestCase[];
    };
  };
  answer: string | null;
  onChange: (answer: string) => void;
  disabled?: boolean;
}

export function CodingQuestion({ question, answer, onChange, disabled = false }: CodingQuestionProps) {
  const [code, setCode] = useState(answer || question.content.codeTemplate || '');
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onChange(newCode);
  };

  const runCode = async () => {
    setRunning(true);
    setTestResults([]);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/code/execute`,
        {
          code,
          language: question.content.language,
          testCases: question.content.testCases.filter(tc => !tc.isHidden).map(tc => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
          })),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setTestResults(response.data.data.results || []);
    } catch (error: any) {
      console.error('Error running code:', error);
      setTestResults([{
        error: error.response?.data?.error?.message || 'Failed to run code',
        passed: false
      }]);
    } finally {
      setRunning(false);
    }
  };

  const visibleTestCases = question.content.testCases.filter(tc => !tc.isHidden);

  return (
    <div className="space-y-4">
      <div className="text-gray-300 mb-4 whitespace-pre-wrap">{question.content.prompt}</div>

      {/* Code Editor */}
      <div className="rounded-lg overflow-hidden border border-gray-700">
        <div className="bg-dark-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
          <span className="text-sm text-gray-400">
            Language: <span className="text-neon-blue">{question.content.language}</span>
          </span>
          <button
            onClick={runCode}
            disabled={running || disabled || !code.trim()}
            className="px-4 py-1 bg-neon-green hover:bg-neon-green/80 text-white rounded text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Running...
              </span>
            ) : (
              '▶ Run Code'
            )}
          </button>
        </div>
        <MonacoEditor
          height="400px"
          language={question.content.language}
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: disabled,
          }}
        />
      </div>

      {/* Test Cases */}
      {visibleTestCases.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-white">Test Cases</h4>
          {visibleTestCases.map((testCase, index) => {
            const result = testResults.find(r => r.testCaseId === testCase.id);

            return (
              <div
                key={testCase.id}
                className={`p-4 rounded-lg border ${
                  result
                    ? result.passed
                      ? 'border-green-500/50 bg-green-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                    : 'border-gray-700 bg-dark-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300">Test Case {index + 1}</span>
                  {result && (
                    <span className={`text-sm font-semibold ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                      {result.passed ? '✓ Passed' : '✗ Failed'}
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Input: </span>
                    <code className="text-neon-blue">{testCase.input}</code>
                  </div>
                  <div>
                    <span className="text-gray-400">Expected: </span>
                    <code className="text-green-400">{testCase.expectedOutput}</code>
                  </div>
                  {result && result.output !== undefined && (
                    <div>
                      <span className="text-gray-400">Your Output: </span>
                      <code className={result.passed ? 'text-green-400' : 'text-red-400'}>
                        {result.output}
                      </code>
                    </div>
                  )}
                  {result && result.error && (
                    <div>
                      <span className="text-gray-400">Error: </span>
                      <code className="text-red-400 text-xs">{result.error}</code>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {testResults.length > 0 && testResults[0].error && !testResults[0].testCaseId && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <div className="text-red-400 text-sm">{testResults[0].error}</div>
        </div>
      )}
    </div>
  );
}
