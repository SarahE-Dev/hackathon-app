'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';
import * as monaco from 'monaco-editor';
import { teamSubmissionsAPI } from '../lib/api';
import { useProctoring } from '../hooks/useProctoring';

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
  sessionId: string;
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
  onMemberStatusChange?: (statuses: Array<{ odId: string; odStatus: 'offline' | 'in-team-space' | 'live-coding'; odProblemTitle?: string }>) => void;
  onProblemCompleted?: () => void;
  onSubmitComplete?: () => void; // Called after successful submission to navigate back
  isAlreadySubmitted?: boolean; // If true, problem was already submitted
  // Shared socket from parent - if provided, we use it instead of creating our own
  sharedSocket?: Socket | null;
}

export default function LiveCodingSession({
  teamId,
  sessionId,
  problemTitle,
  problem,
  onMemberStatusChange,
  onProblemCompleted,
  onSubmitComplete,
  isAlreadySubmitted = false,
  sharedSocket,
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
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const sessionStartRef = useRef<Date>(new Date());

  // Proctoring hook - tracks copy/paste, tab switches, etc.
  const proctoring = useProctoring({
    enabled: !isAlreadySubmitted, // Disable if already submitted
    onEvent: (event) => {
      console.log('Proctoring event:', event.type, event.metadata);
    },
  });
  
  // Ref to track events that need to be synced to backend
  const pendingProctoringEvents = useRef<any[]>([]);
  const lastSnapshotTime = useRef<number>(Date.now());

  // Team collaboration state
  const [collaborationSocket, setCollaborationSocket] = useState<Socket | null>(null);
  const [teamPresence, setTeamPresence] = useState<TeamPresence[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [cursorDecorations, setCursorDecorations] = useState<any[]>([]);
  const hasConnectedOnce = useRef(false);

  const editorRef = useRef<any>(null);

  // Load existing submission when component mounts
  useEffect(() => {
    const loadExistingSubmission = async () => {
      if (!problem?._id) return;
      
      try {
        const response = await teamSubmissionsAPI.getSubmission(teamId, sessionId, problem._id);
        if (response.success && response.data?.submission) {
          const submission = response.data.submission;
          // Load saved code and explanation
          if (submission.code) {
            setCode(submission.code);
          }
          if (submission.explanation) {
            setExplanation(submission.explanation);
          }
          // Load test results if available
          if (submission.testResults?.length > 0) {
            const results: {[key: string]: 'pending' | 'passed' | 'failed'} = {};
            submission.testResults.forEach((r: any) => {
              results[r.testCaseId] = r.passed ? 'passed' : 'failed';
            });
            setTestResults(results);
          }
          console.log('Loaded existing submission for problem:', problem.title);
        }
      } catch (error) {
        // No existing submission, that's fine
        console.log('No existing submission found');
      }
    };

    loadExistingSubmission();
  }, [teamId, sessionId, problem?._id, problem?.title]);

  // Notify parent of member status changes
  useEffect(() => {
    if (onMemberStatusChange) {
      const statuses = teamPresence.map(p => ({
        odId: p.userId,
        odStatus: p.isOnline ? 'live-coding' as const : 'offline' as const,
        odProblemTitle: p.isOnline ? problemTitle : undefined,
      }));
      onMemberStatusChange(statuses);
    }
  }, [teamPresence, onMemberStatusChange, problemTitle]);

  // Queue proctoring events for syncing to backend
  useEffect(() => {
    if (proctoring.events.length > 0) {
      // Add new events to pending queue
      const lastQueuedIndex = pendingProctoringEvents.current.length;
      const newEvents = proctoring.events.slice(lastQueuedIndex);
      if (newEvents.length > 0) {
        pendingProctoringEvents.current.push(...newEvents);
      }
    }
  }, [proctoring.events]);

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

  // Proctoring is now handled by the useProctoring hook
  // It automatically tracks: copy, paste, tab switches, window blur, keyboard shortcuts, etc.

  // Use shared socket from parent if available
  useEffect(() => {
    // If we have a shared socket, use it
    if (sharedSocket) {
      console.log('LiveCodingSession: Using shared socket, connected:', sharedSocket.connected);
      setCollaborationSocket(sharedSocket);
      
      // Always mark as connected once when using shared socket
      // The parent already manages the connection
      hasConnectedOnce.current = true;
      setIsConnected(sharedSocket.connected);
      setConnectionStatus(sharedSocket.connected ? 'connected' : 'connecting');
      
      // Set up event listeners on the shared socket
      const handleConnect = () => {
        console.log('LiveCodingSession: Shared socket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
      };
      
      const handleDisconnect = () => {
        console.log('LiveCodingSession: Shared socket disconnected');
        setIsConnected(false);
      };

      sharedSocket.on('connect', handleConnect);
      sharedSocket.on('disconnect', handleDisconnect);

      // Listen for presence updates
      const handleUserJoined = (data: { userId: string; presence: TeamPresence }) => {
        console.log('User joined:', data.userId);
        setTeamPresence(prev => {
          const filtered = prev.filter(p => p.userId !== data.userId);
          return [...filtered, data.presence];
        });
      };

      const handleUserLeft = (data: { userId: string }) => {
        console.log('User left:', data.userId);
        setTeamPresence(prev => prev.filter(p => p.userId !== data.userId));
      };

      const handleCodeUpdated = (data: { userId: string; code: string; cursorPosition?: { line: number; column: number } }) => {
        if (data.userId !== sharedSocket.id) {
          setCode(data.code);
          if (data.cursorPosition) {
            updateCursorDecoration(data.userId, data.cursorPosition);
          }
        }
      };

      const handleChatMessage = (message: ChatMessage) => {
        setChatMessages(prev => [...prev, message]);
      };

      sharedSocket.on('user-joined', handleUserJoined);
      sharedSocket.on('user-left', handleUserLeft);
      sharedSocket.on('code-updated', handleCodeUpdated);
      sharedSocket.on('chat-message', handleChatMessage);

      return () => {
        sharedSocket.off('connect', handleConnect);
        sharedSocket.off('disconnect', handleDisconnect);
        sharedSocket.off('user-joined', handleUserJoined);
        sharedSocket.off('user-left', handleUserLeft);
        sharedSocket.off('code-updated', handleCodeUpdated);
        sharedSocket.off('chat-message', handleChatMessage);
      };
    }

    // Fallback: create our own socket if no shared socket provided
    const token = localStorage.getItem('accessToken');
    if (!token || !teamId) return;

    console.log('LiveCodingSession: Creating own socket connection');
    const socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}`, {
      auth: { token },
      path: '/collaboration',
    });

    socket.on('connect', () => {
      console.log('LiveCodingSession: Connected to collaboration server');
      setIsConnected(true);
      setConnectionStatus('connected');
      hasConnectedOnce.current = true;
      socket.emit('join-team', teamId);
    });

    socket.on('connect_error', (error) => {
      console.error('LiveCodingSession: Connection error:', error);
      setIsConnected(false);
      setConnectionStatus('failed');
    });

    socket.on('disconnect', (reason) => {
      console.log('LiveCodingSession: Disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        setConnectionStatus('failed');
      }
    });

    const connectionTimeout = setTimeout(() => {
      if (!socket.connected) {
        console.error('LiveCodingSession: Connection timeout');
        setConnectionStatus('failed');
        socket.disconnect();
      }
    }, 10000);

    socket.on('team-joined', (data: {
      teamId: string;
      presence: TeamPresence[];
      chatHistory: ChatMessage[];
      currentCode: string;
    }) => {
      socket.emit('update-status', {
        status: 'live-coding',
        problemTitle: problemTitle,
      });
      console.log('LiveCodingSession: Joined team:', data.teamId);
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
      // Emit that we're leaving live coding (back to team space)
      socket.emit('update-status', {
        status: 'in-team-space',
        problemTitle: undefined,
      });
      socket.emit('leave-team');
      socket.disconnect();
    };
  }, [teamId, problemTitle, sharedSocket, currentProblem.starterCode]);

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

  // Auto-save debounce ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);

      // Send code update to team
      if (collaborationSocket && isConnected) {
        collaborationSocket.emit('code-update', {
          code: value,
        });
      }

      // Auto-save to backend (debounced)
      if (problem?._id) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(async () => {
          try {
            // Get any pending proctoring events
            const eventsToSend = [...pendingProctoringEvents.current];
            pendingProctoringEvents.current = [];
            
            // Take snapshot every 60 seconds
            const shouldSnapshot = Date.now() - lastSnapshotTime.current > 60000;
            if (shouldSnapshot) {
              proctoring.takeSnapshot(value);
              lastSnapshotTime.current = Date.now();
            }
            
            await teamSubmissionsAPI.saveSubmission(teamId, sessionId, problem._id, {
              code: value,
              explanation,
              proctoringEvents: eventsToSend.length > 0 ? eventsToSend : undefined,
              codeSnapshot: shouldSnapshot ? { code: value } : undefined,
            });
            console.log('Auto-saved code with proctoring data');
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }, 2000); // Save after 2 seconds of inactivity
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
    if (!problem?._id) {
      setOutput('Error: Problem ID not available.');
      return;
    }

    setRunning(true);
    setOutput('Running code against test cases...\n');

    // Initialize test results
    const newTestResults: {[key: string]: 'pending' | 'passed' | 'failed'} = {};
    currentProblem.testCases.forEach(tc => {
      newTestResults[tc.id] = 'pending';
    });
    setTestResults(newTestResults);

    try {
      // Use the team submissions API to run tests (includes hidden tests on backend)
      const response = await teamSubmissionsAPI.runTests(teamId, sessionId, problem._id, code);

      if (response.success) {
        const { results, summary } = response.data;

        // Update test results
        const updatedResults: {[key: string]: 'pending' | 'passed' | 'failed'} = {};
        
        // Process all test results
        results.forEach((result: any) => {
          updatedResults[result.id] = result.passed ? 'passed' : 'failed';
        });

        setTestResults(updatedResults);

        // Format output
        const visibleResults = results.filter((r: any) => {
          const tc = currentProblem.testCases.find(t => t.id === r.id);
          return !tc?.isHidden;
        });
        const hiddenResults = results.filter((r: any) => {
          const tc = currentProblem.testCases.find(t => t.id === r.id);
          return tc?.isHidden;
        });

        // Build detailed output
        const outputLines: string[] = [];
        
        // Header
        outputLines.push('═══════════════════════════════════════════════════════════');
        outputLines.push('                    TEST RESULTS');
        outputLines.push('═══════════════════════════════════════════════════════════');
        outputLines.push('');

        // Visible test results with full details
        outputLines.push('📋 VISIBLE TESTS:');
        outputLines.push('───────────────────────────────────────────────────────────');
        
        visibleResults.forEach((result: any, index: number) => {
          const icon = result.passed ? '✅' : '❌';
          const status = result.passed ? 'PASSED' : 'FAILED';
          
          outputLines.push(`${icon} Test ${index + 1}: ${status} (${result.executionTime}ms)`);
          outputLines.push(`   📥 Input:    ${result.input.replace(/\n/g, ' | ')}`);
          outputLines.push(`   📤 Expected: ${result.expectedOutput}`);
          outputLines.push(`   📝 Output:   ${result.actualOutput || '(no output)'}`);
          
          // Show error if there was one
          if (result.error) {
            outputLines.push(`   ⚠️  Error:    ${result.error}`);
          }
          outputLines.push('');
        });

        // Hidden test results (just pass/fail)
        if (hiddenResults.length > 0) {
          outputLines.push('🔒 HIDDEN TESTS:');
          outputLines.push('───────────────────────────────────────────────────────────');
          
          hiddenResults.forEach((result: any, index: number) => {
            const icon = result.passed ? '✅' : '❌';
            const status = result.passed ? 'PASSED' : 'FAILED';
            // Show error for hidden tests too (helps debugging)
            if (result.error) {
              outputLines.push(`${icon} Hidden Test ${index + 1}: ${status} - Error: ${result.error}`);
            } else {
              outputLines.push(`${icon} Hidden Test ${index + 1}: ${status}`);
            }
          });
          outputLines.push('');
        }

        // Summary
        outputLines.push('═══════════════════════════════════════════════════════════');
        outputLines.push(`📊 SUMMARY: ${summary.passedTests}/${summary.totalTests} tests passed (${summary.score})`);
        
        if (summary.allTestsPassed) {
          outputLines.push('');
          outputLines.push('🎉 ALL TESTS PASSED! You can now submit your solution.');
        } else {
          outputLines.push('');
          outputLines.push('💡 Some tests failed. Review the output above and try again.');
        }
        outputLines.push('═══════════════════════════════════════════════════════════');

        setOutput(outputLines.join('\n'));
      } else {
        setOutput('❌ Code execution failed. Please check your code and try again.');
      }

    } catch (error: any) {
      console.error('Code execution error:', error);
      
      // Build detailed error output
      const errorLines: string[] = [];
      errorLines.push('═══════════════════════════════════════════════════════════');
      errorLines.push('                    ❌ EXECUTION ERROR');
      errorLines.push('═══════════════════════════════════════════════════════════');
      errorLines.push('');
      
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error?.message || error.message || 'Unknown error';
      errorLines.push(`Error: ${errorMessage}`);
      
      // If there's additional error data, show it
      if (error?.response?.data?.data?.results) {
        errorLines.push('');
        errorLines.push('Test Results with Errors:');
        error.response.data.data.results.forEach((r: any, i: number) => {
          if (r.error) {
            errorLines.push(`  Test ${i + 1}: ${r.error}`);
          }
        });
      }
      
      errorLines.push('');
      errorLines.push('═══════════════════════════════════════════════════════════');
      errorLines.push('💡 Tips:');
      errorLines.push('   • Check for syntax errors in your code');
      errorLines.push('   • Make sure you\'re reading input correctly');
      errorLines.push('   • Ensure your output format matches expected');
      errorLines.push('═══════════════════════════════════════════════════════════');
      
      setOutput(errorLines.join('\n'));
      setTestResults({});
    } finally {
      setRunning(false);
    }
  };

  const submitSolution = async () => {
    if (!explanation.trim()) {
      setShowExplanationModal(true);
      return;
    }

    if (!problem?._id) {
      alert('Problem ID not available. Please ensure you selected a problem from the Problems tab.');
      return;
    }

    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      // Get final proctoring data
      const proctoringData = proctoring.getFinalStats();
      
      // Submit solution using the team submissions API with proctoring data
      const response = await teamSubmissionsAPI.submitSolution(teamId, sessionId, problem._id, {
        code,
        explanation,
        proctoringStats: proctoringData.stats,
        proctoringEvents: proctoringData.events,
        codeSnapshots: proctoringData.codeSnapshots,
      });

      if (response.success) {
        setSubmitSuccess(true);
        
        // Always mark problem as completed on submission (regardless of test results)
        // The user has submitted their answer - that's final for this problem
        if (onProblemCompleted) {
          onProblemCompleted();
        }
        
        // Navigate back to problems list after a brief delay
        setTimeout(() => {
          if (onSubmitComplete) {
            onSubmitComplete();
          }
        }, 1500); // Show success state briefly before navigating
      } else {
        alert('Failed to submit solution. Please try again.');
        setSubmitting(false);
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      alert(`Failed to submit solution: ${error?.response?.data?.message || error.message || 'Unknown error'}`);
      setSubmitting(false);
    }
    // Note: Don't set submitting to false on success - we want to keep showing the submitted state
  };

  // Get risk level from proctoring stats
  const getRiskLevel = () => {
    const score = proctoring.stats.riskScore;
    if (score > 50) return 'high';
    if (score > 25) return 'medium';
    return 'low';
  };

  const riskLevel = getRiskLevel();
  const riskColor =
    riskLevel === 'high'
      ? 'text-red-500'
      : riskLevel === 'medium'
      ? 'text-yellow-500'
      : 'text-green-500';
  
  // Convenience variables from proctoring stats for UI
  const copyPasteAttempts = proctoring.stats.copyCount + proctoring.stats.pasteCount;
  const tabSwitches = proctoring.stats.tabSwitchCount;
  const windowBlurCount = proctoring.stats.windowBlurCount;
  const externalPastes = proctoring.stats.externalPasteCount;

  // Show loading state only when:
  // 1. We don't have a shared socket AND we're still connecting for the first time
  // 2. If we have a shared socket, never show loading (parent handles connection)
  const showLoading = !sharedSocket && connectionStatus === 'connecting' && !hasConnectedOnce.current;
  
  if (showLoading) {
  return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-green mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl">💻</span>
          </div>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Connecting to Team Session</h3>
        <p className="text-gray-400 text-sm">Setting up your collaborative coding environment...</p>
      </div>
    );
  }

  // Show error state if connection failed (only for non-shared socket)
  if (!sharedSocket && connectionStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-5xl mb-4">⚠️</div>
        <h3 className="text-lg font-bold text-red-400 mb-2">Connection Failed</h3>
        <p className="text-gray-400 text-sm mb-4">Unable to connect to the team collaboration server.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-lg transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Explanation Required Modal */}
      {showExplanationModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 border border-yellow-500/50 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">Explanation Required</h3>
              <p className="text-gray-300 mb-4">
                Before submitting your solution, please provide an explanation of your approach.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-semibold text-yellow-300 text-sm mb-2">Your explanation should include:</h4>
                <ul className="text-sm text-yellow-300/80 space-y-1">
                  <li>• The algorithm or approach you used</li>
                  <li>• Why you chose this solution</li>
                  <li>• Time and space complexity (if known)</li>
                  <li>• Any trade-offs or alternatives considered</li>
                </ul>
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowExplanationModal(false)}
                  className="px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-lg font-medium transition-all"
                >
                  Got it, I'll add one
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className={`mb-4 ${!explanation.trim() ? 'animate-pulse-subtle' : ''}`}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Solution Explanation <span className="text-red-400">*</span>
              {!explanation.trim() && (
                <span className="ml-2 text-xs text-yellow-400 font-normal">(Required to submit)</span>
              )}
            </label>
            <div className="bg-dark-800 rounded-lg p-3 mb-3 border border-gray-700">
              <p className="text-xs text-gray-300 font-medium mb-2">📝 Your explanation should include:</p>
              <ul className="text-xs text-gray-400 space-y-1 ml-4">
                <li>• <span className="text-neon-blue">Algorithm:</span> What approach did you use? (e.g., two pointers, hash map)</li>
                <li>• <span className="text-neon-blue">Why:</span> Why did you choose this approach?</li>
                <li>• <span className="text-neon-blue">Complexity:</span> Time & space complexity (e.g., O(n), O(1))</li>
                <li>• <span className="text-neon-blue">Steps:</span> Brief walkthrough of your solution</li>
              </ul>
            </div>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Example:

ALGORITHM: I used a hash map approach.

WHY: Hash map allows O(1) lookups, making it efficient.

COMPLEXITY: 
- Time: O(n) - single pass through the array
- Space: O(n) - storing elements in hash map

STEPS:
1. Created a hash map to store values and indices
2. For each element, checked if complement exists
3. If found, returned the indices"
              className={`w-full h-48 px-4 py-3 bg-dark-700 border rounded-lg text-white text-sm focus:border-neon-blue outline-none resize-y font-mono transition-colors placeholder:text-gray-500 ${
                !explanation.trim() 
                  ? 'border-yellow-500/50 focus:border-yellow-500' 
                  : 'border-gray-600'
              }`}
            />
            {!submitSuccess && (
              !explanation.trim() ? (
                <p className="text-xs text-yellow-400 mt-1">
                  ⚠️ You must explain your solution approach before submitting
                </p>
              ) : (
                <p className="text-xs text-green-400 mt-1">
                  ✓ Explanation provided - ready to submit!
                </p>
              )
            )}
          </div>

          {/* Submit Button */}
          <div className="mb-4">
            {isAlreadySubmitted ? (
              // Already submitted state
              <div className="w-full py-4 bg-dark-600 border border-gray-600 text-gray-400 rounded-lg font-medium text-center">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Already Submitted
                </span>
                <p className="text-xs text-gray-500 mt-1">You've already submitted this problem</p>
              </div>
            ) : submitSuccess ? (
              // Success state - show confirmation
              <div className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg font-medium text-center">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Solution Submitted! Returning to problems...
                </span>
              </div>
            ) : (
              <button
                onClick={submitSolution}
                disabled={submitting}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  explanation.trim()
                    ? 'bg-gradient-to-r from-neon-purple to-purple-600 text-white hover:shadow-lg hover:shadow-neon-purple/50'
                    : 'bg-dark-600 border border-yellow-500/50 text-yellow-400 cursor-pointer hover:bg-dark-500'
                } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Submitting...
                  </span>
                ) : explanation.trim() ? (
                  '✓ Submit Solution'
                ) : (
                  '📝 Add Explanation to Submit'
                )}
              </button>
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
            {!isConnected && (
              <div className="text-xs text-yellow-400 text-center py-2">
                🔄 Reconnecting to team...
              </div>
            )}
            {isConnected && teamPresence.length === 0 && (
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
                  width: `${proctoring.stats.riskScore}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Violations Tracker */}
        <div className="glass rounded-2xl p-4 border border-gray-800">
          <h4 className="text-sm font-bold text-white mb-3">⚠️ Activity Monitor</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-dark-700 rounded">
              <span className="text-xs text-gray-300">📋 Copy/Paste</span>
              <span className={`text-sm font-bold ${copyPasteAttempts > 5 ? 'text-red-500' : 'text-gray-400'}`}>
                {copyPasteAttempts}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-dark-700 rounded">
              <span className="text-xs text-gray-300">🔄 Tab Switches</span>
              <span className={`text-sm font-bold ${tabSwitches > 10 ? 'text-red-500' : 'text-gray-400'}`}>
                {tabSwitches}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-dark-700 rounded">
              <span className="text-xs text-gray-300">🌐 External Pastes</span>
              <span className={`text-sm font-bold ${externalPastes > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {externalPastes}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-dark-700 rounded">
              <span className="text-xs text-gray-300">👁️ Window Blur</span>
              <span className={`text-sm font-bold ${windowBlurCount > 10 ? 'text-red-500' : 'text-gray-400'}`}>
                {windowBlurCount}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="glass rounded-2xl p-4 border border-gray-800">
          <h4 className="text-sm font-bold text-white mb-3">📝 Recent Events</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {proctoring.events.length === 0 ? (
              <p className="text-xs text-gray-500">No activity recorded yet</p>
            ) : (
              proctoring.events.slice(-5).map((event, idx) => (
                <div
                  key={idx}
                  className={`p-2 bg-dark-700 rounded text-xs text-gray-300 border-l-2 ${
                    ['external-paste', 'devtools-open', 'screenshot-attempt', 'print-attempt'].includes(event.type)
                      ? 'border-red-500'
                      : 'border-yellow-500'
                  }`}
                >
                  <div className="font-semibold text-gray-200">{event.type.replace(/-/g, ' ')}</div>
                  <div className="text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Warning Message */}
        {proctoring.stats.riskScore > 25 && (
          <div className={`glass rounded-2xl p-4 border ${
            proctoring.stats.riskScore > 50 ? 'border-red-500/50 bg-red-500/10' : 'border-yellow-500/50 bg-yellow-500/10'
          }`}>
            <p className={`text-sm ${proctoring.stats.riskScore > 50 ? 'text-red-400' : 'text-yellow-400'}`}>
              ⚠️ Your session is being monitored. {proctoring.stats.suspiciousPatterns.length > 0 && 
                `Detected: ${proctoring.stats.suspiciousPatterns.slice(0, 2).join(', ')}`}
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
