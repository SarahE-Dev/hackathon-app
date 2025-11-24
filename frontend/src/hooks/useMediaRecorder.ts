import { useCallback, useRef, useState, useEffect } from 'react';
import { recordingAPI } from '@/lib/api';

export type RecordingType = 'webcam' | 'screen';
export type RecordingStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error';

interface RecordingConfig {
  sourceType: 'assessment' | 'hackathon';
  sourceId: string;
  type: RecordingType;
  teamId?: string;
  chunkIntervalMs?: number; // Default 30000 (30 seconds)
  onError?: (error: string) => void;
  onChunkUploaded?: (chunkIndex: number) => void;
}

interface RecordingState {
  status: RecordingStatus;
  recordingId: string | null;
  error: string | null;
  duration: number; // milliseconds
  chunksUploaded: number;
  stream: MediaStream | null;
}

export const useMediaRecorder = (config: RecordingConfig) => {
  const [state, setState] = useState<RecordingState>({
    status: 'idle',
    recordingId: null,
    error: null,
    duration: 0,
    chunksUploaded: 0,
    stream: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIdRef = useRef<string | null>(null);

  const chunkInterval = config.chunkIntervalMs || 30000;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    chunkIndexRef.current = 0;
  }, []);

  // Upload a chunk to the server
  const uploadChunk = useCallback(async (blob: Blob, index: number) => {
    if (!recordingIdRef.current) return;

    try {
      const formData = new FormData();
      formData.append('chunk', blob, `chunk-${index}.webm`);
      formData.append('chunkIndex', index.toString());
      formData.append('duration', chunkInterval.toString());

      await recordingAPI.uploadChunk(recordingIdRef.current, formData);

      setState(prev => ({ ...prev, chunksUploaded: prev.chunksUploaded + 1 }));
      config.onChunkUploaded?.(index);
    } catch (error: any) {
      console.error('Failed to upload chunk:', error);
      // Don't stop recording on chunk upload failure, just log it
    }
  }, [chunkInterval, config]);

  // Process and upload accumulated chunks
  const processChunks = useCallback(async () => {
    if (chunksRef.current.length === 0) return;

    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    const currentIndex = chunkIndexRef.current;
    chunkIndexRef.current++;
    chunksRef.current = [];

    await uploadChunk(blob, currentIndex);
  }, [uploadChunk]);

  // Request media stream
  const requestStream = useCallback(async (): Promise<MediaStream> => {
    if (config.type === 'webcam') {
      return navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });
    } else {
      // Screen recording
      return navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: true,
      });
    }
  }, [config.type]);

  // Start recording
  const startRecording = useCallback(async (consentGiven: boolean = true) => {
    if (state.status === 'recording') return;

    setState(prev => ({ ...prev, status: 'requesting', error: null }));

    try {
      // First, start recording session on backend
      const response = await recordingAPI.startRecording({
        sourceType: config.sourceType,
        sourceId: config.sourceId,
        type: config.type,
        teamId: config.teamId,
        consent: { given: consentGiven },
        metadata: {
          deviceInfo: navigator.userAgent,
        },
      });

      recordingIdRef.current = response.data.recordingId;

      // Request media stream
      const stream = await requestStream();
      streamRef.current = stream;

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1000000, // 1 Mbps
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle stop
      mediaRecorder.onstop = async () => {
        // Upload any remaining chunks
        await processChunks();

        // Complete the recording on backend
        if (recordingIdRef.current) {
          try {
            const totalDuration = Date.now() - startTimeRef.current;
            await recordingAPI.completeRecording(recordingIdRef.current, {
              duration: totalDuration,
            });
          } catch (error) {
            console.error('Failed to complete recording:', error);
          }
        }

        setState(prev => ({ ...prev, status: 'stopped' }));
      };

      // Handle error
      mediaRecorder.onerror = (event: any) => {
        const errorMessage = event.error?.message || 'Recording error occurred';
        setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
        config.onError?.(errorMessage);
        cleanup();
      };

      // Handle stream ending (user stops sharing)
      stream.getTracks().forEach(track => {
        track.onended = () => {
          stopRecording();
        };
      });

      // Start recording
      startTimeRef.current = Date.now();
      mediaRecorder.start(1000); // Collect data every second

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: Date.now() - startTimeRef.current,
        }));
      }, 1000);

      // Start chunk upload interval
      uploadIntervalRef.current = setInterval(() => {
        processChunks();
      }, chunkInterval);

      setState(prev => ({
        ...prev,
        status: 'recording',
        recordingId: response.data.recordingId,
        stream,
      }));

    } catch (error: any) {
      let errorMessage = 'Failed to start recording';

      if (error.name === 'NotAllowedError') {
        errorMessage = config.type === 'webcam'
          ? 'Camera access was denied. Please allow camera access to continue.'
          : 'Screen sharing was denied. Please allow screen sharing to continue.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera to continue.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }

      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      config.onError?.(errorMessage);
      cleanup();
    }
  }, [state.status, config, requestStream, processChunks, chunkInterval, cleanup]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || state.status !== 'recording') return;

    try {
      mediaRecorderRef.current.stop();
      cleanup();
    } catch (error: any) {
      console.error('Error stopping recording:', error);
    }
  }, [state.status, cleanup]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.status === 'recording') {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, status: 'paused' }));
    }
  }, [state.status]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.status === 'paused') {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, status: 'recording' }));
    }
  }, [state.status]);

  // Mark recording as failed
  const failRecording = useCallback(async (errorMessage: string) => {
    if (recordingIdRef.current) {
      try {
        await recordingAPI.failRecording(recordingIdRef.current, errorMessage);
      } catch (error) {
        console.error('Failed to mark recording as failed:', error);
      }
    }
    setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    failRecording,
    isRecording: state.status === 'recording',
    isPaused: state.status === 'paused',
  };
};

export default useMediaRecorder;
