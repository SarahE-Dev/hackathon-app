'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Array<'Admin' | 'Proctor' | 'Grader' | 'Judge' | 'Applicant'>;
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/dashboard' }: RoleGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, hasAnyRole } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!hasAnyRole(allowedRoles)) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, user, allowedRoles, redirectTo, router, hasAnyRole]);

  // Show loading or nothing while checking
  if (!isAuthenticated || !hasAnyRole(allowedRoles)) {
    return null;
  }

  return <>{children}</>;
}
