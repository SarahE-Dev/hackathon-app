import { useCallback, useEffect, useRef, useState } from 'react';

export interface ProctoringEvent {
  type: 
    | 'copy' 
    | 'paste' 
    | 'tab-switch'      // User switched to another tab
    | 'tab-return'      // User returned to the tab
    | 'window-blur'     // Window lost focus (switched to another app)
    | 'window-focus'    // Window regained focus
    | 'right-click' 
    | 'keyboard-shortcut'
    | 'code-change' 
    | 'external-paste'  // Paste that doesn't match recent copies
    | 'fullscreen-exit' // Exited fullscreen mode
    | 'fullscreen-enter'
    | 'mouse-leave'     // Mouse left the browser window
    | 'devtools-open'   // Developer tools detected
    | 'resize'          // Browser window was resized
    | 'print-attempt'   // User tried to print
    | 'screenshot-attempt' // Detected screenshot shortcut
    | 'idle-detected'   // User was idle for extended period
    | 'rapid-paste'     // Multiple pastes in quick succession
    | 'large-deletion'  // Large amount of code deleted at once
    | 'session-start'   // Session started
    | 'session-end';    // Session ended
  timestamp: Date;
  metadata?: {
    textLength?: number;
    text?: string;
    keys?: string;
    fromExternal?: boolean;
    changeType?: 'insert' | 'delete' | 'replace';
    linesChanged?: number;
    duration?: number;      // For tab-switch, how long they were away
    windowSize?: { width: number; height: number };
    screenSize?: { width: number; height: number };
    isFullscreen?: boolean;
    visibilityState?: string;
  };
}

export interface ProctoringStats {
  // Copy/paste tracking
  copyCount: number;
  pasteCount: number;
  externalPasteCount: number;
  largestPaste: number;
  rapidPasteCount: number;      // Multiple pastes within 5 seconds
  
  // Focus/attention tracking
  tabSwitchCount: number;
  tabSwitchDuration: number;    // Total time spent on other tabs (ms)
  windowBlurCount: number;
  windowBlurDuration: number;   // Total time with window unfocused (ms)
  mouseLeaveCount: number;
  
  // Suspicious activity
  suspiciousShortcuts: number;
  rightClickCount: number;
  devtoolsOpenCount: number;
  fullscreenExitCount: number;
  printAttempts: number;
  screenshotAttempts: number;
  
  // Timing metrics
  totalTimeSpent: number;
  activeTypingTime: number;
  idleTime: number;
  longestIdlePeriod: number;
  avgTypingSpeed: number;
  
  // Code metrics
  totalCharsTyped: number;
  totalCharsDeleted: number;
  largestDeletion: number;
  
