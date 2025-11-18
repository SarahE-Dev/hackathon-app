import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

export const useKeyboardShortcuts = ({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const shiftMatches =
          shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
        const altMatches = shortcut.altKey === undefined || event.altKey === shortcut.altKey;
        const metaMatches = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return shortcuts;
};

// Pre-defined shortcut sets
export const assessmentShortcuts = {
  nextQuestion: (action: () => void): KeyboardShortcut => ({
    key: 'n',
    ctrlKey: true,
    description: 'Next question',
    action,
  }),
  previousQuestion: (action: () => void): KeyboardShortcut => ({
    key: 'p',
    ctrlKey: true,
    description: 'Previous question',
    action,
  }),
  flagQuestion: (action: () => void): KeyboardShortcut => ({
    key: 'f',
    ctrlKey: true,
    description: 'Flag question for review',
    action,
  }),
  saveAndNext: (action: () => void): KeyboardShortcut => ({
    key: 's',
    ctrlKey: true,
    description: 'Save and go to next',
    action,
  }),
  submitAssessment: (action: () => void): KeyboardShortcut => ({
    key: 'Enter',
    ctrlKey: true,
    description: 'Submit assessment',
    action,
  }),
  openSearch: (action: () => void): KeyboardShortcut => ({
    key: 'k',
    ctrlKey: true,
    description: 'Open question search',
    action,
  }),
  toggleFullscreen: (action: () => void): KeyboardShortcut => ({
    key: 'f11',
    description: 'Toggle fullscreen',
    action,
    preventDefault: false,
  }),
};

// Jump to question shortcuts (1-9)
export const questionJumpShortcuts = (
  maxQuestion: number,
  onJump: (index: number) => void
): KeyboardShortcut[] => {
  const shortcuts: KeyboardShortcut[] = [];
  
  for (let i = 1; i <= Math.min(9, maxQuestion); i++) {
    shortcuts.push({
      key: i.toString(),
      altKey: true,
      description: `Jump to question ${i}`,
      action: () => onJump(i - 1),
    });
  }
  
  return shortcuts;
};

// Hook specifically for assessment taking
export const useAssessmentShortcuts = (handlers: {
  onNext?: () => void;
  onPrevious?: () => void;
  onFlag?: () => void;
  onSaveAndNext?: () => void;
  onSubmit?: () => void;
  onSearch?: () => void;
  onJumpToQuestion?: (index: number) => void;
  maxQuestions?: number;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onNext) {
    shortcuts.push(assessmentShortcuts.nextQuestion(handlers.onNext));
  }
  if (handlers.onPrevious) {
    shortcuts.push(assessmentShortcuts.previousQuestion(handlers.onPrevious));
  }
  if (handlers.onFlag) {
    shortcuts.push(assessmentShortcuts.flagQuestion(handlers.onFlag));
  }
  if (handlers.onSaveAndNext) {
    shortcuts.push(assessmentShortcuts.saveAndNext(handlers.onSaveAndNext));
  }
  if (handlers.onSubmit) {
    shortcuts.push(assessmentShortcuts.submitAssessment(handlers.onSubmit));
  }
  if (handlers.onSearch) {
    shortcuts.push(assessmentShortcuts.openSearch(handlers.onSearch));
  }
  if (handlers.onJumpToQuestion && handlers.maxQuestions) {
    shortcuts.push(...questionJumpShortcuts(handlers.maxQuestions, handlers.onJumpToQuestion));
  }

  return useKeyboardShortcuts({ shortcuts });
};
