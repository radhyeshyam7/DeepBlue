import { motion, AnimatePresence } from 'motion/react';
import { Lock, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface PinInputModalProps {
    isOpen: boolean;
    onSubmit: (pin: string) => void;
    onCancel: () => void;
    error?: string;
    attemptsRemaining?: number;
}

export function PinInputModal({ isOpen, onSubmit, onCancel, error, attemptsRemaining }: PinInputModalProps) {
    const [pin, setPin] = useState(['', '', '', '']);
    const inputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    const isLocked = attemptsRemaining === 0;

    // Focus first input when modal opens
    useEffect(() => {
        if (isOpen) {
            setPin(['', '', '', '']);
            setTimeout(() => inputRefs[0].current?.focus(), 100);
        }
    }, [isOpen]);

    // Automatically clear inputs and refocus when an incorrect attempt occurs
    useEffect(() => {
        if (error && attemptsRemaining !== 0) {
            setPin(['', '', '', '']);
            setTimeout(() => inputRefs[0].current?.focus(), 120);
        }
    }, [error]);

    const handleChange = (index: number, value: string) => {
        if (isLocked) return;
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs[index + 1].current?.focus();
        }

        // Auto-submit when all 4 digits entered
        if (index === 3 && value) {
            const fullPin = newPin.join('');
            if (fullPin.length === 4) {
                setTimeout(() => onSubmit(fullPin), 100);
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (isLocked) return;
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
        if (e.key === 'Enter') {
            const fullPin = pin.join('');
            if (fullPin.length === 4) {
                onSubmit(fullPin);
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (isLocked) return;
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
        if (pastedData.length === 4) {
            setPin(pastedData.split(''));
            setTimeout(() => onSubmit(pastedData), 100);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-dark"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    backgroundColor: 'rgba(3, 7, 18, 0.92)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                {/* Backdrop Click Dismiss */}
                <motion.div
                    className="absolute inset-0"
                    onClick={onCancel}
                />

                {/* Modal */}
                <motion.div
                    className="relative rounded-3xl p-8 sm:p-10 max-w-lg w-full shadow-2xl modal-solid-navy text-white z-10"
                    style={{
                        backgroundColor: '#0B132B',
                        border: isLocked
                            ? '1.5px solid rgba(239, 68, 68, 0.6)'
                            : '1.5px solid rgba(59, 130, 246, 0.45)',
                        boxShadow: isLocked
                            ? '0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 50px rgba(239, 68, 68, 0.3)'
                            : '0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 50px rgba(59, 130, 246, 0.2)',
                    }}
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Close button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-5 right-5 p-2 rounded-lg hover:bg-blue-600/30 transition-all text-blue-300 hover:text-white"
                        style={{
                            backgroundColor: '#132347',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Header */}
                    <div className="flex flex-col items-center mb-6">
                        <motion.div
                            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                            style={{
                                background: isLocked
                                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(185, 28, 28, 0.2) 100%)'
                                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)',
                                border: isLocked
                                    ? '2px solid rgba(239, 68, 68, 0.5)'
                                    : '2px solid rgba(59, 130, 246, 0.4)',
                                boxShadow: isLocked
                                    ? '0 0 30px rgba(239, 68, 68, 0.4)'
                                    : '0 0 30px rgba(59, 130, 246, 0.3)',
                            }}
                            animate={{
                                boxShadow: isLocked
                                    ? ['0 0 30px rgba(239, 68, 68, 0.4)', '0 0 45px rgba(239, 68, 68, 0.6)', '0 0 30px rgba(239, 68, 68, 0.4)']
                                    : ['0 0 30px rgba(59, 130, 246, 0.3)', '0 0 40px rgba(59, 130, 246, 0.5)', '0 0 30px rgba(59, 130, 246, 0.3)'],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Lock className={`w-10 h-10 ${isLocked ? 'text-red-400' : 'text-blue-400'}`} />
                        </motion.div>
                        <h2 className="text-3xl font-bold mb-2 text-white">
                            {isLocked ? 'UPI PIN Locked' : 'Enter Your PIN'}
                        </h2>
                        <p className="text-sm text-blue-200/80 text-center">
                            {isLocked
                                ? 'Security lock active: Maximum 3 attempts exceeded'
                                : 'Enter your 4-digit transaction PIN to confirm payment'}
                        </p>
                    </div>

                    {/* 3-Attempt Security Tracker */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-blue-500/30 text-xs">
                            <span className="text-blue-300 font-medium">Attempts:</span>
                            <div className="flex gap-1.5">
                                {[1, 2, 3].map((num) => {
                                    const isFailed = attemptsRemaining !== undefined && num > attemptsRemaining;
                                    return (
                                        <div
                                            key={num}
                                            className={`w-3 h-3 rounded-full transition-all ${
                                                isFailed
                                                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]'
                                                    : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                                            }`}
                                            title={`Attempt ${num}`}
                                        />
                                    );
                                })}
                            </div>
                            <span className="text-blue-200 font-semibold ml-1">
                                {attemptsRemaining !== undefined
                                    ? `${attemptsRemaining} of 3 remaining`
                                    : '3 attempts allowed'}
                            </span>
                        </div>
                    </div>

                    {/* PIN Input */}
                    <div className="flex gap-4 justify-center mb-6">
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={inputRefs[index]}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                disabled={isLocked}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                className={`w-16 h-20 text-center text-3xl font-bold rounded-xl focus:outline-none transition-all ${
                                    isLocked ? 'opacity-40 cursor-not-allowed' : ''
                                }`}
                                style={{
                                    background: isLocked
                                        ? 'rgba(239, 68, 68, 0.08)'
                                        : digit
                                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)'
                                            : 'rgba(255, 255, 255, 0.08)',
                                    border: isLocked
                                        ? '2px solid rgba(239, 68, 68, 0.3)'
                                        : digit
                                            ? '2px solid rgba(59, 130, 246, 0.6)'
                                            : '2px solid rgba(255, 255, 255, 0.15)',
                                    color: '#ffffff',
                                    boxShadow: digit && !isLocked
                                        ? '0 0 20px rgba(59, 130, 246, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                                        : 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
                                }}
                            />
                        ))}
                    </div>

                    {/* Error & Warning Display */}
                    {isLocked ? (
                        <motion.div
                            className="mb-6 p-4 rounded-xl"
                            style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '2px solid rgba(239, 68, 68, 0.6)',
                                boxShadow: '0 0 25px rgba(239, 68, 68, 0.3)',
                            }}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className="text-red-400 font-bold text-center text-base mb-1 flex items-center justify-center gap-2">
                                <Lock className="w-4 h-4 text-red-400" />
                                <span>Maximum 3 Attempts Exceeded</span>
                            </div>
                            <p className="text-xs text-red-200 text-center leading-relaxed">
                                In accordance with UPI / NPCI security protocols, further attempts are blocked for 5 minutes to prevent unauthorized access.
                            </p>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            className="mb-6 p-4 rounded-xl"
                            style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '2px solid rgba(239, 68, 68, 0.4)',
                                boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
                            }}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <p className="text-sm text-red-300 text-center font-semibold">{error}</p>
                            {attemptsRemaining !== undefined && attemptsRemaining > 0 && (
                                <p className="text-xs text-amber-300 text-center mt-1.5 font-medium">
                                    ⚠️ Caution: Only {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} left before your UPI PIN is blocked.
                                </p>
                            )}
                        </motion.div>
                    ) : null}

                    {/* Security Notice */}
                    <div className="flex items-center justify-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'}`} />
                        <p className="text-xs text-blue-200/60 text-center">
                            {isLocked
                                ? 'Security lockout active for 5 minutes'
                                : 'Maximum 3 attempts allowed • Protected by DEEPBLUE AI'}
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
