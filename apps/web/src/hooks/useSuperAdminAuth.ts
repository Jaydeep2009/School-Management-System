/**
 * Super Admin Authentication Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { SuperAdmin } from '../types/super-admin';

interface SuperAdminAuthState {
  superAdmin: SuperAdmin | null;
  isLoading: boolean;
  error: string | null;
}

export function useSuperAdminAuth() {
  const [state, setState] = useState<SuperAdminAuthState>({
    superAdmin: null,
    isLoading: true,
    error: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if we have a Super Admin token
      const superAdminToken = localStorage.getItem('superAdminToken');
      const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';

      if (!superAdminToken || !isSuperAdmin) {
        setState({ superAdmin: null, isLoading: false, error: null });
        return;
      }

      // Set the token in API service
      apiService.setAccessToken(superAdminToken);

      // Verify the token by calling /auth/me
      // Super Admin token should be rejected by school endpoints
      // but we can verify it's valid by attempting to fetch schools
      try {
        await apiService.getSchools();
        
        // Token is valid, create Super Admin object
        const superAdmin: SuperAdmin = {
          id: 'super-admin',
          role: 'super_admin',
        };

        setState({ superAdmin, isLoading: false, error: null });
      } catch (error) {
        // Token invalid, clear it
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('isSuperAdmin');
        apiService.setAccessToken(null);
        setState({ superAdmin: null, isLoading: false, error: null });
      }
    } catch (error) {
      setState({ superAdmin: null, isLoading: false, error: null });
    }
  };

  const login = useCallback(
    async (loginId: string, password: string) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        await apiService.superAdminLogin(loginId, password);

        // Create Super Admin object
        const superAdmin: SuperAdmin = {
          id: 'super-admin',
          role: 'super_admin',
        };

        setState({ superAdmin, isLoading: false, error: null });

        // Navigate to Super Admin dashboard
        navigate('/super-admin');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        throw error;
      }
    },
    [navigate]
  );

  const logout = useCallback(async () => {
    try {
      await apiService.superAdminLogout();
    } catch (error) {
      console.error('Super Admin logout error:', error);
    } finally {
      setState({ superAdmin: null, isLoading: false, error: null });
      navigate('/super-admin/login');
    }
  }, [navigate]);

  return {
    superAdmin: state.superAdmin,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
  };
}
