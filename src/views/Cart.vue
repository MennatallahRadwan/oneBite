<script setup lang="ts">
import {Minus, Plus, Trash2, ShoppingBag, ArrowRight} from 'lucide-vue-next';
import {money} from '../data';
import {useShopStore} from '../stores/shop';
import PageHero from '../components/PageHero.vue';

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
        <RouterLink class="btn primary" to="/shop">Start Shopping</RouterLink>
      </div>

      <div v-else class="cart-layout">
        <div class="cart-list">
          <article v-for="item in store.cart" :key="item.product.id" class="cart-item">
            <img :src="item.product.image">
            <div class="cart-info">
              <RouterLink :to="`/product/${item.product.id}`">
                <h3>{{ item.product.name }}</h3>
              </RouterLink>
              <p>{{ item.product.nameAr }}</p>
              <strong>{{ money(item.product.price) }}</strong>
            </div>
            <div class="qty">
              <button @click="store.qty(item.product.id, item.quantity - 1)"><Minus :size="16"/></button>
              <b>{{ item.quantity }}</b>
              <button @click="store.qty(item.product.id, item.quantity + 1)"><Plus :size="16"/></button>
            </div>
            <strong class="line-total">{{ money(item.product.price * item.quantity) }}</strong>
            <button class="trash" @click="store.remove(item.product.id)"><Trash2 :size="18"/></button>
          </article>
        </div>

        <aside class="summary">
          <h2>Order Summary</h2>
          <div><span>Subtotal</span><b>{{ money(store.cartTotal) }}</b></div>
          <div><span>Delivery</span><b>Calculated at checkout</b></div>
          <div class="total"><span>Total</span><b>{{ money(store.cartTotal) }}</b></div>
          <RouterLink class="btn primary full" to="/checkout">
            Proceed to Checkout <ArrowRight :size="17"/>
          </RouterLink>
          <p>Cash on delivery · Every order is confirmed by the bakery</p>
        </aside>
      </div>
    </div>
  </section>
</template>
