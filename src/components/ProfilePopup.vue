<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Accessibility, Building2, Check, User, X } from '@lucide/vue'
import { supabase } from '../data/supabase'
import { demoCouncilEmail, demoCouncilEnabled, matchesDemoCouncilCredentials } from '../data/demoCouncil'

const props = defineProps({
  name: { type: String, default: '' },
  activeCount: { type: Number, default: 0 },
  resolvedCount: { type: Number, default: 0 },
  mode: { type: String, default: 'oku' },
  councilAuthenticated: { type: Boolean, default: false },
  demoCouncilSession: { type: Boolean, default: false },
})

const emit = defineEmits(['save', 'close', 'select-mode', 'council-authenticated', 'sign-out'])
const draft = ref(props.name)
const selectedMode = ref(props.mode)
const saved = ref(false)
const input = ref(null)
const councilEmail = ref(demoCouncilEmail)
const councilPassword = ref('')
const authError = ref('')
const authBusy = ref(false)
const initial = computed(() => draft.value.trim().charAt(0).toUpperCase())
let savedTimer

const onKeydown = (event) => { if (event.key === 'Escape') emit('close') }

function selectMode(mode) {
  selectedMode.value = mode
  authError.value = ''
  emit('select-mode', mode)
}

function save() {
  emit('save', draft.value.trim())
  saved.value = true
  window.clearTimeout(savedTimer)
  savedTimer = window.setTimeout(() => { saved.value = false }, 2000)
}

async function signInCouncil() {
  if (matchesDemoCouncilCredentials(councilEmail.value, councilPassword.value)) {
    emit('council-authenticated', 'demo')
    emit('close')
    return
  }
  if (!supabase) {
    authError.value = demoCouncilEnabled
      ? 'Demo sign-in failed. Check the local demo credentials.'
      : 'Council sign-in is unavailable because Supabase is not configured.'
    return
  }
  authBusy.value = true
  authError.value = ''
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: councilEmail.value.trim(),
      password: councilPassword.value,
    })
    if (error) throw error
    if (data.user?.app_metadata?.role !== 'council') {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      authError.value = 'This account is not authorized for council access.'
      return
    }
    emit('council-authenticated')
    emit('close')
  } catch (error) {
    console.error('Council sign-in failed.', error)
    authError.value = 'Sign-in failed. Check your staff account details and try again.'
  } finally {
    authBusy.value = false
  }
}

async function signOutCouncil() {
  if (props.demoCouncilSession) {
    emit('sign-out')
    selectMode('oku')
    return
  }
  if (!supabase) return
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    emit('sign-out')
    selectMode('oku')
  } catch (error) {
    console.error('Council sign-out failed.', error)
    authError.value = 'Could not sign out. Please try again.'
  }
}

function openCouncilDashboard() {
  emit('close')
  emit('council-authenticated', props.demoCouncilSession ? 'demo' : 'supabase')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  input.value?.focus()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.clearTimeout(savedTimer)
})
</script>

<template>
  <div class="profile-layer">
    <div class="profile-backdrop" @click="emit('close')"></div>
    <section class="profile-popup" role="dialog" aria-label="Your profile">
      <button type="button" class="icon-btn profile-close" aria-label="Close profile" @click="emit('close')"><X :size="18" /></button>

      <div class="profile-head">
        <span class="profile-avatar" aria-hidden="true">
          <template v-if="initial">{{ initial }}</template>
          <User v-else :size="30" />
        </span>
        <strong>{{ name || 'Your profile' }}</strong>
        <span>Your details stay in this browser.</span>
      </div>

      <form class="profile-form" @submit.prevent="save">
        <label class="form-label" for="profile-name">Display name</label>
        <input id="profile-name" ref="input" v-model="draft" class="text-input" type="text" maxlength="40" autocomplete="name" placeholder="e.g. Alex" />
        <button type="submit" class="btn btn--brand btn--block"><Check v-if="saved" :size="16" />{{ saved ? 'Saved' : 'Save' }}</button>
      </form>

      <section class="profile-roles" aria-label="Choose your role">
        <strong>Continue as</strong>
        <div class="profile-role-options">
          <button type="button" :class="{ selected: selectedMode === 'oku' }" :aria-pressed="selectedMode === 'oku'" @click="selectMode('oku')">
            <Accessibility :size="17" /> OKU citizen
          </button>
          <button type="button" :class="{ selected: selectedMode === 'council' }" :aria-pressed="selectedMode === 'council'" @click="selectMode('council')">
            <Building2 :size="17" /> Council staff
          </button>
        </div>
        <form v-if="selectedMode === 'council' && !councilAuthenticated" class="profile-form council-login" @submit.prevent="signInCouncil">
          <p v-if="demoCouncilEnabled" class="demo-auth-notice">Local development demo only. This does not verify access with Supabase.</p>
          <label class="form-label" for="council-email">Council staff email</label>
          <input id="council-email" v-model="councilEmail" class="text-input" type="email" autocomplete="username" required />
          <label class="form-label" for="council-password">Password</label>
          <input id="council-password" v-model="councilPassword" class="text-input" type="password" autocomplete="current-password" required />
          <p v-if="authError" class="form-error" role="alert">{{ authError }}</p>
          <button type="submit" class="btn btn--brand btn--block" :disabled="authBusy">{{ authBusy ? 'Signing in…' : 'Sign in to council dashboard' }}</button>
        </form>
        <div v-else-if="selectedMode === 'council' && councilAuthenticated" class="profile-council-actions">
          <p v-if="demoCouncilSession" class="demo-auth-notice">Demo session only. Council actions are saved in this browser and are not authorized in Supabase.</p>
          <p v-else class="profile-role-note">Council access verified.</p>
          <button type="button" class="btn btn--brand btn--block" @click="openCouncilDashboard">Open council dashboard</button>
          <button type="button" class="btn btn--light btn--block" @click="signOutCouncil">Sign out</button>
          <p v-if="authError" class="form-error" role="alert">{{ authError }}</p>
        </div>
      </section>

      <div class="profile-stats" aria-label="Community reports">
        <div><strong>{{ activeCount }}</strong><span>Active reports</span></div>
        <div><strong>{{ resolvedCount }}</strong><span>Resolved</span></div>
      </div>
    </section>
  </div>
</template>
