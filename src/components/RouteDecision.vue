<script setup>
import { ArrowRight, Check, CircleAlert, Footprints, MoveUpRight, ShieldCheck, X } from '@lucide/vue'

defineProps({
  route: { type: Object, required: true },
  status: { type: String, required: true },
  alternate: { type: Object, default: null },
  reason: { type: String, default: '' },
})

defineEmits(['select-alternate'])
</script>

<template>
  <section class="decision-card" aria-live="polite">
    <div class="decision-heading">
      <div class="heading-icon" :class="`heading-icon--${status}`">
        <ShieldCheck v-if="status === 'open'" :size="19" />
        <CircleAlert v-else :size="19" />
      </div>
      <div>
        <p class="eyebrow">YOUR ROUTE</p>
        <h2>{{ route.destination }}</h2>
      </div>
      <span class="status-pill" :class="`status-pill--${status}`">
        <span class="status-dot"></span>
        {{ status === 'open' ? 'Open' : status === 'maintenance' ? 'Closed' : 'Not accessible' }}
      </span>
    </div>

    <div v-if="status === 'open'" class="route-summary">
      <div class="summary-item">
        <span class="summary-icon"><Footprints :size="17" /></span>
        <span><strong>{{ route.distance }}</strong><small>Distance</small></span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-icon"><MoveUpRight :size="17" /></span>
        <span><strong>{{ route.duration }}</strong><small>Easy pace</small></span>
      </div>
    </div>

    <div v-else class="route-alert" :class="`route-alert--${status}`">
      <X v-if="status === 'maintenance'" :size="17" />
      <CircleAlert v-else :size="17" />
      <p>{{ status === 'maintenance' ? (reason || 'A section of this route is under maintenance.') : route.reason }}</p>
    </div>

    <div class="route-qualities">
      <div><Check :size="15" /><span>{{ route.metadata.surface }}</span></div>
      <div><Check :size="15" /><span>{{ route.metadata.incline }}</span></div>
      <div :class="{ 'quality-muted': !route.metadata.ramps }">
        <Check v-if="route.metadata.ramps" :size="15" />
        <X v-else :size="15" />
        <span>{{ route.metadata.ramps ? 'Step-free' : 'No ramp' }}</span>
      </div>
    </div>

    <button
      v-if="status !== 'open' && alternate"
      class="alternate-link"
      type="button"
      @click="$emit('select-alternate', alternate.destinationId)"
    >
      Try {{ alternate.destination }} instead <ArrowRight :size="16" />
    </button>
  </section>
</template>
