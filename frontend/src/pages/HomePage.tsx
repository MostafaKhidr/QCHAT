import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowLeft,
  Play, 
  Users, 
  Info, 
  CheckCircle, 
  Clock, 
  Brain, 
  Shield, 
  Heart,
  User
} from 'lucide-react';
import { Button, Card } from '../components/ui';
import DemoModal from '../components/modals/DemoModal';

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [hasDemoVideo, setHasDemoVideo] = useState(false);

  // Check if demo video exists
  useEffect(() => {
    const checkDemoVideo = async () => {
      const language = i18n.language === 'ar' ? 'ar' : 'en';
      const possiblePaths = [
        `/videos/demo/demo_${language}.mp4`,
        `/videos/demo/demo.mp4`,
        `/videos/demo/demo_video.mp4`,
        `/videos/demo/demo_${language}_video.mp4`,
      ];

      // Check if any of the possible demo videos exist
      for (const path of possiblePaths) {
        try {
          const response = await fetch(path, { method: 'HEAD' });
          if (response.ok) {
            setHasDemoVideo(true);
            return;
          }
        } catch (error) {
          // Continue checking other paths
        }
      }
      setHasDemoVideo(false);
    };

    checkDemoVideo();
  }, [i18n.language]);

  const steps = [
    {
      icon: <Users size={24} />,
      color: 'bg-success-500',
      step: isRTL ? 'الخطوة 1' : 'Step 1',
      title: t('home.howItWorks.step1.title'),
      description: t('home.howItWorks.step1.description'),
    },
    {
      icon: <Info size={24} />,
      color: 'bg-secondary-500',
      step: isRTL ? 'الخطوة 2' : 'Step 2',
      title: t('home.howItWorks.step2.title'),
      description: t('home.howItWorks.step2.description'),
    },
    {
      icon: <CheckCircle size={24} />,
      color: 'bg-warning-500',
      step: isRTL ? 'الخطوة 3' : 'Step 3',
      title: t('home.howItWorks.step3.title'),
      description: t('home.howItWorks.step3.description'),
    },
    {
      icon: <Clock size={24} />,
      color: 'bg-success-700',
      step: isRTL ? 'الخطوة 4' : 'Step 4',
      title: t('home.howItWorks.step4.title'),
      description: t('home.howItWorks.step4.description'),
    },
  ];

  const features = [
    {
      icon: <Brain size={24} />,
      color: 'bg-success-700',
      title: t('home.features.validated.title'),
      description: t('home.features.validated.description'),
    },
    {
      icon: <Shield size={24} />,
      color: 'bg-secondary-500',
      title: t('home.features.privacy.title'),
      description: t('home.features.privacy.description'),
    },
    {
      icon: <Heart size={24} />,
      color: 'bg-warning-500',
      title: t('home.features.quick.title'),
      description: t('home.features.quick.description'),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          {/* Age Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success-50 border border-success-400 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <User size={16} className="text-success-700" />
            <span className="text-sm font-medium text-success-700">
              {t('home.ageBadge')}
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {t('home.title')}
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-success-700 font-medium mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {t('home.subtitle')}
          </motion.p>

          <motion.p
            className="text-base md:text-lg text-gray-600 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {t('home.description')}
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/child-selection')}
              className="gradient-900-700 hover:opacity-90 text-white border-0 shadow-md"
              icon={isRTL ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
            >
              {t('home.startButton')}
            </Button>

            {hasDemoVideo && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowDemoModal(true)}
                className="bg-white border-2 border-success-700 text-success-700 hover:bg-success-50 hover:border-success-800 hover:text-success-800 shadow-sm"
                icon={<Play size={20} />}
              >
                {t('home.watchDemo')}
              </Button>
            )}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-display font-bold text-center text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {t('home.howItWorks.title')}
          </motion.h2>

          <motion.p
            className="text-base md:text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {t('home.howItWorks.description')}
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 * index }}
              >
                <Card padding="lg" className="text-center h-full border border-gray-200 shadow-sm">
                  <div className={`${step.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-sm`}>
                    {step.icon}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{step.step}</p>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Q-CHAT-10 Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-display font-bold text-center text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {t('home.features.title')}
          </motion.h2>

          <motion.p
            className="text-base md:text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {t('home.features.description')}
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 * index }}
              >
                <Card padding="lg" className="text-center h-full border border-gray-200 shadow-sm">
                  <div className={`${feature.color} w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 text-white shadow-sm`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Modal */}
      <DemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
      />
    </div>
  );
};

export default HomePage;
