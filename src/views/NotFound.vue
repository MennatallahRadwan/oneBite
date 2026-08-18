<script setup lang="ts">
import AppLink from '../components/AppLink.vue';
</script>

<template>
  <section class="not-found">
    <div>
      <span>404</span>
      <h1>This bite is missing</h1>
      <p>The page you are looking for may have moved or never made it out of the oven.</p>
      <AppLink class="btn primary" to="/">Back to Home</AppLink>
    </div>
  </section>
</template>