  // Analysis
  suspiciousPatterns: string[];
  riskScore: number;            // 0-100, higher = more suspicious
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface UseProctoringOptions {
  enabled?: boolean;
  onEvent?: (event: ProctoringEvent) => void;
}

// Shortcuts that indicate potential cheating
const SUSPICIOUS_SHORTCUTS = [
  'ctrl+v', 'cmd+v',           // Paste
  'ctrl+shift+v', 'cmd+shift+v', // Paste without formatting
  'ctrl+c', 'cmd+c',           // Copy (tracking)
  'ctrl+a', 'cmd+a',           // Select all
  'ctrl+shift+i', 'cmd+option+i', // DevTools
  'f12',                       // DevTools
  'ctrl+shift+j', 'cmd+option+j', // Console
  'ctrl+p', 'cmd+p',           // Print
  'ctrl+s', 'cmd+s',           // Save
  'printscreen', 'cmd+shift+3', 'cmd+shift+4', // Screenshot
];

const IDLE_THRESHOLD_MS = 30000; // 30 seconds of no activity = idle
const RAPID_PASTE_THRESHOLD_MS = 5000; // Multiple pastes within 5 seconds
const SNAPSHOT_INTERVAL_MS = 60000; // Take code snapshot every minute

export function useProctoring(options: UseProctoringOptions = {}) {
  const { enabled = true, onEvent } = options;
  
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [stats, setStats] = useState<ProctoringStats>({
    // Copy/paste
    copyCount: 0,
    pasteCount: 0,
    externalPasteCount: 0,
    largestPaste: 0,
    rapidPasteCount: 0,
    
    // Focus/attention
    tabSwitchCount: 0,
    tabSwitchDuration: 0,
    windowBlurCount: 0,
    windowBlurDuration: 0,
    mouseLeaveCount: 0,
    
    // Suspicious activity
    suspiciousShortcuts: 0,
    rightClickCount: 0,
    devtoolsOpenCount: 0,
    fullscreenExitCount: 0,
    printAttempts: 0,
    screenshotAttempts: 0,
    
    // Timing
    totalTimeSpent: 0,
    activeTypingTime: 0,
    idleTime: 0,
    longestIdlePeriod: 0,
    avgTypingSpeed: 0,
    
    // Code metrics
    totalCharsTyped: 0,
    totalCharsDeleted: 0,
    largestDeletion: 0,
    
    // Analysis
    suspiciousPatterns: [],
    riskScore: 0,
    riskLevel: 'low',
  });
  
  const startTimeRef = useRef<number>(Date.now());
  const lastActivityRef = useRef<number>(Date.now());
  const recentCopiesRef = useRef<string[]>([]);
  const totalCharsTypedRef = useRef<number>(0);
  const totalCharsDeletedRef = useRef<number>(0);
  const typingStartRef = useRef<number | null>(null);
  const codeSnapshotsRef = useRef<Array<{ code: string; timestamp: Date; charCount: number }>>([]);
  
  // Track focus/blur timing
  const tabSwitchStartRef = useRef<number | null>(null);
  const windowBlurStartRef = useRef<number | null>(null);
  const lastPasteTimeRef = useRef<number>(0);
  const rapidPasteCountRef = useRef<number>(0);
  const idleStartRef = useRef<number | null>(null);
  const longestIdleRef = useRef<number>(0);
  
  // DevTools detection
  const devToolsOpenRef = useRef<boolean>(false);
  
  // Add event and update stats
  const addEvent = useCallback((event: ProctoringEvent) => {
    if (!enabled) return;
    
    setEvents(prev => [...prev, event]);
    onEvent?.(event);
    
    // Update stats based on event type
    setStats(prev => {
      const newStats = { ...prev };
      const now = Date.now();
      
      switch (event.type) {
        case 'copy':
          newStats.copyCount++;
          // Store recent copies to detect external pastes
          if (event.metadata?.text) {
            recentCopiesRef.current.push(event.metadata.text);
            // Keep only last 10 copies
            if (recentCopiesRef.current.length > 10) {
              recentCopiesRef.current.shift();
            }
          }
          break;
          
        case 'paste':
          newStats.pasteCount++;
          if (event.metadata?.textLength) {
            newStats.largestPaste = Math.max(newStats.largestPaste, event.metadata.textLength);
          }
          // Check for rapid paste
          if (now - lastPasteTimeRef.current < RAPID_PASTE_THRESHOLD_MS) {
            rapidPasteCountRef.current++;
            newStats.rapidPasteCount = rapidPasteCountRef.current;
            if (rapidPasteCountRef.current > 3) {
              if (!newStats.suspiciousPatterns.includes('Rapid successive pastes')) {
                newStats.suspiciousPatterns.push('Rapid successive pastes');
              }
            }
          } else {
            rapidPasteCountRef.current = 0;
          }
          lastPasteTimeRef.current = now;
          break;
          
        case 'external-paste':
          newStats.externalPasteCount++;
          newStats.pasteCount++;
          if (event.metadata?.textLength) {
            newStats.largestPaste = Math.max(newStats.largestPaste, event.metadata.textLength);
            // Large external pastes are very suspicious
            if (event.metadata.textLength > 100) {
              if (!newStats.suspiciousPatterns.includes('Large external paste detected')) {
                newStats.suspiciousPatterns.push('Large external paste detected');
              }
            }
            if (event.metadata.textLength > 500) {
              if (!newStats.suspiciousPatterns.includes('Very large code paste (500+ chars)')) {
                newStats.suspiciousPatterns.push('Very large code paste (500+ chars)');
              }
            }
          }
          break;
          
        case 'tab-switch':
          newStats.tabSwitchCount++;
          tabSwitchStartRef.current = now;
          if (newStats.tabSwitchCount > 10) {
            if (!newStats.suspiciousPatterns.includes('Excessive tab switching (10+)')) {
              newStats.suspiciousPatterns.push('Excessive tab switching (10+)');
            }
          }
          if (newStats.tabSwitchCount > 20) {
            if (!newStats.suspiciousPatterns.includes('Extreme tab switching (20+)')) {
              newStats.suspiciousPatterns.push('Extreme tab switching (20+)');
            }
          }
          break;
          
        case 'tab-return':
          if (tabSwitchStartRef.current) {
            const duration = now - tabSwitchStartRef.current;
            newStats.tabSwitchDuration += duration;
            tabSwitchStartRef.current = null;
            
            // Long time away is suspicious
            if (duration > 60000) { // More than 1 minute away
              if (!newStats.suspiciousPatterns.includes('Extended time on other tabs (1+ min)')) {
                newStats.suspiciousPatterns.push('Extended time on other tabs (1+ min)');
              }
            }
          }
          break;
          
        case 'window-blur':
          newStats.windowBlurCount++;
          windowBlurStartRef.current = now;
          break;
          
        case 'window-focus':
          if (windowBlurStartRef.current) {
            const duration = now - windowBlurStartRef.current;
            newStats.windowBlurDuration += duration;
            windowBlurStartRef.current = null;
          }
          break;
          
        case 'mouse-leave':
          newStats.mouseLeaveCount++;
          break;
          
        case 'right-click':
          newStats.rightClickCount++;
          if (newStats.rightClickCount > 5) {
            if (!newStats.suspiciousPatterns.includes('Frequent right-click usage')) {
              newStats.suspiciousPatterns.push('Frequent right-click usage');
            }
          }
          break;
          
        case 'devtools-open':
          newStats.devtoolsOpenCount++;
          if (!newStats.suspiciousPatterns.includes('Developer tools opened')) {
            newStats.suspiciousPatterns.push('Developer tools opened');
          }
          break;
          
        case 'fullscreen-exit':
          newStats.fullscreenExitCount++;
          break;
          
        case 'print-attempt':
          newStats.printAttempts++;
          if (!newStats.suspiciousPatterns.includes('Print attempt detected')) {
            newStats.suspiciousPatterns.push('Print attempt detected');
          }
          break;
          
        case 'screenshot-attempt':
          newStats.screenshotAttempts++;
          if (!newStats.suspiciousPatterns.includes('Screenshot attempt detected')) {
            newStats.suspiciousPatterns.push('Screenshot attempt detected');
          }
          break;
          
        case 'keyboard-shortcut':
          const keys = event.metadata?.keys?.toLowerCase() || '';
          if (SUSPICIOUS_SHORTCUTS.some(s => keys.includes(s.replace('+', '')))) {
            newStats.suspiciousShortcuts++;
          }
          // Detect specific shortcuts
          if (keys.includes('printscreen') || keys.includes('shift+3') || keys.includes('shift+4')) {
            newStats.screenshotAttempts++;
          }
          if (keys.includes('f12') || keys.includes('shift+i') || keys.includes('option+i')) {
            newStats.devtoolsOpenCount++;
          }
          break;
          
        case 'large-deletion':
          if (event.metadata?.textLength) {
            newStats.largestDeletion = Math.max(newStats.largestDeletion, event.metadata.textLength);
            newStats.totalCharsDeleted += event.metadata.textLength;
            if (event.metadata.textLength > 200) {
              if (!newStats.suspiciousPatterns.includes('Large code deletion (200+ chars)')) {
                newStats.suspiciousPatterns.push('Large code deletion (200+ chars)');
              }
            }
          }
          break;
          
        case 'idle-detected':
          if (event.metadata?.duration) {
            newStats.idleTime += event.metadata.duration;
            newStats.longestIdlePeriod = Math.max(newStats.longestIdlePeriod, event.metadata.duration);
          }
          break;
      }
      
      // Calculate risk score and level
      newStats.riskScore = calculateRiskScore(newStats);
      newStats.riskLevel = getRiskLevel(newStats.riskScore);
      
      return newStats;
    });
    
    lastActivityRef.current = Date.now();
  }, [enabled, onEvent]);
  
  // Track copy events
  const handleCopy = useCallback((e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text') || window.getSelection()?.toString() || '';
    addEvent({
      type: 'copy',
      timestamp: new Date(),
      metadata: {
        textLength: text.length,
        text: text.substring(0, 100), // Only store first 100 chars
      },
    });
  }, [addEvent]);
  
  // Track paste events and detect external pastes
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text') || '';
    const isExternal = !recentCopiesRef.current.some(
      copied => text.includes(copied) || copied.includes(text)
    );
    
    addEvent({
      type: isExternal ? 'external-paste' : 'paste',
      timestamp: new Date(),
      metadata: {
        textLength: text.length,
        text: text.substring(0, 100),
        fromExternal: isExternal,
      },
    });
  }, [addEvent]);
  
  // Track tab visibility changes
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      addEvent({
        type: 'tab-switch',
        timestamp: new Date(),
        metadata: { visibilityState: document.visibilityState },
      });
    } else {
      addEvent({
        type: 'tab-return',
        timestamp: new Date(),
        metadata: { visibilityState: document.visibilityState },
      });
    }
  }, [addEvent]);
  
  // Track window blur (switching to another app)
  const handleWindowBlur = useCallback(() => {
    addEvent({
      type: 'window-blur',
      timestamp: new Date(),
    });
  }, [addEvent]);
  
  // Track window focus (returning to app)
  const handleWindowFocus = useCallback(() => {
    addEvent({
      type: 'window-focus',
      timestamp: new Date(),
    });
  }, [addEvent]);
  
  // Track mouse leaving the window
  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only track if mouse actually left the viewport
    if (e.clientY <= 0 || e.clientX <= 0 || 
        e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      addEvent({
        type: 'mouse-leave',
        timestamp: new Date(),
      });
    }
  }, [addEvent]);
  
  // Track right clicks
  const handleContextMenu = useCallback((e: MouseEvent) => {
    addEvent({
      type: 'right-click',
      timestamp: new Date(),
    });
  }, [addEvent]);
  
  // Track window resize (might indicate copying to another window)
  const handleResize = useCallback(() => {
    addEvent({
      type: 'resize',
      timestamp: new Date(),
      metadata: {
        windowSize: { width: window.innerWidth, height: window.innerHeight },
        screenSize: { width: window.screen.width, height: window.screen.height },
      },
    });
  }, [addEvent]);
  
  // Track fullscreen changes
  const handleFullscreenChange = useCallback(() => {
    const isFullscreen = !!document.fullscreenElement;
    addEvent({
      type: isFullscreen ? 'fullscreen-enter' : 'fullscreen-exit',
      timestamp: new Date(),
      metadata: { isFullscreen },
    });
  }, [addEvent]);
  
  // Track print attempts
  const handleBeforePrint = useCallback(() => {
    addEvent({
      type: 'print-attempt',
      timestamp: new Date(),
    });
  }, [addEvent]);
  
  // Track suspicious keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    const key = e.key.toLowerCase();
    
    // Build key combination string
    let keys = '';
    if (e.ctrlKey) keys += 'ctrl+';
    if (e.metaKey) keys += 'cmd+';
    if (e.altKey) keys += 'alt+';
    if (e.shiftKey) keys += 'shift+';
    keys += key;
    
    // Track all modifier key combinations
    if (modifier || e.altKey) {
      addEvent({
        type: 'keyboard-shortcut',
        timestamp: new Date(),
        metadata: { keys },
      });
      
      // Detect specific suspicious shortcuts
      if (key === 'p' && modifier) {
        addEvent({
          type: 'print-attempt',
          timestamp: new Date(),
          metadata: { keys },
        });
      }
      
      // Screenshot shortcuts
      if (key === 'printscreen' || 
          (isMac && e.shiftKey && (key === '3' || key === '4' || key === '5'))) {
        addEvent({
          type: 'screenshot-attempt',
          timestamp: new Date(),
          metadata: { keys },
        });
      }
      
      // DevTools shortcuts
      if (key === 'f12' || 
          (modifier && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
          (isMac && e.altKey && (key === 'i' || key === 'j' || key === 'c'))) {
        addEvent({
          type: 'devtools-open',
          timestamp: new Date(),
          metadata: { keys },
        });
      }
    }
    
    // Update typing activity
    lastActivityRef.current = Date.now();
    if (!typingStartRef.current) {
      typingStartRef.current = Date.now();
    }
    
    // Reset idle tracking
    if (idleStartRef.current) {
      const idleDuration = Date.now() - idleStartRef.current;
      if (idleDuration > IDLE_THRESHOLD_MS) {
        addEvent({
          type: 'idle-detected',
          timestamp: new Date(),
          metadata: { duration: idleDuration },
        });
      }
      idleStartRef.current = null;
    }
  }, [addEvent]);
  
  // Track code changes (called from editor onChange)
  const trackCodeChange = useCallback((
    changeType: 'insert' | 'delete' | 'replace',
    charsChanged: number,
    linesChanged: number = 1
  ) => {
    if (!enabled) return;
    
    if (changeType === 'insert' || changeType === 'replace') {
      totalCharsTypedRef.current += charsChanged;
    }
    
    if (changeType === 'delete') {
      totalCharsDeletedRef.current += charsChanged;
      
      // Track large deletions as potentially suspicious
      if (charsChanged > 100) {
        addEvent({
          type: 'large-deletion',
          timestamp: new Date(),
          metadata: {
            changeType,
            textLength: charsChanged,
            linesChanged,
          },
        });
      }
    }
    
    // Only log significant changes
    if (charsChanged > 50 || linesChanged > 3) {
      addEvent({
        type: 'code-change',
        timestamp: new Date(),
        metadata: {
          changeType,
          textLength: charsChanged,
          linesChanged,
        },
      });
    }
    
    lastActivityRef.current = Date.now();
    
    // Reset idle tracking on activity
    if (idleStartRef.current) {
      idleStartRef.current = null;
    }
  }, [enabled, addEvent]);
  
  // Take code snapshot
  const takeSnapshot = useCallback((code: string) => {
    codeSnapshotsRef.current.push({
      code: code.substring(0, 5000), // Limit snapshot size
      timestamp: new Date(),
      charCount: code.length,
    });
    
    // Keep only last 20 snapshots
    if (codeSnapshotsRef.current.length > 20) {
      codeSnapshotsRef.current.shift();
    }
  }, []);
  
  // Get final stats (call before submission)
  const getFinalStats = useCallback(() => {
    const now = Date.now();
    const totalTime = now - startTimeRef.current;
    
    // Calculate typing time and speed
    const typingTime = typingStartRef.current 
      ? now - typingStartRef.current 
      : 0;
    const avgSpeed = typingTime > 0 
      ? (totalCharsTypedRef.current / (typingTime / 60000)) 
      : 0;
    
    // Add any remaining tab switch or blur duration
    let finalTabSwitchDuration = stats.tabSwitchDuration;
    let finalWindowBlurDuration = stats.windowBlurDuration;
    
    if (tabSwitchStartRef.current) {
      finalTabSwitchDuration += now - tabSwitchStartRef.current;
    }
    if (windowBlurStartRef.current) {
      finalWindowBlurDuration += now - windowBlurStartRef.current;
    }
    
    const finalStats: ProctoringStats = {
      ...stats,
      totalTimeSpent: totalTime,
      activeTypingTime: typingTime,
      idleTime: Math.max(0, totalTime - typingTime),
      avgTypingSpeed: Math.round(avgSpeed),
      tabSwitchDuration: finalTabSwitchDuration,
      windowBlurDuration: finalWindowBlurDuration,
      totalCharsTyped: totalCharsTypedRef.current,
      totalCharsDeleted: totalCharsDeletedRef.current,
    };
    
    // Recalculate risk score with final data
    finalStats.riskScore = calculateRiskScore(finalStats);
    finalStats.riskLevel = getRiskLevel(finalStats.riskScore);
    
    // Add session end event
    addEvent({
      type: 'session-end',
      timestamp: new Date(),
      metadata: {
        duration: totalTime,
      },
    });
    
    return {
      events,
      stats: finalStats,
      codeSnapshots: codeSnapshotsRef.current,
    };
  }, [events, stats, addEvent]);
  
  // Reset proctoring (for new problem)
  const reset = useCallback(() => {
    setEvents([]);
    setStats({
      copyCount: 0,
      pasteCount: 0,
      externalPasteCount: 0,
      largestPaste: 0,
      rapidPasteCount: 0,
      tabSwitchCount: 0,
      tabSwitchDuration: 0,
      windowBlurCount: 0,
      windowBlurDuration: 0,
      mouseLeaveCount: 0,
      suspiciousShortcuts: 0,
      rightClickCount: 0,
      devtoolsOpenCount: 0,
      fullscreenExitCount: 0,
      printAttempts: 0,
      screenshotAttempts: 0,
      totalTimeSpent: 0,
      activeTypingTime: 0,
      idleTime: 0,
      longestIdlePeriod: 0,
      avgTypingSpeed: 0,
      totalCharsTyped: 0,
      totalCharsDeleted: 0,
      largestDeletion: 0,
      suspiciousPatterns: [],
      riskScore: 0,
      riskLevel: 'low',
    });
    startTimeRef.current = Date.now();
    lastActivityRef.current = Date.now();
    recentCopiesRef.current = [];
    totalCharsTypedRef.current = 0;
    totalCharsDeletedRef.current = 0;
    typingStartRef.current = null;
    codeSnapshotsRef.current = [];
    tabSwitchStartRef.current = null;
    windowBlurStartRef.current = null;
    lastPasteTimeRef.current = 0;
    rapidPasteCountRef.current = 0;
    idleStartRef.current = null;
    longestIdleRef.current = 0;
    sessionStartedRef.current = false; // Allow new session start after reset
  }, []);
  
  // Track if session has started
  const sessionStartedRef = useRef(false);
  
  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;
    
    // Log session start only once
    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true;
      setEvents(prev => [...prev, {
        type: 'session-start',
        timestamp: new Date(),
        metadata: {
          windowSize: { width: window.innerWidth, height: window.innerHeight },
          screenSize: { width: window.screen.width, height: window.screen.height },
        },
      }]);
    }
    
    // Clipboard events
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    // Visibility and focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    // Mouse events
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    // Keyboard events
    document.addEventListener('keydown', handleKeyDown);

    // Window events
    window.addEventListener('resize', handleResize);
    window.addEventListener('beforeprint', handleBeforePrint);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // DevTools detection via window size change (common technique)
    let devToolsCheckInterval: NodeJS.Timeout;
    const threshold = 160; // Typical DevTools minimum width
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if ((widthThreshold || heightThreshold) && !devToolsOpenRef.current) {
        devToolsOpenRef.current = true;
        addEvent({
          type: 'devtools-open',
          timestamp: new Date(),
        });
      } else if (!widthThreshold && !heightThreshold) {
        devToolsOpenRef.current = false;
      }
    };
    devToolsCheckInterval = setInterval(checkDevTools, 1000);
    
    // Idle detection
    const idleCheckInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > IDLE_THRESHOLD_MS && !idleStartRef.current) {
        idleStartRef.current = lastActivityRef.current;
      }
    }, 10000);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeprint', handleBeforePrint);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearInterval(devToolsCheckInterval);
      clearInterval(idleCheckInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  
  return {
    events,
    stats,
    trackCodeChange,
    takeSnapshot,
    getFinalStats,
    reset,
  };
}

