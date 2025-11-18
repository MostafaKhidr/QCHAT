 import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Inbox, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Eye, 
  Download,
  BarChart,
  Clock,
  Filter
} from 'lucide-react';
import { Card, Button, StatusBadge } from '../components/ui';
import useSessionStore from '../store/sessionStore';
import { RiskLevel, SessionStatus } from '../types/api.types';
import qchatAPI from '../services/qchat-api';

const SessionHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionHistory: rawSessionHistory } = useSessionStore();
  const [scoresLoading, setScoresLoading] = useState<Set<string>>(new Set());
  const [selectedMrn, setSelectedMrn] = useState<string>('all');

  // Extract unique MRNs from session history
  const uniqueMrns = useMemo(() => {
    const mrns = new Set<string>();
    rawSessionHistory.forEach((session) => {
      if (session.mrn) {
        mrns.add(session.mrn);
      }
    });
    return Array.from(mrns).sort();
  }, [rawSessionHistory]);

  // Reset filter if selected MRN no longer exists
  useEffect(() => {
    if (selectedMrn !== 'all' && !uniqueMrns.includes(selectedMrn)) {
      setSelectedMrn('all');
    }
  }, [selectedMrn, uniqueMrns]);

  // Filter and sort sessions by date (most recent first)
  const sessionHistory = useMemo(() => {
    let filtered = [...rawSessionHistory];
    
    // Filter by MRN if a specific MRN is selected
    if (selectedMrn !== 'all') {
      filtered = filtered.filter((session) => session.mrn === selectedMrn);
    }
    
    // Sort by date (most recent first)
    return filtered.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rawSessionHistory, selectedMrn]);

  // Fetch report scores for completed sessions that don't have a score
  // Also check backend session status to sync with frontend
  useEffect(() => {
    const fetchMissingScores = async () => {
      // Check all sessions that either:
      // 1. Are marked as completed but don't have a score
      // 2. Are marked as in_progress (might be completed in backend)
      const sessionsToCheck = sessionHistory.filter(
        (s) => (s.status === SessionStatus.COMPLETED && (s.final_score === undefined || s.final_score === null)) ||
               (s.status === SessionStatus.IN_PROGRESS && (s.final_score === undefined || s.final_score === null))
      );

      if (sessionsToCheck.length === 0) return;

      const tokensToFetch = sessionsToCheck
        .map((s) => s.session_token)
        .filter((token) => !scoresLoading.has(token));

      if (tokensToFetch.length === 0) return;

      // Mark all as loading
      setScoresLoading((prev) => {
        const next = new Set(prev);
        tokensToFetch.forEach((token) => next.add(token));
        return next;
      });

      // Fetch all reports in parallel
      const reportPromises = tokensToFetch.map(async (token) => {
        try {
          const report = await qchatAPI.getReport(token);
          return { token, report, sessionInfo: null, error: null };
        } catch (error) {
          // If report fetch fails, try to get session info to check status
          try {
            const sessionInfo = await qchatAPI.getSession(token);
            // If session is completed, try to fetch report again (might have been a timing issue)
            if (sessionInfo.status === SessionStatus.COMPLETED) {
              try {
                const report = await qchatAPI.getReport(token);
                return { token, report, sessionInfo, error: null };
              } catch (reportError) {
                // Report still not available, but we know it's completed
                return { token, report: null, sessionInfo, error: null };
              }
            }
            return { token, report: null, sessionInfo, error: null };
          } catch (sessionError) {
            console.debug(`No report or session found for ${token}`);
            return { token, report: null, sessionInfo: null, error: sessionError };
          }
        }
      });

      const results = await Promise.all(reportPromises);

      // Update sessions with report data
      const { sessionHistory: currentHistory } = useSessionStore.getState();
      let hasUpdates = false;
      const newHistory = [...currentHistory];

      results.forEach(({ token, report, sessionInfo }) => {
        const historyIndex = newHistory.findIndex((s) => s.session_token === token);
        if (historyIndex < 0) return;

        const currentSession = newHistory[historyIndex];
        let updated = false;
        const updates: Partial<typeof currentSession> = {};

        // If we got a report, update score and risk level
        if (report && report.total_score !== undefined) {
          updates.final_score = report.total_score; // Map total_score to final_score for LocalSession
          // Map backend risk_level string to RiskLevel enum
          if (report.risk_level === 'low') {
            updates.risk_level = RiskLevel.LOW;
          } else if (report.risk_level === 'high') {
            updates.risk_level = RiskLevel.HIGH;
          } else if (report.risk_level === 'medium') {
            updates.risk_level = RiskLevel.MEDIUM;
          }
          updates.status = SessionStatus.COMPLETED; // Ensure status is set to completed
          updated = true;
        }
        // If we got session info and it's completed, update status
        else if (sessionInfo && sessionInfo.status === SessionStatus.COMPLETED) {
          updates.status = SessionStatus.COMPLETED;
          // QChatSessionResponse doesn't have score, but we know it's completed
          // The score will be fetched from the report when available
          updated = true;
        }

        if (updated) {
          newHistory[historyIndex] = {
            ...currentSession,
            ...updates,
          };
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        useSessionStore.setState({ sessionHistory: newHistory });
      }

      // Clear loading state
      setScoresLoading((prev) => {
        const next = new Set(prev);
        tokensToFetch.forEach((token) => next.delete(token));
        return next;
      });
    };

    fetchMissingScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionHistory.length]); // Only re-run when number of sessions changes

  // Calculate aggregated data for Screening Records section
  const screeningRecords = useMemo(() => {
    if (sessionHistory.length === 0) {
      return {
        patientName: 'N/A',
        patientId: 'N/A',
        totalSessions: 0,
        avgScore: null,
        completedSessionsCount: 0,
      };
    }

    // Get patient info from first session
    const firstSession = sessionHistory[0];
    const patientName = firstSession.child_name;
    const patientId = firstSession.mrn;

    // Calculate total sessions
    const totalSessions = sessionHistory.length;

    // Calculate average score from completed sessions only
    const completedSessions = sessionHistory.filter(
      (s) => s.status === SessionStatus.COMPLETED && s.final_score !== undefined && s.final_score !== null
    );
    const avgScore =
      completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.final_score || 0), 0) /
          completedSessions.length
        : null; // null means no completed sessions

    return {
      patientName,
      patientId,
      totalSessions,
      avgScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null, // Round to 1 decimal or null
      completedSessionsCount: completedSessions.length,
    };
  }, [sessionHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusIcon = (riskLevel?: RiskLevel) => {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return <CheckCircle size={24} className="text-white" />;
      case RiskLevel.MEDIUM:
        return <AlertTriangle size={24} className="text-black" />; // Black exclamation for yellow background
      case RiskLevel.HIGH:
        return <X size={24} className="text-white" />;
      default:
        return <Clock size={24} className="text-gray-600" />;
    }
  };

  const getStatusIconBgColor = (riskLevel?: RiskLevel): string => {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return '#079455'; // success-600 (green circle from Figma)
      case RiskLevel.MEDIUM:
        return '#FDB022'; // warning-400 (yellow circle from Figma)
      case RiskLevel.HIGH:
        return '#D92D20'; // error-600 (red circle from Figma)
      default:
        return '#D0D5DD'; // gray-200
    }
  };


  const getSessionCardBarColorValue = (riskLevel?: RiskLevel): string => {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return '#079455'; // success-600 (green bar from Figma)
      case RiskLevel.MEDIUM:
        return '#FDB022'; // warning-400 (yellow bar from Figma)
      case RiskLevel.HIGH:
        return '#D92D20'; // error-600 (red bar from Figma)
      default:
        return '#98A2B3'; // gray-400
    }
  };

  const handleContinueSession = (session: typeof sessionHistory[0], e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/qchat/${session.session_token}`);
  };

  const handleViewResults = (session: typeof sessionHistory[0], e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/report/${session.session_token}`);
  };

  const handleDownloadReport = (session: typeof sessionHistory[0], e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to report page and trigger print
    navigate(`/report/${session.session_token}`);
    // Small delay to ensure page loads before printing
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Screening Records Section */}
        {sessionHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart size={20} className="text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">
                {t('history.screeningRecords.title', 'Screening Records')}
              </h2>
            </div>
            <Card padding="md" className="bg-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Patient Name Card */}
                <div className="bg-success-50 border-2 border-success-600 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    {t('history.screeningRecords.patientName', 'Patient Name')}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {screeningRecords.patientName}
                  </div>
                </div>

                {/* Patient ID Card */}
                <div className="bg-warning-50 border-2 border-warning-500 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    {t('history.screeningRecords.patientId', 'Patient ID')}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {screeningRecords.patientId}
                  </div>
                </div>

                {/* Total Sessions Card */}
                <div className="bg-success-50 border-2 border-success-600 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    {t('history.screeningRecords.totalSessions', 'Total Sessions')}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {screeningRecords.totalSessions}
                  </div>
                </div>

                {/* Avg Score Card */}
                <div className="bg-success-50 border-2 border-success-600 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    {t('history.screeningRecords.avgScore', 'Avg Score')}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {screeningRecords.avgScore !== null 
                      ? `${screeningRecords.avgScore.toFixed(1)}/20`
                      : t('history.sessionCard.notAvailable', 'N/A')}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Session History Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">
                {t('history.sessionHistory.title', 'Session History')}
              </h2>
            </div>
            
            {/* MRN Filter */}
            {uniqueMrns.length > 1 && (
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-600" />
                <select
                  value={selectedMrn}
                  onChange={(e) => setSelectedMrn(e.target.value)}
                  className="px-4 py-2 rounded-xl border-2 border-gray-300 bg-white text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sa-500 focus:border-sa-500 transition-all duration-200 cursor-pointer"
                >
                  <option value="all">
                    {t('history.filter.allMrns', 'All MRNs')}
                  </option>
                  {uniqueMrns.map((mrn) => (
                    <option key={mrn} value={mrn}>
                      {mrn}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {sessionHistory.length === 0 ? (
            /* Empty State */
            <Card padding="lg" className="text-center">
              <div className="py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Inbox size={48} className="text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {selectedMrn !== 'all' && rawSessionHistory.length > 0
                    ? t('history.empty.filteredTitle', 'No Sessions for Selected MRN')
                    : t('history.empty.title')}
                </h2>
                <p className="text-gray-600 mb-8">
                  {selectedMrn !== 'all' && rawSessionHistory.length > 0
                    ? t('history.empty.filteredMessage', 'No sessions found for the selected MRN. Try selecting a different MRN or view all sessions.')
                    : t('history.empty.message')}
                </p>
                {selectedMrn !== 'all' && rawSessionHistory.length > 0 ? (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setSelectedMrn('all')}
                    className="mr-4"
                  >
                    {t('history.filter.showAll', 'Show All Sessions')}
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/child-selection')}
                >
                  {selectedMrn !== 'all' && rawSessionHistory.length > 0
                    ? t('history.newScreening', 'Start New Screening')
                    : t('history.empty.button')}
                </Button>
              </div>
            </Card>
          ) : (
            /* Sessions List */
            <div className="space-y-4">
              {sessionHistory.map((session, index) => (
                <motion.div
                  key={session.session_token}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="bg-gray-50 rounded-2xl shadow-soft p-6 relative overflow-hidden">
                    {/* Colored Label Bar - Full height on left side of card */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-4 rounded-l-2xl"
                      style={{ 
                        backgroundColor: getSessionCardBarColorValue(session.risk_level),
                        zIndex: 1 
                      }}
                    />
                    <div className="flex items-start gap-4 relative" style={{ zIndex: 2 }}>
                      {/* Status Icon - Always visible and colored */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: getStatusIconBgColor(session.risk_level) }}
                      >
                        {getStatusIcon(session.risk_level)}
                      </div>

                      {/* Session Info */}
                      <div className="flex-1">
                        {/* Session Number and Date with Risk Badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {t('history.sessionCard.sessionNumber', 'Session {{number}}', {
                                number: sessionHistory.length - index,
                              })}{' '}
                              - {formatDate(session.created_at)}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatTime(session.created_at)}
                            </p>
                          </div>

                          {/* Risk Level Badge - Top Right - Always Visible */}
                          <div className="flex-shrink-0">
                            {session.risk_level ? (
                              <StatusBadge 
                                riskLevel={session.risk_level} 
                                size="sm" 
                                showIcon={false}
                                className="flex-shrink-0"
                              />
                            ) : (
                              <span className="inline-flex items-center gap-1.5 font-semibold rounded-full border-2 border-gray-300 bg-gray-100 text-gray-700 px-2 py-1 text-xs flex-shrink-0">
                                {session.status === SessionStatus.COMPLETED 
                                  ? t('history.sessionCard.status.completed', 'Completed')
                                  : t('history.sessionCard.status.inProgress', 'In Progress')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score and Child Age Container */}
                        <div className="flex items-center gap-6 mb-4">
                          <div className="bg-white rounded-lg px-4 py-2 border border-gray-200">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">
                                {t('history.sessionCard.score', 'Score')}:{' '}
                              </span>
                              <span className="font-bold text-gray-900">
                                {session.final_score !== undefined && session.final_score !== null
                                  ? `${session.final_score}/20`
                                  : session.status === SessionStatus.COMPLETED
                                  ? '0/20'
                                  : t('history.sessionCard.notAvailable', 'N/A')}
                              </span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg px-4 py-2 border border-gray-200">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">
                                {t('history.sessionCard.childAge', 'Child Age')}:{' '}
                              </span>
                              <span className="font-bold text-gray-900">
                                {session.child_age_months} {t('history.sessionCard.months', 'months')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                          {session.status === SessionStatus.COMPLETED ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleViewResults(session, e)}
                                icon={<Eye size={16} />}
                                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                {t('history.sessionCard.viewFullResults', 'View Full Results')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleDownloadReport(session, e)}
                                icon={<Download size={16} />}
                                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                {t('history.sessionCard.downloadReport', 'Download Report')}
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleContinueSession(session, e)}
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              {t('history.sessionCard.continue', 'Continue Session')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* New Screening Button */}
        {sessionHistory.length > 0 && (
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="primary"
              onClick={() => navigate('/child-selection')}
            >
              {t('history.newScreening', 'Start New Screening')}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-4 px-4 bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            {t('home.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SessionHistoryPage;
