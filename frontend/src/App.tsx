import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/layout';

// Pages
import HomePage from './pages/HomePage';
import ChildSelectionPage from './pages/ChildSelectionPage';
import AgeSelectionPage from './pages/AgeSelectionPage';
import ChatPage from './pages/ChatPage';
import SessionHistoryPage from './pages/SessionHistoryPage';
import ReportPage from './pages/ReportPage';
import ContactPage from './pages/ContactPage';
// Q-CHAT Pages
import QChatAssessmentPage from './pages/QChatAssessmentPage';
import QChatReportPage from './pages/QChatReportPage';

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isChildSelectionPage = location.pathname === '/child-selection';
  const isContactPage = location.pathname === '/contact';
  const isChatPage = location.pathname.startsWith('/chat/');
  const isQChatPage = location.pathname.startsWith('/qchat/');

  return (
    <div className="flex flex-col min-h-screen">
      {!isChildSelectionPage && !isChatPage && !isQChatPage && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/child-selection" element={<ChildSelectionPage />} />
          <Route path="/session/new" element={<AgeSelectionPage />} />
          <Route path="/chat/:token" element={<ChatPage />} />
          <Route path="/qchat/:token" element={<QChatAssessmentPage />} />
          <Route path="/qchat/report/:token" element={<QChatReportPage />} />
          <Route path="/history" element={<SessionHistoryPage />} />
          <Route path="/report/:token" element={<ReportPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
