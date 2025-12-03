'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';
import * as monaco from 'monaco-editor';
import { codeExecutionAPI, hackathonSessionsAPI } from '../lib/api';

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

interface TeamPresence {
  userId: string;
  username: string;
  cursorPosition?: { line: number; column: number };
  lastActive: Date;
  isOnline: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system' | 'code-share';
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
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [proctorEvents, setProctorEvents] = useState<ProctorEvent[]>([]);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [copyPasteAttempts, setCopyPasteAttempts] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [focusLosses, setFocusLosses] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const sessionStartRef = useRef<Date>(new Date());

  // Team collaboration state
  const [collaborationSocket, setCollaborationSocket] = useState<Socket | null>(null);
  const [teamPresence, setTeamPresence] = useState<TeamPresence[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [cursorDecorations, setCursorDecorations] = useState<any[]>([]);

  const editorRef = useRef<any>(null);

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

  // Monitor copy/paste attempts (log but allow within editor)
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      // Log the copy event but don't prevent it - allow copy within the editor
      setCopyPasteAttempts((prev) => prev + 1);
      const event: ProctorEvent = {
        type: 'copy-paste',
        timestamp: new Date(),
        details: 'Copy detected (logged)',
      };
      setProctorEvents((prev) => [...prev, event]);
    };

    const handlePaste = (e: ClipboardEvent) => {
      // Log the paste event but don't prevent it - allow paste within the editor
      setCopyPasteAttempts((prev) => prev + 1);
      const event: ProctorEvent = {
        type: 'copy-paste',
        timestamp: new Date(),
        details: 'Paste detected (logged)',
      };
      setProctorEvents((prev) => [...prev, event]);
    };

