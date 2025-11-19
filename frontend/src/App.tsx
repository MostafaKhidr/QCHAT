import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/layout';

// Pages
import HomePage from './pages/HomePage';
import ChildSelectionPage from './pages/ChildSelectionPage';
import AgeSelectionPage from './pages/AgeSelectionPage';
import SessionHistoryPage from './pages/SessionHistoryPage';
// Q-CHAT Pages
import QChatAssessmentPage from './pages/QChatAssessmentPage';
import QChatReportPage from './pages/QChatReportPage';

function AppContent() {
  const location = useLocation();
  const isChildSelectionPage = location.pathname === '/child-selection';
  const isQChatPage = location.pathname.startsWith('/qchat/');

  return (
    <div className="flex flex-col min-h-screen">
      {!isChildSelectionPage && !isQChatPage && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/child-selection" element={<ChildSelectionPage />} />
          <Route path="/session/new" element={<AgeSelectionPage />} />
          <Route path="/qchat/:token" element={<QChatAssessmentPage />} />
          <Route path="/qchat/report/:token" element={<QChatReportPage />} />
          <Route path="/history" element={<SessionHistoryPage />} />
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
