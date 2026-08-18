<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {Menu, X, Search, Heart, ShoppingBag, User, Languages} from 'lucide-vue-next';
import {useShopStore} from '../stores/shop';
import {localePath, locale, setLocale, t, localizeDigits} from '../i18n';
import AppLink from './AppLink.vue';

const open = ref(false);
const store = useShopStore();
const route = useRoute();
const router = useRouter();

const links = computed(() => [
  {to: '/shop', label: t('nav.shop')},
  {to: '/categories', label: t('nav.categories')},
  {to: '/best-sellers', label: t('nav.bestSellers')},
  {to: '/seasonal', label: t('nav.seasonal')},
  {to: '/gift-boxes', label: t('nav.giftBoxes')},
  {to: '/about', label: t('nav.ourStory')}
]);

// Switching language keeps the visitor on the page they were reading rather
// than sending them back to the home page.
function toggleLocale() {
  const next = locale.value === 'ar' ? 'en' : 'ar';
  setLocale(next);
  router.push({
    path: localePath(route.path, next),
    query: route.query,
    hash: route.hash
  });
}
</script>

<template>
  <div class="announcement">{{ t('announcement') }}</div>

  <header class="header">
    <div class="container nav">
      <AppLink to="/" class="brand">
        <span class="brand-mark">OB</span>
        <span><b>{{ t('brand.name') }}</b><small>{{ t('brand.tagline') }}</small></span>
      </AppLink>

      <nav :class="['navlinks', {open}]">
        <AppLink v-for="link in links" :key="link.to" :to="link.to" @click="open = false">
          {{ link.label }}
        </AppLink>
      </nav>

      <div class="actions">
        <button class="locale-toggle" :aria-label="t('locale.switchLabel')" @click="toggleLocale">
          <Languages :size="18"/> <span>{{ t('locale.switchTo') }}</span>
        </button>
        <AppLink to="/search" :aria-label="t('nav.search')"><Search :size="20"/></AppLink>
        <AppLink to="/profile" :aria-label="t('nav.account')"><User :size="20"/></AppLink>
        <AppLink to="/wishlist" class="badge-wrap" :aria-label="t('nav.wishlist')">
          <Heart :size="20"/>
          <em v-if="store.wishlist.length">{{ localizeDigits(String(store.wishlist.length)) }}</em>
        </AppLink>
        <AppLink to="/cart" class="badge-wrap" :aria-label="t('nav.cart')">
          <ShoppingBag :size="20"/>
          <em v-if="store.cartCount">{{ localizeDigits(String(store.cartCount)) }}</em>
        </AppLink>
        <button class="menu" :aria-label="t('nav.menu')" @click="open = !open">
          <X v-if="open"/>
          <Menu v-else/>
        </button>
      </div>
    </div>
  </header>
</template>
