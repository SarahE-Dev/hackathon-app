'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import LiveCodingSession from '@/components/LiveCodingSession';
import { teamsAPI, hackathonSessionsAPI, questionsAPI, teamSubmissionsAPI } from '@/lib/api';

interface TeamMember {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Team {
  _id: string;
  name: string;
  projectTitle: string;
  description: string;
  memberIds: TeamMember[];
  track?: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  projectExplanation?: string;
  technicalApproach?: string;
  challengesOvercome?: string;
  submittedAt?: string;
  disqualified: boolean;
}

interface Problem {
  _id: string;
  title: string;
  difficulty: string;
  points: number;
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
}

interface MemberStatus {
  odId: string;
  odStatus: 'offline' | 'in-team-space' | 'live-coding';
  odProblemTitle?: string;
}

const isDevelopment = process.env.NODE_ENV === 'development';

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'code'>('overview');
  const [memberStatuses, setMemberStatuses] = useState<Map<string, MemberStatus>>(new Map());
  const [confirmProblem, setConfirmProblem] = useState<Problem | null>(null);
  const [confirmLeaveTab, setConfirmLeaveTab] = useState<'overview' | 'problems' | 'code' | null>(null);
  const [presenceSocket, setPresenceSocket] = useState<Socket | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showForceLeaveModal, setShowForceLeaveModal] = useState(false);
  const [forceLeaveMessage, setForceLeaveMessage] = useState('');
  
  // Refs to track current state for socket reconnection
  const activeTabRef = useRef(activeTab);
  const selectedProblemRef = useRef(selectedProblem);
  
  // Keep refs in sync with state
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  
  useEffect(() => {
    selectedProblemRef.current = selectedProblem;
  }, [selectedProblem]);
  
  // Problem progress tracking at TEAM level (fetched from backend)
  // 'not-started' | 'in-progress' | 'completed'
  const [problemProgress, setProblemProgress] = useState<Map<string, 'not-started' | 'in-progress' | 'completed'>>(new Map());
  const [loadingProgress, setLoadingProgress] = useState(true);
  
  // Team can only work on ONE problem at a time - track the active problem ID
  const [teamActiveProblemId, setTeamActiveProblemId] = useState<string | null>(null);

  // Fetch team's problem progress from backend submissions
  const loadTeamProgress = useCallback(async () => {
    if (!teamId || !activeSessionId) return;
    
    try {
      // Get problem statuses from backend (persisted per team/session)
      const response = await teamSubmissionsAPI.getProblemStatuses(teamId, activeSessionId);
      const statuses = response?.data?.statuses || {};
      
      console.log('📊 Loaded team problem statuses:', statuses);
      
      const progressMap = new Map<string, 'not-started' | 'in-progress' | 'completed'>();
      let activeProblem: string | null = null;
      
      // Convert the statuses object to a Map
      Object.entries(statuses).forEach(([problemId, status]) => {
        progressMap.set(problemId, status as 'not-started' | 'in-progress' | 'completed');
        if (status === 'in-progress') {
          activeProblem = problemId; // Track the active problem
        }
      });
      
      setProblemProgress(progressMap);
      setTeamActiveProblemId(activeProblem);
      
      console.log('  Progress map:', progressMap);
      console.log('  Active problem:', activeProblem);
      
      // If there's an active problem, auto-select it for this user
      if (activeProblem && problems.length > 0) {
        const activeProblemObj = problems.find(p => p._id === activeProblem);
        if (activeProblemObj && !selectedProblem) {
          console.log('  Auto-selecting active problem:', activeProblemObj.title);
          setSelectedProblem(activeProblemObj);
        }
      }
    } catch (error) {
      console.error('Error loading team progress:', error);
    } finally {
      setLoadingProgress(false);
    }
  }, [teamId, activeSessionId, problems, selectedProblem]);

  // Load progress when session is available
  useEffect(() => {
    if (activeSessionId) {
      loadTeamProgress();
    }
  }, [activeSessionId, loadTeamProgress]);

  // Mark problem as in-progress (called when team member opens it)
  const markProblemAsStarted = useCallback(async (problemId: string) => {
    console.log('📝 Marking problem as started:', problemId);
    setProblemProgress(prev => {
      const currentStatus = prev.get(problemId);
      console.log('  Current status:', currentStatus);
      // Only update if not already completed
      if (currentStatus !== 'completed') {
        const updated = new Map(prev);
        updated.set(problemId, 'in-progress');
        console.log('  ✅ Set to in-progress');
        return updated;
      }
      return prev;
    });
    setTeamActiveProblemId(problemId); // This is now the team's active problem
    
    // Persist to backend
    if (teamId && activeSessionId) {
      try {
        await teamSubmissionsAPI.updateProblemStatus(teamId, activeSessionId, problemId, 'in-progress');
        console.log('  ✅ Persisted to backend');
      } catch (error) {
        console.error('  ⚠️ Failed to persist status:', error);
      }
    }
    
    // Broadcast to team that this problem is now in progress
    if (presenceSocket?.connected) {
      console.log('  📡 Broadcasting problem-started to team');
      presenceSocket.emit('problem-started', { problemId });
    } else {
      console.log('  ⚠️ Socket not connected, cannot broadcast');
    }
  }, [presenceSocket, teamId, activeSessionId]);

  // Mark problem as completed (called after successful submission)
  const markProblemAsCompleted = useCallback(async (problemId: string) => {
    setProblemProgress(prev => {
      const updated = new Map(prev);
      updated.set(problemId, 'completed');
      return updated;
    });
    setTeamActiveProblemId(null); // No more active problem - team can pick a new one
    setSelectedProblem(null);
    
    // Persist to backend
    if (teamId && activeSessionId) {
      try {
        await teamSubmissionsAPI.updateProblemStatus(teamId, activeSessionId, problemId, 'completed');
        console.log('✅ Persisted problem completion to backend');
      } catch (error) {
        console.error('⚠️ Failed to persist completion:', error);
      }
    }
    
    // Broadcast to team that this problem is now completed
    if (presenceSocket?.connected) {
      presenceSocket.emit('problem-completed', { problemId });
    }
  }, [presenceSocket, teamId, activeSessionId]);

  // Dev reset function - clears backend submissions and reloads progress
  const handleDevReset = async () => {
    if (!confirm('DEV RESET: This will clear ALL data for your team:\n\n• All code submissions\n• All explanations\n• All judge reviews & scores\n• All test results\n• Problem completion status\n\nThis cannot be undone. Continue?')) {
      return;
    }
    
    // Clear backend submissions if we have an active session
    if (activeSessionId) {
      try {
        const result = await teamSubmissionsAPI.devReset(teamId, activeSessionId);
        console.log('DEV RESET: Cleared submissions:', result);
        
        // Clear local state
        setProblemProgress(new Map());
        setTeamActiveProblemId(null); // Reset active problem
        setSelectedProblem(null);
        setConfirmProblem(null);
        setActiveTab('problems');
        
        // Broadcast to other team members that everything is reset
        if (presenceSocket?.connected) {
          presenceSocket.emit('dev-reset', {});
        }
        
        // Reload progress from backend (should be empty now)
        await loadTeamProgress();
        
        alert(`✅ DEV RESET complete!\n\nCleared ${result.deletedCount} submissions (including code, explanations, and judge reviews).\n\nYour team can now start fresh.`);
      } catch (error) {
        console.error('Failed to clear backend submissions:', error);
        alert('Failed to clear team submissions.');
      }
    } else {
      alert('No active session found.');
    }
  };

  // Handle tab change - team collaboration mode allows free navigation
  const handleTabChange = (newTab: 'overview' | 'problems' | 'code') => {
    setActiveTab(newTab);
    // Don't clear selected problem when switching tabs - allows returning to it
  };

  // Legacy: confirmLeaveCodeTab (no longer needed in team mode, but keep for compatibility)
  const confirmLeaveCodeTab = () => {
    if (confirmLeaveTab) {
      setActiveTab(confirmLeaveTab);
      setConfirmLeaveTab(null);
    }
  };

  // Handle member status updates from LiveCodingSession (for live-coding status)
  const handleMemberStatusUpdate = useCallback((statuses: Array<{ odId: string; odStatus: 'offline' | 'in-team-space' | 'live-coding'; odProblemTitle?: string }>) => {
    setMemberStatuses(prev => {
      const updated = new Map(prev);
      statuses.forEach(s => {
        updated.set(s.odId, s);
      });
      return updated;
    });
  }, []);

  // Single shared socket connection for the entire team page
  // This socket is shared with LiveCodingSession to avoid connection conflicts
  const [socketConnected, setSocketConnected] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !teamId) return;

    // Parse user ID from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUserIdRef.current = payload.userId;
    } catch (e) {
      console.error('Failed to parse token:', e);
    }

    const socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}`, {
      auth: { token },
      path: '/collaboration',
      // Prevent multiple connections
      forceNew: false,
      multiplex: true,
    });

    socket.on('connect', () => {
      console.log('Team page: Connected to collaboration server');
      setSocketConnected(true);
      socket.emit('join-team', teamId);
      
      // Emit status based on current tab/problem state (important for reconnection)
      if (activeTabRef.current === 'code' && selectedProblemRef.current) {
        console.log('Team page: Reconnected while in live coding, emitting live-coding status');
        socket.emit('update-status', {
          status: 'live-coding',
          problemTitle: selectedProblemRef.current.title,
        });
      } else {
        socket.emit('update-status', {
          status: 'in-team-space',
          problemTitle: undefined,
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Team page: Disconnected:', reason);
      setSocketConnected(false);
    });

    socket.on('team-joined', (data: { teamId: string; presence: any[]; chatHistory: any[] }) => {
      console.log('Team page: Joined team, presence:', data.presence?.length, data.presence);
      setMemberStatuses(prev => {
        const updated = new Map(prev);
        data.presence.forEach((p: any) => {
          if (p.isOnline) {
            updated.set(p.userId, {
              odId: p.userId,
              // Use actual status from presence data, default to 'in-team-space'
              odStatus: (p.status as 'in-team-space' | 'live-coding') || 'in-team-space',
              odProblemTitle: p.problemTitle,
            });
          }
        });
        return updated;
      });
    });

    socket.on('user-joined', (data: { userId: string; presence: any }) => {
      console.log('Team page: User joined', data.userId, data.presence);
      setMemberStatuses(prev => {
        const updated = new Map(prev);
        updated.set(data.userId, {
          odId: data.userId,
          // Use actual status from presence data, default to 'in-team-space'
          odStatus: (data.presence?.status as 'in-team-space' | 'live-coding') || 'in-team-space',
          odProblemTitle: data.presence?.problemTitle,
        });
        return updated;
      });
    });

    socket.on('user-left', (data: { userId: string }) => {
      console.log('Team page: User left', data.userId);
      setMemberStatuses(prev => {
        const updated = new Map(prev);
        updated.delete(data.userId);
        return updated;
      });
    });

    socket.on('user-status-update', (data: { odId: string; odStatus: string; odProblemTitle?: string }) => {
      console.log('Team page: Status update', data.odId, data.odStatus);
      setMemberStatuses(prev => {
        const updated = new Map(prev);
        updated.set(data.odId, {
          odId: data.odId,
          odStatus: data.odStatus as 'offline' | 'in-team-space' | 'live-coding',
          odProblemTitle: data.odProblemTitle,
        });
        return updated;
      });
    });

    // Listen for when team members start a problem
    socket.on('problem-started', (data: { problemId: string; isForceSwitch?: boolean }) => {
      console.log('🎯 Team page: Problem started by teammate', data.problemId, data.isForceSwitch ? '(force switch)' : '');
      setProblemProgress(prev => {
        const currentStatus = prev.get(data.problemId);
        console.log('  Current status:', currentStatus, '→ in-progress');
        const updated = new Map(prev);
        updated.set(data.problemId, 'in-progress');
        return updated;
      });
      setTeamActiveProblemId(data.problemId);
      console.log('  Team active problem ID set to:', data.problemId);
    });

    // Listen for when team completes a problem
    socket.on('problem-completed', (data: { problemId: string; isForceSwitch?: boolean }) => {
      console.log('✅ Team page: Problem completed by teammate', data.problemId, data.isForceSwitch ? '(force switch)' : '');
      setProblemProgress(prev => {
        const updated = new Map(prev);
        updated.set(data.problemId, 'completed');
        console.log('  Marked as completed');
        return updated;
      });
      // Only clear teamActiveProblemId if this is a real submission (not a force-switch)
      if (!data.isForceSwitch) {
        setTeamActiveProblemId(null);
        console.log('  Team active problem ID cleared');
      }
    });

    // Listen for force-leave-problem (when someone force-switches)
    socket.on('force-leave-problem', (data: { problemId: string; newProblemId: string }) => {
      console.log('🚪 Force leave problem:', data.problemId, '→', data.newProblemId);
      
      // Update problem statuses FIRST (before kicking user out)
      setProblemProgress(prev => {
        const updated = new Map(prev);
        updated.set(data.problemId, 'completed');
        updated.set(data.newProblemId, 'in-progress');
        console.log('  Updated statuses: old=completed, new=in-progress');
        return updated;
      });
      
      setTeamActiveProblemId(data.newProblemId);
      
      // If the user is currently viewing the old problem, kick them out
      if (selectedProblemRef.current?._id === data.problemId) {
        console.log('  User was viewing old problem, switching to problems list');
        setSelectedProblem(null);
        setActiveTab('problems');
        
        // Show a modal notification
        setForceLeaveMessage('Your team has switched to a different problem. The previous problem has been submitted as-is.');
        setShowForceLeaveModal(true);
      }
    });

    // Listen for dev-reset (when a teammate resets everything)
    socket.on('dev-reset', async () => {
      console.log('🔄 DEV RESET broadcast received from teammate');
      
      // Clear local state
      setProblemProgress(new Map());
      setTeamActiveProblemId(null);
      setSelectedProblem(null);
      setActiveTab('problems');
      
      // Reload progress from backend (should be empty)
      await loadTeamProgress();
      
      // Show notification
      alert('🔄 Team Reset: A teammate has reset all progress. Starting fresh!');
    });

    socket.on('connect_error', (error) => {
      console.error('Team page: Connection error:', error.message);
      setSocketConnected(false);
    });

    setPresenceSocket(socket);

    return () => {
      console.log('Team page: Cleaning up socket');
      socket.disconnect();
    };
  }, [teamId]);

  // Emit status update when entering/leaving code tab
  useEffect(() => {
    if (!presenceSocket?.connected) return;

    if (activeTab === 'code' && selectedProblem) {
      presenceSocket.emit('update-status', {
        status: 'live-coding',
        problemTitle: selectedProblem.title,
      });
    } else {
      presenceSocket.emit('update-status', {
        status: 'in-team-space',
        problemTitle: undefined,
      });
    }
  }, [activeTab, selectedProblem, presenceSocket]);

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Fetch team details through shared API client so auth headers are attached
        const teamResponse = await teamsAPI.getTeamById(teamId);
        const teamData = teamResponse.data?.team || teamResponse.data?.data?.team;

        if (!teamData) {
          throw new Error('Team not found');
        }
        setTeam(teamData);

        // Fetch active hackathon session for this team
        const sessionsResponse = await hackathonSessionsAPI.getAll();
        const sessions = sessionsResponse.data?.sessions || sessionsResponse.data?.data?.sessions || [];
        const activeSession = sessions.find((s: any) => {
          if (s.status !== 'active') return false;
          // Teams can be populated objects or just IDs
          const teamIds = s.teams?.map((t: any) => typeof t === 'string' ? t : t._id?.toString() || t.toString()) || [];
          return teamIds.includes(teamId);
        });

        if (activeSession) {
          // Save the session ID for submissions
          setActiveSessionId(activeSession._id);
          
          // Fetch full problem details for each problem in the session
          const problemIds = activeSession.problems.map((p: any) => p.problemId);
          const problemPromises = problemIds.map((id: string) => questionsAPI.getById(id));

          const problemResponses = await Promise.all(problemPromises);
          const sessionProblems = problemResponses.map((res, index) => ({
            ...(res.data?.question || res.data?.data?.question),
            order: activeSession.problems[index].order,
            points: activeSession.problems[index].points,
          }));

          // Sort by difficulty order: easy -> medium -> hard
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          sessionProblems.sort((a: any, b: any) => {
            const diffA = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 2;
            const diffB = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 2;
            if (diffA !== diffB) return diffA - diffB;
            return (a.order || 0) - (b.order || 0);
          });
          setProblems(sessionProblems);
        } else {
          console.warn('No active session found for this team');
          setActiveSessionId(null);
          setProblems([]);
        }
      } catch (error: any) {
        console.error('Error loading team:', error);
        const message = error.response?.data?.error?.message || error.message || 'Failed to load team data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [teamId, router]);

  // Handle problem selection - team can only work on ONE problem at a time
  const handleProblemClick = (problem: Problem) => {
    const status = problemProgress.get(problem._id) || 'not-started';
    
    // Block completed problems - team already submitted
    if (status === 'completed') {
      return;
    }
    
    // Check if team already has an active problem
    if (teamActiveProblemId && teamActiveProblemId !== problem._id) {
      // Team is already working on a different problem - show the confirmation
      setConfirmProblem(problem);
      return;
    }
    
    // Either no active problem, or clicking on the currently active problem
    markProblemAsStarted(problem._id);
    setSelectedProblem(problem);
    setActiveTab('code');
    
    // Emit status update via socket
    if (presenceSocket?.connected) {
      presenceSocket.emit('update-status', {
        status: 'live-coding',
        problemTitle: problem.title,
      });
    }
  };

  // Get the currently active problem object
  const getActiveProblem = useCallback(() => {
    if (!teamActiveProblemId) return null;
    return problems.find(p => p._id === teamActiveProblemId) || null;
  }, [teamActiveProblemId, problems]);

  // Force switch to a different problem - submits current work as-is
  const confirmProblemSelection = async () => {
    if (!confirmProblem || !teamActiveProblemId || !activeSessionId || !teamId) return;

    try {
      console.log('🔄 Force switching problems - completing:', teamActiveProblemId, 'starting:', confirmProblem._id);
      
      const oldProblemId = teamActiveProblemId;
      const newProblem = confirmProblem;
      
      // Persist status changes to backend FIRST
      try {
        await teamSubmissionsAPI.updateProblemStatus(teamId, activeSessionId, oldProblemId, 'completed');
        console.log('  ✅ Backend: Marked old problem as completed');
        
        await teamSubmissionsAPI.updateProblemStatus(teamId, activeSessionId, newProblem._id, 'in-progress');
        console.log('  ✅ Backend: Marked new problem as in-progress');
      } catch (error) {
        console.error('  ⚠️ Failed to persist status changes:', error);
        throw error;
      }
      
      // Update local state for THIS user
      setProblemProgress(prev => {
        const updated = new Map(prev);
        updated.set(oldProblemId, 'completed');
        updated.set(newProblem._id, 'in-progress');
        console.log('  ✅ Local state updated: old=completed, new=in-progress');
        return updated;
      });
      
      setTeamActiveProblemId(newProblem._id);
      
      // Broadcast force-leave to all OTHER team members (handles their state)
      if (presenceSocket?.connected) {
        console.log('  📡 Broadcasting force-leave-problem to team');
        presenceSocket.emit('force-leave-problem', { 
          problemId: oldProblemId,
          newProblemId: newProblem._id 
        });
        
        // Also broadcast problem-completed and problem-started with isForceSwitch flag
        presenceSocket.emit('problem-completed', { problemId: oldProblemId, isForceSwitch: true });
        presenceSocket.emit('problem-started', { problemId: newProblem._id, isForceSwitch: true });
      }
      
      // Switch UI to new problem for THIS user
      setSelectedProblem(newProblem);
      setActiveTab('code');
      setConfirmProblem(null);
      
      // Emit status update
      if (presenceSocket?.connected) {
        presenceSocket.emit('update-status', {
          status: 'live-coding',
          problemTitle: newProblem.title,
        });
      }
      
      console.log('✅ Force switch complete - old:', oldProblemId, 'new:', newProblem._id);
    } catch (error) {
      console.error('Error switching problems:', error);
      alert('Failed to switch problems. Please try again.');
    }
  };

  // Callback for when a problem is completed (passed all tests)
  const handleProblemCompleted = useCallback((problemId: string) => {
    markProblemAsCompleted(problemId);
  }, [markProblemAsCompleted]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Loading Team Space</h2>
          <p className="text-gray-400 text-sm">Preparing your collaborative coding environment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <p className="text-gray-400 text-sm mb-4">Your session may have expired.</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-2 bg-neon-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">Team not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-neon-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Calculate progress counts
  const completedCount = problems.filter(p => problemProgress.get(p._id) === 'completed').length;
  const inProgressCount = problems.filter(p => problemProgress.get(p._id) === 'in-progress').length;

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Modal: Force Leave Problem Notification */}
      {showForceLeaveModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 border border-yellow-500/50 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">Team Problem Switch</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">
                {forceLeaveMessage}
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-300">
                  Check the <strong>Problems</strong> tab to see the new active problem.
                </p>
              </div>
              <button
                onClick={() => setShowForceLeaveModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg font-medium hover:opacity-90 transition-all"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Team already has an active problem */}
      {confirmProblem && teamActiveProblemId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 border border-red-500/50 max-w-lg w-full">
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-red-400 mb-2">Switch to Different Problem?</h3>
              <p className="text-gray-300 mb-4">
                Your team is currently working on <span className="font-bold text-neon-blue">"{getActiveProblem()?.title || 'another problem'}"</span>
              </p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-300 mb-3">
                  <strong>⚠️ Warning:</strong> Switching problems will mark your current problem as incomplete and submit any saved work as-is.
                </p>
                <p className="text-sm text-gray-400">
                  Your team can only work on <strong>one problem at a time</strong>. Once you switch, you cannot return to the previous problem.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmProblem(null)}
                  className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Go to the active problem instead of switching
                    const activeProblem = getActiveProblem();
                    if (activeProblem) {
                      setSelectedProblem(activeProblem);
                      setActiveTab('code');
                    }
                    setConfirmProblem(null);
                  }}
                  className="flex-1 px-4 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-lg font-medium transition-all"
                >
                  Continue Current Problem
                </button>
                <button
                  onClick={confirmProblemSelection}
                  className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg font-medium transition-all"
                >
                  Switch Anyway →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gradient">{team.name}</h1>
              <p className="text-gray-400 text-sm mt-1">
                {completedCount} completed • {inProgressCount} in progress
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Dev Reset Button */}
              {isDevelopment && (
                <button
                  onClick={handleDevReset}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg text-sm transition-all"
                  title="Reset viewed problems (dev only)"
                >
                  🔄 Dev Reset
                </button>
              )}
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
            >
                ← Dashboard
            </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Team Members */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-5 border border-gray-800 sticky top-24">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>👥</span> Team Members
              </h2>
              <div className="space-y-2">
                {team.memberIds.map((member) => {
                  const status = memberStatuses.get(member._id);
                  const memberStatus = status?.odStatus || 'offline';
                  const isLiveCoding = memberStatus === 'live-coding';
                  const isInTeamSpace = memberStatus === 'in-team-space';
                  const isOnline = isLiveCoding || isInTeamSpace;
                  
                  return (
                  <div
                    key={member._id}
                      className={`p-3 rounded-lg border transition-all ${
                        isLiveCoding 
                          ? 'bg-neon-green/10 border-neon-green/30' 
                          : isInTeamSpace
                            ? 'bg-neon-blue/10 border-neon-blue/30'
                            : 'bg-dark-700 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          isLiveCoding 
                            ? 'bg-neon-green animate-pulse' 
                            : isInTeamSpace
                              ? 'bg-neon-blue'
                              : 'bg-gray-600'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className={`text-xs ${
                            isLiveCoding 
                              ? 'text-neon-green' 
                              : isInTeamSpace
                                ? 'text-neon-blue'
                                : 'text-gray-500'
                          }`}>
                            {isLiveCoding 
                              ? '💻 Live Coding' 
                              : isInTeamSpace 
                                ? '👀 In Team Space' 
                                : 'Offline'}
                          </p>
                          {isLiveCoding && status?.odProblemTitle && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {status.odProblemTitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Status Legend & Count */}
              <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-neon-green"></div>
                    <span className="text-gray-400">Live Coding</span>
                  </div>
                  <span className="text-gray-500">
                    {Array.from(memberStatuses.values()).filter(s => s.odStatus === 'live-coding').length}
                  </span>
              </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-neon-blue"></div>
                    <span className="text-gray-400">In Team Space</span>
            </div>
                  <span className="text-gray-500">
                    {Array.from(memberStatuses.values()).filter(s => s.odStatus === 'in-team-space').length}
                      </span>
                    </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                    <span className="text-gray-400">Offline</span>
                  </div>
                  <span className="text-gray-500">
                    {team.memberIds.length - Array.from(memberStatuses.values()).filter(s => s.odStatus !== 'offline').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 bg-dark-800 rounded-xl p-1">
              {(['overview', 'problems', 'code'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                    activeTab === tab
                      ? 'bg-neon-blue text-white'
                      : 'text-gray-400 hover:text-white hover:bg-dark-700'
                  }`}
                >
                  {tab === 'overview' && '📋 '}
                  {tab === 'problems' && '🧩 '}
                  {tab === 'code' && '💻 '}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (() => {
              // Calculate progress stats
              const notStartedCount = problems.filter(p => !problemProgress.has(p._id) || problemProgress.get(p._id) === 'not-started').length;
              const inProgressCount = problems.filter(p => problemProgress.get(p._id) === 'in-progress').length;
              const completedCount = problems.filter(p => problemProgress.get(p._id) === 'completed').length;

              return (
              <div className="space-y-6">
                  {/* Welcome Card */}
                <div className="glass rounded-2xl p-6 border border-gray-800">
                    <h3 className="text-2xl font-bold mb-2">Welcome, Team {team.name}! 🎉</h3>
                    <p className="text-gray-400 mb-6">{team.description || 'Ready to tackle some coding challenges together?'}</p>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Overall Progress</span>
                        <span className="text-white font-medium">{completedCount}/{problems.length} completed</span>
                      </div>
                      <div className="h-3 bg-dark-700 rounded-full overflow-hidden flex">
                        {/* Completed (green) */}
                        <div 
                          className="h-full bg-neon-green transition-all duration-500"
                          style={{ width: `${problems.length > 0 ? (completedCount / problems.length) * 100 : 0}%` }}
                        ></div>
                        {/* In Progress (yellow) */}
                        <div 
                          className="h-full bg-yellow-500 transition-all duration-500"
                          style={{ width: `${problems.length > 0 ? (inProgressCount / problems.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="flex text-xs mt-2">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-neon-green"></div>
                            <span className="text-gray-400">Completed</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <span className="text-gray-400">In Progress</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-dark-600"></div>
                            <span className="text-gray-400">Not Started</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                      <button
                      onClick={() => setActiveTab('problems')}
                      className="w-full px-6 py-4 bg-gradient-to-r from-neon-blue to-neon-purple hover:opacity-90 text-white rounded-xl font-medium transition-all text-lg"
                      >
                      🧩 View Problems
                      </button>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="glass rounded-xl p-4 border border-gray-800 text-center">
                      <p className="text-3xl font-bold text-gray-400">{notStartedCount}</p>
                      <p className="text-xs text-gray-500 mt-1">Not Started</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-yellow-500/30 text-center">
                      <p className="text-3xl font-bold text-yellow-500">{inProgressCount}</p>
                      <p className="text-xs text-gray-400 mt-1">In Progress</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-neon-green/30 text-center">
                      <p className="text-3xl font-bold text-neon-green">{completedCount}</p>
                      <p className="text-xs text-gray-400 mt-1">Completed</p>
                    </div>
                  </div>

                  {/* Info about points */}
                  <div className="glass rounded-xl p-4 border border-gray-700 text-center">
                    <p className="text-sm text-gray-400">
                      📝 Points will be awarded by judges after reviewing your submissions
                    </p>
                  </div>
                </div>
              );
            })()}

            {activeTab === 'problems' && (
              <div className="space-y-4">
                {/* Warning Banner */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                        <div>
                      <h4 className="font-semibold text-yellow-400">One-Time Access</h4>
                      <p className="text-sm text-yellow-300/80 mt-1">
                        You can only view each problem <strong>once</strong>. Once you start a problem, you cannot go back to view others you haven't started. Choose wisely!
                      </p>
                      </div>
                  </div>
                </div>

                {/* Problems List */}
                <div className="glass rounded-2xl border border-gray-800 overflow-hidden">
                  <div className="p-4 border-b border-gray-800 bg-dark-800">
                    <h3 className="font-bold">Select a Problem to Start</h3>
                    <p className="text-xs text-gray-400 mt-1">Problems are sorted by difficulty: Easy → Medium → Hard</p>
              </div>
                  
                  <div className="divide-y divide-gray-800">
                  {problems.map((problem, index) => {
                      const status = problemProgress.get(problem._id) || 'not-started';
                      const isStarted = status !== 'not-started';
                      const isCompleted = status === 'completed';
                      const isInProgress = status === 'in-progress';
                      const isCurrentlySelected = selectedProblem?._id === problem._id;
                      
                      // Check if any teammate is currently working on this problem
                      const teammatesOnProblem = Array.from(memberStatuses.values())
                        .filter(s => s.odStatus === 'live-coding' && s.odProblemTitle === problem.title);
                      const hasActiveTeammates = teammatesOnProblem.length > 0;

                    return (
                      <div
                        key={problem._id}
                        onClick={() => {
                            // Don't allow clicking on completed problems
                            if (isCompleted) return;
                            handleProblemClick(problem);
                          }}
                          className={`p-4 transition-all ${
                            isCompleted
                              ? 'bg-neon-green/5 border-l-4 border-l-neon-green cursor-not-allowed opacity-75'
                              : isCurrentlySelected
                                ? 'bg-neon-blue/10 border-l-4 border-l-neon-blue cursor-pointer'
                                : isInProgress
                                  ? 'bg-yellow-500/5 hover:bg-yellow-500/10 border-l-4 border-l-yellow-500 cursor-pointer'
                                  : 'hover:bg-dark-700 border-l-4 border-l-transparent cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {/* Problem Status Icon */}
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                                isCompleted 
                                  ? 'bg-neon-green/20 text-neon-green' 
                                  : isInProgress
                                    ? 'bg-yellow-500/20 text-yellow-500'
                                    : 'bg-dark-600 text-gray-400'
                              }`}>
                                {isCompleted ? '✓' : isInProgress ? '◐' : index + 1}
                            </div>
                              
                              <div>
                                <h4 className={`font-semibold ${isCompleted ? 'text-gray-400' : 'text-white'}`}>
                                  {isStarted ? problem.title : `Problem ${index + 1}`}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                problem.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                problem.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {problem.difficulty.toUpperCase()}
                              </span>
                                  <span className="text-xs text-gray-500">•</span>
                                  <span className="text-xs text-gray-400">
                                    {problem.points} pts max
                              </span>
                            </div>
                          </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Show if teammates are working on this problem */}
                              {hasActiveTeammates && (
                                <div className="flex items-center gap-1 text-xs bg-neon-blue/20 text-neon-blue px-2 py-1 rounded-full animate-pulse">
                                  <span className="inline-block w-2 h-2 bg-neon-blue rounded-full"></span>
                                  {teammatesOnProblem.length} coding
                                </div>
                              )}
                              {isCompleted ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-neon-green/20 text-neon-green px-3 py-1 rounded-full font-medium">
                                    ✓ Submitted
                                  </span>
                                  <span className="text-gray-500 text-xs">🔒</span>
                                </div>
                              ) : isInProgress ? (
                                <span className="text-xs bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full">
                                  In Progress →
                                </span>
                              ) : (
                                <span className="text-xs bg-dark-600 text-gray-400 px-3 py-1 rounded-full">
                                  Start →
                                </span>
                              )}
                            </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>

                {problems.length === 0 && (
                  <div className="glass rounded-2xl p-8 border border-gray-800 text-center">
                    <div className="text-4xl mb-4">📋</div>
                    <p className="text-gray-400">No problems assigned to this session yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'code' && team && (
              <>
                {selectedProblem && activeSessionId ? (
                  <LiveCodingSession
                    key={`${selectedProblem._id}-${activeSessionId}`} // Force remount on problem/session change
                    teamId={team._id}
                    sessionId={activeSessionId}
                    problemTitle={selectedProblem.title}
                    problem={selectedProblem}
                    onMemberStatusChange={handleMemberStatusUpdate}
                    onProblemCompleted={() => handleProblemCompleted(selectedProblem._id)}
                    onSubmitComplete={() => {
                      // After submission, go back to problems list
                      setSelectedProblem(null);
                      setActiveTab('problems');
                    }}
                    isAlreadySubmitted={problemProgress.get(selectedProblem._id) === 'completed'}
                    sharedSocket={presenceSocket}
                  />
                ) : (
                  <div className="glass rounded-2xl p-8 border border-gray-800 text-center">
                    <div className="text-5xl mb-4">🧩</div>
                    <h3 className="text-xl font-bold mb-2">No Problem Selected</h3>
                    <p className="text-gray-400 mb-6">
                      Select a problem from the Problems tab to start coding with your team.
                    </p>
                    <button
                      onClick={() => setActiveTab('problems')}
                      className="px-6 py-3 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-lg font-medium transition-all"
                    >
                      Browse Problems →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
