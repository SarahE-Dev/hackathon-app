'use client';

import { useMemo } from 'react';

interface RecordingIndicatorProps {
  isRecording: boolean;
  recordingType: 'webcam' | 'screen' | 'both';
  duration?: number; // milliseconds
  chunksUploaded?: number;
  error?: string | null;
  onStopClick?: () => void;
  minimal?: boolean;
}

export const RecordingIndicator = ({
  isRecording,
  recordingType,
  duration = 0,
  chunksUploaded = 0,
  error,
  onStopClick,
  minimal = false,
}: RecordingIndicatorProps) => {
  // Format duration as HH:MM:SS
  const formattedDuration = useMemo(() => {
    const totalSeconds = Math.floor(duration / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [duration]);

  const getTypeLabel = () => {
    switch (recordingType) {
      case 'webcam':
        return 'Camera';
      case 'screen':
        return 'Screen';
      case 'both':
        return 'Camera & Screen';
      default:
        return 'Recording';
    }
  };

  const getTypeIcon = () => {
    switch (recordingType) {
      case 'webcam':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'screen':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'both':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-sm text-red-400">Recording Error</span>
      </div>
    );
  }

  if (!isRecording) {
    return null;
  }

  if (minimal) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-red-500/20 rounded-full">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs text-red-400 font-medium">REC</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-dark-800/90 border border-red-500/30 rounded-lg backdrop-blur-sm">
      {/* Recording indicator */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
        </div>
        <span className="text-sm font-medium text-red-400">REC</span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-700" />

      {/* Type icon and label */}
      <div className="flex items-center gap-2 text-gray-300">
        {getTypeIcon()}
        <span className="text-sm">{getTypeLabel()}</span>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1 text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-mono">{formattedDuration}</span>
      </div>

      {/* Chunks uploaded indicator */}
      {chunksUploaded > 0 && (
        <>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-1 text-green-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-xs">{chunksUploaded}</span>
          </div>
        </>
      )}

      {/* Stop button (optional) */}
      {onStopClick && (
        <button
          onClick={onStopClick}
          className="ml-2 p-1 hover:bg-red-500/20 rounded transition-colors"
          title="Stop Recording"
        >
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default RecordingIndicator;
