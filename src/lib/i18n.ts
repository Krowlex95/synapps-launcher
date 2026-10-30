import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from '../locales/pt-BR.json';
import en from '../locales/en.json';

function detectLanguage(): 'pt-BR' | 'en' {
  if (typeof navigator === 'undefined') return 'en';
  const language = navigator.language.toLowerCase();
  return language.startsWith('pt') ? 'pt-BR' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
});

export default i18n;
