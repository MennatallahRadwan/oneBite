<script setup lang="ts">
import SiteHeader from './components/SiteHeader.vue';
import SiteFooter from './components/SiteFooter.vue';
import {computed} from 'vue';
import {useRoute} from 'vue-router';

// The storefront footer carries shop and order links that do not belong on the
// owner dashboard, for the same reason the customer nav does not.
const route = useRoute();
const isAdmin = computed(() => ['/admin', '/ar/admin'].includes(route.path));
</script>

<template>
  <SiteHeader/>
  <main><RouterView/></main>
  <SiteFooter v-if="!isAdmin"/>
</template>