    const handleCut = (e: ClipboardEvent) => {
      // Log the cut event but don't prevent it - allow cut within the editor
      setCopyPasteAttempts((prev) => prev + 1);
      const event: ProctorEvent = {
        type: 'copy-paste',
        timestamp: new Date(),
        details: 'Cut detected (logged)',
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

  // Team collaboration socket connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !teamId) return;

    const socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}`, {
      auth: { token },
      path: '/collaboration',
    });

    socket.on('connect', () => {
      console.log('Connected to collaboration server');
      setIsConnected(true);
      setConnectionStatus('connected');
      socket.emit('join-team', teamId);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      setConnectionStatus('failed');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setIsConnected(false);
      setConnectionStatus('connecting');
    });

    // Set a timeout for connection attempts
    const connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        console.error('WebSocket connection timeout');
        setConnectionStatus('failed');
        socket.disconnect();
      }
    }, 10000); // 10 second timeout

    socket.on('team-joined', (data: {
      teamId: string;
      presence: TeamPresence[];
      chatHistory: ChatMessage[];
      currentCode: string;
    }) => {
      console.log('Joined team:', data.teamId);
      // Only show users who are actually online
      const onlineUsers = data.presence.filter(p => p.isOnline);
      setTeamPresence(onlineUsers);
      setChatMessages(data.chatHistory);
      if (data.currentCode && data.currentCode !== currentProblem.starterCode) {
        setCode(data.currentCode);
      }
    });

    socket.on('user-joined', (data: { userId: string; presence: TeamPresence }) => {
      console.log('User joined:', data.userId);
      setTeamPresence(prev => {
        const filtered = prev.filter(p => p.userId !== data.userId);
        return [...filtered, data.presence];
      });
      // Add system message
      setChatMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        userId: 'system',
        username: 'System',
        message: `${data.presence.username} joined the session`,
        timestamp: new Date(),
        type: 'system',
      }]);
    });

    socket.on('user-left', (data: { userId: string }) => {
      console.log('User left:', data.userId);
      // Remove the user from presence list when they go offline
      setTeamPresence(prev => prev.filter(p => p.userId !== data.userId));
      // Add system message
      const leftUser = teamPresence.find(p => p.userId === data.userId);
      if (leftUser) {
        setChatMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          userId: 'system',
          username: 'System',
          message: `${leftUser.username} left the session`,
          timestamp: new Date(),
          type: 'system',
        }]);
      }
    });

    socket.on('code-updated', (data: {
      userId: string;
      code: string;
      cursorPosition?: { line: number; column: number };
      timestamp: Date;
    }) => {
      // Only update if it's not from the current user
      setCode(data.code);
      if (data.cursorPosition) {
        updateCursorDecoration(data.userId, data.cursorPosition);
      }
    });

    socket.on('chat-message', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('cursor-moved', (data: {
      userId: string;
      position: { line: number; column: number };
    }) => {
      updateCursorDecoration(data.userId, data.position);
    });

    socket.on('team-execution', (data: {
      userId: string;
      result: any;
      problemId: string;
      timestamp: Date;
    }) => {
      // Show notification that a teammate ran code
      console.log('Teammate executed code:', data);
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Collaboration error:', error.message);
      alert('Collaboration error: ' + error.message);
    });

    setCollaborationSocket(socket);

    return () => {
      clearTimeout(connectionTimeout);
      socket.emit('leave-team');
      socket.disconnect();
    };
  }, [teamId]);

  const updateCursorDecoration = (userId: string, position: { line: number; column: number }) => {
    if (!editorRef.current) return;

    // Remove existing decoration for this user
    setCursorDecorations(prev => prev.filter(d => d.userId !== userId));

    // Add new decoration
    const decoration = {
      userId,
      range: new monaco.Range(position.line + 1, position.column + 1, position.line + 1, position.column + 1),
      options: {
        className: 'collaborative-cursor',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        afterContentClassName: 'collaborative-cursor-label',
      },
    };

    editorRef.current.deltaDecorations([], [decoration]);
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);

      // Send code update to team
      if (collaborationSocket && isConnected) {
        collaborationSocket.emit('code-update', {
          code: value,
        });
      }
    }
  };

  const handleCursorChange = (e: any) => {
    const position = e.position;
    if (collaborationSocket && isConnected) {
      collaborationSocket.emit('cursor-move', {
        line: position.lineNumber - 1,
        column: position.column - 1,
      });
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !collaborationSocket || !isConnected) return;

    collaborationSocket.emit('send-message', { message: newMessage.trim() });
    setNewMessage('');
  };

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
      newTestResults[tc.id] = tc.isHidden ? 'pending' : 'pending';
    });
    setTestResults(newTestResults);

    try {
      // Prepare test cases for API (only visible ones for now)
      const visibleTestCases = currentProblem.testCases.filter(tc => !tc.isHidden);

      const executionData = {
        code: code,
        language: currentProblem.language,
        testCases: visibleTestCases.map(tc => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
        timeLimit: 2000, // 2 seconds
        memoryLimit: 256, // 256MB
      };

      const response = await codeExecutionAPI.executeCode(executionData);

      if (response.success) {
        const { results, summary } = response.data;

        // Update test results
        const updatedResults: {[key: string]: 'pending' | 'passed' | 'failed'} = {};
        results.forEach((result: any) => {
          updatedResults[result.id] = result.passed ? 'passed' : 'failed';
        });

        // Mark hidden tests as pending
        currentProblem.testCases.filter(tc => tc.isHidden).forEach(tc => {
          updatedResults[tc.id] = 'pending';
        });

        setTestResults(updatedResults);

        // Format output
        const outputLines = [
          `Code executed successfully!\n`,
          `Test Results:`,
          ...results.map((result: any) =>
            `${result.passed ? '✓' : '✗'} Test Case ${result.id}: ${result.passed ? 'PASSED' : 'FAILED'} (${result.executionTime}ms)`
          ),
          ...currentProblem.testCases.filter(tc => tc.isHidden).map(tc =>
            `? Test Case ${tc.id}: HIDDEN`
          ),
          ``,
          `Score: ${summary.score} (${summary.passedTests}/${summary.totalTests} tests passed)`,
        ];

        setOutput(outputLines.join('\n'));
      } else {
        setOutput('Code execution failed. Please check your code and try again.');
      }

    } catch (error: any) {
      console.error('Code execution error:', error);
      setOutput(`Error running code: ${error?.response?.data?.message || error.message || 'Unknown error'}`);
      setTestResults({});
    } finally {
      setRunning(false);
    }
  };

  const submitSolution = async () => {
    if (!explanation.trim()) {
      alert('Please provide an explanation of your solution approach before submitting.');
      return;
    }

    if (!problem?._id) {
      alert('Problem ID not available. Please ensure you selected a problem from the Problems tab.');
      return;
    }

    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      // For now, we'll submit without sessionId (need to integrate with active session later)
      // This is a temporary placeholder - will show alert for now
      const results = Object.entries(testResults).map(([id, status]) => ({
        id,
        passed: status === 'passed',
      }));

      // TODO: Get actual sessionId from active hackathon session
      // For now, just show success message with saved data
      console.log('Submitting solution:', {
        problemId: problem._id,
        code,
        explanation,
        testResults: results,
      });

      setSubmitSuccess(true);
      alert(`Solution submitted successfully!\n\nCode and explanation saved for ${problem.title}`);
    } catch (error: any) {
      console.error('Submission error:', error);
      alert(`Failed to submit solution: ${error?.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
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
              onMount={(editor) => {
                editorRef.current = editor;
                editor.onDidChangeCursorPosition(handleCursorChange);
              }}
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
          </div>

          {/* Explanation */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Solution Explanation <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Describe your approach to solving this problem, the algorithm you used, and why you chose it.
            </p>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="I solved this problem by...&#10;&#10;My approach:&#10;1. First, I...&#10;2. Then I...&#10;3. Finally...&#10;&#10;Time complexity: O(n)&#10;Space complexity: O(1)&#10;&#10;I chose this approach because..."
              className="w-full h-40 px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm focus:border-neon-blue outline-none resize-y font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              ✓ Explain your thought process, algorithm choice, and complexity analysis
            </p>
          </div>

          {/* Submit Button */}
          <div className="mb-4">
            <button
              onClick={submitSolution}
              disabled={submitting || !explanation.trim()}
              className="w-full py-3 bg-gradient-to-r from-neon-purple to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-neon-purple/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : '✓ Submit Solution'}
            </button>
            {submitSuccess && (
              <p className="text-sm text-green-400 mt-2 text-center">
                ✓ Solution submitted successfully!
              </p>
            )}
          </div>

          {/* Test Results */}
          {output && (
            <div className="bg-dark-800 rounded-lg border border-gray-700 p-4 max-h-96 overflow-y-auto">
              <h4 className="text-sm font-bold text-gray-400 mb-2">Execution Results</h4>
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap bg-dark-900 p-3 rounded">
                {output}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Collaboration & Proctoring Panel */}
      <div className="lg:col-span-1 space-y-4">
        {/* Team Presence */}
        <div className="glass rounded-2xl p-4 border border-gray-800">
          <h4 className="text-sm font-bold text-white mb-3">👥 Team ({teamPresence.length})</h4>
          <div className="space-y-2">
            {teamPresence.map((member) => (
              <div key={member.userId} className="flex items-center gap-3 p-2 bg-dark-700 rounded">
                <div className={`w-2 h-2 rounded-full ${member.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <span className="text-sm text-gray-300">{member.username}</span>
                {member.cursorPosition && (
                  <span className="text-xs text-gray-500 ml-auto">
                    {member.cursorPosition.line}:{member.cursorPosition.column}
                  </span>
                )}
              </div>
            ))}
            {connectionStatus === 'connecting' && (
              <div className="text-xs text-yellow-400 text-center py-2">
                🔄 Connecting to team...
              </div>
            )}
            {connectionStatus === 'failed' && (
              <div className="text-xs text-red-400 text-center py-2">
                ❌ Failed to connect. Please refresh the page.
              </div>
            )}
            {connectionStatus === 'connected' && teamPresence.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-2">
                👥 Connected - Waiting for team members...
              </div>
            )}
          </div>
        </div>

        {/* Team Chat */}
        <div className="glass rounded-2xl p-4 border border-gray-800 flex flex-col h-96">
          <h4 className="text-sm font-bold text-white mb-3">💬 Team Chat</h4>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-3">
            {chatMessages.map((message) => (
              <div key={message.id} className="text-xs">
                <span className="text-neon-blue font-medium">{message.username}:</span>
                <span className="text-gray-300 ml-1">{message.message}</span>
              </div>
            ))}
            {chatMessages.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-4">
                No messages yet. Start collaborating! 💻
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm focus:border-neon-blue outline-none"
              disabled={!isConnected}
            />
            <button
              onClick={sendMessage}
              disabled={!isConnected || !newMessage.trim()}
              className="w-full px-3 py-2 bg-neon-blue text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>

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
