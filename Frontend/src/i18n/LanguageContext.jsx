import { createContext, useContext, useState, useCallback } from 'react';
import en from './en.json';
import si from './si.json';
import ta from './ta.json';

const translations = { English: en, Sinhala: si, Tamil: ta };

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(
        () => localStorage.getItem('appLanguage') || 'English'
    );

    const setLanguage = useCallback((lang) => {
        setLanguageState(lang);
        localStorage.setItem('appLanguage', lang);
        document.documentElement.setAttribute(
            'lang',
            lang === 'Sinhala' ? 'si' : lang === 'Tamil' ? 'ta' : 'en'
        );
    }, []);

    const t = useCallback(
        (key) => {
            const dict = translations[language] || translations.English;
            return dict[key] || translations.English[key] || key;
        },
        [language]
    );

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
