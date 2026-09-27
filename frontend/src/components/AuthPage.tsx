import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../state/authStore';
import { SaarthiLogo } from './logo/SaarthiLogo';
import { Mail, Lock, User, Phone, ArrowRight, Shield, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { UsageContext } from '../state/authStore';

type PortalType = 'user' | 'admin';
type AuthMode = 'login' | 'signup';
type SignupStep = 1 | 2 | 3;

export function AuthPage() {
  const { loginAsUser, loginAsAdmin, signup, setUsageContext, setPin } = useAuthStore();
  const [portal, setPortal] = useState<PortalType>('user');
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<SignupStep>(1);
  const [loading, setLoading] = useState(false);

  // User Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    pin: '',
    usageContext: 'personal' as UsageContext,
  });

  // Admin Form data
  const [adminEmail, setAdminEmail] = useState('admin@saarthi.ai');
  const [adminKey, setAdminKey] = useState('admin123');

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await loginAsUser(formData.email, formData.password);
    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await loginAsAdmin(adminEmail, adminKey);
    setLoading(false);
  };

  const handleQuickUserDemo = async () => {
    setLoading(true);
    await loginAsUser('user@saarthi.ai', '1234');
    setLoading(false);
  };

  const handleQuickAdminDemo = async () => {
    setLoading(true);
    await loginAsAdmin('admin@saarthi.ai', 'admin123');
    setLoading(false);
  };

  const handleSignupStep = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step < 3) {
      setStep((prev) => (prev + 1) as SignupStep);
    } else {
      // Final step - validate PIN before submitting
      if (!/^\d{4}$/.test(formData.pin)) {
        alert('Please enter a valid 4-digit PIN');
        return;
      }

      setLoading(true);
      const success = await signup({
        name: formData.name,
        email: formData.email,
        password: formData.pin, // Use PIN as password for backend
        phone: formData.phone,
      });

      if (success) {
        setUsageContext(formData.usageContext);
        setPin(formData.pin);
      } else {
        alert('Registration failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#050914]">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.12) 0%, transparent 60%)',
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.35, 0.55, 0.35],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Main Container */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="rounded-2xl p-7 sm:p-8 space-y-6 shadow-2xl text-white"
          style={{
            backgroundColor: '#0B132B',
            border: '1.5px solid rgba(59, 130, 246, 0.35)',
            boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 40px rgba(59, 130, 246, 0.15)',
          }}
        >
          {/* Logo */}
          <div className="flex justify-center pt-1">
            <SaarthiLogo mode="idle" size={60} showText={true} />
          </div>

          {/* Separate Portal Selector Tabs */}
          <div className="space-y-1">
            <p className="text-[11px] text-blue-300/70 text-center tracking-wide font-medium">SELECT AUTHENTICATION PORTAL</p>
            <div
              className="grid grid-cols-2 gap-1.5 p-1 rounded-xl"
              style={{
                backgroundColor: '#070D1E',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setPortal('user');
                  setMode('login');
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  portal === 'user'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-300/70 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>UPI User Portal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPortal('admin');
                  setMode('login');
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  portal === 'admin'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-300/70 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-cyan-300" />
                <span>Fraud Ops Portal</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* PORTAL 1: NORMAL UPI USER */}
            {portal === 'user' && (
              <motion.div
                key="user-portal"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Mode toggle (Login / Signup) */}
                <div
                  className="flex gap-2 p-1 rounded-lg"
                  style={{
                    backgroundColor: '#0E1C3E',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                  }}
                >
                  <button
                    onClick={() => {
                      setMode('login');
                      setStep(1);
                    }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                      mode === 'login' ? 'bg-blue-600/40 text-cyan-300 font-semibold' : 'text-blue-300/60'
                    }`}
                  >
                    User Login
                  </button>
                  <button
                    onClick={() => {
                      setMode('signup');
                      setStep(1);
                    }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                      mode === 'signup' ? 'bg-blue-600/40 text-cyan-300 font-semibold' : 'text-blue-300/60'
                    }`}
                  >
                    Register New UPI
                  </button>
                </div>

                {/* Login Form */}
                {mode === 'login' && (
                  <form onSubmit={handleUserLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-blue-200/80">User Email / VPA</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white placeholder-blue-300/30 text-xs focus:outline-none focus:border-cyan-400"
                          style={{
                            backgroundColor: '#080E1E',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                          }}
                          placeholder="your.upi@bank.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-blue-200/80">Password / 4-Digit PIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white placeholder-blue-300/30 text-xs focus:outline-none focus:border-cyan-400"
                          style={{
                            backgroundColor: '#080E1E',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                          }}
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {loading ? 'Authenticating...' : 'Sign In to UPI Account'}
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>

                    {/* Quick Demo User Login */}
                    <div className="pt-2 border-t border-blue-500/20">
                      <button
                        type="button"
                        onClick={handleQuickUserDemo}
                        disabled={loading}
                        className="w-full py-2 rounded-lg text-xs font-medium text-cyan-300 hover:text-white transition-all text-center"
                        style={{
                          backgroundColor: '#0E1C3E',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        ⚡ Demo UPI User Quick Login
                      </button>
                    </div>
                  </form>
                )}

                {/* Signup Form */}
                {mode === 'signup' && step === 1 && (
                  <form onSubmit={handleSignupStep} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs text-blue-200/80">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white text-xs placeholder-blue-300/30 focus:outline-none"
                          style={{ backgroundColor: '#080E1E', border: '1px solid rgba(59, 130, 246, 0.35)' }}
                          placeholder="Radhyeshyam Lahoti"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-blue-200/80">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white text-xs placeholder-blue-300/30 focus:outline-none"
                          style={{ backgroundColor: '#080E1E', border: '1px solid rgba(59, 130, 246, 0.35)' }}
                          placeholder="radhye@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-blue-200/80">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white text-xs placeholder-blue-300/30 focus:outline-none"
                          style={{ backgroundColor: '#080E1E', border: '1px solid rgba(59, 130, 246, 0.35)' }}
                          placeholder="9876543210"
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      Next Step
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </form>
                )}

                {mode === 'signup' && step === 2 && (
                  <form onSubmit={handleSignupStep} className="space-y-4">
                    <h3 className="text-xs font-semibold text-cyan-300">Set 4-Digit Security PIN</h3>
                    <div className="space-y-1.5">
                      <input
                        type="password"
                        maxLength={4}
                        value={formData.pin}
                        onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                        className="w-full py-3 text-center text-xl font-mono tracking-widest rounded-lg text-white focus:outline-none"
                        style={{ backgroundColor: '#080E1E', border: '1.5px solid rgba(59, 130, 246, 0.4)' }}
                        placeholder="••••"
                        required
                        autoFocus
                      />
                      <p className="text-[11px] text-blue-300/60 text-center">
                        This PIN will authorize your UPI transactions
                      </p>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={formData.pin.length !== 4}
                      className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold text-xs disabled:opacity-40"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </form>
                )}

                {mode === 'signup' && step === 3 && (
                  <form onSubmit={handleSignupStep} className="space-y-4">
                    <h3 className="text-xs font-semibold text-cyan-300">Usage Preference</h3>
                    <div className="space-y-2 text-xs">
                      {[
                        { value: 'personal' as UsageContext, label: 'Personal Banking', desc: 'Standard user UPI payments' },
                        { value: 'testing' as UsageContext, label: 'Testing / Exploration', desc: 'Experimenting with anomaly alerts' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, usageContext: option.value })}
                          className="w-full p-3 rounded-lg text-left transition-all"
                          style={{
                            backgroundColor: formData.usageContext === option.value ? 'rgba(59, 130, 246, 0.25)' : '#0E1C3E',
                            border: `1px solid ${formData.usageContext === option.value ? 'rgba(56, 189, 248, 0.5)' : 'rgba(59, 130, 246, 0.2)'}`,
                          }}
                        >
                          <div className="font-semibold text-white">{option.label}</div>
                          <div className="text-[11px] text-blue-300/60 mt-0.5">{option.desc}</div>
                        </button>
                      ))}
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md"
                    >
                      {loading ? 'Creating UPI Account...' : 'Complete & Launch'}
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </form>
                )}
              </motion.div>
            )}

            {/* PORTAL 2: FRAUD OPERATIONS ADMIN PORTAL */}
            {portal === 'admin' && (
              <motion.div
                key="admin-portal"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Admin Security Banner */}
                <div
                  className="p-3 rounded-xl space-y-1.5"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                  }}
                >
                  <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                    <ShieldAlert className="w-4 h-4 text-cyan-300" />
                    <span>Fraud Operations & MLOps Governance</span>
                  </div>
                  <p className="text-[11px] text-blue-200/80 leading-relaxed">
                    Dedicated console for fraud analysts. Access system-wide metrics, MLflow model registry, real-time anomaly alerts, and continuous retraining datasets.
                  </p>
                </div>

                {/* Admin Credentials Form */}
                <form onSubmit={handleAdminLogin} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs text-blue-200/80">Officer ID / Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white placeholder-blue-300/30 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                        style={{
                          backgroundColor: '#080E1E',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                        }}
                        placeholder="admin@saarthi.ai"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-blue-200/80">Security Token / Master Key</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <input
                        type="password"
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white placeholder-blue-300/30 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                        style={{
                          backgroundColor: '#080E1E',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                        }}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg transition-all"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Shield className="w-4 h-4" />
                    <span>{loading ? 'Authenticating Officer...' : 'Authorize & Enter Fraud Operations'}</span>
                  </motion.button>

                  {/* 1-Click Fast Track for Admin */}
                  <div className="pt-2 border-t border-blue-500/20">
                    <button
                      type="button"
                      onClick={handleQuickAdminDemo}
                      disabled={loading}
                      className="w-full py-2 rounded-lg text-xs font-semibold text-cyan-300 hover:text-white transition-all text-center flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: '#0E1C3E',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>1-Click Admin Quick Login (Demo)</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
