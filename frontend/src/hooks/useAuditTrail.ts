import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

interface AuditEvent {
  type: string;
  timestamp: Date;
  metadata: any;
}

interface UseAuditTrailOptions {
  attemptId: string;
  questionId: string;
  enabled?: boolean;
  batchSize?: number;
  flushInterval?: number; // milliseconds
}

export const useAuditTrail = ({
  attemptId,
  questionId,
  enabled = true,
  batchSize = 20,
  flushInterval = 10000, // 10 seconds
}: UseAuditTrailOptions) => {
  const eventsQueue = useRef<AuditEvent[]>([]);
  const flushTimerRef = useRef<NodeJS.Timeout>();
  const lastKeystrokeRef = useRef<number>(Date.now());

  /**
   * Flush events to server
   */
  const flushEvents = useCallback(async () => {
    if (eventsQueue.current.length === 0) return;

    try {
      const token = localStorage.getItem('accessToken');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

      const events = [...eventsQueue.current];
      eventsQueue.current = [];

      await axios.post(
        `${BACKEND_URL}/api/attempts/${attemptId}/audit-events`,
        { events },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error('Failed to flush audit events:', error);
      // Don't re-queue to avoid infinite loop, just log
    }
  }, [attemptId]);

  /**
   * Queue an event
   */
  const queueEvent = useCallback(
    (type: string, metadata: any) => {
      if (!enabled) return;

      eventsQueue.current.push({
        type,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          questionId,
        },
      });

      // Flush if batch size reached
      if (eventsQueue.current.length >= batchSize) {
        flushEvents();
      }
    },
    [enabled, questionId, batchSize, flushEvents]
  );

  /**
   * Track keystrokes
   */
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const duration = now - lastKeystrokeRef.current;
      lastKeystrokeRef.current = now;

      // Don't log passwords or sensitive inputs
      const target = e.target as HTMLElement;
      if (target.getAttribute('type') === 'password') return;

      queueEvent('keystroke', {
        key: e.key.length === 1 ? e.key : e.key.substring(0, 10), // Don't log full key names
        duration,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, queueEvent]);

  /**
   * Track mouse events (throttled)
   */
  useEffect(() => {
    if (!enabled) return;

    let lastMouseMove = 0;
    const throttleMs = 1000; // Only log mouse position every second

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouseMove < throttleMs) return;
      lastMouseMove = now;

      queueEvent('mouse-move', {
        x: e.clientX,
        y: e.clientY,
      });
    };

    const handleClick = (e: MouseEvent) => {
      queueEvent('mouse-click', {
        x: e.clientX,
        y: e.clientY,
        button: e.button,
      });
    };

    const handleScroll = () => {
      queueEvent('mouse-scroll', {
        scrollY: window.scrollY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, queueEvent]);

  /**
   * Track code changes in Monaco editor
   */
  const trackCodeChange = useCallback(
    (type: 'insert' | 'delete' | 'paste', position: number, length: number, content?: string) => {
      queueEvent(`code-${type}`, {
        position,
        length,
        content: content?.substring(0, 100), // Limit content size
      });
    },
    [queueEvent]
  );

  /**
   * Periodic flush
   */
  useEffect(() => {
    if (!enabled) return;

    flushTimerRef.current = setInterval(() => {
      flushEvents();
    }, flushInterval);

    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
      }
    };
  }, [enabled, flushInterval, flushEvents]);

  /**
   * Flush on unmount
   */
  useEffect(() => {
    return () => {
      flushEvents();
    };
  }, [flushEvents]);

  /**
   * Flush on page unload
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable sending on page unload
      if (eventsQueue.current.length > 0) {
        const token = localStorage.getItem('accessToken');
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

        const blob = new Blob(
          [JSON.stringify({ events: eventsQueue.current })],
          { type: 'application/json' }
        );

        navigator.sendBeacon(
          `${BACKEND_URL}/api/attempts/${attemptId}/audit-events?token=${token}`,
          blob
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attemptId]);

  return {
    trackCodeChange,
    flushEvents,
  };
};
