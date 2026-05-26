import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const toasts = ref([])
  const assistantOpen = ref(false)
  const onboardingActive = ref(false)
  const onboardingStep = ref(0)
  const hasSeenWelcome = ref(localStorage.getItem('br_has_seen_welcome') === 'true')

  function addToast(message, type = 'success') {
    const id = Date.now()
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      removeToast(id)
    }, 4000)
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function toggleAssistant() {
    assistantOpen.value = !assistantOpen.value
  }

  function startOnboarding() {
    onboardingActive.value = true
    onboardingStep.value = 0
    assistantOpen.value = false
  }

  function nextOnboarding() {
    onboardingStep.value++
  }

  function prevOnboarding() {
    if (onboardingStep.value > 0) {
      onboardingStep.value--
    }
  }

  function endOnboarding() {
    onboardingActive.value = false
    onboardingStep.value = 0
    hasSeenWelcome.value = true
    localStorage.setItem('br_has_seen_welcome', 'true')
  }

  return { 
    toasts, 
    assistantOpen, 
    onboardingActive, 
    onboardingStep, 
    hasSeenWelcome,
    addToast, 
    removeToast,
    toggleAssistant,
    startOnboarding,
    nextOnboarding,
    prevOnboarding,
    endOnboarding
  }
})
