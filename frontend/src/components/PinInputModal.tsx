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

    // Focus first input when modal opens
    useEffect(() => {
        if (isOpen) {
            setPin(['', '', '', '']);
            setTimeout(() => inputRefs[0].current?.focus(), 100);
        }
    }, [isOpen]);

    const handleChange = (index: number, value: string) => {
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
                        border: '1.5px solid rgba(59, 130, 246, 0.45)',
                        boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 50px rgba(59, 130, 246, 0.2)',
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
                    <div className="flex flex-col items-center mb-8">
                        <motion.div
                            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                            style={{
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)',
                                border: '2px solid rgba(59, 130, 246, 0.4)',
                                boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
                            }}
                            animate={{
                                boxShadow: [
                                    '0 0 30px rgba(59, 130, 246, 0.3)',
                                    '0 0 40px rgba(59, 130, 246, 0.5)',
                                    '0 0 30px rgba(59, 130, 246, 0.3)',
                                ],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Lock className="w-10 h-10 text-blue-400" />
                        </motion.div>
                        <h2 className="text-3xl font-bold mb-3 text-white">Enter Your PIN</h2>
                        <p className="text-base text-blue-200/80 text-center">
                            Enter your 4-digit transaction PIN to confirm payment
                        </p>
                    </div>

                    {/* PIN Input */}
                    <div className="flex gap-4 justify-center mb-8">
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={inputRefs[index]}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                className="w-16 h-20 text-center text-3xl font-bold rounded-xl focus:outline-none transition-all"
                                style={{
                                    background: digit
                                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)'
                                        : 'rgba(255, 255, 255, 0.08)',
                                    border: digit
                                        ? '2px solid rgba(59, 130, 246, 0.6)'
                                        : '2px solid rgba(255, 255, 255, 0.15)',
                                    color: '#ffffff',
                                    boxShadow: digit
                                        ? '0 0 20px rgba(59, 130, 246, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                                        : 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
                                }}
                            />
                        ))}
                    </div>

                    {/* Error message */}
                    {error && (
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
                            <p className="text-base text-red-300 text-center font-semibold">{error}</p>
                            {attemptsRemaining !== undefined && attemptsRemaining > 0 && (
                                <p className="text-sm text-red-300/70 text-center mt-2">
                                    {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} remaining
                                </p>
                            )}
                        </motion.div>
                    )}

                    {/* Info */}
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <p className="text-sm text-blue-200/60 text-center">
                            Your PIN is encrypted and verified securely
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
