<script setup>
import { ref } from 'vue'
import { ArrowLeft } from '@lucide/vue'
import { supabase } from '../data/supabase'

const emit = defineEmits(['done', 'cancel'])
const signup = ref(false)
const email = ref('')
const password = ref('')
const error = ref('')
const info = ref('')
const busy = ref(false)

async function submit() {
  if (!supabase) {
    error.value = 'Sign-in is unavailable because Supabase is not configured.'
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
        info.value = 'Account created. Check your email to confirm, then log in.'
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
    error.value = signup.value ? 'Could not sign up. Try a different email or a longer password.' : 'Log in failed. Check your email and password.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="page">
    <button type="button" class="btn btn--light" @click="emit('cancel')"><ArrowLeft :size="16" /> Back</button>
    <h1>{{ signup ? 'Sign up' : 'Log in' }}</h1>
    <form class="profile-form" @submit.prevent="submit">
      <label class="form-label" for="auth-email">Email</label>
      <input id="auth-email" v-model="email" class="text-input" type="email" autocomplete="username" required />
      <label class="form-label" for="auth-password">Password</label>
      <input id="auth-password" v-model="password" class="text-input" type="password" minlength="6" :autocomplete="signup ? 'new-password' : 'current-password'" required />
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <p v-if="info" class="profile-role-note">{{ info }}</p>
      <button type="submit" class="btn btn--brand btn--block" :disabled="busy">{{ busy ? 'Please wait…' : signup ? 'Sign up' : 'Log in' }}</button>
      <button type="button" class="btn btn--light btn--block" @click="signup = !signup; error = ''">
        {{ signup ? 'Have an account? Log in' : 'New here? Sign up' }}
      </button>
    </form>
  </main>
</template>
