<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {Heart, Minus, Plus, ShoppingBag, Truck, ShieldCheck, Clock} from 'lucide-vue-next';
import {money, num} from '../data';
import {useCatalogStore} from '../stores/catalog';
import {useShopStore} from '../stores/shop';
import {t} from '../i18n';
import ProductCard from '../components/ProductCard.vue';
import AppLink from '../components/AppLink.vue';
import CartAddedToast from '../components/CartAddedToast.vue';
import type {CartItem} from '../stores/shop';

const route = useRoute();
const store = useShopStore();
const catalog = useCatalogStore();

onMounted(() => catalog.load());

const qty = ref(1);
const selectedVariant = ref('');
const selectedAddons = ref<string[]>([]);
const cakeText = ref('');

const product = computed(() => catalog.byId(String(route.params.id)));

// Navigating between product pages reuses this component, so the previous
// product's selections have to be dropped.
watch(
  () => route.params.id,
  () => {
    qty.value = 1;
    selectedVariant.value = '';
    selectedAddons.value = [];
    cakeText.value = '';
  }
);

const variant = computed(
  () =>
    product.value?.variants?.find(option => option.id === selectedVariant.value) ??
    product.value?.variants?.[0]
);

const addonsTotal = computed(
  () =>
    product.value?.addons
      ?.filter(addon => selectedAddons.value.includes(addon.id))
      .reduce((total, addon) => total + addon.price, 0) ?? 0
);

const unitPrice = computed(
  () =>
    (product.value?.price ?? 0) +
    (variant.value?.price ?? 0) +
    addonsTotal.value +
    (cakeText.value ? product.value?.cakeText?.price ?? 0 : 0)
);

const related = computed(() =>
  catalog.products
    .filter(item => item.category === product.value?.category && item.id !== product.value?.id)
    .slice(0, 4)
);

const added = ref(false);
const addedItem = ref<CartItem | null>(null);
let addedTimer: number | undefined;

function add() {
  if (!product.value) return;

  const selection = {
    // The size buttons show the first variant as selected before the customer
    // touches them, so an untouched form must send that same variant.
    variantId: selectedVariant.value || product.value.variants?.[0]?.id,
    addonIds: selectedAddons.value,
    cakeText: cakeText.value
  };

  const item = store.add(product.value, qty.value, selection);
  added.value = true;
  addedItem.value = item;
  if (addedTimer) window.clearTimeout(addedTimer);
  addedTimer = window.setTimeout(() => {
    added.value = false;
    addedItem.value = null;
  }, 6000);
}

function closeAddedToast() {
  added.value = false;
  addedItem.value = null;
  if (addedTimer) window.clearTimeout(addedTimer);
}

onBeforeUnmount(() => {
  if (addedTimer) window.clearTimeout(addedTimer);
});
</script>

<template>
  <section v-if="catalog.loading || catalog.error || !product" class="section">
    <div class="container empty">
      <p v-if="catalog.loading" class="form-note">{{ t('common.loadingProduct') }}</p>
      <p v-else-if="catalog.error" class="form-note" role="alert">{{ catalog.error }}</p>
      <template v-else>
        <h2>{{ t('product.notFound') }}</h2>
        <p>{{ t('product.notFoundBlurb') }}</p>
        <AppLink class="btn primary" to="/shop">{{ t('product.browse') }}</AppLink>
      </template>
    </div>
  </section>

  <section v-else class="section">
    <div class="container product-detail">
      <div class="detail-image">
        <img :src="product.image" :alt="product.name">
        <span class="tag">{{ product.tags[0] }}</span>
      </div>

      <div class="detail-copy">
        <h1>{{ product.name }}</h1>
        <p class="name-alt large" dir="auto">{{ product.nameAlt }}</p>
        <strong class="detail-price">{{ t('common.from', {price: money(product.price)}) }}</strong>
        <p class="description">{{ product.description }}</p>

        <div class="info-pills">
          <span v-if="product.servings">{{ t('product.serves', {value: product.servings}) }}</span>
          <span>{{ t('product.madeToOrder') }}</span>
        </div>

        <div v-if="product.allergens" class="allergens">
          <b>{{ t('product.contains') }}</b> {{ product.allergens.join(', ') }}
        </div>

        <div v-if="product.variants" class="config">
          <b>{{ t('product.chooseSize') }}</b>
          <div class="choice-grid">
            <button
              v-for="option in product.variants"
              :key="option.id"
              :class="{selected: (selectedVariant || product.variants[0].id) === option.id}"
              @click="selectedVariant = option.id"
            >
              {{ option.name }} <small v-if="option.price">+ {{ money(option.price) }}</small>
            </button>
          </div>
        </div>

        <div v-if="product.addons?.length" class="config">
          <b>{{ t('product.packaging') }}</b>
          <label v-for="addon in product.addons" :key="addon.id" class="option-check">
            <input v-model="selectedAddons" type="checkbox" :value="addon.id">
            {{ addon.name }} <small>+ {{ money(addon.price) }}</small>
          </label>
        </div>

        <label v-if="product.cakeText" class="cake-text">
          <b>{{ t('product.cakeText') }}</b>
          <small>
            {{ t('product.cakeTextHint', {price: money(product.cakeText.price), max: product.cakeText.maxLength}) }}
          </small>
          <input
            v-model="cakeText"
            :maxlength="product.cakeText.maxLength"
            :placeholder="t('product.cakeTextPlaceholder')"
          >
        </label>

        <div class="purchase">
          <div class="qty">
            <button @click="qty = Math.max(1, qty - 1)"><Minus :size="17"/></button>
            <b>{{ num(qty) }}</b>
            <button @click="qty++"><Plus :size="17"/></button>
          </div>
          <button class="btn primary grow" @click="add">
            <ShoppingBag :size="18"/> {{ t('product.addToCart', {price: money(unitPrice * qty)}) }}
          </button>
          <button
            class="icon-btn"
            :class="{active: store.wishlist.includes(product.id)}"
            @click="store.toggleWish(product.id)"
          >
            <Heart :fill="store.wishlist.includes(product.id) ? 'currentColor' : 'none'"/>
          </button>
        </div>

        <div class="detail-trust">
          <span><Truck/> {{ t('product.trust.fee') }}</span>
          <span><Clock/> {{ t('product.trust.confirm') }}</span>
          <span><ShieldCheck/> {{ t('product.trust.cod') }}</span>
        </div>
      </div>
    </div>
  </section>

  <CartAddedToast :item="added && addedItem ? addedItem : null" @close="closeAddedToast"/>

  <section v-if="related.length" class="section alt">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">{{ t('product.related.eyebrow') }}</span>
          <h2>{{ t('product.related.title') }}</h2>
        </div>
      </div>
      <div class="product-grid">
        <ProductCard v-for="item in related" :key="item.id" :product="item"/>
      </div>
    </div>
  </section>
</template>
