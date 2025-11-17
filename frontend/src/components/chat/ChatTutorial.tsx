import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentStep: number;
  onStepChange?: (step: number) => void;
}

const TOTAL_STEPS = 5;

const ChatTutorial: React.FC<ChatTutorialProps> = ({ 
  isOpen, 
  onClose, 
  onComplete, 
  currentStep: externalStep,
  onStepChange 
}) => {
  const { t } = useTranslation();
  const [internalStep, setInternalStep] = useState(1);
  const currentStep = externalStep || internalStep;

  // Reset to step 1 when opened
  useEffect(() => {
    if (isOpen) {
      const step = 1;
      setInternalStep(step);
      onStepChange?.(step);
    }
  }, [isOpen, onStepChange]);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      const nextStep = currentStep + 1;
      setInternalStep(nextStep);
      onStepChange?.(nextStep);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setInternalStep(prevStep);
      onStepChange?.(prevStep);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  const tutorialSteps = [
    {
      title: t('chat.tutorial.step1.title'),
      description: t('chat.tutorial.step1.description'),
    },
    {
      title: t('chat.tutorial.step2.title'),
      description: t('chat.tutorial.step2.description'),
    },
    {
      title: t('chat.tutorial.step3.title'),
      description: t('chat.tutorial.step3.description'),
    },
    {
      title: t('chat.tutorial.step4.title'),
      description: t('chat.tutorial.step4.description'),
    },
    {
      title: t('chat.tutorial.step5.title'),
      description: t('chat.tutorial.step5.description'),
    },
  ];

  const currentStepData = tutorialSteps[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-20"
            onClick={onClose}
          />

          {/* Tutorial Modal - Positioned based on step */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className={`fixed z-50 p-4 ${
              currentStep === 1 
                ? 'inset-0 flex items-center justify-center' 
                : currentStep === 2
                ? 'top-20 right-4'
                : currentStep === 3
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                : currentStep === 4
                ? 'bottom-32 left-1/2 -translate-x-1/2'
                : 'bottom-32 right-4'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white/50 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/40">
              {/* Header - Blue section with dots and step indicator */}
              <div className="bg-blue-600/70 backdrop-blur-md px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  {/* Progress dots */}
                  <div className="flex items-center gap-2">
                    {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index + 1 <= currentStep
                            ? 'bg-white'
                            : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="text-white hover:text-gray-200 transition-colors"
                    aria-label="Close tutorial"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Step indicator */}
                <div className="text-white text-sm font-medium">
                  Step {currentStep} of {TOTAL_STEPS}
                </div>
              </div>

              {/* Body - White section with content */}
              <div className="px-6 py-6 bg-white/40 backdrop-blur-md">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-3 drop-shadow-sm">
                      {currentStepData.title}
                    </h2>
                    <p className="text-gray-700 text-base leading-relaxed drop-shadow-sm">
                      {currentStepData.description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation buttons */}
                <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-200">
                  {/* Back button */}
                  <button
                    onClick={handleBack}
                    disabled={isFirstStep}
                    className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFirstStep
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ChevronLeft size={18} />
                    {t('common.back')}
                  </button>

                  {/* Skip button */}
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    {t('chat.tutorial.skip')}
                  </button>

                  {/* Next/Start button */}
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-6 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                  >
                    {isLastStep ? t('chat.tutorial.start') : (
                      <>
                        {t('common.next')}
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatTutorial;

