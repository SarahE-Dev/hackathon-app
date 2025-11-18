'use client';

import { Fragment } from 'react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['Ctrl', 'N'], description: 'Next question', category: 'Navigation' },
  { keys: ['Ctrl', 'P'], description: 'Previous question', category: 'Navigation' },
  { keys: ['Alt', '1-9'], description: 'Jump to question 1-9', category: 'Navigation' },
  { keys: ['Ctrl', 'K'], description: 'Open question search', category: 'Navigation' },
  
  // Actions
  { keys: ['Ctrl', 'S'], description: 'Save and continue', category: 'Actions' },
  { keys: ['Ctrl', 'F'], description: 'Flag for review', category: 'Actions' },
  { keys: ['Ctrl', 'Enter'], description: 'Submit assessment', category: 'Actions' },
  
  // View
  { keys: ['F11'], description: 'Toggle fullscreen', category: 'View' },
  { keys: ['Esc'], description: 'Close modal', category: 'View' },
  { keys: ['?'], description: 'Show shortcuts', category: 'View' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal = ({ isOpen, onClose }: Props) => {
  if (!isOpen) return null;

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl border border-gray-700 p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 bg-dark-800 rounded-lg"
                    >
                      <span className="text-gray-300">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <Fragment key={keyIndex}>
                            <kbd className="px-2 py-1 bg-dark-700 border border-gray-600 rounded text-sm font-mono text-white">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-gray-500 mx-1">+</span>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center">
            Press <kbd className="px-2 py-1 bg-dark-700 border border-gray-600 rounded text-xs">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
};
