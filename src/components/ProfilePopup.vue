<script setup>
import { useI18n } from 'vue-i18n'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown, LayoutDashboard, LogOut, Moon, User, UserRound, X } from '@lucide/vue'
import LogoutConfirm from './LogoutConfirm.vue'
import { isDarkMode, setDarkMode } from '../utils/theme'

const props = defineProps({
  citizenEmail: { type: String, default: '' },
  councilAuthenticated: { type: Boolean, default: false },
  demoCouncilSession: { type: Boolean, default: false },
})

const emit = defineEmits(['citizen-sign-out', 'close', 'council-authenticated', 'sign-out'])
const { t } = useI18n()
const dark = ref(isDarkMode())
const detailsOpen = ref(false)
const confirmingLogout = ref(false)
const isCouncil = computed(() => props.councilAuthenticated || props.demoCouncilSession)
const displayName = computed(() => (isCouncil.value ? t('profile.councilStaff') : props.citizenEmail.split('@')[0] || t('profile.citizen')))

const onKeydown = (event) => { if (event.key === 'Escape' && !confirmingLogout.value) emit('close') }

function toggleDark() {
  dark.value = !dark.value
  setDarkMode(dark.value)
}

function logOut() {
  confirmingLogout.value = false
  emit(isCouncil.value ? 'sign-out' : 'citizen-sign-out')
  emit('close')
}

function openCouncilDashboard() {
  emit('close')
  emit('council-authenticated', props.demoCouncilSession ? 'demo' : 'supabase')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="profile-layer">
    <div class="profile-backdrop" @click="emit('close')"></div>
    <section class="profile-popup" role="dialog" :aria-label="t('profile.dialog')">
      <div class="profile-banner">
        <button type="button" class="icon-btn profile-close" :aria-label="t('profile.close')" @click="emit('close')"><X :size="18" /></button>
      </div>
      <span class="profile-avatar" aria-hidden="true"><User :size="38" /></span>
      <h2 class="profile-name">{{ displayName }}</h2>

      <dl class="profile-info">
        <div><dt>{{ t('profile.role') }}</dt><dd>{{ isCouncil ? t('profile.council') : t('profile.citizen') }}</dd></div>
        <div v-if="citizenEmail && !isCouncil"><dt>{{ t('profile.mail') }}</dt><dd>{{ citizenEmail }}</dd></div>
      </dl>

      <ul class="profile-menu">
        <li>
          <span class="profile-menu-label"><Moon :size="18" /> {{ t('profile.darkMode') }}</span>
          <button type="button" class="profile-switch" role="switch" :aria-checked="dark" :aria-label="t('profile.darkMode')" @click="toggleDark"><span></span></button>
        </li>
        <li v-if="isCouncil">
          <button type="button" class="profile-menu-btn" @click="openCouncilDashboard"><span class="profile-menu-label"><LayoutDashboard :size="18" /> {{ t('profile.councilDashboard') }}</span></button>
        </li>
        <li>
          <button type="button" class="profile-menu-btn" :aria-expanded="detailsOpen" @click="detailsOpen = !detailsOpen">
            <span class="profile-menu-label"><UserRound :size="18" /> {{ t('profile.details') }}</span>
            <ChevronDown :size="16" class="profile-chevron" :class="{ open: detailsOpen }" />
          </button>
          <p v-if="detailsOpen" class="profile-details">
            {{ isCouncil ? (demoCouncilSession ? t('profile.demoCouncil') : t('profile.verifiedCouncil')) : t('profile.signedInAs', { email: citizenEmail }) }}
          </p>
        </li>
        <li>
          <button type="button" class="profile-menu-btn" @click="confirmingLogout = true"><span class="profile-menu-label"><LogOut :size="18" /> {{ t('profile.logOut') }}</span></button>
        </li>
      </ul>
    </section>
    <LogoutConfirm v-if="confirmingLogout" @confirm="logOut" @cancel="confirmingLogout = false" />
  </div>
</template>
