import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enTranslations from './locales/en.json'
import frTranslations from './locales/fr.json'
import arTranslations from './locales/ar.json'

const RTL_LANGS = ['ar']

function applyDocumentDir(lng) {
  const dir = RTL_LANGS.includes(lng) ? 'rtl' : 'ltr'
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', lng)
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      fr: {
        translation: frTranslations
      },
      ar: {
        translation: arTranslations
      }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'ar'],
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

i18n.on('languageChanged', (lng) => {
  applyDocumentDir(lng)
})
i18n.on('initialized', () => {
  applyDocumentDir(i18n.language)
})

export default i18n
export { applyDocumentDir, RTL_LANGS }