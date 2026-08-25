<script setup lang="ts">
import {computed, onMounted} from 'vue';
import {Heart} from 'lucide-vue-next';
import {useCatalogStore} from '../stores/catalog';
import {useShopStore} from '../stores/shop';
import {useCustomerStore} from '../stores/customer';
import {t} from '../i18n';
import ProductCard from '../components/ProductCard.vue';
import PageHero from '../components/PageHero.vue';
import AppLink from '../components/AppLink.vue';

const store = useShopStore();
const customer = useCustomerStore();
const catalog = useCatalogStore();

onMounted(async () => {
  await Promise.all([catalog.load(), customer.load()]);
  if (customer.account?.wishlist.length) store.setWishlist(customer.account.wishlist);
});

const list = computed(() =>
  catalog.products.filter(product => store.wishlist.includes(product.id))
);
</script>

<template>
  <PageHero
    :eyebrow="t('wishlist.eyebrow')"
    :title="t('wishlist.title')"
    :subtitle="t('wishlist.subtitle')"
  />

  <section class="section">
    <div class="container">
      <p v-if="catalog.loading" class="form-note">{{ t('common.loadingSaved') }}</p>
      <p v-else-if="catalog.error" class="form-note" role="alert">{{ catalog.error }}</p>

      <div v-else-if="!list.length" class="empty">
        <Heart :size="48"/>
        <h2>{{ t('wishlist.empty.title') }}</h2>
        <p>{{ t('wishlist.empty.blurb') }}</p>
        <AppLink class="btn primary" to="/shop">{{ t('wishlist.empty.cta') }}</AppLink>
      </div>
      <div v-else class="product-grid">
        <ProductCard v-for="product in list" :key="product.id" :product="product"/>
      </div>
    </div>
  </section>
</template>
