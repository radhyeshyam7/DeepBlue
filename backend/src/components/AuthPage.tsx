import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../state/authStore';
import { DeepBlueLogo } from './logo/DeepBlueLogo';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import type { UsageContext } from '../state/authStore';

type AuthMode = 'login' | 'signup';
type SignupStep = 1 | 2 | 3;

export function AuthPage() {
  const { login, signup, setUsageContext, setPin } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<SignupStep>(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    pin: '',
    usageContext: 'personal' as UsageContext,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(formData.email, formData.password);
    setLoading(false);
  };

  const handleSignupStep = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step < 3) {
      setStep((prev) => (prev + 1) as SignupStep);
    } else {
      // Final step
      setLoading(true);
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
      });
      setUsageContext(formData.usageContext);
      setPin(formData.pin);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="glass rounded-2xl p-8 space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <DeepBlueLogo mode="idle" size={64} showText={true} />
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 p-1 glass-light rounded-lg">
            <button
              onClick={() => {
                setMode('login');
                setStep(1);
              }}
              className="flex-1 py-2 rounded-md transition-all"
              style={{
                background: mode === 'login' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: mode === 'login' ? '#fff' : '#94a3b8',
              }}
            >
              Login
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setStep(1);
              }}
              className="flex-1 py-2 rounded-md transition-all"
              style={{
                background: mode === 'signup' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: mode === 'signup' ? '#fff' : '#94a3b8',
              }}
            >
              Sign Up
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* Login Form */}
            {mode === 'login' && (
              <motion.form
                key="login"
                onSubmit={handleLogin}
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="space-y-2">
                  <label className="text-sm text-blue-200/80">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 glass-light rounded-lg text-white placeholder:text-blue-300/30"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-blue-200/80">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 glass-light rounded-lg text-white placeholder:text-blue-300/30"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {loading ? 'Loading...' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.form>
            )}

            {/* Signup Form - Step 1: Identity */}
            {mode === 'signup' && step === 1 && (
              <motion.form
                key="signup-1"
                onSubmit={handleSignupStep}
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h3 className="text-sm text-blue-200/80 mb-4">Step 1: Identity</h3>

                <div className="space-y-2">
                  <label className="text-sm text-blue-200/80">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 glass-light rounded-lg text-white placeholder:text-blue-300/30"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-blue-200/80">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 glass-light rounded-lg text-white placeholder:text-blue-300/30"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-blue-200/80">Phone (Optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 glass-light rounded-lg text-white placeholder:text-blue-300/30"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-blue-200/80">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 glass-light rounded-lg text-white placeholder:text-blue-300/30"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="w-full py-3 rounded-lg flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.form>
            )}

            {/* Signup Form - Step 2: Security Setup */}
            {mode === 'signup' && step === 2 && (
              <motion.form
                key="signup-2"
                onSubmit={handleSignupStep}
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h3 className="text-sm text-blue-200/80 mb-4">Step 2: Security Setup</h3>

                <div className="space-y-2">
                  <label className="text-sm text-blue-200/80">Transaction PIN (4 digits)</label>
                  <input
                    type="password"
                    value={formData.pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setFormData({ ...formData, pin: value });
                    }}
                    className="w-full px-4 py-3 glass-light rounded-lg text-white text-center text-2xl tracking-widest placeholder:text-blue-300/30"
                    placeholder="••••"
                    maxLength={4}
                    required
                  />
                </div>

                <p className="text-xs text-blue-300/60 text-center">
                  This PIN will be required for all transactions
                </p>

                <motion.button
                  type="submit"
                  disabled={formData.pin.length !== 4}
                  className="w-full py-3 rounded-lg flex items-center justify-center gap-2"
                  style={{
                    background: formData.pin.length === 4 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${formData.pin.length === 4 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                    opacity: formData.pin.length === 4 ? 1 : 0.5,
                  }}
                  whileHover={formData.pin.length === 4 ? { scale: 1.01 } : {}}
                  whileTap={formData.pin.length === 4 ? { scale: 0.99 } : {}}
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.form>
            )}

            {/* Signup Form - Step 3: Usage Context */}
            {mode === 'signup' && step === 3 && (
              <motion.form
                key="signup-3"
                onSubmit={handleSignupStep}
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h3 className="text-sm text-blue-200/80 mb-4">Step 3: Usage Context</h3>

                <div className="space-y-2">
                  <label className="text-sm text-blue-200/80">How will you use DeepBlue?</label>
                  <div className="space-y-2">
                    {[
                      { value: 'personal' as UsageContext, label: 'Personal Use', desc: 'Managing personal transactions' },
                      { value: 'testing' as UsageContext, label: 'Testing', desc: 'Exploring features and capabilities' },
                      { value: 'demo' as UsageContext, label: 'Demo', desc: 'Demonstrating to others' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, usageContext: option.value })}
                        className="w-full p-4 rounded-lg text-left transition-all"
                        style={{
                          background: formData.usageContext === option.value ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${formData.usageContext === option.value ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        }}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-blue-300/60 mt-1">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {loading ? 'Creating Account...' : 'Complete Setup'}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
