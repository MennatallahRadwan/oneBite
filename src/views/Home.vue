<script setup lang="ts">
import {computed, onMounted} from 'vue';
import {ArrowRight, Clock, ShieldCheck, Truck} from 'lucide-vue-next';
import {img, money} from '../data';
import {useCatalogStore} from '../stores/catalog';
import {t} from '../i18n';
import ProductCard from '../components/ProductCard.vue';
import AppLink from '../components/AppLink.vue';

const catalog = useCatalogStore();
onMounted(() => catalog.load());

const categories = computed(() => catalog.categories);
const featured = computed(() => catalog.products.filter(product => product.best).slice(0, 4));
const seasonal = computed(() => catalog.products.filter(product => product.seasonal).slice(0, 3));

// The hero card used to name a hardcoded cake and price. It now follows the
// catalog, so it cannot drift from what is actually on sale.
const showcase = computed(() => featured.value[0] ?? catalog.products[0]);

const stats = computed(() => [
  {icon: '🎂', label: t('home.stat.madeToOrder'), sub: t('home.stat.madeToOrderSub')},
  {icon: '🗓️', label: t('home.stat.slots'), sub: t('home.stat.slotsSub')},
  {icon: '🇰🇼', label: t('home.stat.delivery'), sub: t('home.stat.deliverySub')}
]);
</script>

<template>
  <section class="hero">
    <div class="container hero-grid">
      <div class="hero-copy">
        <span class="hero-pill">{{ t('home.hero.pill') }}</span>
        <h1>{{ t('home.hero.line1') }}<br><i>{{ t('home.hero.line2') }}</i></h1>
        <p>{{ t('home.hero.blurb') }}</p>
        <div class="button-row">
          <AppLink class="btn gold" to="/shop">
            {{ t('home.hero.order') }} <ArrowRight :size="18"/>
          </AppLink>
          <AppLink class="btn outline-light" to="/categories">{{ t('home.hero.viewMenu') }}</AppLink>
        </div>
        <div class="hero-stats">
          <span v-for="stat in stats" :key="stat.label">
            {{ stat.icon }} <b>{{ stat.label }}</b><small>{{ stat.sub }}</small>
          </span>
        </div>
      </div>

      <div class="hero-card">
        <img :src="showcase?.image || img('1578985545062-69928b1d9587')">
        <div v-if="showcase" class="floating-price">
          <small>{{ showcase.name }}</small>
          <b>{{ money(showcase.price) }}</b>
        </div>
      </div>
    </div>
  </section>

  <section class="trust">
    <div class="container trust-row">
      <span><Truck/>{{ t('home.trust.fees') }}</span>
      <span><Clock/>{{ t('home.trust.slot') }}</span>
      <span><ShieldCheck/>{{ t('home.trust.cod') }}</span>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">{{ t('home.categories.eyebrow') }}</span>
          <h2>{{ t('home.categories.title') }}</h2>
        </div>
        <AppLink to="/categories">{{ t('home.categories.all') }}</AppLink>
      </div>
      <p v-if="catalog.loading" class="form-note">{{ t('common.loading') }}</p>
      <p v-else-if="catalog.error" class="form-note" role="alert">{{ catalog.error }}</p>
      <div v-else class="category-strip">
        <AppLink
          v-for="category in categories.slice(0, 6)"
          :key="category.id"
          :to="`/shop?category=${category.id}`"
          class="category-mini"
        >
          <img :src="category.image">
          <b>{{ category.name }}</b>
          <small class="name-alt" dir="auto">{{ category.nameAlt }}</small>
        </AppLink>
      </div>
    </div>
  </section>

  <section class="section alt">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">{{ t('home.best.eyebrow') }}</span>
          <h2>{{ t('home.best.title') }}</h2>
          <p>{{ t('home.best.blurb') }}</p>
        </div>
        <AppLink class="btn secondary" to="/best-sellers">{{ t('common.viewAll') }}</AppLink>
      </div>
      <p v-if="catalog.loading" class="form-note">{{ t('home.best.loading') }}</p>
      <div v-else class="product-grid">
        <ProductCard v-for="product in featured" :key="product.id" :product="product"/>
      </div>
    </div>
  </section>

  <section v-if="seasonal.length" class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">{{ t('home.seasonal.eyebrow') }}</span>
          <h2>{{ t('home.seasonal.title') }}</h2>
        </div>
      </div>
      <div class="seasonal-grid">
        <AppLink
          v-for="(product, index) in seasonal"
          :key="product.id"
          :to="`/product/${product.id}`"
          :class="['seasonal-card', {wide: index === 0}]"
        >
          <img :src="product.image">
          <div>
            <span>{{ t('home.seasonal.badge') }}</span>
            <h3>{{ product.name }}</h3>
            <b>{{ money(product.price) }}</b>
          </div>
        </AppLink>
      </div>
    </div>
  </section>

  <section class="section alt">
    <div class="container story-grid">
      <img :src="img('1556909114-f6e7ad7d3136')">
      <div>
        <span class="eyebrow">{{ t('home.story.eyebrow') }}</span>
        <h2>{{ t('home.story.title') }}</h2>
        <p>{{ t('home.story.blurb') }}</p>
        <AppLink class="btn primary" to="/about">
          {{ t('home.story.cta') }} <ArrowRight :size="17"/>
        </AppLink>
      </div>
    </div>
  </section>
</template>
