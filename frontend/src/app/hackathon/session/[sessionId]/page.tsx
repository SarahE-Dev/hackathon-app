'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { hackathonSessionsAPI, codeExecutionAPI, teamsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Problem {
  _id: string;
  problemId: any;
  status: string;
  code: string;
  language: string;
  explanation?: string;
  testResults: any[];
  passedTests: number;
  totalTests: number;
  score: number;
}

interface TeamSession {
  _id: string;
  sessionId: any;
  teamId: any;
  status: string;
  isPaused: boolean;
  pauseReason?: string;
  totalScore: number;
  maxScore: number;
  problemProgress: Problem[];
}

interface ProctoringSettings {
  enabled: boolean;
  requireFullscreen: boolean;
  detectTabSwitch: boolean;
  detectCopyPaste: boolean;
  detectIdle: boolean;
  idleTimeoutMinutes: number;
}

export default function HackathonSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { user, isAuthenticated } = useAuthStore();

  const [teamSession, setTeamSession] = useState<TeamSession | null>(null);
  const [proctoring, setProctoring] = useState<ProctoringSettings | null>(null);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [explanation, setExplanation] = useState('');
  const [executing, setExecuting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [savingTeamName, setSavingTeamName] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Get team ID from user's fellow role (in a real app, this should be more sophisticated)
  const teamId = user?.roles.find((r: any) => r.role === 'fellow')?.cohortId || '';

  useEffect(() => {
    if (isAuthenticated && teamId) {
      loadSession();
    }
  }, [isAuthenticated, sessionId, teamId]);

  useEffect(() => {
    if (proctoring?.enabled) {
      setupProctoring();
      return () => cleanupProctoring();
    }
  }, [proctoring]);

  useEffect(() => {
    if (teamSession && teamSession.problemProgress.length > 0) {
      const problem = teamSession.problemProgress[currentProblemIndex];
      setCode(problem.code || '');
      setLanguage(problem.language || 'python');
      setExplanation(problem.explanation || '');
    }
  }, [currentProblemIndex, teamSession]);

  // Auto-save code and explanation
  useEffect(() => {
    const currentProgress = teamSession?.problemProgress[currentProblemIndex];
    if (teamSession && (
      code !== currentProgress?.code ||
      explanation !== (currentProgress?.explanation || '')
    )) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        saveProgress();
      }, 2000);
    }
  }, [code, language, explanation]);

  const loadSession = async () => {
    try {
      // Join/get team session
      const joinResponse = await hackathonSessionsAPI.joinSession(sessionId, teamId);
      const session = joinResponse.data.teamSession;
      setTeamSession(session);

      // Get session proctoring settings
      const sessionResponse = await hackathonSessionsAPI.getById(sessionId);
      setProctoring(sessionResponse.data.session.proctoring);

      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load session');
      setLoading(false);
    }
  };

  const setupProctoring = () => {
    if (!proctoring) return;

    // Fullscreen enforcement
    if (proctoring.requireFullscreen) {
      requestFullscreen();
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    // Tab switch detection
    if (proctoring.detectTabSwitch) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
    }

    // Copy/paste detection
    if (proctoring.detectCopyPaste) {
      document.addEventListener('copy', handleCopy);
      document.addEventListener('paste', handlePaste);
    }

    // Idle detection
    if (proctoring.detectIdle) {
      startIdleDetection();
      document.addEventListener('mousemove', resetIdleTimer);
      document.addEventListener('keypress', resetIdleTimer);
    }

    // Periodic fullscreen check
    if (proctoring.requireFullscreen) {
      fullscreenCheckRef.current = setInterval(checkFullscreen, 5000);
    }
  };

  const cleanupProctoring = () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('copy', handleCopy);
    document.removeEventListener('paste', handlePaste);
    document.removeEventListener('mousemove', resetIdleTimer);
    document.removeEventListener('keypress', resetIdleTimer);

    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (fullscreenCheckRef.current) clearInterval(fullscreenCheckRef.current);
  };

  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {
        showWarning('Please enable fullscreen mode to continue');
      });
    }
  };

  const checkFullscreen = () => {
    if (!document.fullscreenElement && proctoring?.requireFullscreen) {
      showWarning('Fullscreen mode is required. Please re-enter fullscreen.');
      logEvent('fullscreen-exit', 'Exited fullscreen mode', 'high');
    }
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && proctoring?.requireFullscreen) {
      logEvent('fullscreen-exit', 'Exited fullscreen mode', 'high');
      showWarning('Fullscreen mode is required!');
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      console.log('[Proctoring] Tab visibility lost');
      logEvent('tab-switch', 'Switched to another tab or minimized window', 'medium');
      showWarning('⚠️ Tab switching detected!');
    }
  };

  const handleWindowBlur = () => {
    console.log('[Proctoring] Window focus lost');
    // Only log if not already tracked by visibility change
    if (!document.hidden) {
      logEvent('tab-switch', 'Window lost focus to another application', 'medium');
      showWarning('⚠️ Please keep focus on this window!');
    }
  };

  const handleCopy = (e: ClipboardEvent) => {
    logEvent('copy-paste', 'Copy detected', 'low');
    showWarning('Copy action detected and logged');
  };

  const handlePaste = (e: ClipboardEvent) => {
    logEvent('copy-paste', 'Paste detected', 'medium');
    showWarning('Paste action detected and logged');
  };

  const startIdleDetection = () => {
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    idleTimerRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      const idleMinutes = idleTime / 60000;
      if (idleMinutes >= (proctoring?.idleTimeoutMinutes || 10)) {
        logEvent('idle', `Idle for ${Math.round(idleMinutes)} minutes`, 'low');
        lastActivityRef.current = Date.now();
      }
    }, 60000); // Check every minute
  };

  const resetIdleTimer = () => {
    lastActivityRef.current = Date.now();
  };

  const showWarning = (message: string) => {
    setWarningMessage(message);
    setTimeout(() => setWarningMessage(''), 5000);
  };

  const logEvent = async (
    type: string,
    details: string,
    severity: 'low' | 'medium' | 'high'
  ) => {
    try {
      await hackathonSessionsAPI.logProctorEvent(sessionId, teamId, {
        type,
        details,
        severity,
      });
    } catch (err) {
      console.error('Failed to log event:', err);
    }
  };

  const saveProgress = async () => {
    if (!teamSession) return;
    try {
      const problem = teamSession.problemProgress[currentProblemIndex];
      await hackathonSessionsAPI.updateProblemProgress(sessionId, teamId, {
        problemId: problem.problemId._id,
        code,
        language,
        explanation,
      });
    } catch (err: any) {
      console.error('Failed to save progress:', err);
    }
  };

  const handleRunCode = async () => {
    if (!teamSession) return;

    setExecuting(true);
    try {
      const problem = teamSession.problemProgress[currentProblemIndex];
      const testCases = problem.problemId.testCases || [];

      const response = await codeExecutionAPI.executeCode({
        code,
        language,
        testCases: testCases.map((tc: any) => ({
          id: tc._id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
        })),
      });

      setTestResults(response.data.results);
      setExecuting(false);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to execute code');
      setExecuting(false);
    }
  };

  const handleSubmitProblem = async () => {
    if (!teamSession || testResults.length === 0) {
      alert('Please run your code first');
      return;
    }

    if (confirm('Submit this solution? This will lock your answer.')) {
      try {
        const problem = teamSession.problemProgress[currentProblemIndex];
        await hackathonSessionsAPI.submitProblem(sessionId, teamId, {
          problemId: problem.problemId._id,
          testResults,
        });

        // Reload session to get updated scores
        await loadSession();
        alert('Solution submitted successfully!');
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Failed to submit solution');
      }
    }
  };

  const handleSubmitSession = async () => {
    if (confirm('Submit your final session? You will not be able to make further changes.')) {
      try {
        await hackathonSessionsAPI.submitSession(sessionId, teamId);
        alert('Session submitted successfully!');
        router.push('/dashboard');
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Failed to submit session');
      }
    }
  };

  const handleEditTeamName = () => {
    setNewTeamName(teamSession?.teamId.name || '');
    setEditingTeamName(true);
  };

  const handleSaveTeamName = async () => {
    if (!newTeamName.trim() || !teamSession) return;

    setSavingTeamName(true);
    try {
      await teamsAPI.updateTeam(teamSession.teamId._id, { name: newTeamName.trim() });
      // Update local state
      setTeamSession({
        ...teamSession,
        teamId: { ...teamSession.teamId, name: newTeamName.trim() }
      });
      setEditingTeamName(false);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update team name');
    } finally {
      setSavingTeamName(false);
    }
  };

  const handleCancelEditTeamName = () => {
    setEditingTeamName(false);
    setNewTeamName('');
  };

  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neon-pink mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg hover:opacity-90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!teamSession) {
    return null;
  }

  if (teamSession.isPaused) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center glass border border-neon-yellow/50 rounded-xl p-8 max-w-md">
          <div className="text-6xl mb-4">⏸️</div>
          <h2 className="text-2xl font-bold text-neon-yellow mb-2">Session Paused</h2>
          <p className="text-gray-300">{teamSession.pauseReason || 'Your session has been paused by a proctor.'}</p>
        </div>
      </div>
    );
  }

  const currentProblem = teamSession.problemProgress[currentProblemIndex];

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Warning Banner */}
      {warningMessage && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-3 px-6 text-center z-50 animate-pulse">
          ⚠️ {warningMessage}
        </div>
      )}

      {/* Header */}
      <div className="glass border-b border-gray-800 p-4">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gradient">{teamSession.sessionId.title}</h1>
            <div className="flex items-center gap-2">
              {editingTeamName ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Team:</span>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="bg-dark-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-neon-blue outline-none"
                    placeholder="Team name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTeamName();
                      if (e.key === 'Escape') handleCancelEditTeamName();
                    }}
                  />
                  <button
                    onClick={handleSaveTeamName}
                    disabled={savingTeamName || !newTeamName.trim()}
                    className="px-2 py-1 bg-neon-green/20 text-neon-green hover:bg-neon-green/30 rounded text-xs disabled:opacity-50"
                  >
                    {savingTeamName ? '...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEditTeamName}
                    className="px-2 py-1 bg-gray-600/20 text-gray-400 hover:bg-gray-600/30 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-sm text-gray-400">Team: {teamSession.teamId.name}</p>
                  <button
                    onClick={handleEditTeamName}
                    className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white rounded text-xs transition-all"
                    title="Edit team name"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-gray-400">Score</div>
              <div className="text-2xl font-bold text-neon-blue">
                {teamSession.totalScore} / {teamSession.maxScore}
              </div>
            </div>
            <button
              onClick={handleSubmitSession}
              className="px-4 py-2 bg-neon-green hover:bg-neon-green/80 text-dark-900 font-medium rounded-lg transition-all"
            >
              Submit Final
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto flex" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Problem Panel */}
        <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
          {/* Problem Tabs */}
          <div className="flex border-b border-gray-700 bg-dark-800">
            {teamSession.problemProgress.map((problem, index) => (
              <button
                key={problem._id}
                onClick={() => setCurrentProblemIndex(index)}
                className={`flex-1 px-4 py-3 text-sm font-medium border-r border-gray-700 transition-all ${
                  currentProblemIndex === index
                    ? 'bg-dark-900 text-neon-blue border-b-2 border-b-neon-blue'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                Problem {index + 1}
                {problem.status === 'passed' && ' ✓'}
              </button>
            ))}
          </div>

          {/* Problem Details */}
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">{currentProblem.problemId.title}</h2>
            <div className="mb-6">
              <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm">
                {currentProblem.problemId.difficulty}
              </span>
              <span className="ml-2 text-gray-400">Points: {currentProblem.problemId.points}</span>
            </div>
            <div
              className="prose prose-invert mb-6"
              dangerouslySetInnerHTML={{ __html: currentProblem.problemId.description }}
            />

            {/* Test Cases */}
            {currentProblem.problemId.testCases && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Sample Test Cases</h3>
                {currentProblem.problemId.testCases.slice(0, 2).map((tc: any, i: number) => (
                  <div key={i} className="mb-3 bg-gray-800 p-3 rounded">
                    <div className="text-sm text-gray-400">Input:</div>
                    <pre className="text-sm mb-2">{tc.input}</pre>
                    <div className="text-sm text-gray-400">Expected Output:</div>
                    <pre className="text-sm">{tc.expectedOutput}</pre>
                  </div>
                ))}
              </div>
            )}

            {/* Current Status */}
            <div className="bg-gray-800 p-4 rounded">
              <h3 className="text-lg font-semibold mb-2">Status</h3>
              <div className="space-y-2 text-sm">
                <div>
                  Status:{' '}
                  <span
                    className={
                      currentProblem.status === 'passed'
                        ? 'text-green-400'
                        : currentProblem.status === 'failed'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }
                  >
                    {currentProblem.status}
                  </span>
                </div>
                <div>
                  Tests Passed: {currentProblem.passedTests} / {currentProblem.totalTests}
                </div>
                <div>Score: {currentProblem.score} points</div>
              </div>
            </div>
          </div>
        </div>

        {/* Code Editor Panel */}
        <div className="flex-1 flex flex-col">
          {/* Editor Controls */}
          <div className="bg-dark-800 border-b border-gray-700 p-3 flex justify-between items-center">
            <div className="px-3 py-1 bg-dark-700 text-white rounded-lg border border-gray-600">
              Language: Python
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRunCode}
                disabled={executing}
                className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-lg disabled:opacity-50 transition-all"
              >
                {executing ? 'Running...' : 'Run Code'}
              </button>
              <button
                onClick={handleSubmitProblem}
                disabled={testResults.length === 0}
                className="px-4 py-2 bg-neon-green hover:bg-neon-green/80 text-dark-900 font-medium rounded-lg disabled:opacity-50 transition-all"
              >
                Submit
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            <Editor
              height="50%"
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Solution Explanation */}
          <div className="border-t border-gray-700 bg-dark-800 p-4">
            <h3 className="text-lg font-semibold mb-2 text-neon-blue">
              Solution Explanation
              <span className="text-gray-400 font-normal text-sm ml-2">(Markdown supported)</span>
            </h3>
            <p className="text-xs text-gray-400 mb-2">
              Explain your approach, algorithm choice, and any trade-offs you made.
            </p>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              placeholder="## My Approach&#10;I used a hash map to achieve O(n) time complexity...&#10;&#10;## Time Complexity: O(n)&#10;## Space Complexity: O(n)"
              className="w-full px-3 py-2 bg-dark-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-neon-blue outline-none font-mono text-sm transition-all"
            />
          </div>

          {/* Test Results */}
          <div className="h-[30%] border-t border-gray-700 overflow-y-auto bg-dark-800 p-4">
            <h3 className="text-lg font-semibold mb-2">Test Results</h3>
            {testResults.length === 0 ? (
              <p className="text-gray-400">Run your code to see test results</p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result: any, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded border ${
                      result.passed
                        ? 'bg-green-900 border-green-600'
                        : 'bg-red-900 border-red-600'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Test Case {index + 1}</span>
                      <span>{result.passed ? '✓ Passed' : '✗ Failed'}</span>
                    </div>
                    {!result.passed && (
                      <>
                        <div className="text-sm">
                          <div className="text-gray-300">Expected:</div>
                          <pre className="text-xs bg-gray-900 p-2 rounded mt-1">
                            {result.expectedOutput}
                          </pre>
                        </div>
                        <div className="text-sm mt-2">
                          <div className="text-gray-300">Got:</div>
                          <pre className="text-xs bg-gray-900 p-2 rounded mt-1">
                            {result.actualOutput}
                          </pre>
                        </div>
                      </>
                    )}
                    {result.error && (
                      <div className="text-sm mt-2">
                        <div className="text-red-300">Error:</div>
                        <pre className="text-xs bg-gray-900 p-2 rounded mt-1">{result.error}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
