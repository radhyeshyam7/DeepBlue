import { motion } from 'motion/react';
import { Home, Send, Clock, User, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '../state/authStore';

interface BottomNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function BottomNavigation({ currentPage, onNavigate }: BottomNavigationProps) {
  const { role, logout } = useAuthStore();

  const userNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'pay', label: 'Pay', icon: Send },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const adminNavItems = [
    { id: 'fraud-center', label: 'Fraud Ops', icon: Shield },
    { id: 'logout', label: 'Log Out', icon: LogOut, isAction: true },
  ];

  const navItems = role === 'ADMIN' ? adminNavItems : userNavItems;

  const handleItemClick = (item: any) => {
    if (item.id === 'logout') {
      if (confirm('Are you sure you want to log out of Fraud Operations?')) {
        logout();
      }
      return;
    }
    onNavigate(item.id);
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 pb-safe"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div
          className="rounded-2xl p-1.5 flex items-center justify-around shadow-2xl backdrop-blur-xl"
          style={{
            backgroundColor: '#091024F0',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.8), 0 0 20px rgba(59, 130, 246, 0.15)'
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const isLogout = item.id === 'logout';

            return (
              <motion.button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="relative flex flex-col items-center gap-1 px-4 sm:px-6 py-2 rounded-xl transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : isLogout ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                }}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-blue-400/40"
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                <Icon
                  className="w-5 h-5 transition-colors"
                  style={{
                    color: isLogout ? '#f87171' : isActive ? '#60a5fa' : 'rgba(147, 197, 253, 0.6)',
                  }}
                />
                <span
                  className="text-xs tracking-wide transition-colors"
                  style={{
                    color: isLogout ? '#f87171' : isActive ? '#60a5fa' : 'rgba(147, 197, 253, 0.6)',
                  }}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
