<script setup lang="ts">
import {onMounted} from 'vue';
import {ArrowRight} from 'lucide-vue-next';
import {useCatalogStore} from '../stores/catalog';
import PageHero from '../components/PageHero.vue';
import AppLink from '../components/AppLink.vue';

const catalog = useCatalogStore();
onMounted(() => catalog.load());
</script>

<template>
  <PageHero
    eyebrow="Explore"
    title="Shop by Category"
    subtitle="Find the perfect sweet for every mood, moment and celebration."
  />

  <section class="section">
    <div class="container">
      <p v-if="catalog.loading" class="form-note">Loading categories…</p>
      <p v-else-if="catalog.error" class="form-note" role="alert">{{ catalog.error }}</p>

      <div v-else class="category-grid">
        <AppLink
          v-for="category in catalog.categories"
          :key="category.id"
          :to="`/shop?category=${category.id}`"
          class="category-card"
        >
          <img :src="category.image">
          <div>
            <span class="name-alt" dir="auto">{{ category.nameAlt }}</span>
            <h2>{{ category.name }}</h2>
            <p>{{ category.description }}</p>
            <b>{{ category.productCount }} available products <ArrowRight :size="17"/></b>
          </div>
        </AppLink>
      </div>
    </div>
  </section>
</template>
