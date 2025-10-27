import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface Modal {
  id: string;
  title: string;
  content: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  isOpen: boolean;
}

interface UIState {
  toasts: Toast[];
  modals: Record<string, Modal>;
  sidebarOpen: boolean;
  theme: 'dark' | 'light';

  // Toast actions
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Modal actions
  openModal: (id: string, modal: Omit<Modal, 'id' | 'isOpen'>) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  // UI actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  modals: {},
  sidebarOpen: true,
  theme: 'dark',

  // Toast actions
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id, message, type, duration },
      ],
    }));

    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => set({ toasts: [] }),

  // Modal actions
  openModal: (id: string, modal: Omit<Modal, 'id' | 'isOpen'>) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [id]: {
          ...modal,
          id,
          isOpen: true,
        },
      },
    }));
  },

  closeModal: (id: string) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [id]: {
          ...state.modals[id],
          isOpen: false,
        },
      },
    }));
  },

  closeAllModals: () => {
    set((state) => {
      const newModals = { ...state.modals };
      Object.keys(newModals).forEach((key) => {
        newModals[key] = { ...newModals[key], isOpen: false };
      });
      return { modals: newModals };
    });
  },

  // UI actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setTheme: (theme: 'dark' | 'light') => set({ theme }),
}));
