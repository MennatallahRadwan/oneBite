<script setup lang="ts">
defineProps<{eyebrow?: string; title: string; subtitle?: string}>();
</script>

<template>
  <section class="page-hero">
    <div class="container">
      <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
  </section>
</template>
