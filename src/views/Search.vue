<script setup lang="ts">
import {ref, computed} from 'vue';
import {Search} from 'lucide-vue-next';
import {products} from '../data';
import ProductCard from '../components/ProductCard.vue';
import PageHero from '../components/PageHero.vue';

const query = ref('');

const result = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return products.slice(0, 4);
  return products.filter(product =>
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
      <h2 class="search-title">
        {{ query ? `${result.length} results for “${query}”` : 'Popular right now' }}
      </h2>
      <div class="product-grid">
        <ProductCard v-for="product in result" :key="product.id" :product="product"/>
      </div>
    </div>
  </section>
</template>
