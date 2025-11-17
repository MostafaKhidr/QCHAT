import React from 'react';
import { Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VideoPlaceholderProps {
  className?: string;
  message?: string;
}

/**
 * VideoPlaceholder Component
 *
 * Displays a placeholder when video file is missing or unavailable.
 * Maintains the same dimensions as a video player for layout consistency.
 */
const VideoPlaceholder: React.FC<VideoPlaceholderProps> = ({
  className = '',
  message
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`
        relative flex items-center justify-center
        bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg
        aspect-video w-full
        ${className}
      `}
    >
      <div className="text-center p-6">
        <Video
          size={48}
          className="mx-auto mb-3 text-gray-400"
          strokeWidth={1.5}
        />
        <p className="text-sm text-gray-500 font-medium">
          {message || t('qchat.videoPlaceholder')}
        </p>
      </div>
    </div>
  );
};

export default VideoPlaceholder;
