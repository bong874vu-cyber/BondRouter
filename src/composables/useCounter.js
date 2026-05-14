import { ref, watch, onMounted } from 'vue'

export function useNumberCounter(sourceValue, duration = 1500) {
  const displayValue = ref(0)
  
  function animate(start, end, time) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / time, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      displayValue.value = start + ease * (end - start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        displayValue.value = end;
      }
    };
    window.requestAnimationFrame(step);
  }

  watch(() => sourceValue.value, (newVal, oldVal) => {
    animate(oldVal || 0, newVal, duration)
  }, { immediate: false })

  onMounted(() => {
    animate(0, sourceValue.value, duration)
  })

  return displayValue
}
