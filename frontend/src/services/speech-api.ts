/**
 * Speech API Service
 *
 * Handles communication with backend speech endpoints for:
 * - ASR (Automatic Speech Recognition) - Audio to Text
 * - TTS (Text-to-Speech) - Text to Audio
 */

import api from './api';

/**
 * Transcription result from ASR service
 */
export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  success: boolean;
  error?: string;
}

/**
 * Speech API Service Class
 */
class SpeechAPI {
  /**
   * Transcribe audio to text using ElevenLabs Speech-to-Text API
   *
   * @param audioBlob - Audio blob to transcribe (WAV, MP3, M4A, WEBM, OGG, FLAC, AAC, etc.)
   * @param language - Language code ('en' for English, 'ar' for Arabic, or null for auto-detection)
   * @returns Transcription result with text and confidence score
   *
   * @example
   * ```typescript
   * const audioBlob = new Blob([audioData], { type: 'audio/webm' });
   * const result = await speechAPI.transcribe(audioBlob, 'ar');
   * console.log(result.text); // "مرحباً"
   * console.log(result.confidence); // 0.95
   * ```
   */
  async transcribe(
    audioBlob: Blob,
    language: 'en' | 'ar' = 'en'
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, `audio.${this.getFileExtension(audioBlob.type)}`);

    const response = await api.post<TranscriptionResult>(
      `/api/speech/transcribe?language=${language}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds for ASR processing
      }
    );

    return response.data;
  }

  /**
   * Synthesize text to speech using ElevenLabs API
   *
   * @param text - Text to synthesize (max 5000 characters)
   * @param language - Language code ('en' for English, 'ar' for Arabic)
   * @returns Audio blob in MP3 format
   *
   * @example
   * ```typescript
   * const audioBlob = await speechAPI.synthesize("Hello, how are you?", 'en');
   * const audioUrl = URL.createObjectURL(audioBlob);
   * const audio = new Audio(audioUrl);
   * await audio.play();
   * ```
   */
  async synthesize(text: string, language: 'en' | 'ar' = 'en'): Promise<Blob> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (text.length > 5000) {
      throw new Error('Text too long (max 5000 characters)');
    }

    const response = await api.post(
      '/api/speech/synthesize',
      { text, language },
      {
        responseType: 'blob',
        timeout: 30000, // 30 seconds for TTS processing
      }
    );

    return response.data;
  }

  /**
   * Get file extension from MIME type
   *
   * @param mimeType - MIME type (e.g., 'audio/webm')
   * @returns File extension (e.g., 'webm')
   */
  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/m4a': 'm4a',
      'audio/ogg': 'ogg',
    };

    return extensions[mimeType] || 'webm';
  }
}

// Export singleton instance
export const speechAPI = new SpeechAPI();
export default speechAPI;
