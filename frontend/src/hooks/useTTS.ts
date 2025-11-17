/**
 * Text-to-Speech (TTS) Hook
 *
 * Provides text-to-speech functionality using ElevenLabs API via backend.
 * Features:
 * - Warm female voices for Arabic (Saudi) and English
 * - Auto-play bot messages
 * - Manual speak/stop controls
 * - User preference toggle
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { speechAPI } from '../services/speech-api';
import useSessionStore from '../store/sessionStore';

/**
 * Text-to-Speech hook for speaking bot messages
 */
export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(() => {
    // Load TTS preference from localStorage
    const saved = localStorage.getItem('mchat-tts-enabled');
    return saved === 'true';
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const { currentSession } = useSessionStore();

  // Save preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('mchat-tts-enabled', String(isEnabled));
  }, [isEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
        currentAudioUrlRef.current = null;
      }
    };
  }, []);

  /**
   * Speak text using TTS
   *
   * @param text - Text to speak (max 5000 characters)
   * @param forceLanguage - Optional language override ('en' or 'ar')
   * @param force - If true, bypass the isEnabled check (for manual button clicks)
   */
  const speak = useCallback(
    async (text: string, forceLanguage?: 'en' | 'ar', force: boolean = false) => {
      if ((!isEnabled && !force) || !text.trim()) {
        return;
      }

      setError(null);

      try {
        // Stop any current audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Revoke previous audio URL
        if (currentAudioUrlRef.current) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
          currentAudioUrlRef.current = null;
        }

        setIsSpeaking(true);

        // Get language from session or use override
        const language = forceLanguage || currentSession?.language || 'en';

        // Get audio from backend
        const audioBlob = await speechAPI.synthesize(text, language);

        // Create audio element
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudioUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        // Set up event listeners
        audio.onended = () => {
          setIsSpeaking(false);
          if (currentAudioUrlRef.current) {
            URL.revokeObjectURL(currentAudioUrlRef.current);
            currentAudioUrlRef.current = null;
          }
        };

        audio.onerror = (e) => {
          console.error('TTS audio playback error:', e);
          setError('Failed to play audio');
          setIsSpeaking(false);
          if (currentAudioUrlRef.current) {
            URL.revokeObjectURL(currentAudioUrlRef.current);
            currentAudioUrlRef.current = null;
          }
        };

        // Play audio
        await audio.play();
      } catch (err: any) {
        console.error('TTS error:', err);
        setError(err.message || 'Failed to synthesize speech');
        setIsSpeaking(false);
      }
    },
    [isEnabled, currentSession?.language]
  );

  /**
   * Stop speaking immediately
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  /**
   * Toggle TTS on/off
   */
  const toggleTTS = useCallback(() => {
    const newState = !isEnabled;
    setIsEnabled(newState);

    // Stop speaking if disabling
    if (!newState && isSpeaking) {
      stop();
    }
  }, [isEnabled, isSpeaking, stop]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isSpeaking,
    isEnabled,
    error,

    // Actions
    speak,
    stop,
    toggleTTS,
    setIsEnabled,
    clearError,
  };
};

export default useTTS;
