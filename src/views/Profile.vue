<script setup lang="ts">
import {Package,ShieldCheck} from 'lucide-vue-next';
import PageHero from '../components/PageHero.vue';
</script>

<template>
  <PageHero eyebrow="Customer account" title="Account access is coming soon" subtitle="Orders can currently be tracked securely using the private tracking link sent after checkout."/>
  <section class="section"><div class="container"><div class="success-card">
    <div class="success-icon"><ShieldCheck/></div>
    <h2>No demo account data</h2>
    <p>We do not show sample profiles, addresses, or order history as if they were real. Customer sign-in will be added with secure authentication before account data is available.</p>
    <RouterLink class="btn primary" to="/shop"><Package :size="17"/> Browse the bakery</RouterLink>
  </div></div></section>
</template>
