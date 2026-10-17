<script setup>
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'
import { CircleAlert, GitBranch, ShieldCheck } from '@lucide/vue'
import { REPORT_TYPES } from '../data/reportTypes'

const { t } = useI18n()

const props = defineProps({
  plan: { type: Object, required: true },
})

const route = computed(() => props.plan.route)
const showReasons = ref(false)
const canExplain = computed(() => ['blocked', 'not-step-free'].includes(props.plan.status))
const reasonDetails = computed(() => {
  if (props.plan.status === 'blocked') {
    return props.plan.blockedPaths.map(({ path, reports }) => {
      const reasons = reports.map((report) => {
        const label = REPORT_TYPES[report.type] ? t(`types.${report.type}`) : t('route.activeReport')
        return report.description ? `${label}: ${report.description}` : label
      })
      return `${path.name}: ${reasons.join('; ') || path.unavailableReason || t('route.unavailable')}`
    })
  }
  if (props.plan.status === 'not-step-free') {
    return props.plan.stairsPaths.map((path) => {
      const reason = path.hasStairs
        ? t('route.hasStairs')
        : !path.wheelchairFriendly
          ? t('route.notWheelchair')
          : t('route.tooSteep', { n: path.slope })
      return `${path.name}: ${reason}`
    })
  }
  return []
})

const message = computed(() => {
  const { status, unmapped, blockedPaths } = props.plan
  if (status === 'same') return { title: t('route.sameTitle'), body: t('route.sameBody') }
  if (status === 'unmapped') {
    return {
      title: t('route.unmappedTitle'),
      body: t(unmapped.length > 1 ? 'route.unmappedMany' : 'route.unmappedOne', { names: unmapped.map((place) => place.name).join(t('route.and')) }),
    }
  }
  if (status === 'not-step-free') {
    const names = [...new Set(props.plan.stairsPaths.map((path) => path.name))].join(', ')
    return { title: t('route.notStepFreeTitle'), body: t('route.notStepFreeBody', { dest: props.plan.destination.name, names }) }
  }
  if (status === 'blocked') {
    const names = [...new Set(blockedPaths.map(({ path }) => path.name))].join(', ')
    return { title: t('route.blockedTitle'), body: t('route.blockedBody', { names }) }
  }
  return { title: t('route.noneTitle'), body: t('route.noneBody') }
})

const details = computed(() => {
  if (!route.value) return []
  const r = route.value
  return [
    r.stepFree ? (r.hasRamp ? t('route.stepFreeRamps') : t('route.stepFree')) : t('route.hasStairs'),
    r.maxSlope ? t('route.upTo', { n: r.maxSlope }) : t('route.level'),
    r.surfaces.length ? r.surfaces.join(', ') : t('route.paved'),
  ]
})
</script>

<template>
  <section class="sheet" aria-live="polite">
    <template v-if="route">
      <div class="eta">
        <strong>{{ t('route.min', { n: route.minutes }) }}</strong>
        <span>{{ t('route.stepFreePace', { m: Math.round(route.distance / 10) * 10 || 10 }) }}</span>
        <span class="eta-badge"><ShieldCheck :size="14" /> {{ t('route.open') }}</span>
      </div>
      <p v-if="plan.detour" class="sheet-note sheet-note--detour"><GitBranch :size="15" /> {{ t('route.rerouted') }}</p>
      <ul class="chip-row">
        <li v-for="detail in details" :key="detail">{{ detail }}</li>
      </ul>
    </template>
    <template v-else>
      <div class="sheet-alert">
        <CircleAlert :size="22" />
        <div>
          <strong>{{ message.title }}</strong>
          <p>{{ message.body }}</p>
          <a
            v-if="canExplain"
            class="why-link"
            href="#route-reasons"
            :aria-expanded="showReasons"
            @click.prevent="showReasons = !showReasons"
          >{{ t('route.seeWhy') }}</a>
          <ul v-if="showReasons" id="route-reasons" class="route-reasons">
            <li v-for="reason in reasonDetails" :key="reason">{{ reason }}</li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>
