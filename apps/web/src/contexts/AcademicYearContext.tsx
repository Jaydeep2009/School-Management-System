/**
 * Academic Year Context
 * 
 * Manages academic year selection across the application
 * - Always defaults to the current/active academic year
 * - Allows switching to historical years for reports
 * - Does NOT persist selection (always starts with current year)
 * - Waits for authentication before loading
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

interface AcademicYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'closed' | 'upcoming' | 'current';
}

interface AcademicYearContextType {
  selectedYear: AcademicYear | null;
  currentYear: AcademicYear | null;
  allYears: AcademicYear[];
  isLoading: boolean;
  setSelectedYear: (year: AcademicYear | null) => void;
  refreshYears: () => Promise<void>;
  resetToCurrentYear: () => void;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

interface AcademicYearProviderProps {
  children: ReactNode;
}

export function AcademicYearProvider({ children }: AcademicYearProviderProps) {
  const [selectedYear, setSelectedYearState] = useState<AcademicYear | null>(null);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [allYears, setAllYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated by looking for access token
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage?.getItem('accessToken');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Failed to check auth from localStorage:', error);
        setIsAuthenticated(false);
      }
    };

    // Check immediately
    checkAuth();

    // Also check on storage events (when token is set/removed)
    window.addEventListener('storage', checkAuth);
    
    // Custom event for when auth changes in same tab
    const handleAuthChange = () => checkAuth();
    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  // Load academic years from API
  const loadAcademicYears = async () => {
    // Don't load if not authenticated
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('[AcademicYear] Loading academic years...');
      
      const response = await apiService.getAcademicYears();
      const years = response.data || [];
      console.log('[AcademicYear] Loaded years:', years);
      
      // Sort years by start date (most recent first)
      const sortedYears = years.sort((a: AcademicYear, b: AcademicYear) => {
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      });
      
      setAllYears(sortedYears);

      // Find the current/active academic year (this is the default)
      const current = sortedYears.find((y: AcademicYear) => 
        y.status === 'current' || y.status === 'active'
      );
      
      // If no current year, use the most recent year
      const defaultYear = current || sortedYears[0] || null;
      
      console.log('[AcademicYear] Current year:', defaultYear?.label);
      setCurrentYear(defaultYear);
      setSelectedYearState(defaultYear);
      
    } catch (error) {
      console.error('[AcademicYear] Failed to load academic years:', error);
      setAllYears([]);
      setSelectedYearState(null);
      setCurrentYear(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load years when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAcademicYears();
    } else {
      // Clear data when not authenticated
      setAllYears([]);
      setSelectedYearState(null);
      setCurrentYear(null);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Update selected year (no localStorage persistence)
  const setSelectedYear = (year: AcademicYear | null) => {
    console.log('[AcademicYear] Changing year to:', year?.label);
    setSelectedYearState(year);
  };

  // Reset to current year
  const resetToCurrentYear = () => {
    console.log('[AcademicYear] Resetting to current year');
    setSelectedYearState(currentYear);
  };

  // Refresh academic years list
  const refreshYears = async () => {
    await loadAcademicYears();
  };

  return (
    <AcademicYearContext.Provider
      value={{
        selectedYear,
        currentYear,
        allYears,
        isLoading,
        setSelectedYear,
        refreshYears,
        resetToCurrentYear,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
}

/**
 * Hook to use academic year context
 * 
 * @example
 * const { selectedYear, currentYear, setSelectedYear, allYears } = useAcademicYear();
 */
export function useAcademicYear() {
  const context = useContext(AcademicYearContext);
  if (context === undefined) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
}
