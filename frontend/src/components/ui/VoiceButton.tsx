import React from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  isSupported,
  onClick,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const sizeStyles: Record<string, string> = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  };

  const iconSizes: Record<string, number> = {
    sm: 18,
    md: 20,
    lg: 24,
  };

  // Button should always be enabled when listening (to allow stopping)
  const isDisabled = (disabled || !isSupported) && !isListening;

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('VoiceButton clicked', { 
            isDisabled, 
            isListening, 
            disabled,
            isSupported 
          });
          // Always allow click when listening (to stop)
          if (!isDisabled || isListening) {
            onClick();
          } else {
            console.warn('Button click ignored - disabled and not listening');
          }
        }}
        disabled={isDisabled}
        className={`
          ${sizeStyles[size]}
          rounded-xl
          flex items-center justify-center
          transition-all duration-200
          relative
          ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
              : 'bg-gray-700 hover:bg-gray-800 active:bg-gray-900'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-md hover:shadow-lg
          ${!isDisabled ? 'cursor-pointer' : ''}
          z-20
          ${className}
        `}
        whileHover={{ scale: isDisabled ? 1 : 1.1 }}
        whileTap={{ scale: isDisabled ? 1 : 0.95 }}
        aria-label={isListening ? 'Stop recording' : 'Start voice input'}
        title={isListening ? 'Click to stop recording' : 'Click to start voice input'}
      >
        <span className="relative z-10">
          {isListening ? (
            <Mic size={iconSizes[size]} className="text-white" />
          ) : (
            <Mic size={iconSizes[size]} className="text-white" />
          )}
        </span>
      </motion.button>

      {/* Recording animation - behind button */}
      {isListening && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500 opacity-50 pointer-events-none"
            style={{ zIndex: 0 }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500 opacity-30 pointer-events-none"
            style={{ zIndex: 0 }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.3,
            }}
          />
        </>
      )}

      {/* Not supported indicator */}
      {!isSupported && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white" />
      )}
    </div>
  );
};

export default VoiceButton;
