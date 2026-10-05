import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function ProtectedRoute({ allowedRole, onUnauthenticated, onRoleMismatch, children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      onUnauthenticated();
      return;
    }

    const checkUserAuth = async () => {
      try {
        const profile = await apiClient.get('/auth/me/');
        setUser(profile);

        if (allowedRole && profile.role.toLowerCase() !== allowedRole.toLowerCase()) {
          onRoleMismatch(profile.role.toLowerCase());
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Authentication check failed:", err);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        onUnauthenticated();
      }
    };

    checkUserAuth();
  }, [allowedRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-serene-bg flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-serene-primary/30 border-t-serene-primary rounded-full animate-spin" />
          <p className="text-xs font-bold text-serene-muted uppercase tracking-wider">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return children(user);
}
