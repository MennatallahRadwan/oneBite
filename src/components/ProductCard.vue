<script setup lang="ts">
import {Heart, Plus} from 'lucide-vue-next';
import {money, type Product} from '../data';
import {useShopStore} from '../stores/shop';

defineProps<{product: Product}>();
const store = useShopStore();
</script>

<template>
  <article class="product-card">
    <div class="product-image">
      <RouterLink :to="`/product/${product.id}`">
        <img :src="product.image" :alt="product.name">
      </RouterLink>
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
      <RouterLink :to="`/product/${product.id}`">
        <h3>{{ product.name }}</h3>
      </RouterLink>
      <p class="arabic">{{ product.nameAr }}</p>
      <div class="product-bottom">
        <strong>From {{ money(product.price) }}</strong>
        <RouterLink class="add" :to="`/product/${product.id}`">
          <Plus :size="17"/> Choose
        </RouterLink>
      </div>
    </div>
  </article>
</template>
