import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PatientDashboard from './pages/PatientDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import NurseDashboard from './pages/NurseDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    navigateTo('/');
  };

  const handleUnauthenticated = () => {
    navigateTo('/login');
  };

  const handleRoleMismatch = (actualRole) => {
    navigateTo(`/dashboard/${actualRole}`);
  };

  const renderCurrentView = () => {
    if (currentPath === '/login') {
      return <LoginPage onNavigate={navigateTo} />;
    }

    if (currentPath === '/register') {
      return <RegisterPage onNavigate={navigateTo} />;
    }

    if (currentPath === '/dashboard/patient') {
      return (
        <ProtectedRoute
          allowedRole="patient"
          onUnauthenticated={handleUnauthenticated}
          onRoleMismatch={handleRoleMismatch}
        >
          {(user) => <PatientDashboard user={user} onLogout={handleLogout} />}
        </ProtectedRoute>
      );
    }

    if (currentPath === '/dashboard/caregiver') {
      return (
        <ProtectedRoute
          allowedRole="caregiver"
          onUnauthenticated={handleUnauthenticated}
          onRoleMismatch={handleRoleMismatch}
        >
          {(user) => <CaregiverDashboard user={user} onLogout={handleLogout} />}
        </ProtectedRoute>
      );
    }

    if (currentPath === '/dashboard/doctor') {
      return (
        <ProtectedRoute
          allowedRole="doctor"
          onUnauthenticated={handleUnauthenticated}
          onRoleMismatch={handleRoleMismatch}
        >
          {(user) => <DoctorDashboard user={user} onLogout={handleLogout} />}
        </ProtectedRoute>
      );
    }

    if (currentPath === '/dashboard/nurse') {
      return (
        <ProtectedRoute
          allowedRole="nurse"
          onUnauthenticated={handleUnauthenticated}
          onRoleMismatch={handleRoleMismatch}
        >
          {(user) => <NurseDashboard user={user} onLogout={handleLogout} />}
        </ProtectedRoute>
      );
    }

    if (currentPath === '/dashboard/admin') {
      return (
        <ProtectedRoute
          allowedRole="admin"
          onUnauthenticated={handleUnauthenticated}
          onRoleMismatch={handleRoleMismatch}
        >
          {(user) => <AdminDashboard user={user} onLogout={handleLogout} />}
        </ProtectedRoute>
      );
    }

    // Default: Landing Page
    return <LandingPage onNavigate={navigateTo} />;
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        {renderCurrentView()}
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
