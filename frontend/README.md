# Q-CHAT-10 Screening - User Frontend Application

React-based user-facing web application for Q-CHAT-10 (Quantitative Checklist for Autism in Toddlers) autism screening.

## Features

- 🎥 **Video-Based Assessment** - Side-by-side positive and negative behavior examples for 10 questions
- 🌍 **Bilingual Support** - English and Arabic with RTL layout
- 📊 **5-Point Scale Answers** - Frequency-based response options (Always to Never)
- 📱 **Mobile Responsive** - Optimized for all devices
- 💾 **Session Persistence** - Auto-save and resume functionality
- 📄 **Instant Reports** - Immediate risk assessment and downloadable recommendations
- ♿ **Accessible** - WCAG 2.1 compliant with keyboard navigation
- ↩️ **Navigation Freedom** - Go back to previous questions and change answers

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS 3.4+
- **State Management:** Zustand with localStorage persistence
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Forms:** React Hook Form + Zod validation
- **i18n:** react-i18next (English/Arabic)
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Prerequisites

- Node.js 18+ and npm
- Backend API running at http://localhost:8000 (or configured URL)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=Q-CHAT-10 Screening
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development
```

### 3. Run Development Server

```bash
npm run dev
```

Application will be available at: http://localhost:5173

### 4. Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
frontend_user/
├── src/
│   ├── components/
│   │   ├── layout/         # Header, Footer, Container
│   │   ├── ui/             # Reusable UI components
│   │   ├── chat/           # Chat-specific components
│   │   ├── forms/          # Form components
│   │   └── modals/         # Modal dialogs
│   ├── pages/              # Page components (routes)
│   ├── services/
│   │   ├── api.ts          # Axios instance
│   │   └── qchat-api.ts    # API client methods
│   ├── hooks/              # Custom React hooks
│   ├── store/              # Zustand global state
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── i18n/               # Internationalization
│   ├── assets/             # Static assets
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
├── .env                    # Environment variables
├── .env.example            # Environment template
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS configuration
└── package.json
```

## Development Status

See [PROGRESS.md](./PROGRESS.md) for detailed implementation status.

## API Integration

The frontend integrates with the Q-CHAT-10 backend REST API.

### Endpoints Used

```typescript
POST   /api/sessions/create              // Create new session
GET    /api/sessions/{token}/start       // Get welcome message
POST   /api/sessions/{token}/message     // Send user message
GET    /api/sessions/{token}             // Get session info
GET    /api/sessions/{token}/report      // Get final report
POST   /api/sessions/contact-request     // Submit contact form
```

## Internationalization (i18n)

Supports English and Arabic with automatic RTL layout switching.

Language preference is saved to localStorage.

## Voice Input

Uses Web Speech API for voice-based answers.

**Browser Support:**
- Chrome/Edge (full support)
- Safari (iOS 14.5+)
- Firefox (limited support)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

**Built with ❤️ for early autism detection**
