<script setup lang="ts">
import AppLink from '../components/AppLink.vue';
import {t} from '../i18n';
</script>

<template>
  <section class="not-found">
    <div>
      <span>404</span>
      <h1>{{ t('notFound.title') }}</h1>
      <p>{{ t('notFound.blurb') }}</p>
      <AppLink class="btn primary" to="/">{{ t('notFound.cta') }}</AppLink>
    </div>
  </section>
</template>
