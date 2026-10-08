/**
 * Authentication Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { User, UserRole } from '../types/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    loginId: string;
    role: string;
    schoolId: string;
    mustChangePassword: boolean;
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if we have an access token
      const accessToken = localStorage.getItem('accessToken');
      
      if (!accessToken) {
        setState({ user: null, isLoading: false, error: null });
        window.dispatchEvent(new Event('auth-change'));
        return;
      }

      // Set the token in API service
      apiService.setAccessToken(accessToken);

      // Verify the token by calling /auth/me
      const meResponse = await apiService.getMe();

      // Create user object from response
      const user: User = {
        id: meResponse.userId,
        loginId: meResponse.loginId,
        role: meResponse.role as UserRole,
        schoolId: meResponse.schoolId,
        mustChangePassword: false,
      };

      setState({ user, isLoading: false, error: null });
      window.dispatchEvent(new Event('auth-change'));
    } catch (error) {
      // Token invalid or expired, clear it
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      apiService.setAccessToken(null);
      setState({ user: null, isLoading: false, error: null });
      window.dispatchEvent(new Event('auth-change'));
    }
  };

  const login = useCallback(async (loginId: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await apiService.login(loginId, password) as LoginResponse;
      
      // Check if user must change password
      if (response.user.mustChangePassword) {
        throw new Error('Password change required. Please contact administrator.');
      }

      // Create user object from response
      const user: User = {
        id: response.user.id,
        loginId: response.user.loginId,
        role: response.user.role as UserRole,
        schoolId: response.user.schoolId,
        mustChangePassword: response.user.mustChangePassword,
      };

      setState({ user, isLoading: false, error: null });

      // Dispatch auth change event for contexts
      window.dispatchEvent(new Event('auth-change'));

      // Navigate based on role
      switch (response.user.role) {
        case 'principal':
          navigate('/dashboard');
          break;
        case 'teacher':
          navigate('/teacher/dashboard');
          break;
        case 'student':
          navigate('/student/dashboard');
          break;
        default:
          throw new Error('Invalid user role');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (error) {
      // Even if logout fails on server, clear client state
      console.error('Logout error:', error);
    } finally {
      setState({ user: null, isLoading: false, error: null });
      
      // Dispatch auth change event for contexts
      window.dispatchEvent(new Event('auth-change'));
      
      navigate('/login');
    }
  }, [navigate]);

  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
  };
}
