import { create } from 'zustand';

export type Theme = 'deep-blue' | 'ocean-teal' | 'midnight-violet' | 'graphite-gradient' | 'calm-amber';
export type AmbientRisk = 'LOW' | 'MEDIUM' | 'HIGH';

interface AppState {
  // Boot
  bootComplete: boolean;
  setBootComplete: (complete: boolean) => void;

  // Theme
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;

  // Ambient intelligence
  ambientRiskLevel: AmbientRisk;
  setAmbientRisk: (level: AmbientRisk) => void;

  // Navigation
  currentPage: 'transaction' | 'settings' | 'dashboard';
  setCurrentPage: (page: 'transaction' | 'settings' | 'dashboard') => void;
}

export const useAppStore = create<AppState>((set) => ({
  bootComplete: false,
  setBootComplete: (complete) => set({ bootComplete: complete }),

  currentTheme: 'deep-blue',
  setTheme: (theme) => {
    set({ currentTheme: theme });
    document.documentElement.setAttribute('data-theme', theme);
  },

  ambientRiskLevel: 'LOW',
  setAmbientRisk: (level) => set({ ambientRiskLevel: level }),

  currentPage: 'transaction',
  setCurrentPage: (page) => set({ currentPage: page }),
}));
