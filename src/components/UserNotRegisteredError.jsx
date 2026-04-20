import React from 'react';
import { base44 } from '@/api/base44Client';

const UserNotRegisteredError = () => {
  // Detect Facebook/OAuth email error from URL params
  const params = new URLSearchParams(window.location.search);
  const errorParam = (params.get('error') || params.get('error_description') || '').toLowerCase();
  const isFacebookEmailError =
    errorParam.includes('email not returned') ||
    errorParam.includes('email_not_returned') ||
    errorParam.includes('facebook');

  const handleGoogleLogin = () => {
    base44.auth.redirectToLogin('/dashboard');
  };

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  if (isFacebookEmailError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 px-4">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg border border-slate-100 text-center space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
            <span className="text-3xl">😕</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Inloggning med Facebook misslyckades</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Facebook delade inte din e-postadress med oss, vilket krävs för att skapa ett konto.
            Det händer tyvärr ibland med Facebook-inloggning.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            <p className="font-semibold mb-1">✅ Vi rekommenderar Google</p>
            <p>Google-inloggning fungerar alltid och är snabbare.</p>
          </div>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Logga in med Google istället →
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Gå tillbaka till startsidan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-2 rounded-full bg-orange-100">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Åtkomst begränsad</h1>
          <p className="text-slate-600 text-sm">
            Du är inte registrerad för att använda den här appen. Kontakta administratören för att begära åtkomst.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 text-left">
            <p className="font-medium mb-2">Om du tror detta är ett misstag:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Kontrollera att du är inloggad med rätt konto</li>
              <li>Prova att logga ut och in igen</li>
              <li>Kontakta app-administratören</li>
            </ul>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Logga ut och gå till startsidan
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;