<script setup lang="ts">
import {ArrowRight} from 'lucide-vue-next';
import {categories, products} from '../data';
import PageHero from '../components/PageHero.vue';

const productCount = (category: string) =>
  products.filter(product => product.category === category).length;
</script>

<template>
  <PageHero
    eyebrow="Explore"
    title="Shop by Category"
    subtitle="Find the perfect sweet for every mood, moment and celebration."
  />

  <section class="section">
    <div class="container category-grid">
      <RouterLink
        v-for="category in categories"
        :key="category.id"
        :to="`/shop?category=${category.id}`"
        class="category-card"
      >
        <img :src="category.image">
        <div>
          <span>{{ category.nameAr }}</span>
          <h2>{{ category.name }}</h2>
          <p>{{ category.description }}</p>
          <b>{{ productCount(category.id) }} available products <ArrowRight :size="17"/></b>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
