import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './lib/AuthContext';
import App from './App';

export default function Root() {
  return (
    <AuthProvider>
      <App />
      <Analytics />
    </AuthProvider>
  );
}
