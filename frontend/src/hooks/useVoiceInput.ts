/**
 * Voice Input Hook (ASR - Automatic Speech Recognition)
 *
 * Records audio and transcribes to text using ElevenLabs Speech-to-Text API via backend.
 * Features:
 * - High-accuracy Arabic recognition (supports 99 languages)
 * - English recognition
 * - Auto language detection
 * - Confidence scores
 * - Browser microphone access
 */

import { useState, useCallback, useRef } from 'react';
import useSessionStore from '../store/sessionStore';
import { speechAPI } from '../services/speech-api';

/**
 * Voice input hook using backend ASR service
 */
export const useVoiceInput = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true); // Always supported (backend-based)
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { currentSession } = useSessionStore();

  /**
   * Process audio blob for transcription
   */
  const processAudioBlob = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size === 0) {
      setError('Audio recording is empty');
      return;
    }

    setIsProcessing(true);
    try {
      const language = currentSession?.language || 'en';
      const result = await speechAPI.transcribe(audioBlob, language);

      if (result.success) {
        setTranscript(result.text);
        setConfidence(result.confidence);
      } else {
        setError(result.error || 'Transcription failed');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err.message || 'Failed to transcribe audio');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  }, [currentSession?.language]);

  /**
   * Start recording audio from microphone
   */
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setConfidence(0);
    audioChunksRef.current = [];

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono audio
          sampleRate: 16000, // 16kHz recommended for speech
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Determine MIME type (prefer webm for compatibility)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });

      mediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Process audio when stopped
      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder onstop triggered');
        setIsListening(false);
        
        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Small delay to ensure all chunks are collected
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create blob from chunks
        if (audioChunksRef.current.length === 0) {
          setError('No audio recorded');
          mediaRecorderRef.current = null;
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        mediaRecorderRef.current = null;

        // Process the audio
        processAudioBlob(audioBlob);
      };

      // Handle errors
      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setError(`Recording error: ${event.error?.message || 'Unknown'}`);
        setIsListening(false);
        setIsProcessing(false);
      };

      // Start recording with timeslice to ensure data is collected
      mediaRecorder.start(100); // Collect data every 100ms
      setIsListening(true);
    } catch (err: any) {
      console.error('Microphone access error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError(err.message || 'Failed to access microphone');
      }

      setIsListening(false);
      setIsSupported(false);
    }
  }, [currentSession?.language, processAudioBlob]);

  /**
   * Stop recording audio
   */
  const stopListening = useCallback(() => {
    console.log('stopListening called', {
      hasRecorder: !!mediaRecorderRef.current,
      recorderState: mediaRecorderRef.current?.state,
      isListening,
      isProcessing,
      audioChunks: audioChunksRef.current.length
    });

    // Don't do anything if already processing
    if (isProcessing) {
      console.log('Already processing, ignoring stop request');
      return;
    }

    // Immediately set listening to false for UI feedback
    setIsListening(false);

    // Stop media recorder if it's recording
    if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;
      const recorderState = recorder.state;
      console.log('MediaRecorder state:', recorderState);
      
      if (recorderState === 'recording' || recorderState === 'paused') {
        try {
          // Request final data before stopping
          recorder.requestData();
          recorder.stop();
          console.log('MediaRecorder.stop() called successfully');
        } catch (error) {
          console.error('Error stopping MediaRecorder:', error);
          // If stop fails, manually process chunks
          if (audioChunksRef.current.length > 0) {
            const mimeType = recorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            processAudioBlob(audioBlob);
          }
          mediaRecorderRef.current = null;
        }
      } else {
        console.log('MediaRecorder not in recording state, cleaning up');
        mediaRecorderRef.current = null;
      }
    }

    // Stop all audio tracks immediately
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, [isProcessing, processAudioBlob]);

  /**
   * Clear transcript and error
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
    setConfidence(0);
  }, []);

  /**
   * Reset everything
   */
  const reset = useCallback(() => {
    stopListening();
    clearTranscript();
    setIsProcessing(false);
  }, [stopListening, clearTranscript]);

  return {
    // State
    isListening,
    transcript,
    isSupported,
    error,
    confidence,
    isProcessing,

    // Actions
    startListening,
    stopListening,
    clearTranscript,
    reset,
  };
};

export default useVoiceInput;
