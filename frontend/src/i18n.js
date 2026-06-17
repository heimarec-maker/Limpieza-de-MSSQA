import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Archivos JSON de traducciones por idioma
import esCO from './locales/es-CO.json'
import enUS from './locales/en-US.json'
import ptBR from './locales/pt-BR.json'
import zhCN from './locales/zh-CN.json'

const resources = {
  'es-CO': { translation: esCO },
  'en-US': { translation: enUS },
  'pt-BR': { translation: ptBR },
  'zh-CN': { translation: zhCN },
}

// Leer idioma guardado en localStorage (si existe)
const savedSettings = localStorage.getItem('userSettings')
const parsedSettings = savedSettings ? JSON.parse(savedSettings) : null
const initialLanguage = parsedSettings?.language || 'es-CO'

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'es-CO',
    interpolation: {
      escapeValue: false // React already escapes by default
    }
  })

export default i18n
