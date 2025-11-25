import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAllUsers: async (params?: any) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getAll: async (params?: any) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/users', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  addUserRole: async (userId: string, roleData: { role: string; organizationId?: string; cohortId?: string }) => {
    const response = await api.post(`/users/${userId}/roles`, roleData);
    return response.data;
  },

  removeUserRole: async (userId: string, roleData: { role: string; organizationId?: string }) => {
    const response = await api.delete(`/users/${userId}/roles`, { data: roleData });
    return response.data;
  },
};

// Teams API
export const teamsAPI = {
  getAllTeams: async (params?: any) => {
    const response = await api.get('/teams', { params });
    return response.data;
  },

  getTeamById: async (id: string) => {
    const response = await api.get(`/teams/${id}`);
    return response.data;
  },

  createTeam: async (data: { name: string; description?: string; track?: string }) => {
    const response = await api.post('/teams', data);
    return response.data;
  },

  updateTeam: async (id: string, data: any) => {
    const response = await api.put(`/teams/${id}`, data);
    return response.data;
  },

  deleteTeam: async (id: string) => {
    const response = await api.delete(`/teams/${id}`);
    return response.data;
  },

  addMember: async (teamId: string, userId: string) => {
    const response = await api.post(`/teams/${teamId}/members`, { userId });
    return response.data;
  },

  removeMember: async (teamId: string, userId: string) => {
    const response = await api.delete(`/teams/${teamId}/members/${userId}`);
    return response.data;
  },

  submitProject: async (teamId: string, data: {
    repoUrl?: string;
    demoUrl?: string;
    videoUrl?: string;
    track?: string;
    projectExplanation?: string;
    technicalApproach?: string;
    challengesOvercome?: string;
    codeSnippets?: Array<{
      filename: string;
      language: string;
      code: string;
      explanation?: string;
    }>;
  }) => {
    const response = await api.post(`/teams/${teamId}/submit`, data);
    return response.data;
  },
};

