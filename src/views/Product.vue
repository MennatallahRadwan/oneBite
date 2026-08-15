<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute} from 'vue-router';
import {Heart, Minus, Plus, ShoppingBag, Truck, ShieldCheck, Clock} from 'lucide-vue-next';
import {products, money} from '../data';
import {useShopStore} from '../stores/shop';
import ProductCard from '../components/ProductCard.vue';

const route = useRoute();
const store = useShopStore();

const qty = ref(1);
const selectedVariant = ref('');
const selectedAddons = ref<string[]>([]);
const cakeText = ref('');

const product = computed(() => products.find(item => item.id === route.params.id));

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
  products
    .filter(item => item.category === product.value?.category && item.id !== product.value?.id)
    .slice(0, 4)
);

function add() {
  if (product.value) store.add(product.value, qty.value);
}
</script>

<template>
  <section v-if="product" class="section">
    <div class="container product-detail">
      <div class="detail-image">
        <img :src="product.image" :alt="product.name">
        <span class="tag">{{ product.tags[0] }}</span>
      </div>

      <div class="detail-copy">
        <h1>{{ product.name }}</h1>
        <p class="arabic large">{{ product.nameAr }}</p>
        <strong class="detail-price">From {{ money(product.price) }}</strong>
        <p class="description">{{ product.description }}</p>

        <div class="info-pills">
          <span v-if="product.servings">Serves: {{ product.servings }}</span>
          <span>Made to order</span>
        </div>

        <div v-if="product.allergens" class="allergens">
          <b>Contains:</b> {{ product.allergens.join(', ') }}
        </div>

        <div v-if="product.variants" class="config">
          <b>Choose a size</b>
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
          <b>Packaging</b>
          <label v-for="addon in product.addons" :key="addon.id" class="option-check">
            <input v-model="selectedAddons" type="checkbox" :value="addon.id">
            {{ addon.name }} <small>+ {{ money(addon.price) }}</small>
          </label>
        </div>

        <label v-if="product.cakeText" class="cake-text">
          <b>Short cake text (optional)</b>
          <small>
            + {{ money(product.cakeText.price) }} · up to {{ product.cakeText.maxLength }} characters
          </small>
          <input
            v-model="cakeText"
            :maxlength="product.cakeText.maxLength"
            placeholder="e.g. Happy Birthday Noor"
          >
        </label>

        <div class="purchase">
          <div class="qty">
            <button @click="qty = Math.max(1, qty - 1)"><Minus :size="17"/></button>
            <b>{{ qty }}</b>
            <button @click="qty++"><Plus :size="17"/></button>
          </div>
          <button class="btn primary grow" @click="add">
            <ShoppingBag :size="18"/> Add to Cart · {{ money(unitPrice * qty) }}
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
          <span><Truck/> Delivery fee and earliest window are calculated after area selection</span>
          <span><Clock/> Availability is confirmed by the bakery after ordering</span>
          <span><ShieldCheck/> Cash on delivery only</span>
        </div>
      </div>
    </div>
  </section>

  <section v-if="related.length" class="section alt">
    <div class="container">
      <div class="section-head">
        <div>
          <span class="eyebrow">You May Also Like</span>
          <h2>More to Love</h2>
        </div>
      </div>
      <div class="product-grid">
        <ProductCard v-for="item in related" :key="item.id" :product="item"/>
      </div>
    </div>
  </section>
</template>
