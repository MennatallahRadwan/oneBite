<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {Search} from 'lucide-vue-next';
import {useCatalogStore} from '../stores/catalog';
import {t} from '../i18n';
import ProductCard from '../components/ProductCard.vue';
import PageHero from '../components/PageHero.vue';

const catalog = useCatalogStore();
onMounted(() => catalog.load());

const query = ref('');

const result = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return catalog.products.slice(0, 4);
  return catalog.products.filter(product =>
    (product.name + product.nameAlt + product.description).toLowerCase().includes(needle)
  );
});
</script>

<template>
  <PageHero
    :eyebrow="t('search.eyebrow')"
    :title="t('search.title')"
    :subtitle="t('search.subtitle')"
  />

  <section class="section">
    <div class="container">
      <div class="big-search">
        <Search/>
        <input v-model="query" autofocus :placeholder="t('search.placeholder')">
      </div>

      <p v-if="catalog.loading" class="form-note">{{ t('common.loading') }}</p>
      <p v-else-if="catalog.error" class="form-note" role="alert">{{ catalog.error }}</p>

      <template v-else>
        <h2 class="search-title">
          {{ query ? t('search.results', {count: result.length, query}) : t('search.popular') }}
        </h2>
        <div class="product-grid">
          <ProductCard v-for="product in result" :key="product.id" :product="product"/>
        </div>
      </template>
    </div>
  </section>
</template>
