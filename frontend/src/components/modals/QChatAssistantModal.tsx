import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Mic, Send } from 'lucide-react';
import ChatBubble from '../ui/ChatBubble';
import { useTTS } from '../../hooks/useTTS';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import qchatChatAPI from '../../services/qchat-chat-api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface QChatAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionNumber: number;
  token: string;
  language: 'en' | 'ar';
  onAnswerExtracted: (option: string, confidence: number) => void;
}

export default function QChatAssistantModal({
  isOpen,
  onClose,
  questionNumber,
  token,
  language,
  onAnswerExtracted,
}: QChatAssistantModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // TTS hook
  const { speak, isEnabled: isTTSEnabled, isSpeaking: isTTSSpeaking } = useTTS();

  // ASR hook
  const {
    isListening,
    transcript,
    error: voiceError,
    isProcessing: isProcessingVoice,
    startListening,
    stopListening,
  } = useVoiceInput();

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-set input when transcript is available
  useEffect(() => {
    if (transcript && !isListening) {
      setInputMessage(transcript);
      inputRef.current?.focus();
    }
  }, [transcript, isListening]);

  // Initialize chat when modal opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeChat();
    }
    // Reset when modal closes
    if (!isOpen) {
      setIsInitialized(false);
      setMessages([]);
      setChatId(null);
    }
  }, [isOpen, questionNumber]);

  const initializeChat = async () => {
    setIsLoading(true);
    try {
      const data = await qchatChatAPI.startChat(token, {
        question_number: questionNumber,
        language: language,
      });

      setChatId(data.chat_id);
      setMessages(data.existing_messages || []);
      setIsInitialized(true);

      // Speak welcome message if TTS enabled
      if (isTTSEnabled && data.message) {
        speak(data.message, language);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      // Fallback welcome message
      const fallbackMsg: ChatMessage = {
        role: 'assistant',
        content:
          language === 'ar'
            ? `مرحباً! أنا هنا لمساعدتك في السؤال ${questionNumber}.`
            : `Hi! I'm here to help you with Question ${questionNumber}.`,
        timestamp: new Date().toISOString(),
      };
      setMessages([fallbackMsg]);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !chatId || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const data = await qchatChatAPI.sendMessage(token, {
        message: userMessage.content,
        chat_id: chatId,
      });

      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Speak assistant response if TTS enabled
      if (isTTSEnabled && data.message) {
        speak(data.message, language);
      }

      // If answer was extracted, handle it
      if (data.is_complete && data.extracted_option) {
        // Wait 2 seconds before closing to let user see the message
        setTimeout(() => {
          onAnswerExtracted(data.extracted_option!, data.confidence || 1.0);
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content:
          language === 'ar'
            ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
            : 'Sorry, an error occurred. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceInput = async () => {
    try {
      if (isListening) {
        stopListening();
      } else {
        await startListening();
      }
    } catch (error) {
      console.error('Voice input error:', error);
    }
  };

  const handleSpeak = async (text: string) => {
    try {
      await speak(text, language, true); // force=true to bypass isEnabled check for manual button clicks
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  };

  return (
    <>

      {/* Chat Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed bottom-0 right-0 flex max-w-full pl-10 pr-4">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-3xl">
                    <div className="flex h-screen flex-col bg-white shadow-xl rounded-tl-2xl" style={{ height: '85vh', maxHeight: '900px', marginBottom: '20px', marginRight: '20px' }}>
                      {/* Header */}
                      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6 sm:px-8">
                        <div className="flex items-center justify-between">
                          <Dialog.Title className="text-xl font-semibold text-white">
                            {language === 'ar'
                              ? `مساعد الذكاء الاصطناعي - السؤال ${questionNumber}`
                              : `AI Assistant - Question ${questionNumber}`}
                          </Dialog.Title>
                          <button
                            type="button"
                            className="rounded-md text-white hover:text-primary-100 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                            onClick={onClose}
                          >
                            <span className="sr-only">Close panel</span>
                            <X className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 bg-gray-50">
                        {isLoading && messages.length === 0 ? (
                          <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {messages.map((msg, index) => (
                              <ChatBubble
                                key={index}
                                role={msg.role}
                                content={msg.content}
                                language={language}
                                onSpeak={msg.role === 'assistant' ? () => handleSpeak(msg.content) : undefined}
                                isSpeaking={msg.role === 'assistant' ? isTTSSpeaking : false}
                              />
                            ))}
                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </div>

                      {/* Input Area */}
                      <div className="border-t border-gray-200 px-6 py-4 sm:px-8 bg-white">
                        <div className="flex items-center space-x-3">
                          <input
                            ref={inputRef}
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={
                              language === 'ar'
                                ? 'اكتب رسالتك...'
                                : 'Type your message...'
                            }
                            className="flex-1 rounded-xl border-2 border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            disabled={isLoading}
                          />
                          <button
                            onClick={handleVoiceInput}
                            className={`p-3 rounded-xl transition-all ${
                              isListening
                                ? 'bg-red-600 text-white animate-pulse shadow-lg'
                                : isProcessingVoice
                                ? 'bg-yellow-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            disabled={isLoading || isProcessingVoice}
                            aria-label="Voice input"
                            title={isListening ? 'Click to stop listening' : 'Click to start voice input'}
                          >
                            <Mic className="w-6 h-6" />
                          </button>
                          <button
                            onClick={sendMessage}
                            className="bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            disabled={isLoading || !inputMessage.trim()}
                            aria-label="Send message"
                          >
                            <Send className="w-6 h-6" />
                          </button>
                        </div>
                        {(isListening || isProcessingVoice || voiceError) && (
                          <div className="mt-2">
                            {isListening && (
                              <p className="text-sm text-red-600">
                                {language === 'ar' ? 'جاري الاستماع...' : 'Listening...'}
                              </p>
                            )}
                            {isProcessingVoice && !isListening && (
                              <p className="text-sm text-yellow-600">
                                {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                              </p>
                            )}
                            {voiceError && (
                              <p className="text-sm text-red-600">
                                {voiceError}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