// Calculate risk score based on suspicious activity
function calculateRiskScore(stats: ProctoringStats): number {
  let score = 0;
  
  // === COPY/PASTE RISKS ===
  // External pastes are very suspicious (code copied from outside)
  score += stats.externalPasteCount * 15;
  
  // Large pastes indicate potential copying
  if (stats.largestPaste > 500) score += 25;
  else if (stats.largestPaste > 200) score += 15;
  else if (stats.largestPaste > 100) score += 8;
  else if (stats.largestPaste > 50) score += 3;
  
  // Rapid successive pastes
  if (stats.rapidPasteCount > 5) score += 15;
  else if (stats.rapidPasteCount > 3) score += 8;
  
  // === FOCUS/ATTENTION RISKS ===
  // Excessive tab switching
  if (stats.tabSwitchCount > 30) score += 25;
  else if (stats.tabSwitchCount > 20) score += 15;
  else if (stats.tabSwitchCount > 10) score += 8;
  else if (stats.tabSwitchCount > 5) score += 3;
  
  // Time spent on other tabs (very suspicious if > 5 minutes total)
  if (stats.tabSwitchDuration > 300000) score += 20;
  else if (stats.tabSwitchDuration > 120000) score += 12;
  else if (stats.tabSwitchDuration > 60000) score += 5;
  
  // Window blur events
  if (stats.windowBlurCount > 20) score += 15;
  else if (stats.windowBlurCount > 10) score += 8;
  else if (stats.windowBlurCount > 5) score += 3;
  
  // Mouse leaving window frequently
  if (stats.mouseLeaveCount > 20) score += 10;
  else if (stats.mouseLeaveCount > 10) score += 5;
  
  // === SUSPICIOUS TOOLS ===
  // DevTools opened
  score += stats.devtoolsOpenCount * 20;
  
  // Print attempts
  score += stats.printAttempts * 15;
  
  // Screenshot attempts
  score += stats.screenshotAttempts * 15;
  
  // Right-click usage (potential copying)
  if (stats.rightClickCount > 10) score += 8;
  else if (stats.rightClickCount > 5) score += 3;
  
  // === CODE BEHAVIOR ===
  // Large deletions followed by large pastes = replace with copied code
  if (stats.largestDeletion > 100 && stats.largestPaste > 100) {
    score += 15;
  }
  
  // Very fast "typing" with large pastes = likely copied
  if (stats.avgTypingSpeed > 500 && stats.largestPaste > 100) {
    score += 20;
  }
  
  // Ratio of deleted to typed (high delete ratio could mean pasting over)
  if (stats.totalCharsTyped > 0) {
    const deleteRatio = stats.totalCharsDeleted / stats.totalCharsTyped;
    if (deleteRatio > 2) score += 10;
  }
  
  // === IDLE TIME ===
  // Long idle periods (might be researching elsewhere)
  if (stats.longestIdlePeriod > 300000) score += 10; // 5+ minutes
  else if (stats.longestIdlePeriod > 180000) score += 5; // 3+ minutes
  
  // === PATTERN BONUS ===
  // Each detected suspicious pattern adds to score
  score += stats.suspiciousPatterns.length * 5;
  
  // Cap at 100
  return Math.min(100, Math.round(score));
}

// Get risk level from score
function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}
