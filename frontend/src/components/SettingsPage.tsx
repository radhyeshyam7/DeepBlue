import { motion } from 'motion/react';
import { useAppStore, type Theme } from '../state/appStore';
import { useAuthStore } from '../state/authStore';
import { Shield, Palette, User as UserIcon, LogOut, Info, Trash2 } from 'lucide-react';
import { pageVariants } from '../animations/page.motion';
import { saveNominee, deleteNominee, getNominee } from '../api/nomineeApi';
import { useState, useEffect } from 'react';

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const { currentTheme, setTheme } = useAppStore();
  const { user, logout } = useAuthStore();

  const themes: { value: Theme; label: string; preview: string }[] = [
    { value: 'deep-blue', label: 'Deep Blue', preview: 'linear-gradient(135deg, #0a0e27, #3b82f6)' },
    { value: 'ocean-teal', label: 'Ocean Teal', preview: 'linear-gradient(135deg, #0a1f1f, #14b8a6)' },
    { value: 'midnight-violet', label: 'Midnight Violet', preview: 'linear-gradient(135deg, #1a0a27, #8b5cf6)' },
    { value: 'graphite-gradient', label: 'Graphite', preview: 'linear-gradient(135deg, #0f0f0f, #6366f1)' },
    { value: 'calm-amber', label: 'Calm Amber', preview: 'linear-gradient(135deg, #1a1108, #f59e0b)' },
  ];

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  // Nominee state
  const [nomineeName, setNomineeName] = useState('');
  const [nomineePhone, setNomineePhone] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('');
  const [nomineeExists, setNomineeExists] = useState(false);
  const [cooldownInfo, setCooldownInfo] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadNominee();
    }
  }, [user]);

  const loadNominee = async () => {
    try {
      if (!user?.id) return;
      const res = await getNominee(user.id);
      if (res && res.nominee) {
        setNomineeName(res.nominee.name || '');
        setNomineePhone(res.nominee.phone || '');
        setNomineeRelationship(res.nominee.relationship || '');
        setNomineeExists(true);
        if (res.nominee.last_alert_at) {
          const then = new Date(res.nominee.last_alert_at).toLocaleString();
          setCooldownInfo(`Last nominee alert: ${then}`);
        }
      }
    } catch (e) {
      // Nominee not found - this is okay
      setNomineeExists(false);
    }
  };

  const handleSaveNominee = async () => {
    try {
      if (!user?.id) {
        alert('Please log in to save nominee');
        return;
      }

      if (!nomineeName || !nomineePhone) {
        alert('Please enter nominee name and phone number');
        return;
      }

      const res = await saveNominee(user.id, {
        name: nomineeName,
        phone: nomineePhone,
        relationship: nomineeRelationship
      });

      if (res && res.status === 'OK') {
        setNomineeExists(true);
        alert('✅ Nominee saved successfully! They will receive SMS alerts for HIGH-risk transactions.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save nominee');
    }
  };

  const handleDeleteNominee = async () => {
    if (!confirm('Are you sure you want to remove your nominee?')) {
      return;
    }

    try {
      if (!user?.id) return;

      await deleteNominee(user.id);
      setNomineeName('');
      setNomineePhone('');
      setNomineeRelationship('');
      setNomineeExists(false);
      setCooldownInfo(null);
      alert('Nominee removed successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to remove nominee');
    }
  };

  return (
    <motion.div
      className="space-y-6"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl tracking-wide">Settings</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 glass-light rounded-lg text-sm hover:bg-white/[0.07] transition-colors"
        >
          Back to Transactions
        </button>
      </div>

      {/* Profile Section */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <UserIcon className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg tracking-wide">Profile</h3>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-blue-300/60">Name</span>
            <span>{user?.name || 'Not set'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-blue-300/60">Email</span>
            <span>{user?.email || 'Not set'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-blue-300/60">Account Age</span>
            <span>
              {user?.accountAge
                ? `${Math.floor((Date.now() - new Date(user.accountAge).getTime()) / (1000 * 60 * 60 * 24))} days`
                : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-blue-300/60">Usage Context</span>
            <span className="capitalize">{user?.usageContext || 'Not set'}</span>
          </div>
        </div>
      </section>

      {/* Nominee / Trusted Contact Section */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <UserIcon className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg tracking-wide">Trusted Contact (Nominee)</h3>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-xs text-blue-300/60">
            Add a trusted contact to receive SMS alerts for HIGH-risk payments (optional).
          </p>

          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Name"
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
              className="px-3 py-2 rounded bg-white/3"
            />
            <input
              placeholder="Phone number"
              value={nomineePhone}
              onChange={(e) => setNomineePhone(e.target.value)}
              className="px-3 py-2 rounded bg-white/3"
            />
          </div>

          <input
            placeholder="Relationship (optional)"
            value={nomineeRelationship}
            onChange={(e) => setNomineeRelationship(e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/3"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSaveNominee}
              className="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              {nomineeExists ? 'Update Nominee' : 'Save Nominee'}
            </button>
            {nomineeExists && (
              <button
                onClick={handleDeleteNominee}
                className="px-4 py-2 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors flex items-center gap-2"
                title="Remove nominee"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {nomineeExists && (
            <p className="text-xs text-green-400">✓ Nominee configured - will receive SMS for HIGH-risk transactions</p>
          )}
          {cooldownInfo && <p className="text-xs text-blue-300/50">{cooldownInfo}</p>}
        </div>
      </section>

      {/* Security Section */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg tracking-wide">Security</h3>
        </div>

        <div className="space-y-3">
          <button className="w-full px-4 py-3 glass-light rounded-lg text-left text-sm hover:bg-white/[0.07] transition-colors">
            Change Transaction PIN
          </button>
          <button className="w-full px-4 py-3 glass-light rounded-lg text-left text-sm hover:bg-white/[0.07] transition-colors">
            Update Password
          </button>

          <div className="pt-2">
            <label className="text-xs text-blue-300/60 block mb-2">Risk Sensitivity</label>
            <div className="flex items-center gap-4">
              <span className="text-xs">Low</span>
              <input
                type="range"
                min="1"
                max="3"
                defaultValue="2"
                className="flex-1"
              />
              <span className="text-xs">High</span>
            </div>
            <p className="text-xs text-blue-300/50 mt-2">
              Higher sensitivity increases scrutiny for unusual patterns
            </p>
          </div>
        </div>
      </section>

      {/* Theme Section */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg tracking-wide">Themes</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme) => (
            <motion.button
              key={theme.value}
              onClick={() => setTheme(theme.value)}
              className="relative overflow-hidden rounded-lg p-4 text-left transition-all"
              style={{
                background: currentTheme === theme.value ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${currentTheme === theme.value ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="h-12 rounded mb-3"
                style={{ background: theme.preview }}
              />
              <span className="text-sm">{theme.label}</span>
              {currentTheme === theme.value && (
                <motion.div
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)' }}
                />
              )}
            </motion.button>
          ))}
        </div>

        <p className="text-xs text-blue-300/50 mt-4">
          Note: Risk colors (Low/Medium/High) remain consistent across all themes
        </p>
      </section>

      {/* About Section */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg tracking-wide">About Saarthi</h3>
        </div>

        <div className="space-y-3 text-sm text-blue-300/70">
          <p>
            <strong className="text-white">Saarthi</strong> is an intelligent transaction risk analysis system
            designed to protect users through behavioral engineering and ambient intelligence.
          </p>
          <p>
            Our mission is to make digital transactions safer by providing real-time risk assessment
            without creating alarm or friction.
          </p>
          <div className="pt-2 text-xs text-blue-300/50">
            <p>Version 1.0.0</p>
            <p>© 2026 Saarthi Safety Layer</p>
          </div>
        </div>
      </section>

      {/* Logout */}
      <motion.button
        onClick={handleLogout}
        className="w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2 text-red-400/80 hover:text-red-400 transition-colors"
        style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}
        whileHover={{ scale: 1.01, background: 'rgba(239, 68, 68, 0.1)' }}
        whileTap={{ scale: 0.99 }}
      >
        <LogOut className="w-4 h-4" />
        Logout
      </motion.button>
    </motion.div>
  );
}
