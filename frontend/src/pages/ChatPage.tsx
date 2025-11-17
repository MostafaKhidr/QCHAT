import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Loader, Volume2, ArrowLeft, HelpCircle, Mic } from 'lucide-react';
import { ChatBubble, Button, Modal } from '../components/ui';
import ChatTutorial from '../components/chat/ChatTutorial';
import { useChat } from '../hooks/useChat';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useTTS } from '../hooks/useTTS';
import useSessionStore from '../store/sessionStore';
import { getVideoUrl } from '../utils/videoUtils';
import { MessageRole } from '../types/api.types';

const ChatPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const {
    messages,
    isSending,
    chatError,
    isTyping,
    isComplete,
    initializeChat,
    sendMessage,
    sendQuickAnswer,
  } = useChat();

  const { currentSession, currentQuestionNumber, sessionHistory } = useSessionStore();
  const { isListening, transcript, isSupported, isProcessing, startListening, stopListening, clearTranscript } =
    useVoiceInput();
  const { isSpeaking, isEnabled: isTTSEnabled, speak } = useTTS();

  // Wrapper function to speak a message (forces TTS even if globally disabled)
  const speakMessage = async (text: string) => {
    await speak(text, undefined, true);
  };

  const [inputValue, setInputValue] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef<string | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const quickAnswerRef = useRef<HTMLDivElement>(null);
  const voiceButtonRef = useRef<HTMLButtonElement>(null);

  // Sync i18n language with session language
  useEffect(() => {
    if (currentSession?.language && currentSession.language !== i18n.language) {
      i18n.changeLanguage(currentSession.language);
    }
  }, [currentSession?.language, i18n]);

  // Check if tutorial should be shown (first-time user)
  // This runs once when component mounts and session is available
  useEffect(() => {
    if (!currentSession || tutorialChecked) return;

    // Check if tutorial was already completed
    const tutorialCompleted = localStorage.getItem('mchat-tutorial-completed');
    
    // Show tutorial if:
    // 1. Tutorial hasn't been completed before
    // 2. This is a new session (no messages yet) - not a resumed session
    // 3. User has no completed sessions in history (first-time user)
    if (!tutorialCompleted && messages.length === 0) {
      const hasCompletedSessions = sessionHistory.some(
        (session) => session.status === 'completed'
      );
      
      // Show for first-time users (no completed sessions) or if no history at all
      if (!hasCompletedSessions) {
        setShowTutorial(true);
      }
    }
    
    setTutorialChecked(true);
  }, [currentSession, sessionHistory, messages.length, tutorialChecked]);

  // Initialize chat on mount - only once per token
  // Delay initialization if tutorial is showing
  useEffect(() => {
    // Skip if already initialized for this token
    if (initializedRef.current === token) {
      return;
    }

    // Skip if currently initializing (prevent duplicate calls)
    if (isInitializingRef.current) {
      return;
    }

    // Skip if messages already exist (session was resumed)
    if (messages.length > 0) {
      initializedRef.current = token || null;
      return;
    }

    // Skip if no token
    if (!token) {
      return;
    }

    // Skip if tutorial is showing (wait for it to complete)
    if (showTutorial) {
      return;
    }

    // Mark as initializing
    isInitializingRef.current = true;

    // Initialize chat
    initializeChat().then((result) => {
      isInitializingRef.current = false;
      if (result.success && result.newSessionToken) {
        // Set initializedRef BEFORE navigating to prevent duplicate initialization
        initializedRef.current = result.newSessionToken;
        // Navigate to the new session URL
        navigate(`/chat/${result.newSessionToken}`, { replace: true });
      } else {
        initializedRef.current = token;
      }
    }).catch(() => {
      isInitializingRef.current = false;
    });
  }, [token, messages.length, initializeChat, showTutorial, navigate]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
      clearTranscript();
    }
  }, [transcript, clearTranscript]);

  // Navigate to report when complete
  useEffect(() => {
    if (isComplete) {
      setTimeout(() => {
        navigate(`/report/${token}`);
      }, 10000); // Redirect after 10 seconds
    }
  }, [isComplete, navigate, token]);

  // Auto-speak bot messages when TTS is enabled
  useEffect(() => {
    if (messages.length > 0 && isTTSEnabled && !isSpeaking) {
      const lastMessage = messages[messages.length - 1];

      // Only speak assistant messages (bot responses)
      if (lastMessage.role === 'assistant') {
        speak(lastMessage.content);
      }
    }
  }, [messages, isTTSEnabled, isSpeaking, speak]);

  const handleSend = async (message?: string) => {
    const textToSend = message || inputValue.trim();

    if (!textToSend || isSending) return;

    setInputValue('');
    await sendMessage(textToSend);

    // Focus input after sending
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleQuickAnswer = async (answer: 'yes' | 'no') => {
    if (isSending) return;
    // Send the translated text based on current language instead of English
    const translatedAnswer = t(`chat.quickAnswers.${answer}`);
    await sendMessage(translatedAnswer);
  };

  const handleWatchVideo = (videoUrl: string) => {
    // Add an assistant (bot) message with the video URL to send it in the chat
    // The ChatBubble will detect it's a video and render it
    const { addMessage } = useSessionStore.getState();
    addMessage(MessageRole.ASSISTANT, videoUrl);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isListening) {
      console.log('Stopping recording...', { isProcessing, isSending, isComplete });
      stopListening();
    } else {
      console.log('Starting recording...');
      try {
        await startListening();
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

  const handleExit = () => {
    setShowExitModal(false);
    navigate('/');
  };

  const handleTutorialClose = () => {
    // Just close the tutorial without marking as completed
    // This allows users to see it again if they want
    setShowTutorial(false);
    
    // Initialize chat after tutorial is closed (if not already initialized)
    if (token && initializedRef.current !== token && messages.length === 0) {
      initializeChat().then((result) => {
        if (result.success && result.newSessionToken) {
          // Navigate to the new session URL
          navigate(`/chat/${result.newSessionToken}`, { replace: true });
          initializedRef.current = result.newSessionToken;
        } else {
          initializedRef.current = token;
        }
      });
    }
  };

  const handleTutorialComplete = () => {
    // Mark tutorial as completed in localStorage
    localStorage.setItem('mchat-tutorial-completed', 'true');
    setShowTutorial(false);
    
    // Initialize chat after tutorial is completed (if not already initialized)
    if (token && initializedRef.current !== token && messages.length === 0) {
      initializeChat().then((result) => {
        if (result.success && result.newSessionToken) {
          // Navigate to the new session URL
          navigate(`/chat/${result.newSessionToken}`, { replace: true });
          initializedRef.current = result.newSessionToken;
        } else {
          initializedRef.current = token;
        }
      });
    }
  };

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-primary-500" size={40} />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Back arrow + Child name */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExitModal(true)}
                className="p-1 text-gray-700 hover:text-gray-900 transition-colors"
                aria-label="Back"
                title="Back"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">
                {currentSession?.child_name || t('chat.title')}
              </h1>
            </div>
            
            {/* Right: Question mark + Progress */}
            <div className="flex items-center gap-3">
              <button
                className="p-1 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Help"
                title="Help"
              >
                <HelpCircle size={20} />
              </button>
              <div 
                ref={progressRef}
                className={`flex items-center gap-2 transition-all ${
                  showTutorial && tutorialStep === 2 
                    ? 'ring-4 ring-yellow-400 ring-offset-4 rounded-lg px-2 py-1 bg-yellow-50 shadow-lg shadow-yellow-400/50 animate-pulse' 
                    : ''
                }`}
              >
                <span className="text-sm font-medium text-gray-700">
                  {currentQuestionNumber || 0}/20
                </span>
                <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionNumber || 0) / 20) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.map((message, index) => {
            // For assistant messages, use currentQuestionNumber if it's the last message
            // For video messages, also use currentQuestionNumber to enable "See Another Example"
            const isLastAssistantMessage = message.role === 'assistant' && index === messages.length - 1;
            const isVideoMessage = message.content.startsWith('/videos/');
            const questionNumberForMessage = (isLastAssistantMessage || isVideoMessage) ? currentQuestionNumber : null;
            const language = currentSession?.language || 'en';
            
            return (
              <ChatBubble
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                showAvatar={false}
                onSpeak={speakMessage}
                isSpeaking={isSpeaking}
                highlightWatchListen={
                  message.role === 'assistant' && 
                  index === messages.length - 1 && 
                  showTutorial && 
                  tutorialStep === 3
                }
                questionNumber={questionNumberForMessage}
                language={language}
                onWatchVideo={handleWatchVideo}
              />
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <span className="text-sm text-gray-500">{t('chat.typing')}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Error Message */}
          {chatError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{chatError}</p>
            </div>
          )}

          {/* Quick Answer Buttons */}
          {!isComplete && currentQuestionNumber && (
            <div 
              ref={quickAnswerRef}
              className={`flex gap-2 mb-3 justify-start transition-all ${
                showTutorial && tutorialStep === 4 
                  ? 'ring-4 ring-yellow-400 ring-offset-4 rounded-lg p-2 bg-yellow-50/90 shadow-lg shadow-yellow-400/50 animate-pulse' 
                  : ''
              }`}
            >
              <button
                onClick={() => handleQuickAnswer('yes')}
                disabled={isSending}
                className={`px-3 py-1.5 rounded-xl border-2 text-sm font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  showTutorial && tutorialStep === 4
                    ? 'border-yellow-500 bg-yellow-200 text-gray-800 shadow-md shadow-yellow-400/50 scale-105'
                    : 'border-gray-300 bg-gray-200 text-gray-700'
                }`}
              >
                {t('chat.quickAnswers.yes')}
              </button>
              <button
                onClick={() => handleQuickAnswer('no')}
                disabled={isSending}
                className={`px-3 py-1.5 rounded-xl border-2 text-sm font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  showTutorial && tutorialStep === 4
                    ? 'border-yellow-500 bg-yellow-200 text-gray-800 shadow-md shadow-yellow-400/50 scale-105'
                    : 'border-gray-300 bg-gray-200 text-gray-700'
                }`}
              >
                {t('chat.quickAnswers.no')}
              </button>
            </div>
          )}

          {/* Input Field */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? t('chat.voiceListening') : 'Type your response...'}
                disabled={isSending || isComplete || isProcessing}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Voice Button */}
            {isSupported && (
              <button
                ref={voiceButtonRef}
                onClick={handleVoiceToggle}
                disabled={isSending || isComplete || isProcessing}
                className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  showTutorial && tutorialStep === 5
                    ? 'ring-4 ring-yellow-400 ring-offset-4 shadow-lg shadow-yellow-400/50 scale-105 animate-pulse'
                    : ''
                } ${
                  isListening
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-700 text-white hover:bg-gray-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Mic size={18} />
                Voice
              </button>
            )}

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isSending || isComplete}
              className="px-6 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSending ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  {t('chat.sendButton')}
                </>
              )}
            </button>
          </div>

          {/* Voice Listening Indicator */}
          {isListening && (
            <motion.div
              className="mt-2 text-sm text-primary-600 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>{t('chat.voiceListening')}</span>
            </motion.div>
          )}

          {/* Voice Processing Indicator */}
          {isProcessing && (
            <motion.div
              className="mt-2 text-sm text-primary-600 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader size={16} className="animate-spin" />
              <span>Processing audio...</span>
            </motion.div>
          )}

          {/* TTS Speaking Indicator */}
          {isSpeaking && (
            <motion.div
              className="mt-2 text-sm text-primary-600 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Volume2 size={16} className="animate-pulse" />
              {t('chat.speaking')}
            </motion.div>
          )}
        </div>
      </div>

      {/* Chat Tutorial */}
      <ChatTutorial
        isOpen={showTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
        currentStep={tutorialStep}
        onStepChange={setTutorialStep}
      />

      {/* Exit Confirmation Modal */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title={t('chat.exit.confirmTitle')}
        size="sm"
        showCloseButton={false}
        closeOnOverlayClick={false}
        footer={
          <div className="flex gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={() => setShowExitModal(false)}
              className="flex-1 border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              {t('chat.exit.cancelButton')}
            </Button>
            <Button 
              variant="danger" 
              onClick={handleExit}
              className="flex-1"
            >
              {t('chat.exit.confirmButton')}
            </Button>
          </div>
        }
      >
        <p className="text-gray-700 text-base">
          {t('chat.exit.confirmMessage', { current: currentQuestionNumber || 0 })}
        </p>
      </Modal>

      {/* Footer */}
      <footer className="py-4 px-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            {t('home.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ChatPage;
