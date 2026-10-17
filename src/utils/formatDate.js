import { i18n } from '../i18n'

export function formatDate(value) {
  return new Intl.DateTimeFormat(i18n.global.locale.value, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}