// Assessments API
export const assessmentsAPI = {
  getAll: async (params?: any) => {
    const response = await api.get('/assessments', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/assessments/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/assessments', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/assessments/${id}`, data);
    return response.data;
  },

  publish: async (id: string) => {
    const response = await api.post(`/assessments/${id}/publish`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/assessments/${id}`);
    return response.data;
  },
};

// Questions API
export const questionsAPI = {
  getAll: async (params?: any) => {
    const response = await api.get('/questions', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/questions/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/questions', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/questions/${id}`, data);
    return response.data;
  },

  publish: async (id: string) => {
    const response = await api.post(`/questions/${id}/publish`);
    return response.data;
  },

  duplicate: async (id: string) => {
    const response = await api.post(`/questions/${id}/duplicate`);
    return response.data;
  },

  archive: async (id: string) => {
    const response = await api.patch(`/questions/${id}/archive`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/questions/${id}`);
    return response.data;
  },
};

// Sessions API
export const sessionsAPI = {
  getAll: async (params?: any) => {
    const response = await api.get('/sessions', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/sessions/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/sessions', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/sessions/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/sessions/${id}`);
    return response.data;
  },
};

// Attempts API
export const attemptsAPI = {
  getAll: async (params?: any) => {
    const response = await api.get('/attempts/my-attempts', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/attempts/${id}`);
    return response.data;
  },

  start: async (assessmentId: string, sessionId?: string) => {
    const response = await api.post('/attempts/start', {
      assessmentId,
      sessionId,
    });
    return response.data;
  },

  saveAnswer: async (attemptId: string, questionId: string, answer: any) => {
    const response = await api.put(`/attempts/${attemptId}/answer`, {
      questionId,
      answer,
    });
    return response.data;
  },

  submit: async (attemptId: string) => {
    const response = await api.post(`/attempts/${attemptId}/submit`);
    return response.data;
  },

  addProctorEvent: async (attemptId: string, event: any) => {
    const response = await api.post(`/attempts/${attemptId}/event`, event);
    return response.data;
  },

  uploadFile: async (attemptId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/attempts/${attemptId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Grades API
export const gradesAPI = {
  getByAttempt: async (attemptId: string) => {
    const response = await api.get(`/grades/attempt/${attemptId}`);
    return response.data;
  },

  getByAssessment: async (assessmentId: string, params?: any) => {
    const response = await api.get(`/grades/assessment/${assessmentId}`, {
      params,
    });
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/grades', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/grades/${id}`, data);
    return response.data;
  },
};

// Problem Import API (Codewars integration)
export const problemImportAPI = {
  // Check if Codewars API is available
  checkCodewarsStatus: async () => {
    const response = await api.get('/problems/codewars/status');
    return response.data;
  },

  // Preview a problem before importing
  previewCodewarsProblem: async (codewarsId: string) => {
    const response = await api.get(`/problems/codewars/preview/${codewarsId}`);
    return response.data;
  },

  // Import a problem from Codewars
  importCodewarsProblem: async (codewarsId: string, language: string = 'javascript') => {
    const response = await api.post('/problems/import', {
      codewarsId,
      language,
    });
    return response.data;
  },
};

// Code Execution API
export const codeExecutionAPI = {
  // Execute code with test cases
  executeCode: async (data: {
    code: string;
    language: string;
    testCases: Array<{ id: string; input: string; expectedOutput: string }>;
    timeLimit?: number;
    memoryLimit?: number;
  }) => {
    const response = await api.post('/code/execute', data);
    return response.data;
  },

  // Validate code syntax
  validateCode: async (code: string, language: string) => {
    const response = await api.post('/code/validate', { code, language });
    return response.data;
  },
};

// Hackathon Sessions API
export const hackathonSessionsAPI = {
  // Get all hackathon sessions
  getAll: async (params?: any) => {
    const response = await api.get('/hackathon-sessions', { params });
    return response.data;
  },

  // Get session by ID
  getById: async (id: string) => {
    const response = await api.get(`/hackathon-sessions/${id}`);
    return response.data;
  },

  // Create new hackathon session
  create: async (data: any) => {
    const response = await api.post('/hackathon-sessions', data);
    return response.data;
  },

  // Update session
  update: async (id: string, data: any) => {
    const response = await api.put(`/hackathon-sessions/${id}`, data);
    return response.data;
  },

  // Start session
  start: async (id: string) => {
    const response = await api.post(`/hackathon-sessions/${id}/start`);
    return response.data;
  },

  // Pause session
  pause: async (id: string, reason?: string) => {
    const response = await api.post(`/hackathon-sessions/${id}/pause`, { reason });
    return response.data;
  },

  // Resume session
  resume: async (id: string) => {
    const response = await api.post(`/hackathon-sessions/${id}/resume`);
    return response.data;
  },

  // Complete session
  complete: async (id: string) => {
    const response = await api.post(`/hackathon-sessions/${id}/complete`);
    return response.data;
  },

  // Get session leaderboard
  getLeaderboard: async (id: string) => {
    const response = await api.get(`/hackathon-sessions/${id}/leaderboard`);
    return response.data;
  },

  // Delete session
  delete: async (id: string) => {
    const response = await api.delete(`/hackathon-sessions/${id}`);
    return response.data;
  },

  // Team operations
  joinSession: async (sessionId: string, teamId: string) => {
    const response = await api.post('/hackathon-sessions/team/join', {
      sessionId,
      teamId,
    });
    return response.data;
  },

  // Get team session
  getTeamSession: async (sessionId: string, teamId: string) => {
    const response = await api.get(`/hackathon-sessions/${sessionId}/team/${teamId}`);
    return response.data;
  },

  // Update problem progress
  updateProblemProgress: async (
    sessionId: string,
    teamId: string,
    data: { problemId: string; code: string; language: string; explanation?: string }
  ) => {
    const response = await api.put(
      `/hackathon-sessions/${sessionId}/team/${teamId}/problem`,
      data
    );
    return response.data;
  },

  // Submit problem solution
  submitProblem: async (
    sessionId: string,
    teamId: string,
    data: { problemId: string; testResults: any[] }
  ) => {
    const response = await api.post(
      `/hackathon-sessions/${sessionId}/team/${teamId}/problem/submit`,
      data
    );
    return response.data;
  },

  // Submit final session
  submitSession: async (sessionId: string, teamId: string) => {
    const response = await api.post(
      `/hackathon-sessions/${sessionId}/team/${teamId}/submit`
    );
    return response.data;
  },

  // Log proctoring event
  logProctorEvent: async (
    sessionId: string,
    teamId: string,
    event: {
      type: string;
      details?: string;
      severity?: 'low' | 'medium' | 'high';
    }
  ) => {
    const response = await api.post(
      `/hackathon-sessions/${sessionId}/team/${teamId}/event`,
      event
    );
    return response.data;
  },

  // Get all active sessions for monitoring
  getActiveSessions: async (sessionId?: string) => {
    const response = await api.get('/hackathon-sessions/monitor/active', {
      params: { sessionId },
    });
    return response.data;
  },

  // Pause team session (proctor)
  pauseTeamSession: async (sessionId: string, teamId: string, reason?: string) => {
    const response = await api.post(
      `/hackathon-sessions/${sessionId}/team/${teamId}/pause`,
      { reason }
    );
    return response.data;
  },

  // Resume team session (proctor)
  resumeTeamSession: async (sessionId: string, teamId: string) => {
    const response = await api.post(
      `/hackathon-sessions/${sessionId}/team/${teamId}/resume`
    );
    return response.data;
  },
};

// Hackathon Roster API
export const hackathonRosterAPI = {
  // Get roster for a hackathon session
  getRoster: async (sessionId: string, params?: { role?: string; status?: string }) => {
    const response = await api.get(`/hackathon-roster/${sessionId}`, { params });
    return response.data;
  },

  // Add single entry to roster
  addToRoster: async (sessionId: string, data: {
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'judge' | 'fellow';
    notes?: string;
    organizationId?: string;
  }) => {
    const response = await api.post(`/hackathon-roster/${sessionId}`, data);
    return response.data;
  },

  // Bulk add entries to roster
  bulkAddToRoster: async (sessionId: string, data: {
    entries: Array<{ email: string; firstName?: string; lastName?: string }>;
    role: 'judge' | 'fellow';
    organizationId?: string;
  }) => {
    const response = await api.post(`/hackathon-roster/${sessionId}/bulk`, data);
    return response.data;
  },

  // Update roster entry
  updateEntry: async (id: string, data: {
    firstName?: string;
    lastName?: string;
    notes?: string;
    teamId?: string | null;
    status?: string;
  }) => {
    const response = await api.put(`/hackathon-roster/entry/${id}`, data);
    return response.data;
  },

  // Remove from roster
  removeFromRoster: async (id: string) => {
    const response = await api.delete(`/hackathon-roster/entry/${id}`);
    return response.data;
  },

  // Assign fellow to team
  assignToTeam: async (id: string, teamId: string | null) => {
    const response = await api.post(`/hackathon-roster/entry/${id}/assign-team`, { teamId });
    return response.data;
  },

  // Bulk assign to teams
  bulkAssignToTeams: async (sessionId: string, assignments: Array<{ rosterId: string; teamId: string | null }>) => {
    const response = await api.post(`/hackathon-roster/${sessionId}/bulk-assign`, { assignments });
    return response.data;
  },

  // Auto-create teams from roster
  createTeamsFromRoster: async (sessionId: string, data?: {
    teamSize?: number;
    teamNamePrefix?: string;
    organizationId?: string;
  }) => {
    const response = await api.post(`/hackathon-roster/${sessionId}/create-teams`, data || {});
    return response.data;
  },

  // Check if email is on roster
  checkEmail: async (email: string) => {
    const response = await api.get(`/hackathon-roster/check/${email}`);
    return response.data;
  },
};

// Judge Documentation API
export const judgeDocumentationAPI = {
  // Get documentation (for judges - active only)
  getDocumentation: async (params?: {
    organizationId?: string;
    hackathonSessionId?: string;
    type?: string;
    includeDefaults?: boolean;
  }) => {
    const response = await api.get('/judge-documentation', { params });
    return response.data;
  },

  // Get all documentation (admin - includes inactive)
  getAllDocumentation: async (params?: {
    organizationId?: string;
    hackathonSessionId?: string;
    type?: string;
  }) => {
    const response = await api.get('/judge-documentation/all', { params });
    return response.data;
  },

  // Get documentation by ID
  getById: async (id: string) => {
    const response = await api.get(`/judge-documentation/${id}`);
    return response.data;
  },

  // Create documentation
  create: async (data: {
    hackathonSessionId?: string;
    organizationId: string;
    title: string;
    type: 'rubric' | 'faq' | 'guide' | 'general';
    rubricCriteria?: Array<{
      name: string;
      description: string;
      maxPoints: number;
      scoringGuide: Array<{ points: number; description: string }>;
    }>;
    faqs?: Array<{ question: string; answer: string; order: number }>;
    content?: string;
    isActive?: boolean;
    isDefault?: boolean;
  }) => {
    const response = await api.post('/judge-documentation', data);
    return response.data;
  },

  // Update documentation
  update: async (id: string, data: any) => {
    const response = await api.put(`/judge-documentation/${id}`, data);
    return response.data;
  },

  // Delete documentation
  delete: async (id: string) => {
    const response = await api.delete(`/judge-documentation/${id}`);
    return response.data;
  },

  // Toggle active status
  toggle: async (id: string) => {
    const response = await api.patch(`/judge-documentation/${id}/toggle`);
    return response.data;
  },

  // Duplicate documentation
  duplicate: async (id: string, data?: { hackathonSessionId?: string; title?: string }) => {
    const response = await api.post(`/judge-documentation/${id}/duplicate`, data);
    return response.data;
  },
};

// Recording API
export const recordingAPI = {
  // Start a new recording session
  startRecording: async (data: {
    sourceType: 'assessment' | 'hackathon';
    sourceId: string;
    type: 'webcam' | 'screen' | 'snapshot';
    teamId?: string;
    consent: { given: boolean };
    metadata?: {
      resolution?: string;
      frameRate?: number;
      audioEnabled?: boolean;
      deviceInfo?: string;
    };
  }) => {
    const response = await api.post('/recordings/start', data);
    return response.data;
  },

  // Upload a recording chunk
  uploadChunk: async (recordingId: string, formData: FormData) => {
    const response = await api.post(`/recordings/${recordingId}/chunk`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Upload a snapshot
  uploadSnapshot: async (recordingId: string, formData: FormData) => {
    const response = await api.post(`/recordings/${recordingId}/snapshot`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Complete a recording
  completeRecording: async (recordingId: string, data?: { totalSize?: number; duration?: number }) => {
    const response = await api.post(`/recordings/${recordingId}/complete`, data || {});
    return response.data;
  },

  // Mark recording as failed
  failRecording: async (recordingId: string, errorMessage?: string) => {
    const response = await api.post(`/recordings/${recordingId}/fail`, { errorMessage });
    return response.data;
  },

  // Get recordings for an assessment attempt or hackathon session
  getRecordings: async (sourceType: 'assessment' | 'hackathon', sourceId: string) => {
    const response = await api.get(`/recordings/${sourceType}/${sourceId}`);
    return response.data;
  },

  // Get a single recording
  getRecording: async (recordingId: string) => {
    const response = await api.get(`/recordings/detail/${recordingId}`);
    return response.data;
  },

  // Delete a recording (admin only)
  deleteRecording: async (recordingId: string) => {
    const response = await api.delete(`/recordings/${recordingId}`);
    return response.data;
  },

  // Get recording statistics (admin only)
  getStats: async () => {
    const response = await api.get('/recordings/stats');
    return response.data;
  },
};

export default api;
