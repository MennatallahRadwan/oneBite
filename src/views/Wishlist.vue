<script setup lang="ts">
import {computed, onMounted} from 'vue';
import {Heart} from 'lucide-vue-next';
import {useCatalogStore} from '../stores/catalog';
import {useShopStore} from '../stores/shop';
import ProductCard from '../components/ProductCard.vue';
import PageHero from '../components/PageHero.vue';

const store = useShopStore();
const catalog = useCatalogStore();

onMounted(() => catalog.load());

const list = computed(() =>
  catalog.products.filter(product => store.wishlist.includes(product.id))
);
</script>

<template>
  <PageHero
    eyebrow="Saved for Later"
    title="Your Wishlist"
    subtitle="All the sweet things you have your eye on."
  />

  <section class="section">
    <div class="container">
      <p v-if="catalog.loading" class="form-note">Loading your saved items…</p>
      <p v-else-if="catalog.error" class="form-note" role="alert">{{ catalog.error }}</p>

      <div v-else-if="!list.length" class="empty">
        <Heart :size="48"/>
        <h2>No favorites yet</h2>
        <p>Tap the heart on any product to save it here.</p>
        <RouterLink class="btn primary" to="/shop">Explore the Menu</RouterLink>
      </div>
      <div v-else class="product-grid">
        <ProductCard v-for="product in list" :key="product.id" :product="product"/>
      </div>
    </div>
  </section>
</template>
