import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface Answer {
  questionId: string;
  answer: any;
  timestamp: Date;
  timeSpent: number;
}

interface OfflineAnswer extends Answer {
  attemptId: string;
  synced: boolean;
  retryCount: number;
}

const OFFLINE_STORAGE_KEY = 'offline-answers';
const MAX_RETRY_COUNT = 5;

export const useOfflineAnswers = (attemptId: string) => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  // Load offline answers from localStorage
  const loadOfflineAnswers = useCallback((): OfflineAnswer[] => {
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load offline answers:', error);
      return [];
    }
  }, []);

  // Save offline answers to localStorage
  const saveOfflineAnswers = useCallback((answers: OfflineAnswer[]) => {
    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(answers));
    } catch (error) {
      console.error('Failed to save offline answers:', error);
    }
  }, []);

  // Add answer to offline queue
  const queueAnswer = useCallback((answer: Answer) => {
    const offlineAnswers = loadOfflineAnswers();
    const newAnswer: OfflineAnswer = {
      ...answer,
      attemptId,
      synced: false,
      retryCount: 0,
    };
    offlineAnswers.push(newAnswer);
    saveOfflineAnswers(offlineAnswers);
    setPendingSync(offlineAnswers.filter(a => !a.synced).length);
  }, [attemptId, loadOfflineAnswers, saveOfflineAnswers]);

  // Sync a single answer
  const syncAnswer = useCallback(async (answer: OfflineAnswer): Promise<boolean> => {
    try {
      const token = localStorage.getItem('accessToken');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

      await axios.put(
        `${BACKEND_URL}/api/attempts/${answer.attemptId}/answer`,
        {
          questionId: answer.questionId,
          answer: answer.answer,
          timeSpent: answer.timeSpent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000, // 10 second timeout
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to sync answer:', error);
      return false;
    }
  }, []);

  // Sync all pending answers
  const syncAllAnswers = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    const offlineAnswers = loadOfflineAnswers();
    const unsyncedAnswers = offlineAnswers.filter(a => !a.synced && a.retryCount < MAX_RETRY_COUNT);

    for (const answer of unsyncedAnswers) {
      const success = await syncAnswer(answer);
      
      if (success) {
        answer.synced = true;
      } else {
        answer.retryCount++;
      }
    }

    // Remove synced answers and answers that exceeded retry count
    const remainingAnswers = offlineAnswers.filter(
      a => !a.synced && a.retryCount < MAX_RETRY_COUNT
    );
    
    saveOfflineAnswers(remainingAnswers);
    setPendingSync(remainingAnswers.length);
    setIsSyncing(false);

    return remainingAnswers.length === 0;
  }, [isSyncing, isOnline, loadOfflineAnswers, syncAnswer, saveOfflineAnswers]);

  // Save answer with offline support
  const saveAnswerWithOffline = useCallback(async (answer: Answer): Promise<boolean> => {
    try {
      const token = localStorage.getItem('accessToken');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

      await axios.put(
        `${BACKEND_URL}/api/attempts/${attemptId}/answer`,
        {
          questionId: answer.questionId,
          answer: answer.answer,
          timeSpent: answer.timeSpent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000, // 5 second timeout
        }
      );

      return true;
    } catch (error) {
      // If offline or request failed, queue for later
      console.warn('Failed to save answer online, queuing for offline sync:', error);
      queueAnswer(answer);
      return false;
    }
  }, [attemptId, queueAnswer]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored, syncing offline answers...');
      setIsOnline(true);
      syncAllAnswers();
    };

    const handleOffline = () => {
      console.log('Connection lost, entering offline mode...');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncAllAnswers]);

  // Periodic sync attempt
  useEffect(() => {
    if (isOnline && pendingSync > 0) {
      syncIntervalRef.current = setInterval(() => {
        syncAllAnswers();
      }, 30000); // Try every 30 seconds

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [isOnline, pendingSync, syncAllAnswers]);

  // Load pending count on mount
  useEffect(() => {
    const offlineAnswers = loadOfflineAnswers();
    setPendingSync(offlineAnswers.filter(a => !a.synced).length);
  }, [loadOfflineAnswers]);

  return {
    isOnline,
    pendingSync,
    isSyncing,
    saveAnswerWithOffline,
    syncAllAnswers,
    queueAnswer,
  };
};
