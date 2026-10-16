<script setup>
import { computed, ref } from 'vue'
import { X } from '@lucide/vue'
import { LOCATION_TYPES } from '../data/campusLocations'

const props = defineProps({
  options: { type: Array, required: true },
  label: { type: String, required: true },
  placeholder: { type: String, default: 'Search places' },
  inputId: { type: String, required: true },
})

const model = defineModel({ type: String, required: true })
const root = ref(null)
const open = ref(false)
const typing = ref(false)
const query = ref('')
let suppressOpen = false

const selected = computed(() => props.options.find((place) => place.id === model.value))
const text = computed({
  get: () => (typing.value ? query.value : selected.value?.name ?? ''),
  set: (value) => {
    query.value = value
    typing.value = true
    open.value = true
  },
})
const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  return typing.value && term ? props.options.filter((place) => place.name.toLowerCase().includes(term)) : props.options
})

function close() {
  open.value = false
  typing.value = false
}

function clear() {
  model.value = ''
  query.value = ''
  typing.value = false
  open.value = false
  // put the cursor back in the field without popping the list open
  suppressOpen = true
  root.value?.querySelector('input')?.focus()
  suppressOpen = false
}

function onFocus(event) {
  if (!suppressOpen) open.value = true
  event.target.select()
}

function pick(place) {
  model.value = place.id
  close()
}

function onFocusOut(event) {
  if (!root.value?.contains(event.relatedTarget)) close()
}
</script>

<template>
  <div ref="root" class="place-field" @focusout="onFocusOut">
    <label class="sr-only" :for="inputId">{{ label }}</label>
    <input
      :id="inputId"
      v-model="text"
      type="text"
      role="combobox"
      autocomplete="off"
      :aria-expanded="open"
      :aria-controls="`${inputId}-list`"
      :placeholder="label"
      @focus="onFocus"
      @click="open = true"
      @keydown.esc="close(); $event.target.blur()"
      @keydown.enter.prevent="filtered[0] && pick(filtered[0])"
    />
    <button v-if="model || query" type="button" class="place-clear" :aria-label="`Clear ${label}`" @mousedown.prevent @click="clear">
      <X :size="16" />
    </button>
    <Transition name="drop">
      <ul v-if="open" :id="`${inputId}-list`" class="place-list" role="listbox" :aria-label="label">
        <li v-for="place in filtered" :key="place.id" role="option" :aria-selected="place.id === model">
          <button type="button" @mousedown.prevent @click="pick(place)">
            <span class="place-icon" aria-hidden="true">{{ LOCATION_TYPES[place.type]?.icon }}</span>
            <span class="place-name">{{ place.name }}</span>
            <small v-if="!place.connected">Not mapped yet</small>
          </button>
        </li>
        <li v-if="!filtered.length" class="place-empty">No matching places</li>
      </ul>
    </Transition>
  </div>
</template>
