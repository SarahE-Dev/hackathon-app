'use client';

import { useState } from 'react';

interface RecordingConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
  recordingTypes: {
    webcam: boolean;
    screen: boolean;
    snapshots: boolean;
  };
  sessionType: 'assessment' | 'hackathon';
}

export const RecordingConsentModal = ({
  isOpen,
  onConsent,
  onDecline,
  recordingTypes,
  sessionType,
}: RecordingConsentModalProps) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const enabledTypes = [];
  if (recordingTypes.webcam) enabledTypes.push('webcam video');
  if (recordingTypes.screen) enabledTypes.push('screen activity');
  if (recordingTypes.snapshots) enabledTypes.push('periodic snapshots');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="glass rounded-2xl border border-gray-700 p-8 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Recording Consent Required</h2>
            <p className="text-sm text-gray-400">
              This {sessionType} requires recording
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          <p className="text-gray-300">
            To ensure integrity and provide a record of your session, the following will be recorded:
          </p>

          <ul className="space-y-2">
            {recordingTypes.webcam && (
              <li className="flex items-center gap-3 text-gray-300">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span>Webcam video recording</span>
              </li>
            )}
            {recordingTypes.screen && (
              <li className="flex items-center gap-3 text-gray-300">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span>Screen activity recording</span>
              </li>
            )}
            {recordingTypes.snapshots && (
              <li className="flex items-center gap-3 text-gray-300">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span>Periodic webcam snapshots</span>
              </li>
            )}
          </ul>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm text-yellow-200">
              <strong>Privacy Notice:</strong> Recordings are stored securely and will only be reviewed
              by authorized personnel if needed for verification. All data is handled in accordance
              with our privacy policy.
            </p>
          </div>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-gray-600 bg-dark-700 text-neon-500 focus:ring-neon-500 focus:ring-offset-dark-800"
          />
          <span className="text-sm text-gray-300">
            I understand and consent to {enabledTypes.join(', ')} being recorded during this {sessionType}.
            I confirm that I am the authorized participant.
          </span>
        </label>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors"
          >
            Decline & Exit
          </button>
          <button
            onClick={onConsent}
            disabled={!agreed}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              agreed
                ? 'bg-neon-500 hover:bg-neon-600 text-dark-900'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            I Consent - Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingConsentModal;
