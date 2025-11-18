import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Globe, FileText, MessageCircle, CheckCircle, Home } from 'lucide-react';

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentLanguage = i18n.language;
  const isHomePage = location.pathname === '/';
  const isHistoryPage = location.pathname === '/history';
  const isContactPage = location.pathname === '/contact';

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="bg-white sticky top-0 z-40 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-success-700 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle size={20} className="text-white" />
            </div>
            <span className="text-xl font-display font-bold text-gray-900">
              Q-CHAT-10
            </span>
          </Link>

          {/* Actions - Icons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Home icon - show on all pages except home page */}
            {!isHomePage && (
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-600 hover:text-success-700 transition-colors rounded-lg hover:bg-gray-50"
                aria-label="Home"
                title="Home"
              >
                <Home size={20} />
              </button>
            )}
            {/* History icon - show on all pages except history page */}
            {!isHistoryPage && (
              <button
                onClick={() => navigate('/history')}
                className="p-2 text-gray-600 hover:text-success-700 transition-colors rounded-lg hover:bg-gray-50"
                aria-label="My Sessions"
                title="My Sessions"
              >
                <FileText size={20} />
              </button>
            )}
            {/* Contact icon - show on all pages except contact page */}
            {!isContactPage && (
              <button
                onClick={() => navigate('/contact')}
                className="p-2 text-gray-600 hover:text-success-700 transition-colors rounded-lg hover:bg-gray-50"
                aria-label="Contact Us"
                title="Contact Us"
              >
                <MessageCircle size={20} />
              </button>
            )}
            <button
              onClick={toggleLanguage}
              className="p-2 text-gray-600 hover:text-success-700 transition-colors rounded-lg hover:bg-gray-50"
              aria-label="Switch language"
              title="Switch language"
            >
              <Globe size={20} />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-success-700 hover:bg-gray-50"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex items-center gap-4">
              {/* Home icon - show on all pages except home page */}
              {!isHomePage && (
                <button
                  onClick={() => {
                    navigate('/');
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 text-gray-600 hover:text-success-700 transition-colors"
                  aria-label="Home"
                >
                  <Home size={20} />
                </button>
              )}
              {/* History icon - show on all pages except history page */}
              {!isHistoryPage && (
                <button
                  onClick={() => {
                    navigate('/history');
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 text-gray-600 hover:text-success-700 transition-colors"
                  aria-label="My Sessions"
                >
                  <FileText size={20} />
                </button>
              )}
              {/* Contact icon - show on all pages except contact page */}
              {!isContactPage && (
                <button
                  onClick={() => {
                    navigate('/contact');
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 text-gray-600 hover:text-success-700 transition-colors"
                  aria-label="Contact Us"
                >
                  <MessageCircle size={20} />
                </button>
              )}
              <button
                onClick={() => {
                  toggleLanguage();
                  setIsMobileMenuOpen(false);
                }}
                className="p-2 text-gray-600 hover:text-success-700 transition-colors"
                aria-label="Switch language"
              >
                <Globe size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
