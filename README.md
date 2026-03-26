# Dar-ul-Madinah Lesson Planner Deployment Guide

This project is a full-stack React application (Vite + Express) designed to be deployed on Vercel.

## Deployment Steps

### 1. Firebase Configuration
Ensure your Firebase project is correctly configured:
- **Authorized Domains**: Go to **Firebase Console > Authentication > Settings > Authorized Domains** and add your Vercel deployment domain (e.g., `dar-ul-madinah-international-islamic-school-system-8y2mje5ci.vercel.app`). **This is required for Google Sign-in to work.**

### 2. Vercel Environment Variables
Add the following environment variables in your Vercel Dashboard (**Settings > Environment Variables**):

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API Key. |
| `NODE_ENV` | Set to `production`. |

### 3. Local Setup
If you want to run the project locally:
1. Install dependencies: `npm install`
2. Create a `.env` file with your `GEMINI_API_KEY`.
3. Start the dev server: `npm run dev`

## Project Structure
- `server.ts`: Express server handling Gemini API calls and serving the frontend.
- `src/`: React frontend source code.
- `firebase-applet-config.json`: Firebase configuration (ensure this is correct).
