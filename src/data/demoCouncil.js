const demoEmail = import.meta.env.VITE_DEMO_COUNCIL_EMAIL || ''
const demoPassword = import.meta.env.VITE_DEMO_COUNCIL_PASSWORD || ''

export const demoCouncilEnabled = import.meta.env.DEV && Boolean(demoEmail && demoPassword)
export const demoCouncilEmail = demoCouncilEnabled ? demoEmail : ''

export function matchesDemoCouncilCredentials(email, password) {
  return demoCouncilEnabled
    && email.trim().toLowerCase() === demoEmail.trim().toLowerCase()
    && password === demoPassword
}
