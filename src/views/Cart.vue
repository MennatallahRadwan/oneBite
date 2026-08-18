<script setup lang="ts">
import {Minus, Plus, Trash2, ShoppingBag, ArrowRight} from 'lucide-vue-next';
import {money} from '../data';
import {useShopStore} from '../stores/shop';
import PageHero from '../components/PageHero.vue';
import AppLink from '../components/AppLink.vue';

const store = useShopStore();
</script>

<template>
  <PageHero
    eyebrow="Your Selection"
    title="Shopping Cart"
    subtitle="Freshly baked and almost on its way."
  />

  <section class="section">
    <div class="container">
      <div v-if="!store.cart.length" class="empty">
        <ShoppingBag :size="48"/>
        <h2>Your cart is empty</h2>
        <p>There is always room for one more sweet moment.</p>
        <AppLink class="btn primary" to="/shop">Start Shopping</AppLink>
      </div>

      <div v-else class="cart-layout">
        <div class="cart-list">
          <article v-for="item in store.cart" :key="item.lineId" class="cart-item">
            <img :src="item.image">
            <div class="cart-info">
              <AppLink :to="`/product/${item.slug}`">
                <h3>{{ item.name }}</h3>
              </AppLink>
              <p>{{ item.nameAr }}</p>
              <ul v-if="item.variantName || item.addonNames.length || item.cakeText" class="line-options">
                <li v-if="item.variantName">{{ item.variantName }}</li>
                <li v-for="addon in item.addonNames" :key="addon">{{ addon }}</li>
                <li v-if="item.cakeText">Message: “{{ item.cakeText }}”</li>
              </ul>
              <strong>{{ money(item.unitPrice) }}</strong>
            </div>
            <div class="qty">
              <button @click="store.qty(item.lineId, item.quantity - 1)"><Minus :size="16"/></button>
              <b>{{ item.quantity }}</b>
              <button @click="store.qty(item.lineId, item.quantity + 1)"><Plus :size="16"/></button>
            </div>
            <strong class="line-total">{{ money(item.unitPrice * item.quantity) }}</strong>
            <button class="trash" @click="store.remove(item.lineId)"><Trash2 :size="18"/></button>
          </article>
        </div>

        <aside class="summary">
          <h2>Order Summary</h2>
          <div><span>Subtotal</span><b>{{ money(store.cartTotal) }}</b></div>
          <div><span>Delivery</span><b>Calculated at checkout</b></div>
          <div class="total"><span>Total</span><b>{{ money(store.cartTotal) }}</b></div>
          <AppLink class="btn primary full" to="/checkout">
            Proceed to Checkout <ArrowRight :size="17"/>
          </AppLink>
          <p>Cash on delivery · Every order is confirmed by the bakery</p>
        </aside>
      </div>
    </div>
  </section>
</template>
