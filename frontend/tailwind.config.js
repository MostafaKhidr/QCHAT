/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DGA SA Primary Color Scale (Green Series)
        sa: {
          50: '#E9F5EF',
          100: '#CFEBDD',
          200: '#A0D7BB',
          300: '#72C299',
          400: '#43AE77',
          500: '#25935F',
          600: '#1B8354',
          700: '#166445',
          800: '#14573A',
          900: '#104631',
          950: '#092A1E',
        },
        // Map primary to SA scale (backward compatibility)
        primary: {
          50: '#E9F5EF',
          100: '#CFEBDD',
          200: '#A0D7BB',
          300: '#72C299',
          400: '#43AE77',
          500: '#25935F',
          600: '#1B8354',
          700: '#166445',
          800: '#14573A',
          900: '#104631',
          950: '#092A1E',
        },
        // DGA Neutral / Gray Palette
        gray: {
          50: '#F9FAFB',
          100: '#F2F4F7',
          200: '#EAECF0',
          300: '#D0D5DD',
          400: '#98A2B3',
          500: '#667085',
          600: '#475467',
          700: '#344054',
          800: '#1D2939',
          900: '#101828',
          950: '#0D121C',
        },
        // DGA Semantic Colors - Error / Danger
        error: {
          50: '#FEF3F2',
          100: '#FEE4E2',
          200: '#FECACA',
          300: '#FDA29B',
          400: '#F97066',
          500: '#F04438',
          600: '#D92D20',
          700: '#B42318',
          800: '#912018',
          900: '#7A271A',
        },
        // Map danger to error (backward compatibility)
        danger: {
          50: '#FEF3F2',
          100: '#FEE4E2',
          200: '#FECACA',
          300: '#FDA29B',
          400: '#F97066',
          500: '#F04438',
          600: '#D92D20',
          700: '#B42318',
          800: '#912018',
          900: '#7A271A',
        },
        // DGA Semantic Colors - Warning
        warning: {
          50: '#FFFAEB',
          100: '#FEF0C7',
          200: '#FEDF89',
          300: '#FEC84B',
          400: '#FDB022',
          500: '#F79009',
          600: '#DC6803',
          700: '#B54708',
          800: '#93370D',
          900: '#7A2E0E',
        },
        // DGA Semantic Colors - Success
        success: {
          50: '#ECFDF3',
          100: '#D1FADF',
          200: '#A6F4C5',
          300: '#6CE9A6',
          400: '#32D583',
          500: '#17B26A',
          600: '#079455',
          700: '#067647',
          800: '#085D3A',
          900: '#074D31',
        },
        // DGA Semantic Colors - Info / Blue
        info: {
          50: '#EFF8FF',
          100: '#D1E9FF',
          200: '#B2DDFF',
          300: '#84CAFF',
          400: '#53B1FD',
          500: '#2E90FA',
          600: '#1570EF',
          700: '#175CD3',
          800: '#1849A9',
          900: '#194185',
        },
        // Map secondary to info (backward compatibility)
        secondary: {
          50: '#EFF8FF',
          100: '#D1E9FF',
          200: '#B2DDFF',
          300: '#84CAFF',
          400: '#53B1FD',
          500: '#2E90FA',
          600: '#1570EF',
          700: '#175CD3',
          800: '#1849A9',
          900: '#194185',
        },
      },
      fontFamily: {
        // DGA Typography System
        primary: ['Tajawal', 'sans-serif'], // Heading font
        secondary: ['IBM Plex Sans Arabic', 'sans-serif'], // Body text
        english: ['Inter', 'sans-serif'], // English UI
        sans: ['IBM Plex Sans Arabic', 'Inter', 'system-ui', 'sans-serif'], // Default body
        display: ['Tajawal', 'Inter', 'system-ui', 'sans-serif'], // Display/Heading
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.5' }],
        '2xl': ['24px', { lineHeight: '1.4' }],
        '3xl': ['30px', { lineHeight: '1.3' }],
        '4xl': ['36px', { lineHeight: '1.2' }],
        '5xl': ['48px', { lineHeight: '1.1' }],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -3px rgba(0, 0, 0, 0.1), 0 15px 30px -2px rgba(0, 0, 0, 0.05)',
        'large': '0 10px 40px -3px rgba(0, 0, 0, 0.15), 0 20px 40px -2px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
