"""
Speech service for Text-to-Speech (TTS) and Automatic Speech Recognition (ASR)

TTS: ElevenLabs API (warm female voices for Arabic and English)
ASR: ElevenLabs API (Scribe v1 model with support for 99 languages including Arabic)
"""

import logging
from typing import Literal, Optional
from io import BytesIO
import httpx

from ..config import settings

logger = logging.getLogger(__name__)


class SpeechService:
    """
    Service for handling speech-to-text and text-to-speech operations
    """

    def __init__(self):
        """Initialize speech service with ElevenLabs configurations for TTS and ASR"""
        # ElevenLabs API Configuration
        self.elevenlabs_base_url = "https://api.elevenlabs.io/v1"
        self.elevenlabs_api_key = settings.elevenlabs_api_key
        self.elevenlabs_asr_model = settings.elevenlabs_asr_model or "scribe_v1"
        self.elevenlabs_headers = {
            "xi-api-key": settings.elevenlabs_api_key,
            "Content-Type": "application/json"
        }

        if not settings.elevenlabs_api_key:
            logger.warning("ElevenLabs API key not configured. TTS and ASR will not work.")
        else:
            logger.info(f"ElevenLabs initialized with ASR model: {self.elevenlabs_asr_model}")

    async def transcribe_audio(
        self,
        audio_data: bytes,
        language: Literal["en", "ar"] = "en"
    ) -> dict:
        """
        Transcribe audio to text using ElevenLabs Speech-to-Text API

        Args:
            audio_data: Audio file bytes (WAV, MP3, M4A, AAC, OGG, FLAC, WEBM, etc.)
            language: Language code ("en" for English, "ar" for Arabic)

        Returns:
            {
                "text": "transcribed text",
                "confidence": 0.95,
                "language": "ar",
                "success": True,
                "error": None
            }
        """
        if not self.elevenlabs_api_key:
            return {
                "text": "",
                "confidence": 0.0,
                "language": language,
                "success": False,
                "error": "ElevenLabs API key not configured"
            }

        try:
            # Map language codes to ElevenLabs format (ISO 639-1)
            # ElevenLabs uses "eng" for English and "ara" for Arabic
            # If None is provided, the model will auto-detect the language
            lang_code_map = {
                "en": "eng",
                "ar": "ara"
            }
            language_code = lang_code_map.get(language)

            url = f"{self.elevenlabs_base_url}/speech-to-text"
            
            logger.info(f"Transcribing audio with ElevenLabs (model: {self.elevenlabs_asr_model}, language: {language_code or 'auto-detect'})")

            # Prepare multipart form data
            files = {
                "file": ("audio", BytesIO(audio_data), "audio/wav")
            }
            
            data = {
                "model_id": self.elevenlabs_asr_model,
                "tag_audio_events": False,  # Set to True if you want to tag events like laughter
                "diarize": False,  # Set to True if you want speaker diarization
            }
            
            if language_code:
                data["language_code"] = language_code

            headers = {
                "xi-api-key": self.elevenlabs_api_key
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    files=files,
                    data=data
                )
                response.raise_for_status()

                result = response.json()
                
                # Extract transcription text
                transcribed_text = result.get("text", "")
                detected_language = result.get("language_code", language)
                language_probability = result.get("language_probability", 1.0)

                logger.info(f"Transcription successful: {transcribed_text[:100]}...")
                
                return {
                    "text": transcribed_text,
                    "confidence": language_probability,
                    "language": detected_language,
                    "success": True,
                    "error": None
                }

        except httpx.HTTPStatusError as e:
            error_msg = f"ElevenLabs API error: {e.response.status_code}"
            try:
                error_detail = e.response.json()
                error_msg += f" - {error_detail}"
            except:
                error_msg += f" - {e.response.text}"
            
            logger.error(error_msg)
            return {
                "text": "",
                "confidence": 0.0,
                "language": language,
                "success": False,
                "error": error_msg
            }
        except httpx.TimeoutException:
            logger.error("ElevenLabs ASR request timed out")
            return {
                "text": "",
                "confidence": 0.0,
                "language": language,
                "success": False,
                "error": "ASR request timed out"
            }
        except Exception as e:
            logger.error(f"Transcription error: {e}", exc_info=True)
            return {
                "text": "",
                "confidence": 0.0,
                "language": language,
                "success": False,
                "error": str(e)
            }

    async def synthesize_speech(
        self,
        text: str,
        language: Literal["en", "ar"] = "en"
    ) -> bytes:
        """
        Synthesize speech from text using ElevenLabs API

        Args:
            text: Text to synthesize
            language: Language code ("en" or "ar")

        Returns:
            Audio bytes in MP3 format

        Raises:
            Exception: If TTS fails or API key not configured
        """
        if not settings.elevenlabs_api_key:
            raise Exception("ElevenLabs API key not configured")

        # Select voice based on language
        voice_id = (
            settings.elevenlabs_voice_id_ar_female
            if language == "ar"
            else settings.elevenlabs_voice_id_en_female
        )

        if not voice_id:
            raise Exception(f"ElevenLabs voice ID not configured for language: {language}")

        url = f"{self.elevenlabs_base_url}/text-to-speech/{voice_id}"

        # Prepare request payload
        payload = {
            "text": text,
            "model_id": settings.elevenlabs_model,
            "voice_settings": {
                "stability": 0.5,  # Balanced stability
                "similarity_boost": 0.75,  # High similarity to voice
                "style": 0.0,  # No style exaggeration
                "use_speaker_boost": True  # Enhance clarity
            }
        }

        logger.info(f"Synthesizing speech ({language}): {text[:50]}...")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=self.elevenlabs_headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()

                audio_bytes = response.content
                logger.info(f"TTS successful, audio size: {len(audio_bytes)} bytes")
                return audio_bytes

        except httpx.HTTPStatusError as e:
            logger.error(f"ElevenLabs API error: {e.response.status_code} - {e.response.text}")
            raise Exception(f"ElevenLabs API error: {e.response.status_code}")
        except httpx.TimeoutException:
            logger.error("ElevenLabs API timeout")
            raise Exception("TTS request timed out")
        except Exception as e:
            logger.error(f"TTS error: {e}", exc_info=True)
            raise Exception(f"Failed to synthesize speech: {str(e)}")

    async def list_elevenlabs_voices(self) -> list:
        """
        List all available ElevenLabs voices

        Useful for finding voice IDs and discovering new voices.
        Filters can be applied to find warm female voices for Arabic.

        Returns:
            List of voice dictionaries with details
        """
        if not settings.elevenlabs_api_key:
            raise Exception("ElevenLabs API key not configured")

        url = f"{self.elevenlabs_base_url}/voices"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.elevenlabs_headers,
                    timeout=10.0
                )
                response.raise_for_status()

                data = response.json()
                voices = data.get("voices", [])

                logger.info(f"Retrieved {len(voices)} ElevenLabs voices")
                return voices

        except httpx.HTTPStatusError as e:
            logger.error(f"ElevenLabs API error: {e.response.status_code}")
            raise Exception(f"Failed to list voices: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Error listing voices: {e}", exc_info=True)
            raise Exception(f"Failed to list voices: {str(e)}")

    def get_service_status(self) -> dict:
        """
        Get status of speech services

        Returns:
            Dictionary with service availability status
        """
        return {
            "elevenlabs": {
                "available": bool(settings.elevenlabs_api_key),
                "configured": bool(settings.elevenlabs_api_key),
                "asr_model": self.elevenlabs_asr_model,
                "tts_model": settings.elevenlabs_model,
                "voices_configured": {
                    "arabic": bool(settings.elevenlabs_voice_id_ar_female),
                    "english": bool(settings.elevenlabs_voice_id_en_female)
                }
            }
        }


# Singleton instance
speech_service = SpeechService()
