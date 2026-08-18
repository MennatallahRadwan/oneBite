<script setup lang="ts">
import {Heart, Plus} from 'lucide-vue-next';
import {money, type Product} from '../data';
import {t} from '../i18n';
import {useShopStore} from '../stores/shop';
import AppLink from './AppLink.vue';

defineProps<{product: Product}>();
const store = useShopStore();
</script>

<template>
  <article class="product-card">
    <div class="product-image">
      <AppLink :to="`/product/${product.id}`">
        <img :src="product.image" :alt="product.name">
      </AppLink>
      <span v-if="product.tags[0]" class="tag">{{ product.tags[0] }}</span>
      <button
        class="wish"
        :class="{active: store.wishlist.includes(product.id)}"
        @click="store.toggleWish(product.id)"
      >
        <Heart :size="18" :fill="store.wishlist.includes(product.id) ? 'currentColor' : 'none'"/>
      </button>
    </div>

    <div class="product-info">
      <AppLink :to="`/product/${product.id}`">
        <h3>{{ product.name }}</h3>
      </AppLink>
      <p class="name-alt" dir="auto">{{ product.nameAlt }}</p>
      <div class="product-bottom">
        <strong>{{ t('common.from', {price: money(product.price)}) }}</strong>
        <AppLink class="add" :to="`/product/${product.id}`">
          <Plus :size="17"/> {{ t('product.choose') }}
        </AppLink>
      </div>
    </div>
  </article>
</template>
