import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const initialToken = localStorage.getItem('home_in_token');
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('home_in_user');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [token, setToken] = useState(() => initialToken);
    // If no token exists, we are definitely not loading
    const [loading, setLoading] = useState(() => !!initialToken);

    useEffect(() => {
        if (!initialToken) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        const verifyAuth = async () => {
            try {
                const res = await api.get('/me');
                if (isMounted && res.data?.data?.user) {
                    setUser(res.data.data.user);
                    localStorage.setItem('home_in_user', JSON.stringify(res.data.data.user));
                }
            } catch (err) {
                if (isMounted) {
                    localStorage.removeItem('home_in_token');
                    localStorage.removeItem('home_in_user');
                    setUser(null);
                    setToken(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        verifyAuth();

        return () => {
            isMounted = false;
        };
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/login', { email, password });
        const { user: userData, token: userToken } = res.data.data;
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('home_in_token', userToken);
        localStorage.setItem('home_in_user', JSON.stringify(userData));
        return userData;
    };

    const register = async (payload) => {
        const res = await api.post('/register', payload);
        const { user: userData, token: userToken } = res.data.data;
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('home_in_token', userToken);
        localStorage.setItem('home_in_user', JSON.stringify(userData));
        return userData;
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (err) {
            // ignore network errors
        } finally {
            setUser(null);
            setToken(null);
            localStorage.removeItem('home_in_token');
            localStorage.removeItem('home_in_user');
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
