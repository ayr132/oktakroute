import { createI18n } from 'vue-i18n'
import en from './en'
import ms from './ms'
import ta from './ta'
import zh from './zh'

const KEY = 'oktakroute-language'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'zh', label: '中文' },
  { code: 'ta', label: 'தமிழ்' },
]

function readLanguage() {
  try {
    const saved = localStorage.getItem(KEY)
    return LANGUAGES.some((language) => language.code === saved) ? saved : 'en'
  } catch {
    return 'en'
  }
}

export const i18n = createI18n({ legacy: false, locale: readLanguage(), fallbackLocale: 'en', messages: { en, ms, ta, zh } })
document.documentElement.lang = i18n.global.locale.value

export function setLanguage(code) {
  i18n.global.locale.value = code
  document.documentElement.lang = code
  try {
    localStorage.setItem(KEY, code)
  } catch (error) {
    console.error('Could not save the language in this browser.', error)
  }
}
