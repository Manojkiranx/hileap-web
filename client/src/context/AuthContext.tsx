import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<User>;
  loginCustomer: (identifier: string) => Promise<User>;
  logout: () => Promise<void>;
  locationStatus: { active: boolean; message: string; lastCoords?: { lat: number; lng: number } };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [locationStatus, setLocationStatus] = useState<{ active: boolean; message: string; lastCoords?: { lat: number; lng: number } }>({
    active: false,
    message: 'Location tracking offline.',
  });

  // Verify auth session on initial page load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success && res.data.user) {
          setUser(res.data.user);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Automatic Geolocation tracking for Customer-Service Agent while logged in (Section 15)
  useEffect(() => {
    const watchId: number | null = null;
    let intervalId: any = null;

    const sendLocation = async (position: GeolocationPosition) => {
      try {
        const { latitude, longitude, accuracy } = position.coords;
        await api.post('/locations', { latitude, longitude, accuracy });
        setLocationStatus({
          active: true,
          message: `Live tracking active (${new Date().toLocaleTimeString()})`,
          lastCoords: { lat: latitude, lng: longitude },
        });
      } catch (err: any) {
        setLocationStatus({
          active: false,
          message: err.message || 'Outside working hours or tracking paused.',
        });
      }
    };

    const handleLocationError = (err: GeolocationPositionError) => {
      let msg = 'Geolocation error.';
      if (err.code === err.PERMISSION_DENIED) {
        msg = 'Location permission denied by user/browser.';
      }
      setLocationStatus({ active: false, message: msg });
    };

    if (user && user.role === 'Customer-Service-Agent') {
      if ('geolocation' in navigator) {
        // Obtain immediate fix
        navigator.geolocation.getCurrentPosition(sendLocation, handleLocationError, {
          enableHighAccuracy: true,
        });

        // Periodic location updates every 30 seconds
        intervalId = setInterval(() => {
          navigator.geolocation.getCurrentPosition(sendLocation, handleLocationError, {
            enableHighAccuracy: true,
          });
        }, 30000);
      } else {
        setLocationStatus({ active: false, message: 'Browser does not support Geolocation.' });
      }
    } else {
      setLocationStatus({ active: false, message: 'Location tracking disabled for role.' });
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [user]);

  const login = async (identifier: string, pass: string): Promise<User> => {
    const res = await api.post('/auth/login', { identifier, password: pass });
    if (res.data.success && res.data.user) {
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Login failed.');
  };

  const loginCustomer = async (identifier: string): Promise<User> => {
    const res = await api.post('/auth/customer-login', { identifier });
    if (res.data.success && res.data.user) {
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Customer login failed.');
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout server request failed:', err);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginCustomer, logout, locationStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
