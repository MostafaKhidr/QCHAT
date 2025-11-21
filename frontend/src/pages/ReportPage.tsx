import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit, AlertCircle, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { mchatAPI } from '../services/mchat-api';
import { RiskLevel, AnswerType } from '../types/api.types';
import type { ScreeningReportResponse, QuestionBreakdownItem } from '../types/api.types';

const ReportPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const [report, setReport] = useState<ScreeningReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [localAnswers, setLocalAnswers] = useState<Map<number, AnswerType>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        const data = await mchatAPI.getReport(token);
        setReport(data);
      } catch (err: any) {
        setError(err.detail || 'Failed to load report');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [token]);

  const getAssessmentText = (riskLevel: RiskLevel) => {
    const assessmentKey = {
      [RiskLevel.LOW]: 'lowLikelihood',
      [RiskLevel.MEDIUM]: 'mediumLikelihood',
      [RiskLevel.HIGH]: 'highLikelihood',
    }[riskLevel];

    return t(`report.assessment.${assessmentKey}`, { returnObjects: true }) as {
      title: string;
      description: string;
    };
  };

  const getAssessmentBgColor = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 'bg-success-100 border-success-300';
      case RiskLevel.MEDIUM:
        return 'bg-warning-100 border-warning-300';
      case RiskLevel.HIGH:
        return 'bg-pink-100 border-pink-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelColor = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 'bg-green-200 text-white';
      case RiskLevel.MEDIUM:
        return 'bg-yellow-200 text-white';
      case RiskLevel.HIGH:
        return 'bg-pink-200 text-white';
      default:
        return 'bg-gray-200 text-white';
    }
  };

  const formatAnswer = (answer: AnswerType) => {
    switch (answer) {
      case AnswerType.YES:
        return t('common.yes');
      case AnswerType.NO:
        return t('common.no');
      case AnswerType.UNANSWERED:
        return t('report.questionBreakdown.skipped');
      default:
        return t('report.questionBreakdown.skipped');
    }
  };

  const getNextAnswer = (currentAnswer: AnswerType): AnswerType => {
    // Cycle: Yes -> No -> Skipped -> Yes
    switch (currentAnswer) {
      case AnswerType.YES:
        return AnswerType.NO;
      case AnswerType.NO:
        return AnswerType.UNANSWERED;
      case AnswerType.UNANSWERED:
        return AnswerType.YES;
      default:
        return AnswerType.YES;
    }
  };

  const getAnswerForQuestion = (questionNumber: number): AnswerType => {
    if (localAnswers.has(questionNumber)) {
      return localAnswers.get(questionNumber)!;
    }
    const question = report?.question_breakdown?.find(q => q.question_number === questionNumber);
    return question?.patient_answer || AnswerType.UNANSWERED;
  };

  const calculateAIAssessment = (questionNumber: number, answer: AnswerType): 'concern' | 'pass' => {
    // For now, we'll show the original assessment until save
    // The backend will properly recalculate based on reverse_scored flags
    // This is a preview - actual calculation happens on the backend
    const question = report?.question_breakdown?.find(q => q.question_number === questionNumber);
    if (!question) return 'pass';

    // If answer is unchanged, use original assessment
    if (answer === question.patient_answer) {
      return question.ai_assessment;
    }

    // For changed answers, we'll show a simplified preview
    // Unanswered always passes
    if (answer === AnswerType.UNANSWERED) {
      return 'pass';
    }

    // For Yes/No changes, we'll keep the original for now
    // The backend will recalculate properly on save
    return question.ai_assessment;
  };

  const handleAnswerClick = (questionNumber: number) => {
    if (!isEditMode) return;

    const currentAnswer = getAnswerForQuestion(questionNumber);
    const nextAnswer = getNextAnswer(currentAnswer);
    
    const newLocalAnswers = new Map(localAnswers);
    newLocalAnswers.set(questionNumber, nextAnswer);
    setLocalAnswers(newLocalAnswers);
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Save changes
      handleSave();
    } else {
      // Enter edit mode
      setIsEditMode(true);
      setLocalAnswers(new Map()); // Reset local changes
    }
  };

  const handleSave = async () => {
    if (!token || !report) {
      setIsEditMode(false);
      return;
    }

    // If no changes, just exit edit mode
    if (localAnswers.size === 0) {
      setIsEditMode(false);
      return;
    }

    try {
      setIsSaving(true);
      const updates = Array.from(localAnswers.entries()).map(([questionNumber, answer]) => ({
        question_number: questionNumber,
        answer,
      }));

      const updatedReport = await mchatAPI.batchUpdateAnswers(token, updates);
      setReport(updatedReport);
      setLocalAnswers(new Map());
      setIsEditMode(false);
    } catch (err: any) {
      setError(err.detail || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card padding="lg" className="max-w-md text-center">
          <p className="text-danger-600 mb-4">{error || t('report.questionBreakdown.reportNotFound')}</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            {t('nav.home')}
          </Button>
        </Card>
      </div>
    );
  }

  const assessment = getAssessmentText(report.risk_level);
  const patientId = report.mrn ? `${report.mrn.split('-')[0] || report.mrn.substring(0, 2).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}` : 'N/A';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Patient's Score Section */}
        <div className="mb-6">
          <Card padding="lg" className="bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('report.questionBreakdown.patientScore')}
            </h2>
            <div className="flex items-center justify-between">
              <div className="text-7xl font-bold text-primary-500">
                {report.final_score}
                <span className="text-4xl text-gray-400 font-normal">/20</span>
              </div>
              <div className={`px-4 py-3 rounded-lg ${getRiskLevelColor(report.risk_level)} min-w-[120px]`}>
                <div className="text-xs font-medium mb-1 opacity-90">{t('report.questionBreakdown.riskLevel')}</div>
                <div className="text-lg font-bold capitalize">
                  {t(`report.riskLevel.${report.risk_level}`)}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Assessment Section */}
        <div className="mb-8">
          <Card padding="lg" className="bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('report.assessment.title')}
            </h2>
            <div className={`p-4 rounded-lg border-2 ${getAssessmentBgColor(report.risk_level)}`}>
              <p className="font-bold text-gray-900 mb-2">{assessment.title}</p>
              <p className="text-gray-700 text-sm">{assessment.description}</p>
            </div>
          </Card>
        </div>

        {/* Question Breakdown Section */}
        {report.question_breakdown && report.question_breakdown.length > 0 && (
          <div className="mb-8">
            <Card padding="lg" className="bg-gray-50">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {t('report.questionBreakdown.title')}
                  </h2>
                  {report.child_name && (
                    <p className="text-sm text-gray-500">
                      {report.child_name} • ID: {patientId} • {report.child_age_months} {t('report.months')}
                    </p>
                  )}
                </div>
                <Button
                  variant={isEditMode ? "primary" : "outline"}
                  size="sm"
                  onClick={handleEditToggle}
                  icon={<Edit size={16} />}
                  disabled={isSaving}
                >
                  {isSaving ? t('common.loading') : isEditMode ? t('common.save') : t('report.questionBreakdown.edit')}
                </Button>
              </div>

              {/* Edit Mode Info Box */}
              {isEditMode && (
                <div className="mb-4 p-4 bg-success-50 border-2 border-success-200 rounded-lg">
                  <p className="text-success-800 font-medium">
                    {t('report.questionBreakdown.editModeInfo')}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {report.question_breakdown.map((item: QuestionBreakdownItem) => {
                  const currentAnswer = getAnswerForQuestion(item.question_number);
                  const currentAIAssessment = localAnswers.has(item.question_number)
                    ? calculateAIAssessment(item.question_number, currentAnswer)
                    : item.ai_assessment;

                  return (
                    <div
                      key={item.question_number}
                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="font-semibold text-gray-900">
                              Q{item.question_number}
                            </span>
                            <span className="text-gray-700">{item.question_text}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-600">{t('report.questionBreakdown.patient')}:</span>
                            {isEditMode ? (
                              <button
                                onClick={() => handleAnswerClick(item.question_number)}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer hover:opacity-80 ${
                                  currentAnswer === AnswerType.UNANSWERED
                                    ? 'bg-gray-100 text-gray-500'
                                    : currentAnswer === AnswerType.YES
                                    ? 'bg-gray-200 text-gray-800'
                                    : 'bg-gray-200 text-gray-800'
                                }`}
                                title={t('report.questionBreakdown.clickToChange')}
                              >
                                {formatAnswer(currentAnswer)}
                              </button>
                            ) : (
                              <span
                                className={`px-3 py-1 rounded-md text-sm font-medium ${
                                  currentAnswer === AnswerType.UNANSWERED
                                    ? 'bg-gray-100 text-gray-500'
                                    : currentAnswer === AnswerType.YES
                                    ? 'bg-gray-200 text-gray-800'
                                    : 'bg-gray-200 text-gray-800'
                                }`}
                              >
                                {formatAnswer(currentAnswer)}
                              </span>
                            )}
                            {i18n.language === 'ar' ? (
                              <ArrowLeft size={16} className="text-gray-400" />
                            ) : (
                              <ArrowRight size={16} className="text-gray-400" />
                            )}
                            <span className="text-sm text-gray-600">{t('report.questionBreakdown.ai')}:</span>
                            {currentAnswer === AnswerType.UNANSWERED ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 text-sm font-medium border border-gray-200">
                                <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center">
                                  <AlertCircle size={10} className="text-white" />
                                </div>
                                {t('report.questionBreakdown.didntAnswer')}
                              </span>
                            ) : currentAIAssessment === 'concern' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-100 text-orange-700 text-sm font-medium border border-orange-200">
                                <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                                  <AlertCircle size={10} className="text-white" />
                                </div>
                                {t('report.questionBreakdown.concern')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success-100 text-success-700 text-sm font-medium border border-success-200">
                                <div className="w-4 h-4 rounded-full bg-success-600 flex items-center justify-center">
                                  <CheckCircle size={10} className="text-white" />
                                </div>
                                {t('report.questionBreakdown.pass')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportPage;
