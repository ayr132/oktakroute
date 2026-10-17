<script setup>
import { computed, ref } from 'vue'
import { CircleAlert, GitBranch, ShieldCheck } from '@lucide/vue'
import { REPORT_TYPES } from '../data/reportTypes'

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
        const label = REPORT_TYPES[report.type]?.label || 'Active report'
        return report.description ? `${label}: ${report.description}` : label
      })
      return `${path.name}: ${reasons.join('; ') || path.unavailableReason || 'Unavailable'}`
    })
  }
  if (props.plan.status === 'not-step-free') {
    return props.plan.stairsPaths.map((path) => {
      const reason = path.hasStairs
        ? 'Has stairs'
        : !path.wheelchairFriendly
          ? 'Not wheelchair friendly'
          : `Slope is too steep (${path.slope}%)`
      return `${path.name}: ${reason}`
    })
  }
  return []
})

const message = computed(() => {
  const { status, unmapped, blockedPaths } = props.plan
  if (status === 'same') return { title: 'You are already here', body: 'Pick a different destination.' }
  if (status === 'unmapped') {
    return {
      title: 'Not on the walking network yet',
      body: `${unmapped.map((place) => place.name).join(' and ')} ${unmapped.length > 1 ? 'are' : 'is'} too far from any mapped footpath to plan a route.`,
    }
  }
  if (status === 'not-step-free') {
    const names = [...new Set(props.plan.stairsPaths.map((path) => path.name))].join(', ')
    return {
      title: 'Not wheelchair accessible',
      body: `The only way to ${props.plan.destination.name} is via ${names}, which has stairs. There is no step-free route.`,
    }
  }
  if (status === 'blocked') {
    const names = [...new Set(blockedPaths.map(({ path }) => path.name))].join(', ')
    return { title: 'Route blocked', body: `An active report on ${names} blocks every way there. Check back once it is resolved.` }
  }
  return { title: 'No route found', body: `No step-free path connects these places.` }
})

const details = computed(() => {
  if (!route.value) return []
  const r = route.value
  return [
    r.stepFree ? (r.hasRamp ? 'Step-free · ramps' : 'Step-free') : 'Has stairs',
    r.maxSlope ? `Up to ${r.maxSlope}% slope` : 'Level ground',
    r.surfaces.length ? r.surfaces.join(', ') : 'Paved footpath',
  ]
})
</script>

<template>
  <section class="sheet" aria-live="polite">
    <template v-if="route">
      <div class="eta">
        <strong>{{ route.minutes }} min</strong>
        <span>{{ Math.round(route.distance / 10) * 10 || 10 }} m · step-free pace</span>
        <span class="eta-badge"><ShieldCheck :size="14" /> Open</span>
      </div>
      <p v-if="plan.detour" class="sheet-note sheet-note--detour"><GitBranch :size="15" /> Rerouted around an active report</p>
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
          >see why</a>
          <ul v-if="showReasons" id="route-reasons" class="route-reasons">
            <li v-for="reason in reasonDetails" :key="reason">{{ reason }}</li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>
