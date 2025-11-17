import React, { useRef, useState, useEffect, Fragment } from 'react';
import { X } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoPath?: string;
}

const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose, videoPath }) => {
  const { t, i18n } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Determine video path based on language
  const getVideoPath = () => {
    if (videoPath) {
      return videoPath;
    }
    // Try multiple common naming patterns
    const language = i18n.language === 'ar' ? 'ar' : 'en';
    // Try: demo_en.mp4, demo_ar.mp4, demo.mp4, demo_video.mp4
    const possiblePaths = [
      `/videos/demo/demo_${language}.mp4`,
      `/videos/demo/demo.mp4`,
      `/videos/demo/demo_video.mp4`,
      `/videos/demo/demo_${language}_video.mp4`,
    ];
    // Return the first one (you can enhance this to check which exists)
    return possiblePaths[0];
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
      // Reset video when modal opens
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.load();
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    // Pause video when closing
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    onClose();
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-black text-left align-middle shadow-xl transition-all">
                {/* Header with close button */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold text-white"
                  >
                    {t('home.watchDemo')}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                    aria-label="Close"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Video container */}
                <div className="relative bg-black aspect-video">
                  {isLoading && !hasError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-white">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p>{t('common.loading')}</p>
                      </div>
                    </div>
                  )}
                  
                  {hasError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white p-8">
                        <p className="text-lg mb-2">{t('common.error')}</p>
                        <p className="text-sm text-gray-400">
                          Video file not found. Please ensure the video exists at: {getVideoPath()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      src={getVideoPath()}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      onLoadedData={handleVideoLoad}
                      onError={handleVideoError}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DemoModal;

