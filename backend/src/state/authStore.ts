import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UsageContext = 'personal' | 'testing' | 'demo';

interface User {
  name: string;
  email: string;
  phone?: string;
  accountAge: Date;
  usageContext: UsageContext;
  pin?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  
  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: { name: string; email: string; password: string; phone?: string }) => Promise<boolean>;
  logout: () => void;
  
  // User setup
  setUsageContext: (context: UsageContext) => void;
  setPin: (pin: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,

      login: async (email: string, password: string) => {
        // Mock login - in production, call real API
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // For demo, accept any credentials
        set({
          isAuthenticated: true,
          user: {
            name: 'Demo User',
            email,
            accountAge: new Date(),
            usageContext: 'demo',
          },
        });
        
        return true;
      },

      signup: async (data) => {
        // Mock signup
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        set({
          isAuthenticated: true,
          user: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            accountAge: new Date(),
            usageContext: 'personal',
          },
        });
        
        return true;
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
        });
      },

      setUsageContext: (context) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, usageContext: context } });
        }
      },

      setPin: (pin) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, pin } });
        }
      },
    }),
    {
      name: 'deepblue-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
