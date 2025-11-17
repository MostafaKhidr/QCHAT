import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, FileText, Globe, User, ArrowRight, PlusCircle, Home } from 'lucide-react';
import { Button } from '../components/ui';
import useSessionStore from '../store/sessionStore';

interface ChildData {
  name: string;
  mrn: string;
  parentName?: string;
  childAgeMonths?: number;
  language?: string;
}

interface LocationState {
  children?: ChildData[];
  child?: ChildData;
}

const ChildSelectionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionHistory } = useSessionStore();
  const [selectedChild, setSelectedChild] = useState<ChildData | null>(null);
  const [isNewSession, setIsNewSession] = useState(false);

  // Get children from location state
  const locationState = location.state as LocationState | null;
  
  // Extract unique children from session history with all available data
  // Use the most recent session's data for each child
  const historyChildren = useMemo(() => {
    const uniqueChildren = new Map<string, ChildData>();
    
    // Sort sessions by date (most recent first) to get latest data
    const sortedSessions = [...sessionHistory].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    sortedSessions.forEach(session => {
      const key = `${session.mrn}-${session.child_name}`;
      if (!uniqueChildren.has(key)) {
        // Use the most recent session data for each child
        uniqueChildren.set(key, {
          name: session.child_name,
          mrn: session.mrn,
          parentName: session.parent_name,
          childAgeMonths: session.child_age_months,
          language: session.language
        });
      }
    });
    return Array.from(uniqueChildren.values());
  }, [sessionHistory]);

  // Combine location state children with history children
  const children: ChildData[] = useMemo(() => {
    const allChildren = new Map<string, ChildData>();
    
    // Add children from location state
    if (locationState?.children) {
      locationState.children.forEach(child => {
        const key = `${child.mrn}-${child.name}`;
        allChildren.set(key, child);
      });
    } else if (locationState?.child) {
      const key = `${locationState.child.mrn}-${locationState.child.name}`;
      allChildren.set(key, locationState.child);
    }
    
    // Add children from history
    historyChildren.forEach(child => {
      const key = `${child.mrn}-${child.name}`;
      if (!allChildren.has(key)) {
        allChildren.set(key, child);
      }
    });
    
    return Array.from(allChildren.values());
  }, [locationState, historyChildren]);

  const handleChildSelect = (child: ChildData) => {
    // If already selected, navigate (double-click behavior)
    if (selectedChild?.mrn === child.mrn && selectedChild?.name === child.name) {
      handleContinue();
      return;
    }
    
    // First click: just select
    setSelectedChild(child);
    setIsNewSession(false);
  };

  const handleNewSession = () => {
    // If already selected, navigate (double-click behavior)
    if (isNewSession) {
      handleContinue();
      return;
    }
    
    // First click: just select
    setSelectedChild(null);
    setIsNewSession(true);
  };

  const handleContinue = () => {
    if (isNewSession) {
      // Navigate to new session without pre-filled data
      navigate('/session/new');
    } else if (selectedChild) {
      // Find existing session for this child (most recent first)
      // Use case-insensitive matching and trim whitespace
      const existingSession = sessionHistory
        .filter(session => {
          const sessionMrn = (session.mrn || '').trim().toLowerCase();
          const sessionName = (session.child_name || '').trim().toLowerCase();
          const childMrn = (selectedChild.mrn || '').trim().toLowerCase();
          const childName = (selectedChild.name || '').trim().toLowerCase();
          return sessionMrn === childMrn && sessionName === childName;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      // If there's any existing session, check its status
      if (existingSession) {
        // If session is completed, start a new session for this child
        if (existingSession.status === 'completed') {
          // Navigate to new session form with pre-filled data from the child
          navigate('/session/new', {
            state: {
              child: selectedChild,
              mrn: selectedChild.mrn,
              childName: selectedChild.name,
              parentName: selectedChild.parentName,
              childAgeMonths: selectedChild.childAgeMonths,
              language: selectedChild.language || i18n.language
            }
          });
        } else {
          // For in_progress, created, or any other status, go to chat
          navigate(`/chat/${existingSession.session_token}`);
        }
      } else {
        // No session exists, go to new session form with all pre-filled data
        navigate('/session/new', {
          state: {
            child: selectedChild,
            mrn: selectedChild.mrn,
            childName: selectedChild.name,
            parentName: selectedChild.parentName,
            childAgeMonths: selectedChild.childAgeMonths,
            language: selectedChild.language || i18n.language
          }
        });
      }
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Card colors matching Figma design
  const cardColors = [
    { 
      bg: 'bg-blue-50', 
      border: 'border-blue-300', 
      icon: 'text-blue-700'
    },
    { 
      bg: 'bg-orange-50', 
      border: 'border-orange-300', 
      icon: 'text-orange-700'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side: Back arrow, Checkmark, M-CHAT */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                aria-label="Home"
              >
                <div className="bg-success-700 w-8 h-8 rounded-full flex items-center justify-center">
                  <CheckCircle size={18} className="text-white" />
                </div>
                <span className="text-xl font-display font-bold text-gray-900">
                  M-CHAT
                </span>
              </button>
            </div>

            {/* Right side: Home, Document and Globe icons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                aria-label="Home"
                title="Home"
              >
                <Home size={20} />
              </button>
              <button
                onClick={() => navigate('/history')}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                aria-label="History"
              >
                <FileText size={20} />
              </button>
              <button
                onClick={() => {
                  const newLang = i18n.language === 'en' ? 'ar' : 'en';
                  i18n.changeLanguage(newLang);
                }}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                aria-label="Language"
              >
                <Globe size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Title and Subtitle */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
            {t('childSelection.selectChildTitle')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('childSelection.selectChildSubtitle')}
          </p>
        </motion.div>

        {/* Child Selection Cards */}
        <div className="flex flex-col md:flex-row gap-6 justify-center mb-8 flex-wrap">
          {/* New Session Card - Always visible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            onClick={handleNewSession}
            className={`
              flex-1 max-w-sm cursor-pointer transition-all duration-200
              bg-gray-50 border-2 border-gray-300 rounded-lg p-6
              ${isNewSession ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
            `}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 text-gray-700">
                <PlusCircle size={48} className="fill-current" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {t('childSelection.newSession')}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('childSelection.createNewScreening')}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Existing Children Cards */}
          {children.slice(0, 2).map((child, index) => {
            const colors = cardColors[index % cardColors.length];
            const isSelected = selectedChild?.mrn === child.mrn && selectedChild?.name === child.name;
            
            return (
              <motion.div
                key={`${child.mrn}-${child.name}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 1) * 0.1 }}
                onClick={() => handleChildSelect(child)}
                className={`
                  flex-1 max-w-sm cursor-pointer transition-all duration-200
                  ${colors.bg} ${colors.border} border-2 rounded-lg p-6
                  ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Person Icon */}
                  <div className={`flex-shrink-0 ${colors.icon}`}>
                    <User size={48} className="fill-current" />
                  </div>
                  
                  {/* Child Info */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      {child.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      ID: {child.mrn}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Continue Button */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={handleContinue}
            disabled={!selectedChild && !isNewSession}
            className={`
              bg-gray-100 text-gray-700 border-gray-300
              ${(selectedChild || isNewSession) ? 'hover:bg-gray-200 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
              px-8 py-3 rounded-lg flex items-center gap-2
            `}
          >
            {t('common.continue')}
            <ArrowRight size={20} />
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-4 bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            {t('home.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ChildSelectionPage;
