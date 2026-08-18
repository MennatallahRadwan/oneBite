<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {SlidersHorizontal, Search as SearchIcon} from 'lucide-vue-next';
import {useCatalogStore} from '../stores/catalog';
import {t, type MessageKey} from '../i18n';
import ProductCard from '../components/ProductCard.vue';
import PageHero from '../components/PageHero.vue';

const props = defineProps<{mode: string}>();
const route = useRoute();
const catalog = useCatalogStore();

onMounted(() => catalog.load());

const query = ref('');
const category = ref((route.query.category as string) || 'all');
const sort = ref('featured');

watch(() => route.query.category, value => (category.value = (value as string) || 'all'));

const modes = ['all', 'best', 'seasonal', 'gift'];
const modeKey = computed(() => (modes.includes(props.mode) ? props.mode : 'all'));

const title = computed(() => t(`listing.${modeKey.value}.title` as MessageKey));
const subtitle = computed(() => t(`listing.${modeKey.value}.subtitle` as MessageKey));

const categories = computed(() => catalog.categories);

const filtered = computed(() => {
  let list = [...catalog.products];

  if (props.mode === 'best') list = list.filter(product => product.best);
  if (props.mode === 'seasonal') list = list.filter(product => product.seasonal);
  if (props.mode === 'gift') list = list.filter(product => product.gift);
  if (category.value !== 'all') list = list.filter(product => product.category === category.value);

  if (query.value) {
    const needle = query.value.toLowerCase();
    list = list.filter(product =>
      (product.name + product.nameAlt + product.description).toLowerCase().includes(needle)
    );
  }

  if (sort.value === 'low') list.sort((a, b) => a.price - b.price);
  if (sort.value === 'high') list.sort((a, b) => b.price - a.price);

  return list;
});
</script>

<template>
  <PageHero :eyebrow="t('listing.eyebrow')" :title="title" :subtitle="subtitle"/>

  <section class="section">
    <div class="container">
      <div class="filters">
        <div class="search-input">
          <SearchIcon :size="18"/>
          <input v-model="query" :placeholder="t('listing.searchPlaceholder')">
        </div>
        <select v-model="category">
          <option value="all">{{ t('listing.allCategories') }}</option>
          <option v-for="option in categories" :key="option.id" :value="option.id">
            {{ option.name }}
          </option>
        </select>
        <select v-model="sort">
          <option value="featured">{{ t('listing.sort.featured') }}</option>
          <option value="low">{{ t('listing.sort.low') }}</option>
          <option value="high">{{ t('listing.sort.high') }}</option>
        </select>
        <span class="result-count">
          <SlidersHorizontal :size="16"/>
          {{ t('common.availableProducts', {count: filtered.length}) }}
        </span>
      </div>

      <p v-if="catalog.loading" class="form-note">{{ t('common.loading') }}</p>
      <p v-else-if="catalog.error" class="form-note" role="alert">{{ catalog.error }}</p>
      <div v-else-if="filtered.length" class="product-grid">
        <ProductCard v-for="product in filtered" :key="product.id" :product="product"/>
      </div>
      <div v-else class="empty">
        <h2>{{ t('listing.empty.title') }}</h2>
        <p>{{ t('listing.empty.blurb') }}</p>
      </div>
    </div>
  </section>
</template>
