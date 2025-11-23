import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface ProctorConfig {
  attemptId: string;
  enableTabDetection?: boolean;
  enableCopyPaste?: boolean;
  enableRightClick?: boolean;
  enableFullscreen?: boolean;
  enableWebcam?: boolean;
  enableScreenRecording?: boolean;
  blockMobileDevices?: boolean;
  requireWebcam?: boolean;
}

interface ProctorAlert {
  message: string;
  timestamp: Date;
}

export const useProctoring = (config: ProctorConfig) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState<ProctorAlert[]>([]);
  const [forceSubmit, setForceSubmit] = useState<{ reason: string } | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Get access token from localStorage
    const token = localStorage.getItem('accessToken');

    if (!token) {
      console.error('No access token found for proctoring');
      return;
    }

    // Connect to proctoring WebSocket
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001', {
      path: '/proctoring',
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Proctoring connected');
      setIsConnected(true);

      // Join attempt room
      socket.emit('join-attempt', config.attemptId);
    });

    socket.on('joined-attempt', ({ attemptId }) => {
      console.log(`Joined attempt room: ${attemptId}`);
    });

    socket.on('disconnect', () => {
      console.log('Proctoring disconnected');
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Proctoring error:', error);
    });

    // Receive alerts from proctors
    socket.on('proctor-alert', ({ message }) => {
      setAlerts((prev) => [...prev, { message, timestamp: new Date() }]);
    });

    // Force submit event
    socket.on('force-submit', ({ reason }) => {
      setForceSubmit({ reason });
    });

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      }
    }, 30000); // Every 30 seconds

    socket.on('heartbeat-ack', () => {
      // Connection is alive
    });

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [config.attemptId]);

  // Tab visibility detection
  useEffect(() => {
    if (!config.enableTabDetection) return;

    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      socketRef.current?.emit('tab-switch', { hidden });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [config.enableTabDetection]);

  // Focus detection
  useEffect(() => {
    if (!config.enableTabDetection) return;

    const handleBlur = () => {
      socketRef.current?.emit('focus-loss');
    };

    const handleFocus = () => {
      socketRef.current?.emit('focus-gain');
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [config.enableTabDetection]);

  // Copy/Paste detection
  useEffect(() => {
    if (!config.enableCopyPaste) return;

    const handleCopy = (e: ClipboardEvent) => {
      const text = window.getSelection()?.toString();
      socketRef.current?.emit('copy-attempt', { text });
    };

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text');
      socketRef.current?.emit('paste-attempt', { text });
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [config.enableCopyPaste]);

  // Right click detection
  useEffect(() => {
    if (!config.enableRightClick) return;

    const handleContextMenu = (e: MouseEvent) => {
      socketRef.current?.emit('right-click', { x: e.clientX, y: e.clientY });
      // Optionally prevent right click
      // e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [config.enableRightClick]);

  // Keyboard shortcut detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect common shortcuts
      const modifierKeys = [];
      if (e.ctrlKey) modifierKeys.push('Ctrl');
      if (e.metaKey) modifierKeys.push('Cmd');
      if (e.altKey) modifierKeys.push('Alt');
      if (e.shiftKey) modifierKeys.push('Shift');

      if (modifierKeys.length > 0 && e.key.length === 1) {
        const keys = [...modifierKeys, e.key.toUpperCase()].join('+');
        socketRef.current?.emit('keyboard-shortcut', { keys });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fullscreen detection
  useEffect(() => {
    if (!config.enableFullscreen) return;

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        socketRef.current?.emit('fullscreen-enter');
      } else {
        socketRef.current?.emit('fullscreen-exit');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [config.enableFullscreen]);

  // Multiple monitor detection
  useEffect(() => {
    if (window.screen && 'isExtended' in window.screen) {
      // @ts-ignore - Experimental API
      if (window.screen.isExtended) {
        socketRef.current?.emit('multiple-monitors-detected', {
          count: window.screen.availWidth / window.screen.width,
        });
      }
    }
  }, []);

  // Mobile device detection
  useEffect(() => {
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

      // Check for mobile patterns
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
      const isMobile = mobileRegex.test(userAgent) ||
                      ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0);

      setIsMobileDevice(isMobile);

      if (isMobile) {
        socketRef.current?.emit('mobile-device-detected', {
          userAgent,
          touchPoints: navigator.maxTouchPoints,
        });

        // If mobile devices are blocked, show error and prevent access
        if (config.blockMobileDevices) {
          setForceSubmit({
            reason: 'Mobile devices are not allowed for this proctored session. Please use a desktop or laptop computer.'
          });
        }
      }
    };

    checkMobileDevice();
  }, [config.blockMobileDevices]);

  // Webcam requirement enforcement
  useEffect(() => {
    if (!config.requireWebcam && !config.enableWebcam) return;

    const enableWebcam = async () => {
      try {
        // Request webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });

        webcamStreamRef.current = stream;
        setWebcamEnabled(true);
        setWebcamError(null);

        socketRef.current?.emit('webcam-started', {
          timestamp: new Date(),
        });

        // Monitor if webcam is still active
        const track = stream.getVideoTracks()[0];
        track.onended = () => {
          setWebcamEnabled(false);
          socketRef.current?.emit('webcam-stopped', {
            reason: 'Webcam was disabled by user',
            timestamp: new Date(),
          });

          if (config.requireWebcam) {
            setAlerts(prev => [...prev, {
              message: 'Webcam was disabled. Please re-enable to continue.',
              timestamp: new Date(),
            }]);
          }
        };

      } catch (error: any) {
        console.error('Webcam error:', error);
        setWebcamEnabled(false);

        let errorMessage = 'Failed to access webcam';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Webcam access was denied. Please allow webcam access to continue.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No webcam found. Please connect a webcam to continue.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Webcam is already in use by another application.';
        }

        setWebcamError(errorMessage);

        socketRef.current?.emit('webcam-error', {
          error: errorMessage,
          timestamp: new Date(),
        });

        if (config.requireWebcam) {
          setForceSubmit({
            reason: errorMessage + ' This is required for proctored sessions.'
          });
        }
      }
    };

    enableWebcam();

    // Cleanup: stop webcam stream when component unmounts
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }
    };
  }, [config.requireWebcam, config.enableWebcam]);

  // Clear specific alert
  const clearAlert = (index: number) => {
    setAlerts((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear all alerts
  const clearAllAlerts = () => {
    setAlerts([]);
  };

  return {
    isConnected,
    alerts,
    forceSubmit,
    clearAlert,
    clearAllAlerts,
    isMobileDevice,
    webcamEnabled,
    webcamError,
    webcamStream: webcamStreamRef.current,
  };
};
