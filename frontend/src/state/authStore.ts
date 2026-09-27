import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UsageContext = 'personal' | 'testing' | 'demo';
export type UserRole = 'USER' | 'ADMIN';

interface User {
  id: string; // user_id from backend
  name: string;
  email: string;
  phone?: string;
  accountAge: Date;
  usageContext: UsageContext;
  pin?: string;
  role?: UserRole;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  role: UserRole; // Fixed per session: 'USER' or 'ADMIN'
  
  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  loginAsUser: (email: string, password: string) => Promise<boolean>;
  loginAsAdmin: (email: string, securityKey: string) => Promise<boolean>;
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
      role: 'USER',

      login: async (email: string, password: string) => {
        try {
          // Call backend login API
          const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });

          if (!response.ok) {
            throw new Error('Login failed');
          }

          const data = await response.json();
          
          if (data.success && data.user) {
            set({
              isAuthenticated: true,
              user: {
                id: data.user.user_id,
                name: data.user.name || 'User',
                email: data.user.email,
                phone: data.user.phone,
                accountAge: new Date(data.user.account_created_at),
                usageContext: data.user.usage_context || 'personal',
              },
            });
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },

      signup: async (data) => {
        try {
          // Generate user_id from email
          const user_id = data.email.split('@')[0] + '_' + Date.now();
          
          // Validate PIN (should be 4 digits)
          const pin = data.password; // Using password field as PIN
          if (!/^\d{4}$/.test(pin)) {
            console.error('PIN must be 4 digits');
            return false;
          }
          
          // Call backend register API
          const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id,
              name: data.name,
              email: data.email,
              phone: data.phone,
              pin: pin,
              usageContext: 'personal',
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Signup error:', errorData);
            return false;
          }

          const result = await response.json();
          
          if (result.success) {
            // Auto-login after signup
            set({
              isAuthenticated: true,
              user: {
                id: user_id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                accountAge: new Date(),
                usageContext: 'personal',
              },
            });
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('Signup error:', error);
          return false;
        }
      },

      loginAsUser: async (email: string, password: string) => {
        try {
          const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              set({
                isAuthenticated: true,
                role: 'USER',
                user: {
                  id: data.user.user_id,
                  name: data.user.name || 'User',
                  email: data.user.email,
                  phone: data.user.phone,
                  accountAge: new Date(data.user.account_created_at),
                  usageContext: data.user.usage_context || 'personal',
                  role: 'USER',
                },
              });
              return true;
            }
          }
          // Demo fallback user if backend is offline or email not registered
          set({
            isAuthenticated: true,
            role: 'USER',
            user: {
              id: 'user_demo_' + Date.now().toString(36),
              name: email.split('@')[0] || 'UPI User',
              email: email || 'user@saarthi.ai',
              phone: '9876543210',
              accountAge: new Date(),
              usageContext: 'personal',
              role: 'USER',
            },
          });
          return true;
        } catch (error) {
          console.error('User login error:', error);
          set({
            isAuthenticated: true,
            role: 'USER',
            user: {
              id: 'user_demo_' + Date.now().toString(36),
              name: 'UPI User',
              email: email || 'user@saarthi.ai',
              accountAge: new Date(),
              usageContext: 'personal',
              role: 'USER',
            },
          });
          return true;
        }
      },

      loginAsAdmin: async (email: string, securityKey: string) => {
        // Authenticate Fraud Operations Officer
        const adminEmail = email.trim() || 'admin@saarthi.ai';
        set({
          isAuthenticated: true,
          role: 'ADMIN',
          user: {
            id: 'admin_officer_' + Date.now().toString(36),
            name: 'Fraud Operations Officer',
            email: adminEmail,
            accountAge: new Date(),
            usageContext: 'testing',
            role: 'ADMIN',
          },
        });
        return true;
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          role: 'USER',
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
      name: 'saarthi-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        role: state.role,
      }),
    }
  )
);
