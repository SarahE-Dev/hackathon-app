'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';

/**
 * This page redirects to the correct assessment attempt route.
 * The proper route for taking assessments is /assessment/[attemptId]
 * This page handles legacy URLs or incorrect navigation patterns.
 */
export default function LegacyAssessmentAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;

  useEffect(() => {
    const redirectToAttempt = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        // Check if there's an in-progress attempt for this assessment
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/my-attempts`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const attempts = response.data.data || [];
        const inProgressAttempt = attempts.find(
          (attempt: any) =>
            (attempt.assessmentId === assessmentId ||
             attempt.assessmentId?._id === assessmentId ||
             attempt.assessmentId?.id === assessmentId) &&
            attempt.status === 'in-progress'
        );

        if (inProgressAttempt) {
          // Redirect to existing attempt
          const attemptId = inProgressAttempt._id || inProgressAttempt.id;
          router.push(`/assessment/${attemptId}`);
        } else {
          // No in-progress attempt, redirect to assessments list to start new one
          router.push(`/assessments?highlight=${assessmentId}`);
        }
      } catch (error) {
        console.error('Error checking attempts:', error);
        // On error, redirect to assessments list
        router.push('/assessments');
      }
    };

    redirectToAttempt();
  }, [assessmentId, router]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to assessment...</p>
      </div>
    </div>
  );
}
