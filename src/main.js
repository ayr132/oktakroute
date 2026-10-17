import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'
import './style.css'
import 'leaflet/dist/leaflet.css'

import { isDarkMode, setDarkMode } from './utils/theme'

setDarkMode(isDarkMode())
createApp(App).use(i18n).mount('#app')
