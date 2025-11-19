import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bot, User, Loader, Video, Volume2, RefreshCw } from 'lucide-react';
import { MessageRole } from '../../types/api.types';
import { hasVideoForQuestion, getVideoUrl, getAnotherVideoUrl, hasMoreVideos } from '../../utils/videoUtils';

interface ChatBubbleProps {
  role: MessageRole;
  content: string;
  timestamp?: Date;
  showAvatar?: boolean;
  onSpeak?: (text: string) => Promise<void>;
  isSpeaking?: boolean;
  highlightWatchListen?: boolean;
  questionNumber?: number | null;
  language?: string;
  onWatchVideo?: (videoUrl: string) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  role,
  content,
  timestamp,
  showAvatar = true,
  onSpeak,
  isSpeaking = false,
  highlightWatchListen = false,
  questionNumber = null,
  language = 'en',
  onWatchVideo,
}) => {
  const { t } = useTranslation();
  const isBot = role === 'assistant';
  const isUser = role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasMoreVideosAvailable, setHasMoreVideosAvailable] = useState(false);
  
  // Check if content is a video URL
  const isVideoContent = content.startsWith('/videos/');
  
  // Check if video exists for this question (async)
  useEffect(() => {
    if (questionNumber && isBot) {
      hasVideoForQuestion(questionNumber, language).then((has) => {
        setHasVideo(has);
        // For video messages, check if there are more videos available beyond the current one
        if (has && isVideoContent) {
          hasMoreVideos(questionNumber, language, content).then(setHasMoreVideosAvailable);
        } else {
          setHasMoreVideosAvailable(false);
        }
      });
    } else {
      setHasVideo(false);
      setHasMoreVideosAvailable(false);
    }
  }, [questionNumber, language, isBot, isVideoContent, content]);

  const handleSpeak = async () => {
    if (!onSpeak || !content.trim()) return;
    
    setIsPlaying(true);
    try {
      await onSpeak(content);
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const bubbleVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  const handleWatch = async () => {
    if (!onWatchVideo || !questionNumber) return;
    
    // Get video URL for this question
    const videoUrl = await getVideoUrl(questionNumber, language);
    
    if (videoUrl) {
      onWatchVideo(videoUrl);
    }
  };

  const handleSeeAnotherExample = async () => {
    if (!onWatchVideo || !questionNumber || !isVideoContent) return;
    
    // Get a different video URL for this question
    const anotherVideoUrl = await getAnotherVideoUrl(questionNumber, language, content);
    
    if (anotherVideoUrl) {
      onWatchVideo(anotherVideoUrl);
    }
  };

  const handleListen = async () => {
    if (onSpeak && content.trim()) {
      await handleSpeak();
    }
  };

  const isRTL = language === 'ar';
  
  return (
    <motion.div
      className={`flex items-end gap-2 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      initial="hidden"
      animate="visible"
      variants={bubbleVariants}
    >
      {/* For user messages: message first, then icon at the end */}
      {/* For bot messages: icon first, then message */}
      {isUser ? (
        <>
          {/* Message bubble */}
          <div className={`flex flex-col items-end max-w-[75%]`} dir={isRTL ? 'rtl' : 'ltr'}>
            {isVideoContent ? (
              <div
                className={`px-4 py-3 rounded-2xl bg-green-500 text-white rounded-tr-sm`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <video
                  src={content}
                  controls
                  className="max-w-full h-auto rounded-lg"
                  style={{ maxHeight: '400px' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div
                className={`px-4 py-3 rounded-2xl bg-green-500 text-white rounded-tr-sm`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <p className={`text-base leading-relaxed whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
                  {content}
                </p>
              </div>
            )}
            {/* Timestamp */}
            {timestamp && (
              <span className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          
          {/* Avatar - at the end for user messages */}
          {showAvatar && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-primary-500">
              <User size={20} className="text-white" />
            </div>
          )}
        </>
      ) : (
        <>
          {/* Avatar - at the start for bot messages */}
          {showAvatar && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-300">
              <Bot size={20} className="text-gray-700" />
            </div>
          )}

          {/* Message bubble */}
          <div className={`flex flex-col items-start max-w-[75%]`} dir={isRTL ? 'rtl' : 'ltr'}>
            {isVideoContent ? (
              <div
                className={`px-4 py-3 rounded-2xl bg-gray-200 text-gray-900 rounded-tl-sm`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <video
                  src={content}
                  controls
                  className="max-w-full h-auto rounded-lg"
                  style={{ maxHeight: '400px' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div
                className={`px-4 py-3 rounded-2xl bg-gray-200 text-gray-900 rounded-tl-sm`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <p className={`text-base leading-relaxed whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
                  {content}
                </p>
              </div>
            )}

            {/* Watch and Listen buttons (only for bot messages) - positioned below bubble at the end */}
            <div className={`flex items-center gap-2 mt-2 self-end relative`} dir={isRTL ? 'rtl' : 'ltr'}>
              {highlightWatchListen && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
                  <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-yellow-400 drop-shadow-lg"></div>
                </div>
              )}
              {/* For video messages, show "See Another Example" button only if more videos are available */}
              {isVideoContent && hasMoreVideosAvailable ? (
                <button
                  onClick={handleSeeAnotherExample}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                    highlightWatchListen
                      ? 'border-yellow-500 bg-yellow-200 text-gray-800 hover:bg-yellow-300 shadow-md shadow-yellow-400/50 scale-105'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw size={14} />
                  {t('chat.seeAnotherExample')}
                </button>
              ) : (
                <>
                  {/* For text messages, show Watch and Listen buttons */}
                  {hasVideo && !isVideoContent && (
                    <button
                      onClick={handleWatch}
                      className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                        highlightWatchListen
                          ? 'border-yellow-500 bg-yellow-200 text-gray-800 hover:bg-yellow-300 shadow-md shadow-yellow-400/50 scale-105'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Video size={14} />
                      Watch
                    </button>
                  )}
                  {!isVideoContent && (
                    <button
                      onClick={handleListen}
                      disabled={isPlaying || isSpeaking}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isPlaying || isSpeaking
                          ? 'bg-primary-100 text-primary-600'
                          : highlightWatchListen
                          ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 shadow-md shadow-yellow-400/50 scale-105'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                      }`}
                      title={isPlaying || isSpeaking ? 'Speaking...' : 'Listen'}
                      aria-label={isPlaying || isSpeaking ? 'Speaking...' : 'Listen'}
                    >
                      {isPlaying || isSpeaking ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <Volume2 size={18} />
                      )}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Timestamp */}
            {timestamp && (
              <span className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default ChatBubble;
