import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => localStorage.getItem('cb_theme') || 'dark');
    const [wallpaper, setWallpaper] = useState(() =>
        localStorage.getItem('cb_wallpaper') || 'default'
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('cb_theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('cb_wallpaper', wallpaper);
    }, [wallpaper]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    return (
        <SettingsContext.Provider value={{ theme, toggleTheme, wallpaper, setWallpaper }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);