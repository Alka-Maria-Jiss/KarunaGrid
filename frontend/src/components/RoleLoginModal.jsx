import React, { useEffect } from 'react';

export default function RoleLoginModal({ isOpen, onClose, initialTab = 'login' }) {
  useEffect(() => {
    if (isOpen) {
      const targetPath = initialTab === 'register' ? '/register' : '/login';
      window.history.pushState({}, '', targetPath);
      window.dispatchEvent(new Event('popstate'));
      if (onClose) onClose();
    }
  }, [isOpen, initialTab, onClose]);

  return null;
}
