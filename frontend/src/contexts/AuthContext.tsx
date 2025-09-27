import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
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
          } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('token');
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
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      
      // Hardcoded admin credentials
      if (credentials.email === 'admin@rajalakshmi.edu.in' && credentials.password === 'admin@1234') {
        const adminUser: User = {
          id: 'admin-1',
          email: 'admin@rajalakshmi.edu.in',
          name: 'Portal Admin',
          role: 'Portal Admin'
        };
        
        // In a real app, this would come from your backend
        const mockToken = 'mock-jwt-token-for-admin';
        
        setUser(adminUser);
        localStorage.setItem('token', mockToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
        
        // In a real app, you would make an API call like this:
        // const response = await api.post('/auth/login', credentials);
        // setUser(response.data.user);
        // localStorage.setItem('token', response.data.token);
        // api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      } else {
        throw new Error('Invalid email or password');
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
      setUser(null);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
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
