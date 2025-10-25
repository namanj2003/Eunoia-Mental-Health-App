# Eunoia Mental Health App (Mobile Application)
AI-powered mental wellness mobile application for secure journaling, mood tracking, and supportive AI chat.

## Tech Stack
- React 18 + TypeScript
- Vite, Tailwind, Radix UI
- Capacitor (Android/iOS packaging)
- Axios for API calls

## Features
- Secure journaling with emotion insights
- Weekly mood trends, pie chart, positivity score, streaks
- AI chatbot with crisis detection
- Guided meditation and mood check-ins
- Accessibility: multiple contrast modes

## Quick Start
1. Prerequisites: Node 18+
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the app:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
5. Open native project (optional):
   ```bash
   npx cap sync
   npx cap open android
   ```

## Environment Variables (.env)
- VITE_API_BASE_URL=https://backend.example.com
- VITE_ML_SERVICE_URL=https://ml-service.example.com
- VITE_CHAT_SERVICE_URL=https://ai-chat-service.example.com

## Project Structure
- `src/` – components, screens, contexts, utils
- `public/` – static assets

## Notes
- Configure API base URLs in `.env`.
- For mobile builds, ensure Android/iOS SDKs are installed.
