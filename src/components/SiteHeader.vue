<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Heart,
  Languages,
  Menu,
  Search,
  Package,
  ShoppingBag,
  User,
  X,
} from "lucide-vue-next";
import { useShopStore } from "../stores/shop";
import { localePath, locale, setLocale, t, localizeDigits } from "../i18n";
import AppLink from "./AppLink.vue";

const open = ref(false);
const store = useShopStore();
const route = useRoute();
const router = useRouter();

const links = computed(() => [
  { to: "/shop", label: t("nav.shop") },
  { to: "/categories", label: t("nav.categories") },
  { to: "/best-sellers", label: t("nav.bestSellers") },
  { to: "/seasonal", label: t("nav.seasonal") },
  { to: "/gift-boxes", label: t("nav.giftBoxes") },
  { to: "/about", label: t("nav.ourStory") },
]);

// Switching language keeps the visitor on the page they were reading rather
// than sending them back to the home page.
function toggleLocale() {
  const next = locale.value === "ar" ? "en" : "ar";
  setLocale(next);
  open.value = false;
  router.push({
    path: localePath(route.path, next),
    query: route.query,
    hash: route.hash,
  });
}

function closeMenu() {
  open.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") closeMenu();
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});

watch(
  () => route.fullPath,
  () => {
    open.value = false;
  },
);

watch(open, (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
});
</script>

<template>
  <div class="announcement">{{ t("announcement") }}</div>

  <header class="header">
    <div class="container nav">
      <AppLink to="/" class="brand">
        <span class="brand-mark">OB</span>
        <span
          ><b>{{ t("brand.name") }}</b
          ><small>{{ t("brand.tagline") }}</small></span
        >
      </AppLink>

      <button
        class="mobile-drawer-trigger"
        :aria-label="t('nav.menu')"
        :aria-expanded="open"
        aria-controls="mobile-drawer"
        @click="open = !open"
      >
        <X v-if="open" :size="22" />
        <Menu v-else :size="22" />
      </button>

      <nav class="navlinks">
        <AppLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          @click="open = false"
        >
          {{ link.label }}
        </AppLink>
      </nav>

      <div class="actions">
        <button
          class="nav-action locale-toggle"
          :aria-label="t('locale.switchLabel')"
          @click="toggleLocale"
        >
          <Languages :size="18" />
          <span class="locale-text">{{ t("locale.switchTo") }}</span>
          <span class="nav-action-label">{{ t("locale.switchTo") }}</span>
        </button>
        <AppLink to="/search" class="nav-action" :aria-label="t('nav.search')">
          <Search :size="20" />
          <span class="nav-action-label">{{ t("nav.search") }}</span>
        </AppLink>
        <AppLink
          to="/profile"
          class="nav-action"
          :aria-label="t('nav.account')"
        >
          <User :size="20" />
          <span class="nav-action-label">{{ t("nav.account") }}</span>
        </AppLink>
        <AppLink
          to="/profile#orders"
          class="nav-action"
          :aria-label="t('nav.orders')"
        >
          <Package :size="20" />
          <span class="nav-action-label">{{ t("nav.orders") }}</span>
        </AppLink>
        <AppLink
          to="/wishlist"
          class="nav-action badge-wrap"
          :aria-label="t('nav.wishlist')"
        >
          <Heart :size="20" />
          <em v-if="store.wishlist.length">{{
            localizeDigits(String(store.wishlist.length))
          }}</em>
          <span class="nav-action-label">{{ t("nav.wishlist") }}</span>
        </AppLink>
        <AppLink
          to="/cart"
          class="nav-action badge-wrap"
          :aria-label="t('nav.cart')"
        >
          <ShoppingBag :size="20" />
          <em v-if="store.cartCount">{{
            localizeDigits(String(store.cartCount))
          }}</em>
          <span class="nav-action-label">{{ t("nav.cart") }}</span>
        </AppLink>
        <button
          class="nav-action menu"
          :aria-label="t('nav.menu')"
          :aria-expanded="open"
          @click="open = !open"
        >
          <X v-if="open" />
          <Menu v-else />
          <span class="nav-action-label">{{ t("nav.menu") }}</span>
        </button>
      </div>
    </div>
  </header>

  <div v-if="open" class="mobile-drawer-backdrop" @click.self="closeMenu">
    <aside id="mobile-drawer" class="mobile-drawer" role="dialog" :aria-label="t('nav.menu')">
      <div class="mobile-drawer-head">
        <span class="brand">
          <span class="brand-mark">OB</span>
          <span
            ><b>{{ t("brand.name") }}</b
            ><small>{{ t("brand.tagline") }}</small></span
          >
        </span>
        <button class="mobile-drawer-close" :aria-label="t('common.close')" @click="closeMenu">
          <X :size="21" />
        </button>
      </div>

      <nav class="mobile-drawer-links" aria-label="Mobile menu">
        <AppLink v-for="link in links" :key="link.to" :to="link.to" @click="closeMenu">
          {{ link.label }}
        </AppLink>
      </nav>

      <div class="mobile-drawer-actions">
        <button class="mobile-drawer-action" :aria-label="t('locale.switchLabel')" @click="toggleLocale">
          <Languages :size="18" />
          <span>{{ t("locale.switchTo") }}</span>
        </button>
        <AppLink to="/search" class="mobile-drawer-action" @click="closeMenu">
          <Search :size="18" />
          <span>{{ t("nav.search") }}</span>
        </AppLink>
        <AppLink to="/profile" class="mobile-drawer-action" @click="closeMenu">
          <User :size="18" />
          <span>{{ t("nav.account") }}</span>
        </AppLink>
        <AppLink to="/profile#orders" class="mobile-drawer-action" @click="closeMenu">
          <Package :size="18" />
          <span>{{ t("nav.orders") }}</span>
        </AppLink>
        <AppLink to="/wishlist" class="mobile-drawer-action badge-wrap" @click="closeMenu">
          <Heart :size="18" />
          <span>{{ t("nav.wishlist") }}</span>
          <em v-if="store.wishlist.length">{{ localizeDigits(String(store.wishlist.length)) }}</em>
        </AppLink>
        <AppLink to="/cart" class="mobile-drawer-action badge-wrap" @click="closeMenu">
          <ShoppingBag :size="18" />
          <span>{{ t("nav.cart") }}</span>
          <em v-if="store.cartCount">{{ localizeDigits(String(store.cartCount)) }}</em>
        </AppLink>
      </div>
    </aside>
  </div>
</template>
