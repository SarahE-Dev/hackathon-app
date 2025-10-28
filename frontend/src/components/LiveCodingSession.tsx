'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';

interface ProctorEvent {
  type: 'tab-switch' | 'copy-paste' | 'focus-lost' | 'suspicious-activity';
  timestamp: Date;
  details: string;
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
  timeLimit?: number;
  memoryLimit?: number;
}

interface Problem {
  title: string;
  description: string;
  difficulty: string;
  points: number;
  language: string;
  starterCode: string;
  testCases: TestCase[];
}

interface LiveCodingSessionProps {
  teamId: string;
  problemTitle: string;
  problem?: {
    _id: string;
    title: string;
    content: {
      prompt: string;
      language: string;
      codeTemplate?: string;
      testCases?: Array<{
        id: string;
        input: string;
        expectedOutput: string;
        isHidden: boolean;
        points: number;
        timeLimit?: number;
        memoryLimit?: number;
      }>;
    };
    difficulty: string;
    points: number;
    tags?: string[];
    metadata?: {
      codewarsId?: string;
      codewarsDifficulty?: number;
      codewarsStats?: {
        totalAttempts: number;
        totalCompleted: number;
        successRate: string;
      };
    };
  };
}

export default function LiveCodingSession({
  teamId,
  problemTitle,
  problem,
}: LiveCodingSessionProps) {
  // Convert problem prop to internal format, with fallback for demo
  const currentProblem: Problem = problem ? {
    title: problem.title,
    description: problem.content.prompt,
    difficulty: problem.difficulty,
    points: problem.points,
    language: problem.content.language || 'python',
    starterCode: problem.content.codeTemplate || `def solution():
    # Your code here
    pass`,
    testCases: problem.content.testCases || [],
  } : {
    // Fallback demo problem
    title: "Two Sum Problem",
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

**Example 1:**
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

**Example 2:**
Input: nums = [3,2,4], target = 6
Output: [1,2]

**Example 3:**
Input: nums = [3,3], target = 6
Output: [0,1]

**Constraints:**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
    difficulty: "Easy",
    points: 10,
    language: "python",
    starterCode: `def two_sum(nums, target):
    """
    Find two numbers in nums that add up to target.
    
    Args:
        nums: List of integers
        target: Target sum
        
    Returns:
        List of two indices
    """
    # Your code here
    pass`,
    testCases: [
      {
        id: "1",
        input: "[2,7,11,15], 9",
        expectedOutput: "[0,1]",
        isHidden: false,
        points: 2,
        timeLimit: 1000,
        memoryLimit: 256,
      },
      {
        id: "2", 
        input: "[3,2,4], 6",
        expectedOutput: "[1,2]",
        isHidden: false,
        points: 2,
        timeLimit: 1000,
        memoryLimit: 256,
      },
      {
        id: "3",
        input: "[3,3], 6", 
        expectedOutput: "[0,1]",
        isHidden: false,
        points: 2,
        timeLimit: 1000,
        memoryLimit: 256,
      },
      {
        id: "4",
        input: "[1,2,3,4,5], 8",
        expectedOutput: "[2,4]",
        isHidden: true,
        points: 2,
        timeLimit: 1000,
        memoryLimit: 256,
      },
      {
        id: "5",
        input: "[-1,-2,-3,-4,-5], -8",
        expectedOutput: "[2,4]",
        isHidden: true,
        points: 2,
        timeLimit: 1000,
        memoryLimit: 256,
      },
    ],
  };

  const [code, setCode] = useState(currentProblem.starterCode);
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<{[key: string]: 'pending' | 'passed' | 'failed'}>({});
  const [running, setRunning] = useState(false);
  const [proctorEvents, setProctorEvents] = useState<ProctorEvent[]>([]);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [copyPasteAttempts, setCopyPasteAttempts] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [focusLosses, setFocusLosses] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const sessionStartRef = useRef<Date>(new Date());

  // Timer for session duration
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (new Date().getTime() - sessionStartRef.current.getTime()) / 1000
      );
      setSessionTimer(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Monitor window focus (tab switching)
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
      setTabSwitches((prev) => prev + 1);
      const event: ProctorEvent = {
        type: 'tab-switch',
        timestamp: new Date(),
        details: `User switched away from the coding window`,
      };
      setProctorEvents((prev) => [...prev, event]);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Monitor copy/paste attempts
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setCopyPasteAttempts((prev) => prev + 1);
      const event: ProctorEvent = {
        type: 'copy-paste',
        timestamp: new Date(),
        details: 'Copy attempt detected',
      };
      setProctorEvents((prev) => [...prev, event]);
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setCopyPasteAttempts((prev) => prev + 1);
      const event: ProctorEvent = {
        type: 'copy-paste',
        timestamp: new Date(),
        details: 'Paste attempt detected',
      };
      setProctorEvents((prev) => [...prev, event]);
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      setCopyPasteAttempts((prev) => prev + 1);
      const event: ProctorEvent = {
        type: 'copy-paste',
        timestamp: new Date(),
        details: 'Cut attempt detected',
      };
      setProctorEvents((prev) => [...prev, event]);
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
    };
  }, []);

  // Detect unusual activities
  useEffect(() => {
    if (copyPasteAttempts > 3) {
      const event: ProctorEvent = {
        type: 'suspicious-activity',
        timestamp: new Date(),
        details: `Multiple copy/paste attempts (${copyPasteAttempts} total)`,
      };
      setProctorEvents((prev) => [...prev, event]);
    }

    if (tabSwitches > 5) {
      const event: ProctorEvent = {
        type: 'suspicious-activity',
        timestamp: new Date(),
        details: `Excessive tab switching (${tabSwitches} total)`,
      };
      setProctorEvents((prev) => [...prev, event]);
    }
  }, [copyPasteAttempts, tabSwitches]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const runCode = async () => {
    setRunning(true);
    setOutput('Running code...\n');
    
    // Initialize test results
    const newTestResults: {[key: string]: 'pending' | 'passed' | 'failed'} = {};
    currentProblem.testCases.forEach(tc => {
      newTestResults[tc.id] = 'pending';
    });
    setTestResults(newTestResults);

    try {
      // Simulate code execution - in real app this would call the code execution service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock test results for demo
      const mockResults: {[key: string]: 'pending' | 'passed' | 'failed'} = {
        '1': 'passed',
        '2': 'passed', 
        '3': 'failed',
        '4': 'pending',
        '5': 'pending'
      };
      
      setTestResults(mockResults);
      setOutput(`Code executed successfully!

Test Results:
✓ Test Case 1: PASSED
✓ Test Case 2: PASSED  
✗ Test Case 3: FAILED
? Test Case 4: HIDDEN
? Test Case 5: HIDDEN

Score: 4/10 points`);
      
    } catch (error) {
      setOutput(`Error running code: ${error}`);
      setTestResults({});
    } finally {
      setRunning(false);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  const getRiskLevel = () => {
    const totalViolations = copyPasteAttempts + tabSwitches + focusLosses;
    if (totalViolations > 10) return 'high';
    if (totalViolations > 5) return 'medium';
    return 'low';
  };

  const riskLevel = getRiskLevel();
  const riskColor =
    riskLevel === 'high'
      ? 'text-red-500'
      : riskLevel === 'medium'
      ? 'text-yellow-500'
      : 'text-green-500';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Content Area */}
      <div className="lg:col-span-3 space-y-6">
        {/* Problem Header */}
        <div className="glass rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{currentProblem.title}</h2>
              <div className="flex items-center gap-4 mt-2">
                <span className="px-3 py-1 bg-neon-blue/20 text-neon-blue rounded-full text-sm font-medium">
                  {currentProblem.difficulty}
                </span>
                <span className="px-3 py-1 bg-neon-green/20 text-neon-green rounded-full text-sm font-medium">
                  {currentProblem.points} points
                </span>
                <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm font-medium">
                  Python
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono text-neon-blue font-bold">
                {formatTime(sessionTimer)}
              </div>
              <p className="text-xs text-gray-400">Session Duration</p>
            </div>
          </div>
        </div>

        {/* Problem Description */}
        <div className="glass rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-4">Problem Description</h3>
          <div className="prose prose-invert max-w-none">
            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
              {currentProblem.description}
            </div>
          </div>
        </div>

        {/* Test Cases */}
        <div className="glass rounded-2xl p-6 border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-4">Test Cases</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentProblem.testCases
              .filter(tc => !tc.isHidden)
              .map((testCase) => (
                <div key={testCase.id} className="bg-dark-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neon-blue">Test Case {testCase.id}</span>
                    <span className="text-xs text-gray-400">{testCase.points} pts</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Input:</div>
                      <code className="text-green-400 text-sm bg-dark-800 px-2 py-1 rounded">
                        {testCase.input}
                      </code>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Expected Output:</div>
                      <code className="text-blue-400 text-sm bg-dark-800 px-2 py-1 rounded">
                        {testCase.expectedOutput}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Code Editor */}
        <div className="glass rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Code Editor</h3>
            <div className="text-xs text-gray-500">
              Lines: {code.split('\n').length} | Characters: {code.length}
            </div>
          </div>
          
          <div className="border-2 border-gray-700 rounded-lg overflow-hidden mb-4">
            <Editor
              height="400px"
              language="python"
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
                readOnly: false,
                wordWrap: 'on',
                folding: true,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 3,
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={runCode}
              disabled={running}
              className="flex-1 py-3 bg-gradient-to-r from-neon-green to-green-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-neon-green/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? 'Running...' : '▶ Run Code'}
            </button>
            <button className="flex-1 py-3 bg-dark-700 border border-gray-600 text-white rounded-lg font-medium hover:border-neon-blue transition-all">
              💾 Save Progress
            </button>
            <button className="flex-1 py-3 bg-dark-700 border border-gray-600 text-white rounded-lg font-medium hover:border-neon-green transition-all">
              ✓ Submit Solution
            </button>
          </div>

          {/* Test Results */}
          {output && (
            <div className="bg-dark-800 rounded-lg border border-gray-700 p-4">
              <h4 className="text-sm font-bold text-gray-400 mb-2">Execution Results</h4>
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap bg-dark-900 p-3 rounded">
                {output}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Proctoring Panel */}
      <div className="lg:col-span-1 space-y-4">
        {/* Security Status */}
        <div className="glass rounded-2xl p-4 border border-gray-800">
          <h4 className="text-sm font-bold text-white mb-3">🛡️ Security Status</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Risk Level</span>
              <span className={`text-sm font-bold uppercase ${riskColor}`}>
                {riskLevel}
              </span>
            </div>
            <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  riskLevel === 'high'
                    ? 'bg-red-500'
                    : riskLevel === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min(
                    (copyPasteAttempts + tabSwitches + focusLosses) * 10,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Violations Tracker */}
        <div className="glass rounded-2xl p-4 border border-gray-800">
          <h4 className="text-sm font-bold text-white mb-3">⚠️ Violations</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-dark-700 rounded">
              <span className="text-xs text-gray-300">📋 Copy/Paste</span>
              <span className={`text-sm font-bold ${copyPasteAttempts > 3 ? 'text-red-500' : 'text-gray-400'}`}>
                {copyPasteAttempts}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-dark-700 rounded">
              <span className="text-xs text-gray-300">🔄 Tab Switches</span>
              <span className={`text-sm font-bold ${tabSwitches > 5 ? 'text-red-500' : 'text-gray-400'}`}>
                {tabSwitches}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-dark-700 rounded">
              <span className="text-xs text-gray-300">👁️ Focus Loss</span>
              <span className={`text-sm font-bold ${focusLosses > 3 ? 'text-red-500' : 'text-gray-400'}`}>
                {focusLosses}
              </span>
            </div>
          </div>
        </div>

        {/* Window Focus Indicator */}
        <div className="glass rounded-2xl p-4 border border-gray-800">
          <h4 className="text-sm font-bold text-white mb-3">👁️ Window Status</h4>
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isWindowFocused ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span className="text-sm text-gray-300">
              {isWindowFocused ? 'Focused' : 'Not Focused'}
            </span>
          </div>
        </div>

        {/* Recent Events */}
        <div className="glass rounded-2xl p-4 border border-gray-800">
          <h4 className="text-sm font-bold text-white mb-3">📝 Recent Events</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {proctorEvents.length === 0 ? (
              <p className="text-xs text-gray-500">No suspicious activity detected</p>
            ) : (
              proctorEvents.slice(-5).map((event, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-dark-700 rounded text-xs text-gray-300 border-l-2 border-red-500"
                >
                  <div className="font-semibold text-red-400">{event.type}</div>
                  <div className="text-gray-500">
                    {event.timestamp.toLocaleTimeString()}
                  </div>
                  <div className="text-gray-400">{event.details}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Warning Message */}
        {(copyPasteAttempts > 3 || tabSwitches > 5 || focusLosses > 3) && (
          <div className="glass rounded-2xl p-4 border border-red-500/50 bg-red-500/10">
            <p className="text-sm text-red-400">
              ⚠️ Your session is being monitored. Suspicious activities are being
              recorded.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
