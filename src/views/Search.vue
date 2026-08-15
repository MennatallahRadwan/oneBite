<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {Search} from 'lucide-vue-next';
import {useCatalogStore} from '../stores/catalog';
import ProductCard from '../components/ProductCard.vue';
import PageHero from '../components/PageHero.vue';

const catalog = useCatalogStore();
onMounted(() => catalog.load());

const query = ref('');

const result = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return catalog.products.slice(0, 4);
  return catalog.products.filter(product =>
    (product.name + product.nameAr + product.description).toLowerCase().includes(needle)
  );
});
</script>

<template>
  <PageHero
    eyebrow="Find Your Favorite"
    title="Search One Bite"
    subtitle="Search cakes, pastries, gifts and seasonal creations."
  />

  <section class="section">
    <div class="container">
      <div class="big-search">
        <Search/>
        <input v-model="query" autofocus placeholder="What are you craving?">
      </div>

      <p v-if="catalog.loading" class="form-note">Loading the menu…</p>
      <p v-else-if="catalog.error" class="form-note" role="alert">{{ catalog.error }}</p>

      <template v-else>
        <h2 class="search-title">
          {{ query ? `${result.length} results for “${query}”` : 'Popular right now' }}
        </h2>
        <div class="product-grid">
          <ProductCard v-for="product in result" :key="product.id" :product="product"/>
        </div>
      </template>
    </div>
  </section>
</template>
