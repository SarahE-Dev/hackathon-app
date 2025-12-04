'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, UserRole } from '@/store/authStore';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/dashboard' }: RoleGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);
  const hasRedirected = useRef(false);

  // Check if user has any of the allowed roles
  const userHasRole = user?.roles?.some(r => allowedRoles.includes(r.role as UserRole)) ?? false;

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return;

    // Wait a moment for Zustand to rehydrate from localStorage
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        hasRedirected.current = true;
        router.replace('/auth/login');
        return;
      }

      if (!userHasRole) {
        hasRedirected.current = true;
        router.replace(redirectTo);
        return;
      }

      setAuthChecked(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [isAuthenticated, userHasRole, router, redirectTo]);

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
