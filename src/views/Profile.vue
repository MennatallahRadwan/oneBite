<script setup lang="ts">
import {Package,ShieldCheck} from 'lucide-vue-next';
import PageHero from '../components/PageHero.vue';
import {t} from '../i18n';
import AppLink from '../components/AppLink.vue';
</script>

<template>
  <PageHero :eyebrow="t('profile.eyebrow')" :title="t('profile.title')" :subtitle="t('profile.subtitle')"/>
  <section class="section"><div class="container"><div class="success-card">
    <div class="success-icon"><ShieldCheck/></div>
    <h2>{{ t('profile.heading') }}</h2>
    <p>{{ t('profile.blurb') }}</p>
    <AppLink class="btn primary" to="/shop"><Package :size="17"/> {{ t('profile.cta') }}</AppLink>
  </div></div></section>
</template>
