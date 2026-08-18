<script setup lang="ts">
import {computed, onMounted} from 'vue';
import {ArrowRight, Clock, ShieldCheck, Truck} from 'lucide-vue-next';
import {img} from '../data';
import {useCatalogStore} from '../stores/catalog';
import ProductCard from '../components/ProductCard.vue';
import AppLink from '../components/AppLink.vue';

const catalog = useCatalogStore();
onMounted(() => catalog.load());

const categories = computed(() => catalog.categories);
const featured = computed(() => catalog.products.filter(product => product.best).slice(0, 4));
const seasonal = computed(() => catalog.products.filter(product => product.seasonal).slice(0, 3));
</script>

<template>
  <section class="hero">
    <div class="container hero-grid">
      <div class="hero-copy">
        <span class="hero-pill">Made to order · Kuwait delivery</span>
        <h1>Baked with Love,<br><i>Delivered</i> to Your Door</h1>
        <p>
          Premium cakes, pastries and sweets crafted for your occasions—choose from our available menu
          and reserve a delivery request.
        </p>
        <div class="button-row">
          <AppLink class="btn gold" to="/shop">Order Now <ArrowRight :size="18"/></AppLink>
          <AppLink class="btn outline-light" to="/categories">View Menu</AppLink>
        </div>
        <div class="hero-stats">
          <span>🎂 <b>Made to order</b><small>Predefined sizes &amp; flavours</small></span>
          <span>🗓️ <b>Flexible slots</b><small>Subject to bakery confirmation</small></span>
          <span>🇰🇼 <b>Kuwait delivery</b><small>Area-based delivery fees</small></span>
        </div>
      </div>

      <div class="hero-card">
        <img :src="img('1578985545062-69928b1d9587')">
        <div class="floating-price">
          <small>Chocolate Truffle Cake</small>
          <b>KWD 8.500</b>
        </div>
      </div>
    </div>
  </section>

  <section class="trust">
    <div class="container trust-row">
      <span><Truck/>Area-based delivery fees</span>
      <span><Clock/>Earliest slot calculated for your cart</span>
      <span><ShieldCheck/>Cash on delivery only</span>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">Browse</span>
          <h2>Our Categories</h2>
        </div>
        <AppLink to="/categories">All categories →</AppLink>
      </div>
      <p v-if="catalog.loading" class="form-note">Loading the menu…</p>
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
          <span class="eyebrow">Popular choices</span>
          <h2>Best Sellers</h2>
          <p>A curated selection from the current menu.</p>
        </div>
        <AppLink class="btn secondary" to="/best-sellers">View all</AppLink>
      </div>
      <p v-if="catalog.loading" class="form-note">Loading best sellers…</p>
      <div v-else class="product-grid">
        <ProductCard v-for="product in featured" :key="product.id" :product="product"/>
      </div>
    </div>
  </section>

  <section v-if="seasonal.length" class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">Limited Edition</span>
          <h2>Seasonal Collection</h2>
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
            <span>Limited</span>
            <h3>{{ product.name }}</h3>
            <b>KWD {{ product.price.toFixed(3) }}</b>
          </div>
        </AppLink>
      </div>
    </div>
  </section>

  <section class="section alt">
    <div class="container story-grid">
      <img :src="img('1556909114-f6e7ad7d3136')">
      <div>
        <span class="eyebrow">Our Story</span>
        <h2>Made from scratch. Made to matter.</h2>
        <p>
          We bake in small batches and finish each order by hand. Product availability and delivery
          windows are confirmed by the bakery so every order receives the care it needs.
        </p>
        <AppLink class="btn primary" to="/about">Meet One Bite <ArrowRight :size="17"/></AppLink>
      </div>
    </div>
  </section>
</template>
