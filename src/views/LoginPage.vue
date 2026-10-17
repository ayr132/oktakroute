<script setup>
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { Accessibility, ArrowLeft, Building2, UserRound } from '@lucide/vue'
import { supabase } from '../data/supabase'
import { demoCouncilEmail, demoCouncilEnabled, matchesDemoCouncilCredentials } from '../data/demoCouncil'

const { t } = useI18n()
const emit = defineEmits(['done', 'cancel', 'council', 'demo-citizen'])
const signup = ref(false)
const role = ref('citizen')
const email = ref('')
const password = ref('')
const error = ref('')
const info = ref('')
const busy = ref(false)

function selectRole(next) {
  role.value = next
  error.value = ''
  info.value = ''
  email.value = next === 'council' && demoCouncilEnabled ? demoCouncilEmail : ''
  password.value = ''
}

async function submit() {
  if (role.value === 'council') return submitCouncil()
  if (!signup.value && email.value.trim().toLowerCase() === 'demo@gmail.com' && password.value === 'demo') {
    emit('demo-citizen', 'demo@gmail.com')
    return
  }
  if (!supabase) {
    error.value = t('auth.errNoSupabase')
    return
  }
  busy.value = true
  error.value = ''
  info.value = ''
  try {
    const credentials = { email: email.value.trim(), password: password.value }
    if (signup.value) {
      const { data, error: err } = await supabase.auth.signUp(credentials)
      if (err) throw err
      if (!data.session) {
        info.value = t('auth.checkEmail')
        signup.value = false
        return
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword(credentials)
      if (err) throw err
    }
    emit('done')
  } catch (err) {
    console.error('Citizen auth failed.', err)
    error.value = signup.value ? t('auth.errSignUp') : t('auth.errLogIn')
  } finally {
    busy.value = false
  }
}

async function submitCouncil() {
  if (matchesDemoCouncilCredentials(email.value, password.value)) {
    emit('council', 'demo')
    return
  }
  if (!supabase) {
    error.value = demoCouncilEnabled ? t('auth.errDemoCouncil') : t('auth.errCouncilNoSupabase')
    return
  }
  busy.value = true
  error.value = ''
  try {
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value })
    if (err) throw err
    if (data.user?.app_metadata?.role !== 'council') {
      await supabase.auth.signOut()
      error.value = t('auth.errNotCouncil')
      return
    }
    emit('council', 'supabase')
  } catch (err) {
    console.error('Council sign-in failed.', err)
    error.value = t('auth.errCouncil')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <button type="button" class="icon-btn auth-back" :aria-label="t('auth.back')" @click="emit('cancel')"><ArrowLeft :size="18" /></button>
      <div class="search-brand auth-brand">
        <span class="brand-mark"><Accessibility :size="18" stroke-width="2.4" /></span>
        <span class="brand-name">OKtak<span>Route</span></span>
      </div>
      <div class="auth-title">
        <h1>{{ signup ? t('auth.createAccount') : t('auth.welcomeBack') }}</h1>
        <p>{{ signup ? t('auth.signupSub') : t('auth.loginSub') }}</p>
      </div>
      <div class="profile-role-options" role="group" :aria-label="t('auth.accountType')">
        <button type="button" :class="{ selected: role === 'citizen' }" :aria-pressed="role === 'citizen'" @click="selectRole('citizen')"><UserRound :size="17" /> {{ t('profile.citizen') }}</button>
        <button type="button" :class="{ selected: role === 'council' }" :aria-pressed="role === 'council'" @click="selectRole('council')"><Building2 :size="17" /> {{ t('profile.council') }}</button>
      </div>
      <p v-if="role === 'council' && signup" class="profile-role-note">{{ t('auth.councilSignupNote') }}</p>
      <p v-if="role === 'council' && !signup && demoCouncilEnabled" class="demo-auth-notice">{{ t('auth.demoNotice') }}</p>
      <form v-if="!(role === 'council' && signup)" class="profile-form" @submit.prevent="submit">
        <label class="form-label" for="auth-email">{{ t('auth.email') }}</label>
        <input id="auth-email" v-model="email" class="text-input" type="email" autocomplete="username" placeholder="you@example.com" required />
        <label class="form-label" for="auth-password">{{ t('auth.password') }}</label>
        <input id="auth-password" v-model="password" class="text-input" type="password" :minlength="signup && role === 'citizen' ? 6 : undefined" :autocomplete="signup ? 'new-password' : 'current-password'" required />
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <p v-if="info" class="profile-role-note">{{ info }}</p>
        <button type="submit" class="btn btn--brand btn--block" :disabled="busy">{{ busy ? t('auth.wait') : signup && role === 'citizen' ? t('auth.signUp') : t('auth.logIn') }}</button>
      </form>
      <p class="auth-switch">
        {{ signup ? t('auth.haveAccount') : t('auth.newHere') }}
        <button type="button" @click="signup = !signup; error = ''">{{ signup ? t('auth.logIn') : t('auth.signUp') }}</button>
      </p>
      <p v-if="role === 'citizen' && !signup" class="auth-demo">{{ t('auth.demoHint', { email: 'demo@gmail.com' }) }}</p>
    </section>
  </main>
</template>
