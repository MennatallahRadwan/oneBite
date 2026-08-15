<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {SlidersHorizontal, Search as SearchIcon} from 'lucide-vue-next';
import {useCatalogStore} from '../stores/catalog';
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

const titles: Record<string, string> = {
  best: 'Best Sellers',
  seasonal: 'Seasonal Collection',
  gift: 'Gift Boxes'
};
const subtitles: Record<string, string> = {
  best: 'A curated selection of One Bite favourites.',
  seasonal: 'Limited-edition flavours inspired by the season.',
  gift: 'Thoughtful, beautiful and ready to make someone’s day.'
};

const title = computed(() => titles[props.mode] ?? 'Shop All');
const subtitle = computed(
  () => subtitles[props.mode] ?? 'Choose from our available, made-to-order bakery menu.'
);

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
      (product.name + product.nameAr + product.description).toLowerCase().includes(needle)
    );
  }

  if (sort.value === 'low') list.sort((a, b) => a.price - b.price);
  if (sort.value === 'high') list.sort((a, b) => b.price - a.price);

  return list;
});
</script>

<template>
  <PageHero eyebrow="One Bite Bakery" :title="title" :subtitle="subtitle"/>

  <section class="section">
    <div class="container">
      <div class="filters">
        <div class="search-input">
          <SearchIcon :size="18"/>
          <input v-model="query" placeholder="Search products...">
        </div>
        <select v-model="category">
          <option value="all">All categories</option>
          <option v-for="option in categories" :key="option.id" :value="option.id">
            {{ option.name }}
          </option>
        </select>
        <select v-model="sort">
          <option value="featured">Featured</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
        <span class="result-count">
          <SlidersHorizontal :size="16"/> {{ filtered.length }} available products
        </span>
      </div>

      <p v-if="catalog.loading" class="form-note">Loading the menu…</p>
      <p v-else-if="catalog.error" class="form-note" role="alert">{{ catalog.error }}</p>
      <div v-else-if="filtered.length" class="product-grid">
        <ProductCard v-for="product in filtered" :key="product.id" :product="product"/>
      </div>
      <div v-else class="empty">
        <h2>No products found</h2>
        <p>Try a different search or category.</p>
      </div>
    </div>
  </section>
</template>
