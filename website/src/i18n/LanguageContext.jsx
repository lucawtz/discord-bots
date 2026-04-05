import { createContext, useContext, useState, useCallback } from 'react';
import de from './de';
import en from './en';

const translations = { de, en };
const LanguageContext = createContext();

function get(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
}

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'de');

    const changeLang = useCallback((l) => {
        setLang(l);
        localStorage.setItem('lang', l);
    }, []);

    const t = useCallback((key, fallback) => {
        return get(translations[lang], key) ?? fallback ?? key;
    }, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
