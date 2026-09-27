import { motion } from 'motion/react';
import { ArrowLeft, User, Shield, Lock, LogOut, Edit2, Check, X, UserCircle2, Trash2 } from 'lucide-react';
import { useAuthStore } from '../state/authStore';
import { useState, useEffect } from 'react';

interface ProfilePageProps {
  onBack: () => void;
}

interface UserProfile {
  user_id: string;
  name?: string;
  email?: string;
  phone?: string;
  account_created_at: Date;
  account_age_days: number;
  total_transactions: number;
  user_type: string;
  usage_context?: string;
  has_pin: boolean;
  pin_set_at?: Date;
  cooling_off_enabled: boolean;
  risk_sensitivity_level: string;
  nominee?: {
    name?: string;
    phone?: string;
    relationship?: string;
    enabled: boolean;
    verified: boolean;
  };
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, logout, role } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Trusted Contact state
  const [trustedContactName, setTrustedContactName] = useState('');
  const [trustedContactPhone, setTrustedContactPhone] = useState('');
  const [trustedContactRelationship, setTrustedContactRelationship] = useState('');
  const [hasTrustedContact, setHasTrustedContact] = useState(false);

  // Fetch user profile
  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get user ID from auth store
      if (!user?.id) {
        console.log('ProfilePage: No user ID found', user);
        setLoading(false);
        setError('Please log out and log in again to view your profile');
        return;
      }
      
      console.log('ProfilePage: Loading profile for user:', user.id);
      const userId = user.id;
      const response = await fetch(`http://localhost:3000/auth/user/${userId}`);
      
      console.log('ProfilePage: Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('ProfilePage: Failed to load profile:', errorData);
        throw new Error(errorData.error || 'Failed to load profile');
      }
      
      const data = await response.json();
      console.log('ProfilePage: Profile loaded:', data.user);
      setProfile(data.user);
      
      // Load trusted contact if exists
      if (data.user.nominee && data.user.nominee.enabled) {
        setTrustedContactName(data.user.nominee.name || '');
        setTrustedContactPhone(data.user.nominee.phone || '');
        setTrustedContactRelationship(data.user.nominee.relationship || '');
        setHasTrustedContact(true);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSave = async (field: string) => {
    try {
      if (!user?.id) {
        throw new Error('User not logged in');
      }
      
      const userId = user.id;
      const response = await fetch(`http://localhost:3000/auth/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: editValue
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      // Reload profile
      await loadProfile();
      setEditingField(null);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleChangePIN = () => {
    const oldPin = prompt('Enter current PIN:');
    if (!oldPin) return;
    
    const newPin = prompt('Enter new PIN (4 digits):');
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      alert('PIN must be exactly 4 digits');
      return;
    }
    
    const confirmPin = prompt('Confirm new PIN:');
    if (newPin !== confirmPin) {
      alert('PINs do not match');
      return;
    }
    
    changePIN(oldPin, newPin);
  };

  const changePIN = async (oldPin: string, newPin: string) => {
    try {
      if (!user?.id) {
        throw new Error('User not logged in');
      }
      
      const userId = user.id;
      const response = await fetch('http://localhost:3000/auth/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          old_pin: oldPin,
          new_pin: newPin
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || 'Failed to change PIN');
        return;
      }
      
      alert('PIN changed successfully!');
      await loadProfile();
    } catch (err) {
      console.error('Error changing PIN:', err);
      alert('Failed to change PIN');
    }
  };

  const toggleCoolingOff = async () => {
    try {
      if (!user?.id) {
        throw new Error('User not logged in');
      }
      
      const userId = user.id;
      const response = await fetch(`http://localhost:3000/auth/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cooling_off_enabled: !profile?.cooling_off_enabled
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update setting');
      }
      
      await loadProfile();
    } catch (err) {
      console.error('Error updating setting:', err);
      alert('Failed to update setting');
    }
  };

  if (loading) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-4">
          <motion.button
            onClick={onBack}
            className="w-10 h-10 rounded-full glass-light flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h2 className="text-xl tracking-wide">Profile & Settings</h2>
        </div>
        <div className="glass-light rounded-lg p-8 text-center">
          <p className="text-blue-300/60 tracking-wide">Loading profile...</p>
        </div>
      </motion.div>
    );
  }

  if (error || !profile) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-4">
          <motion.button
            onClick={onBack}
            className="w-10 h-10 rounded-full glass-light flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h2 className="text-xl tracking-wide">Profile & Settings</h2>
        </div>
        <div className="glass-light rounded-lg p-8 text-center">
          <p className="text-red-400 tracking-wide mb-4">{error || 'Failed to load profile'}</p>
          <motion.button
            onClick={loadProfile}
            className="px-4 py-2 rounded-lg glass-light"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Try Again
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <motion.button
          onClick={onBack}
          className="w-10 h-10 rounded-full glass-light flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h2 className="text-xl tracking-wide font-bold text-white">Profile & Settings</h2>
          <p className="text-xs text-blue-300/70 tracking-wide">Manage your account and role mode</p>
        </div>
      </div>

      {/* RBAC Role & Access Mode Governance Card */}
      <motion.div
        className="card-solid-navy rounded-xl p-4 sm:p-5 space-y-3 text-white shadow-lg"
        style={{
          backgroundColor: '#0D1836',
          border: '1.5px solid rgba(59, 130, 246, 0.35)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Role-Based Access (RBAC)</span>
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase text-cyan-300"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.25)',
              border: '1px solid rgba(59, 130, 246, 0.45)',
            }}
          >
            {role === 'ADMIN' ? 'Fraud Operations Officer' : 'Normal UPI User'}
          </span>
        </div>
        <p className="text-xs text-blue-200/80 leading-relaxed">
          {role === 'ADMIN'
            ? 'Active: Fraud Officer Mode. Unlocks Saarthi Fraud Center, system-wide transaction metrics, ML model registry governance, and live inspection.'
            : 'Active: Normal User Mode. Displays personal baseline behavioral profile, explainable 0–100 risk score, and transaction feedback loop.'}
        </p>
        <div
          className="w-full py-2 px-3 rounded-lg text-xs text-blue-300/80 flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
          }}
        >
          <span className="text-[11px] text-blue-300 font-medium">Session Isolation:</span>
          <span className="text-[11px] text-blue-200">Role is locked. To switch roles, log out and sign in through the other portal.</span>
        </div>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        className="card-solid-navy rounded-xl p-5 space-y-4 text-white shadow-lg"
        style={{
          backgroundColor: '#0D1836',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow"
            style={{
              backgroundColor: '#1E293B',
              border: '2px solid rgba(59, 130, 246, 0.5)',
            }}
          >
            <span>{profile.name?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg tracking-wide">{profile.name || 'User'}</h3>
            <p className="text-sm text-blue-300/60 tracking-wide">
              {profile.email || 'No email set'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-blue-400/20">
          <div className="space-y-1">
            <p className="text-xs text-blue-300/60 tracking-wide">Account Type</p>
            <p className="text-sm tracking-wide capitalize">
              {profile.usage_context || 'Personal'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-blue-300/60 tracking-wide">Member Since</p>
            <p className="text-sm tracking-wide">
              {new Date(profile.account_created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-blue-300/60 tracking-wide">User Type</p>
            <p className="text-sm tracking-wide">{profile.user_type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-blue-300/60 tracking-wide">Transactions</p>
            <p className="text-sm tracking-wide">{profile.total_transactions}</p>
          </div>
        </div>
      </motion.div>

      {/* Personal Information */}
      <motion.div
        className="glass-light rounded-lg p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-sm tracking-wide flex items-center gap-2">
          <User className="w-4 h-4" />
          Personal Information
        </h3>
        
        {/* Name */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-300/60 tracking-wide">Name</span>
          {editingField === 'name' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="px-2 py-1 rounded bg-blue-500/10 text-white text-xs"
                autoFocus
              />
              <button onClick={() => handleSave('name')} className="text-green-400">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={handleCancel} className="text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="tracking-wide">{profile.name || 'Not set'}</span>
              <button
                onClick={() => handleEdit('name', profile.name || '')}
                className="text-blue-400"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-300/60 tracking-wide">Email</span>
          {editingField === 'email' ? (
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="px-2 py-1 rounded bg-blue-500/10 text-white text-xs"
                autoFocus
              />
              <button onClick={() => handleSave('email')} className="text-green-400">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={handleCancel} className="text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="tracking-wide">{profile.email || 'Not set'}</span>
              <button
                onClick={() => handleEdit('email', profile.email || '')}
                className="text-blue-400"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Phone */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-300/60 tracking-wide">Phone</span>
          {editingField === 'phone' ? (
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="px-2 py-1 rounded bg-blue-500/10 text-white text-xs"
                autoFocus
              />
              <button onClick={() => handleSave('phone')} className="text-green-400">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={handleCancel} className="text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="tracking-wide">{profile.phone || 'Not set'}</span>
              <button
                onClick={() => handleEdit('phone', profile.phone || '')}
                className="text-blue-400"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Security Settings */}
      <motion.div
        className="glass-light rounded-lg p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-sm tracking-wide flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Security Settings
        </h3>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-300/60 tracking-wide">Transaction PIN</span>
          <div className="flex items-center gap-2">
            <span className={`tracking-wide ${profile.has_pin ? 'text-green-400' : 'text-amber-400'}`}>
              {profile.has_pin ? '✓ Set' : '⚠ Not set'}
            </span>
            {profile.has_pin && (
              <button
                onClick={handleChangePIN}
                className="text-blue-400 text-xs px-2 py-1 rounded bg-blue-500/10"
              >
                Change
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="text-blue-300/60 tracking-wide">Cooling Off Mode</p>
            <p className="text-xs text-blue-300/40 tracking-wide">Extra protection for high-risk transactions</p>
          </div>
          <button
            onClick={toggleCoolingOff}
            className={`px-3 py-1 rounded text-xs ${
              profile.cooling_off_enabled
                ? 'bg-green-500/20 text-green-400'
                : 'bg-blue-500/10 text-blue-400'
            }`}
          >
            {profile.cooling_off_enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-300/60 tracking-wide">Risk Sensitivity</span>
          <span className="tracking-wide capitalize">{profile.risk_sensitivity_level}</span>
        </div>
      </motion.div>

      {/* Trusted Contact Section */}
      <motion.div
        className="glass-light rounded-lg p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <h3 className="text-sm tracking-wide flex items-center gap-2">
          <UserCircle2 className="w-4 h-4" />
          Trusted Contact
        </h3>
        <p className="text-xs text-blue-300/60 tracking-wide">
          Add a trusted contact who will receive SMS alerts if you attempt a MEDIUM/HIGH-risk payment.
        </p>
        
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Name"
            value={trustedContactName}
            onChange={(e) => setTrustedContactName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-blue-500/10 text-white text-xs placeholder-blue-300/40"
          />
          <input
            type="tel"
            placeholder="Phone number (e.g., +919876543210)"
            value={trustedContactPhone}
            onChange={(e) => setTrustedContactPhone(e.target.value)}
            className="w-full px-3 py-2 rounded bg-blue-500/10 text-white text-xs placeholder-blue-300/40"
          />
          <input
            type="text"
            placeholder="Relationship (optional)"
            value={trustedContactRelationship}
            onChange={(e) => setTrustedContactRelationship(e.target.value)}
            className="w-full px-3 py-2 rounded bg-blue-500/10 text-white text-xs placeholder-blue-300/40"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!user?.id) {
                alert('Please log in to save trusted contact');
                return;
              }
              if (!trustedContactName || !trustedContactPhone) {
                alert('Please enter name and phone number');
                return;
              }
              
              try {
                const response = await fetch(`http://localhost:3000/user/nominee`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    user_id: user.id,
                    name: trustedContactName,
                    phone: trustedContactPhone,
                    relationship: trustedContactRelationship
                  })
                });
                
                if (!response.ok) throw new Error('Failed to save');
                
                setHasTrustedContact(true);
                alert('✅ Trusted contact saved successfully!');
                await loadProfile();
              } catch (err) {
                console.error(err);
                alert('Failed to save trusted contact');
              }
            }}
            className="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs transition-colors"
          >
            {hasTrustedContact ? 'Update Trusted Contact' : 'Save Trusted Contact'}
          </button>
          
          {hasTrustedContact && (
            <button
              onClick={async () => {
                if (!confirm('Remove trusted contact?')) return;
                
                try {
                  if (!user?.id) return;
                  const response = await fetch(`http://localhost:3000/user/nominee`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      user_id: user.id
                    })
                  });
                  
                  if (!response.ok) throw new Error('Failed to delete');
                  
                  setTrustedContactName('');
                  setTrustedContactPhone('');
                  setTrustedContactRelationship('');
                  setHasTrustedContact(false);
                  alert('Trusted contact removed');
                  await loadProfile();
                } catch (err) {
                  console.error(err);
                  alert('Failed to remove trusted contact');
                }
              }}
              className="px-4 py-2 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
              title="Remove trusted contact"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {hasTrustedContact && (
          <p className="text-xs text-green-400">✓ Trusted contact configured - will receive SMS alerts for MEDIUM/HIGH-risk transactions</p>
        )}
      </motion.div>

      {/* Saarthi Protection Status */}
      <motion.div
        className="glass-light rounded-lg p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-sm tracking-wide">Saarthi Protection</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-300/60 tracking-wide">AI Fraud Detection</span>
            <span className="text-green-400">✓ Active</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-300/60 tracking-wide">Behavioral Analysis</span>
            <span className="text-green-400">✓ Learning</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-300/60 tracking-wide">Real-time Monitoring</span>
            <span className="text-green-400">✓ Enabled</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-300/60 tracking-wide">Account Age</span>
            <span className="tracking-wide">{profile.account_age_days} days</span>
          </div>
        </div>
      </motion.div>

      {/* Logout Button */}
      <motion.button
        onClick={handleLogout}
        className="w-full glass-light rounded-lg p-4 flex items-center justify-center gap-2 text-red-400"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <LogOut className="w-5 h-5" />
        <span className="tracking-wide">Logout</span>
      </motion.button>
    </motion.div>
  );
}
