import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';

import { UIProvider } from './context/UIContext.jsx';

// VITE_GOOGLE_CLIENT_ID must be set in .env.local (dev) and Vercel env vars (prod).
// Do NOT hardcode a fallback here — a fake/missing ID causes "invalid_client".
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.error(
    '[Fwtion] VITE_GOOGLE_CLIENT_ID is not set. ' +
    'Add it to .env.local (dev) or Vercel environment variables (prod). ' +
    'Google login will not work until this is fixed.'
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || ''}>
      <BrowserRouter>
        <ThemeProvider>
          <UIProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </UIProvider>
        </ThemeProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
