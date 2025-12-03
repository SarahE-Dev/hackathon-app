'use client';

import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodingQuestionProps {
  question: {
    id?: string; // Question ID for tracking changes
    title?: string; // Problem title
    prompt?: string; // Problem description/prompt
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
    explanation?: string;
  } | null;
  onChange: (value: { code: string; language: string; explanation?: string }) => void;
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
    value?.language || question.content.language || 'python'
  );
  const [explanation, setExplanation] = useState(value?.explanation || '');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  
  // Track the question ID to detect when question changes
  const previousQuestionIdRef = useRef<string | undefined>(question.id);
  
  // Reset state when question changes
  useEffect(() => {
    if (question.id && question.id !== previousQuestionIdRef.current) {
      // Question changed - reset to new question's values
      setCode(value?.code || question.content.starterCode || '');
      setLanguage(value?.language || question.content.language || 'python');
      setExplanation(value?.explanation || '');
      setOutput('');
      previousQuestionIdRef.current = question.id;
    }
  }, [question.id, question.content.starterCode, question.content.language, value]);
  
  // Also update if value changes from external source (e.g., loading saved answer)
  useEffect(() => {
    if (value) {
      setCode(value.code || question.content.starterCode || '');
      setLanguage(value.language || question.content.language || 'python');
      setExplanation(value.explanation || '');
    }
  }, [value, question.content.starterCode, question.content.language]);

  const handleCodeChange = (newCode: string | undefined) => {
    if (newCode !== undefined) {
      setCode(newCode);
      onChange({ code: newCode, language, explanation });
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    onChange({ code, language: newLanguage, explanation });
  };

  const handleExplanationChange = (newExplanation: string) => {
    setExplanation(newExplanation);
    onChange({ code, language, explanation: newExplanation });
  };

  const runCode = async () => {
    setRunning(true);
    setOutput('Running code...');

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setOutput('Error: Not authenticated');
        setRunning(false);
        return;
      }

      // Prepare test cases for execution
      const testCases = (question.content.testCases || []).map((tc, idx) => ({
        id: `test-${idx}`,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      }));

      if (testCases.length === 0) {
        setOutput('No test cases available to run');
        setRunning(false);
        return;
      }

      // Call backend code execution API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/code/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code,
            language: 'python', // Always use Python
            testCases,
            timeLimit: 5000,
            memoryLimit: 256,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Code execution failed');
      }

      // Format output
      const { results, summary } = result.data;
      let outputText = `=== Test Results ===\n`;
      outputText += `Score: ${summary.score}\n`;
      outputText += `Passed: ${summary.passedTests}/${summary.totalTests}\n\n`;

      results.forEach((testResult: any, idx: number) => {
        outputText += `Test Case ${idx + 1}: ${testResult.passed ? '✓ PASSED' : '✗ FAILED'}\n`;
        outputText += `Input: ${testResult.input}\n`;
        outputText += `Expected: ${testResult.expectedOutput}\n`;
        outputText += `Actual: ${testResult.actualOutput}\n`;
        if (testResult.error) {
          outputText += `Error: ${testResult.error}\n`;
        }
        outputText += `Execution Time: ${testResult.executionTime}ms\n\n`;
      });

      setOutput(outputText);
      setRunning(false);
    } catch (error: any) {
      setOutput('Error running code: ' + (error.message || error));
      setRunning(false);
    }
  };

  const supportedLanguages = [
    { id: 'python', name: 'Python' },
  ];

  return (
    <div className="space-y-4">
      {/* Problem Description */}
      {question.prompt && (
        <div className="glass rounded-lg p-5 border border-gray-700 bg-dark-800/50">
          <h4 className="font-semibold mb-3 text-neon-blue flex items-center gap-2">
            <span>📋</span> Problem Description
          </h4>
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
              {question.prompt}
            </div>
          </div>
        </div>
      )}

      {/* Language selector - Python only */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-400">Language:</label>
        <div className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white">
          Python
        </div>
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

      {/* Solution Explanation */}
      <div className="glass rounded-lg p-4 border border-gray-700">
        <h4 className="font-semibold mb-2 text-neon-blue">
          Solution Explanation
          <span className="text-gray-400 font-normal text-sm ml-2">(Markdown supported)</span>
        </h4>
        <p className="text-xs text-gray-400 mb-3">
          Explain your approach, algorithm choice, time/space complexity, and any edge cases you handled.
        </p>
        <textarea
          value={explanation}
          onChange={(e) => handleExplanationChange(e.target.value)}
          disabled={disabled}
          rows={4}
          placeholder="## My Approach&#10;&#10;I used a two-pointer technique because...&#10;&#10;## Time Complexity: O(n)&#10;## Space Complexity: O(1)"
          className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none font-mono text-sm disabled:opacity-50"
        />
      </div>

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
