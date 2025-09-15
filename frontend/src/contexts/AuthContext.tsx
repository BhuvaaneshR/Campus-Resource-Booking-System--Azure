import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest, isAllowedDomain } from '../config/authConfig';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { instance, accounts } = useMsal();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if authentication is disabled
        if (process.env.REACT_APP_AUTH_MODE === 'disabled') {
          // Set a mock user for bypass mode
          const mockUser: User = {
            id: 'bypass-user',
            email: 'admin@rajalakshmi.edu.in',
            name: 'System Admin',
            role: 'Portal Admin'
          };
          setUser(mockUser);
          setLoading(false);
          return;
        }

        // Check for existing MSAL account
        if (accounts.length > 0) {
          const account = accounts[0];
          const accessTokenRequest = {
            scopes: loginRequest.scopes,
            account: account,
          };

          const response = await instance.acquireTokenSilent(accessTokenRequest);
          
          // Check if user email domain is allowed
          const userEmail = response.account?.username || response.account?.idTokenClaims?.email;
          if (!userEmail || typeof userEmail !== 'string' || !isAllowedDomain(userEmail)) {
            throw new Error('Access denied. Only @rajalakshmi.edu.in email addresses are allowed.');
          }

          // Verify token with backend
          const result = await api.post('/auth/login', {
            accessToken: response.accessToken,
          });

          if (result.data.success) {
            setUser(result.data.user);
            localStorage.setItem('token', result.data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${result.data.token}`;
          }
        } else {
          // Check for existing JWT token
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const result = await api.get('/auth/verify');
              if (result.data.valid) {
                setUser(result.data.user);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
              } else {
                localStorage.removeItem('token');
              }
            } catch {
              localStorage.removeItem('token');
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [instance, accounts]);

  const login = async () => {
    try {
      setLoading(true);
      
      // Check if authentication is disabled
      if (process.env.REACT_APP_AUTH_MODE === 'disabled') {
        // Set a mock user for bypass mode
        const mockUser: User = {
          id: 'bypass-user',
          email: 'admin@rajalakshmi.edu.in',
          name: 'System Admin',
          role: 'Portal Admin'
        };
        setUser(mockUser);
        setLoading(false);
        return;
      }

      const response = await instance.loginPopup(loginRequest);
      
      if (response.account) {
        const accessTokenRequest = {
          scopes: loginRequest.scopes,
          account: response.account,
        };

        const tokenResponse = await instance.acquireTokenSilent(accessTokenRequest);
        
        // Check if user email domain is allowed
        const userEmail = response.account?.username || response.account?.idTokenClaims?.email;
        if (!userEmail || typeof userEmail !== 'string' || !isAllowedDomain(userEmail)) {
          throw new Error('Access denied. Only @rajalakshmi.edu.in email addresses are allowed.');
        }
        
        // Verify token with backend
        const result = await api.post('/auth/login', {
          accessToken: tokenResponse.accessToken,
        });

        if (result.data.success) {
          setUser(result.data.user);
          localStorage.setItem('token', result.data.token);
          api.defaults.headers.common['Authorization'] = `Bearer ${result.data.token}`;
        } else {
          throw new Error(result.data.error || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Check if authentication is disabled
      if (process.env.REACT_APP_AUTH_MODE === 'disabled') {
        setUser(null);
        return;
      }

      await instance.logoutPopup();
      setUser(null);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
