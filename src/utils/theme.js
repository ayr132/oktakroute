const KEY = 'oktakroute-dark-mode'

export function isDarkMode() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setDarkMode(on) {
  document.documentElement.classList.toggle('dark', on)
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch (error) {
    console.error('Could not save the theme in this browser.', error)
  }
}
