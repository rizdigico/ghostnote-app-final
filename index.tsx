import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Validate environment variables
const validateEnvironment = () => {
  if (import.meta.env.PROD) {
    // In production, API key should be set
    const apiKey = (import.meta.env as any).VITE_GEMINI_API_KEY || (import.meta.env as any).GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: VITE_GEMINI_API_KEY environment variable is not configured.');
    }
  }
};

// Log environment for debugging (only in dev)
if (!import.meta.env.PROD) {
  console.log('Running in development mode');
} else {
  console.log('Running in production mode');
}

// Validate environment on startup
validateEnvironment();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);