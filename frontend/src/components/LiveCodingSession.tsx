'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ProctorEvent {
  type: 'tab-switch' | 'copy-paste' | 'focus-lost' | 'suspicious-activity';
  timestamp: Date;
  details: string;
}

interface LiveCodingSessionProps {
  teamId: string;
  problemTitle: string;
}

export default function LiveCodingSession({
  teamId,
  problemTitle,
}: LiveCodingSessionProps) {
  const [code, setCode] = useState('// Start coding here\n');
  const [proctorEvents, setProctorEvents] = useState<ProctorEvent[]>([]);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [copyPasteAttempts, setCopyPasteAttempts] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [focusLosses, setFocusLosses] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
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
      {/* Code Editor */}
      <div className="lg:col-span-3">
        <div className="glass rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{problemTitle}</h3>
              <p className="text-gray-400 text-sm">Team: {teamId}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono text-neon-blue font-bold">
                {formatTime(sessionTimer)}
              </div>
              <p className="text-xs text-gray-400">Session Duration</p>
            </div>
          </div>

          {/* Code Editor */}
          <div className="bg-dark-800 rounded-lg border border-gray-700 p-4 mb-4">
            <div className="bg-dark-900 rounded font-mono text-sm mb-2">
              <textarea
                ref={codeEditorRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-96 bg-transparent text-gray-300 p-4 resize-none outline-none font-mono"
                placeholder="// Start typing your code here..."
              />
            </div>
            <div className="text-xs text-gray-500">
              Lines: {code.split('\n').length} | Characters: {code.length}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button className="flex-1 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg font-medium hover:shadow-lg hover:shadow-neon-blue/50 transition-all">
              ▶ Run Code
            </button>
            <button className="flex-1 py-3 bg-dark-700 border border-gray-600 text-white rounded-lg font-medium hover:border-neon-blue transition-all">
              💾 Save Progress
            </button>
            <button className="flex-1 py-3 bg-dark-700 border border-gray-600 text-white rounded-lg font-medium hover:border-neon-green transition-all">
              ✓ Submit Solution
            </button>
          </div>

          {/* Test Output */}
          <div className="mt-6 bg-dark-800 rounded-lg border border-gray-700 p-4">
            <h4 className="text-sm font-bold text-gray-400 mb-2">Test Results</h4>
            <pre className="text-xs text-gray-400 overflow-auto max-h-32">
              {`Test Case 1: PASSED
Test Case 2: PENDING
Test Case 3: PENDING

Ready to run tests...`}
            </pre>
          </div>
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
