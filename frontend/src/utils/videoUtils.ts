// Cache for videos data
let videosDataCache: Record<string, string[]> | null = null;

/**
 * Load videos data from JSON file (cached)
 */
const loadVideosData = async (): Promise<Record<string, string[]>> => {
  if (videosDataCache) {
    return videosDataCache;
  }

  try {
    const response = await fetch('/videos/videos.json');
    if (!response.ok) {
      console.warn('Failed to load videos.json, returning empty data');
      return {};
    }
    videosDataCache = await response.json();
    return videosDataCache || {};
  } catch (error) {
    console.error('Error loading videos.json:', error);
    return {};
  }
};

/**
 * Get video URLs for a specific question number
 * @param questionNumber - The question number (1-20)
 * @param language - The language code ('en' or 'ar')
 * @returns Array of video file names for the question, or empty array if none exist
 */
export const getVideosForQuestion = async (
  questionNumber: number | null,
  language: string = 'en'
): Promise<string[]> => {
  if (!questionNumber || questionNumber < 1 || questionNumber > 20) {
    return [];
  }

  // For question 1, check chatintro folder first
  if (questionNumber === 1) {
    // Try to get videos from chatintro folder
    // We'll check for common naming patterns
    const langSuffix = language === 'ar' ? '_ar' : '_en';
    const possibleFiles = [
      `chatintro_${langSuffix}.mp4`,
      `chatintro_${language}.mp4`,
      `chatintro.mp4`,
      `intro_${langSuffix}.mp4`,
      `intro_${language}.mp4`,
      `intro.mp4`,
    ];
    
    // Check which files exist by trying to fetch them
    const existingVideos: string[] = [];
    for (const file of possibleFiles) {
      try {
        const response = await fetch(`/videos/chatintro/${file}`, { method: 'HEAD' });
        if (response.ok) {
          existingVideos.push(file);
        }
      } catch (error) {
        // Continue checking other files
      }
    }
    
    // If we found videos in chatintro, return them
    if (existingVideos.length > 0) {
      return existingVideos;
    }
    
    // Fallback to Q1 folder if chatintro doesn't have videos
    const videosData = await loadVideosData();
    const videos = videosData['Q1'];
    if (videos && videos.length > 0) {
      const languageVideos = videos.filter((video) => video.includes(langSuffix));
      return languageVideos.length > 0 ? languageVideos : videos;
    }
    
    return [];
  }

  // For other questions, use the Q folder structure
  const videosData = await loadVideosData();
  const questionKey = `Q${questionNumber}`;
  const videos = videosData[questionKey];

  if (!videos || videos.length === 0) {
    return [];
  }

  // Filter videos by language if possible (some videos have language in filename)
  // If no language-specific videos, return all videos
  const langSuffix = language === 'ar' ? '_ar' : '_en';
  const languageVideos = videos.filter((video) => video.includes(langSuffix));
  
  // If we have language-specific videos, return those; otherwise return all
  return languageVideos.length > 0 ? languageVideos : videos;
};

/**
 * Get the first video URL for a question
 * @param questionNumber - The question number (1-20)
 * @param language - The language code ('en' or 'ar')
 * @returns Video URL path or null if no video exists
 */
export const getVideoUrl = async (
  questionNumber: number | null,
  language: string = 'en'
): Promise<string | null> => {
  const videos = await getVideosForQuestion(questionNumber, language);
  if (videos.length === 0) {
    return null;
  }

  // For question 1, use chatintro folder
  if (questionNumber === 1) {
    return `/videos/chatintro/${videos[0]}`;
  }

  // For other questions, use Q folder
  const questionKey = `Q${questionNumber}`;
  return `/videos/${questionKey}/${videos[0]}`;
};

/**
 * Get a different video URL for a question (not the current one)
 * @param questionNumber - The question number (1-20)
 * @param language - The language code ('en' or 'ar')
 * @param currentVideoUrl - The current video URL to exclude
 * @returns Video URL path or null if no other video exists
 */
export const getAnotherVideoUrl = async (
  questionNumber: number | null,
  language: string = 'en',
  currentVideoUrl: string
): Promise<string | null> => {
  const videos = await getVideosForQuestion(questionNumber, language);
  if (videos.length <= 1) {
    return null; // No other videos available
  }

  // Extract current video filename from URL
  const currentFilename = currentVideoUrl.split('/').pop() || '';
  
  // Find the index of current video
  const currentIndex = videos.findIndex(v => v === currentFilename);
  
  // If current video not found or we're on the last video, no more available
  if (currentIndex < 0 || currentIndex >= videos.length - 1) {
    return null;
  }
  
  // Get next video (don't cycle - just get the next one)
  const nextIndex = currentIndex + 1;
  const nextVideo = videos[nextIndex];

  // For question 1, use chatintro folder
  if (questionNumber === 1) {
    return `/videos/chatintro/${nextVideo}`;
  }

  // For other questions, use Q folder
  const questionKey = `Q${questionNumber}`;
  return `/videos/${questionKey}/${nextVideo}`;
};

/**
 * Check if a video exists for a question
 * @param questionNumber - The question number (1-20)
 * @param language - The language code ('en' or 'ar')
 * @returns Promise that resolves to true if video exists, false otherwise
 */
export const hasVideoForQuestion = async (
  questionNumber: number | null,
  language: string = 'en'
): Promise<boolean> => {
  const videos = await getVideosForQuestion(questionNumber, language);
  return videos.length > 0;
};

/**
 * Check if there are more videos available beyond the current one
 * @param questionNumber - The question number (1-20)
 * @param language - The language code ('en' or 'ar')
 * @param currentVideoUrl - The current video URL
 * @returns Promise that resolves to true if more videos are available, false otherwise
 */
export const hasMoreVideos = async (
  questionNumber: number | null,
  language: string = 'en',
  currentVideoUrl: string
): Promise<boolean> => {
  const videos = await getVideosForQuestion(questionNumber, language);
  
  // If there's only one video or no videos, no more available
  if (videos.length <= 1) {
    return false;
  }

  // Extract current video filename from URL
  const currentFilename = currentVideoUrl.split('/').pop() || '';
  
  // Find the index of current video
  const currentIndex = videos.findIndex(v => v === currentFilename);
  
  // If current video not found, assume no more available
  if (currentIndex < 0) {
    return false;
  }
  
  // Check if we're on the last video
  // If we're on the last video (index === length - 1), no more available
  return currentIndex < videos.length - 1;
};

