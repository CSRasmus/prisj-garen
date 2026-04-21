import React from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import InstallPrompt from '@/components/InstallPrompt';
import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import AddProduct from '@/pages/AddProduct';
import ProductDetail from '@/pages/ProductDetail';
import Blog from '@/pages/Blog';
import BlogPost from '@/pages/BlogPost';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import Admin from '@/pages/Admin';
import Hund from '@/pages/niches/Hund';
import Katt from '@/pages/niches/Katt';
import Barn from '@/pages/niches/Barn';
import Elektronik from '@/pages/niches/Elektronik';
import Hem from '@/pages/niches/Hem';
import { handleReferral } from '@/functions/handleReferral';

// Capture referral code from URL and store in localStorage
const params = new URLSearchParams(window.location.search);
const refCode = params.get("ref");
if (refCode) localStorage.setItem("prisjakare_ref", refCode);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (!isAuthenticated) return;
    const savedRef = localStorage.getItem("prisjakare_ref");
    handleReferral({ referral_code: savedRef || null })
      .then(() => { if (savedRef) localStorage.removeItem("prisjakare_ref"); })
      .catch(() => {});
  }, [isAuthenticated]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      {/* Public landing page — redirect to dashboard if logged in */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />

      {/* Public blog routes */}
      <Route path="/blogg" element={<Blog />} />
      <Route path="/blogg/:slug" element={<BlogPost />} />

      {/* Public legal routes */}
      <Route path="/integritetspolicy" element={<Privacy />} />
      <Route path="/villkor" element={<Terms />} />

      {/* Admin */}
      <Route path="/admin" element={<Admin />} />

      {/* Niche landing pages */}
      <Route path="/hund" element={<Hund />} />
      <Route path="/katt" element={<Katt />} />
      <Route path="/barn" element={<Barn />} />
      <Route path="/elektronik" element={<Elektronik />} />
      <Route path="/hem" element={<Hem />} />

      {/* Authenticated app routes */}
      <Route element={<AppLayout />}>
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/" replace />}
        />
        <Route
          path="/add"
          element={isAuthenticated ? <AddProduct /> : <Navigate to="/" replace />}
        />
        <Route
          path="/product/:id"
          element={isAuthenticated ? <ProductDetail /> : <Navigate to="/" replace />}
        />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster duration={4000} closeButton />
        <InstallPrompt />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App