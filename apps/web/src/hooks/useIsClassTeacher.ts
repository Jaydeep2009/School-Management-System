import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

/**
 * Hook to check if the current teacher is a class teacher
 * Returns true if teacher has at least one classroom where they are the class teacher
3
 * 
 * Features:
 * - Retry logic for network errors (up to 3 attempts)
 * - Proper error state tracking
 * - Null state for initial loading
 */
export function useIsClassTeacher() {
  const [isClassTeacher, setIsClassTeacher] = useState<boolean | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const checkClassTeacherStatus = async () => {
      try {
        const response = await apiService.getMyTeaching();
        const assignments = response.data || [];
        
        // Check if any assignment has is_class_teacher flag
        const hasClassTeacherRole = assignments.some((a: any) => !!a.is_class_teacher);
        
        if (mounted) {
          setIsClassTeacher(hasClassTeacherRole);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to check class teacher status:', err);
        
        // Retry on network errors
        if (retryCount < MAX_RETRIES && mounted) {
          retryCount++;
          console.log(`Retrying class teacher check (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(checkClassTeacherStatus, 1000 * retryCount);
        } else if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setIsClassTeacher(false);
        }
      }
    };

    checkClassTeacherStatus();

    return () => {
      mounted = false;
    };
  }, []);

  return { 
    isClassTeacher: isClassTeacher ?? false, 
    isLoading: isClassTeacher === null,
    error 
  };
}
