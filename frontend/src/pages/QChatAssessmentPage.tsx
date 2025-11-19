import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button, Card, ProgressBar, VideoPlaceholder } from '../components/ui';
import qchatAPI from '../services/qchat-api';
import useSessionStore from '../store/sessionStore';
import { RiskLevel, SessionStatus } from '../types/api.types';
import type {
  QChatQuestion,
  QChatAnswerOption,
  QChatSubmitAnswerResponse,
} from '../types/api.types';

const QChatAssessmentPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [currentQuestion, setCurrentQuestion] = useState<QChatQuestion | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store answers for navigation
  const [answersHistory, setAnswersHistory] = useState<Map<number, string>>(new Map());

  // Session store
  const { updateSessionStatus, updateSessionScore, currentSession } = useSessionStore();

  const positiveVideoRef = useRef<HTMLVideoElement>(null);

  // Load session on mount to resume from where user left off
  useEffect(() => {
    const loadSession = async () => {
      if (!token) return;

      setIsLoadingSession(true);
      setError(null);

      try {
        const session = await qchatAPI.getSession(token);

        // Resume from current question in session
        setCurrentQuestionNumber(session.current_question);

        // Preload answers history
        const history = new Map<number, string>();
        session.answers.forEach((answer) => {
          history.set(answer.question_number, answer.selected_option);
        });
        setAnswersHistory(history);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadSession();
  }, [token]);

  // Load current question
  useEffect(() => {
    const loadQuestion = async () => {
      if (!token || isLoadingSession) return;

      setIsLoadingQuestion(true);
      setError(null);

      try {
        const question = await qchatAPI.getQuestion(token, currentQuestionNumber);
        setCurrentQuestion(question);

        // Restore previously selected answer if exists
        const previousAnswer = answersHistory.get(currentQuestionNumber);
        setSelectedOption(previousAnswer || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load question');
      } finally {
        setIsLoadingQuestion(false);
      }
    };

    loadQuestion();
  }, [token, currentQuestionNumber, isLoadingSession]);

  // Auto-play positive video when question loads
  useEffect(() => {
    const playVideo = async () => {
      if (positiveVideoRef.current && currentQuestion?.video_positive) {
        try {
          await positiveVideoRef.current.play();
        } catch (err) {
          console.log('Video autoplay prevented:', err);
        }
      }
    };

    if (currentQuestion) {
      playVideo();
    }
  }, [currentQuestion]);

  const handleOptionSelect = (optionValue: string) => {
    setSelectedOption(optionValue);
  };

  const handleBack = () => {
    if (currentQuestionNumber > 1) {
      setCurrentQuestionNumber(currentQuestionNumber - 1);
    }
  };

  const handleNext = async () => {
    if (!selectedOption || !token) return;

    setIsLoading(true);
    setError(null);

    try {
      // Save answer to history
      setAnswersHistory(prev => new Map(prev).set(currentQuestionNumber, selectedOption));

      const response: QChatSubmitAnswerResponse = await qchatAPI.submitAnswer(token, {
        question_number: currentQuestionNumber,
        selected_option: selectedOption as QChatAnswerOption,
      });

      if (response.is_complete) {
        // Assessment complete - update session store and fetch report for score
        updateSessionStatus(SessionStatus.COMPLETED);
        
        // Fetch report to get final score and risk level
        try {
          const report = await qchatAPI.getReport(token);
          // Map risk_level string to RiskLevel enum
          let riskLevel: RiskLevel = RiskLevel.LOW;
          if (report.risk_level === 'high') {
            riskLevel = RiskLevel.HIGH;
          } else if (report.risk_level === 'medium') {
            riskLevel = RiskLevel.MEDIUM;
          }
          updateSessionScore(report.total_score, riskLevel);
        } catch (err) {
          console.error('Failed to fetch report after completion:', err);
          // Still update status even if report fetch fails
        }
        
        // Navigate to report
        navigate(`/qchat/report/${token}`);
      } else if (response.next_question_number) {
        // Move to next question
        setCurrentQuestionNumber(response.next_question_number);
        // Update status to in_progress if not already
        if (currentSession?.status === SessionStatus.CREATED) {
          updateSessionStatus(SessionStatus.IN_PROGRESS);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  };

  const getOptionLabel = (option: { value: string; label_en: string; label_ar: string }) => {
    return i18n.language === 'ar' ? option.label_ar : option.label_en;
  };

  const getQuestionText = () => {
    if (!currentQuestion) return '';
    return i18n.language === 'ar' ? currentQuestion.text_ar : currentQuestion.text_en;
  };

  if (isLoadingSession || isLoadingQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-danger-600 mb-3">
            {t('errors.sessionNotFound')}
          </h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load question'}</p>
          <Button onClick={() => navigate('/')} variant="primary">
            {t('nav.home')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Progress Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t('qchat.progress', { current: currentQuestionNumber })}
            </h1>
            <span className="text-sm text-gray-500 font-medium">
              {currentQuestionNumber}/10
            </span>
          </div>
          <ProgressBar current={currentQuestionNumber} total={10} />
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionNumber}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card padding="lg">
              {/* Video Display (Positive Only) - Shown First */}
              <div className="mb-8">
                {currentQuestion.video_positive ? (
                  <div className="max-w-3xl mx-auto">
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 bg-success-100 text-success-700 text-sm font-medium rounded-full">
                        {t('qchat.videoExample')}
                      </span>
                    </div>
                    <video
                      ref={positiveVideoRef}
                      className="w-full rounded-lg shadow-md"
                      controls
                      muted
                      loop
                      playsInline
                    >
                      <source src={currentQuestion.video_positive} type="video/mp4" />
                      Your browser does not support video playback.
                    </video>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto">
                    <VideoPlaceholder />
                    <div className="mt-4 p-4 bg-info-50 border border-info-200 rounded-lg">
                      <p className="text-sm text-info-700">
                        {t('qchat.noVideosAvailable')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Question Text */}
              <div className="mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-relaxed">
                  {getQuestionText()}
                </h2>
              </div>

              {/* Answer Options */}
              <div className="mb-8">
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleOptionSelect(option.value)}
                      className={`
                        w-full p-4 rounded-xl border-2 transition-all text-left
                        flex items-center justify-between
                        ${
                          selectedOption === option.value
                            ? 'border-primary-500 bg-primary-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center
                            ${
                              selectedOption === option.value
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-gray-300'
                            }
                          `}
                        >
                          {selectedOption === option.value && (
                            <Check size={16} className="text-white" />
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">
                            {option.value}:
                          </span>{' '}
                          <span className="text-gray-700">{getOptionLabel(option)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center gap-4">
                {/* Back Button */}
                <Button
                  onClick={handleBack}
                  variant="outline"
                  size="lg"
                  disabled={currentQuestionNumber === 1 || isLoading}
                  icon={<ArrowLeft size={20} />}
                >
                  {t('common.back')}
                </Button>

                {/* Next Button */}
                <Button
                  onClick={handleNext}
                  variant="primary"
                  size="lg"
                  disabled={!selectedOption || isLoading}
                  isLoading={isLoading}
                  icon={<ArrowRight size={20} />}
                >
                  {currentQuestionNumber === 10 ? t('common.submit') : t('common.next')}
                </Button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QChatAssessmentPage;
