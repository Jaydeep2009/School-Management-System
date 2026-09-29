/**
 * Academic Year Context
 * 
 * Provides global academic year selection across the application
 * - Persists selection in localStorage
 * - Automatically loads current year on mount
 * - Filters all school data by selected academic year
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
  allYears: AcademicYear[];
  isLoading: boolean;
  setSelectedYear: (year: AcademicYear | null) => void;
  refreshYears: () => Promise<void>;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

const STORAGE_KEY = 'sms_selected_academic_year';

interface AcademicYearProviderProps {
  children: ReactNode;
}

export function AcademicYearProvider({ children }: AcademicYearProviderProps) {
  const [selectedYear, setSelectedYearState] = useState<AcademicYear | null>(null);
  const [allYears, setAllYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load academic years from API
  const loadAcademicYears = async () => {
    try {
      setIsLoading(true);
      console.log('[AcademicYear] Loading academic years...');
      const response = await apiService.getAcademicYears();
      const years = response.data || [];
      console.log('[AcademicYear] Loaded years:', years);
      setAllYears(years);

      // Try to restore selected year from localStorage
      const storedYearId = localStorage.getItem(STORAGE_KEY);
      let yearToSelect: AcademicYear | null = null;

      if (storedYearId) {
        // Find the stored year
        yearToSelect = years.find((y: AcademicYear) => y.id === storedYearId) || null;
        console.log('[AcademicYear] Restored from localStorage:', yearToSelect?.label);
      }

      // If no stored year or stored year not found, use active/current year
      if (!yearToSelect) {
        yearToSelect = years.find((y: AcademicYear) => y.status === 'active' || y.status === 'current') || null;
        console.log('[AcademicYear] Using active year:', yearToSelect?.label);
      }

      // If still no year, use the first year
      if (!yearToSelect && years.length > 0) {
        yearToSelect = years[0];
        console.log('[AcademicYear] Using first year:', yearToSelect?.label);
      }

      setSelectedYearState(yearToSelect);
      console.log('[AcademicYear] Selected year:', yearToSelect);
      
      // Save to localStorage
      if (yearToSelect) {
        localStorage.setItem(STORAGE_KEY, yearToSelect.id);
      }
    } catch (error) {
      console.error('[AcademicYear] Failed to load academic years:', error);
      setAllYears([]);
      setSelectedYearState(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load years on mount
  useEffect(() => {
    loadAcademicYears();
  }, []);

  // Update selected year and persist to localStorage
  const setSelectedYear = (year: AcademicYear | null) => {
    console.log('[AcademicYear] Changing year to:', year?.label);
    setSelectedYearState(year);
    if (year) {
      localStorage.setItem(STORAGE_KEY, year.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Refresh academic years list
  const refreshYears = async () => {
    await loadAcademicYears();
  };

  return (
    <AcademicYearContext.Provider
      value={{
        selectedYear,
        allYears,
        isLoading,
        setSelectedYear,
        refreshYears,
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
 * const { selectedYear, setSelectedYear, allYears } = useAcademicYear();
 */
export function useAcademicYear() {
  const context = useContext(AcademicYearContext);
  if (context === undefined) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
}
