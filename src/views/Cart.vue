<script setup lang="ts">
import {Minus, Plus, Trash2, ShoppingBag, ArrowRight} from 'lucide-vue-next';
import {money, num} from '../data';
import {useShopStore} from '../stores/shop';
import {t} from '../i18n';
import PageHero from '../components/PageHero.vue';
import AppLink from '../components/AppLink.vue';

const store = useShopStore();
</script>

<template>
  <PageHero :eyebrow="t('cart.eyebrow')" :title="t('cart.title')" :subtitle="t('cart.subtitle')"/>

  <section class="section">
    <div class="container">
      <div v-if="!store.cart.length" class="empty">
        <ShoppingBag :size="48"/>
        <h2>{{ t('cart.empty.title') }}</h2>
        <p>{{ t('cart.empty.blurb') }}</p>
        <AppLink class="btn primary" to="/shop">{{ t('cart.empty.cta') }}</AppLink>
      </div>

      <div v-else class="cart-layout">
        <div class="cart-list">
          <article v-for="item in store.cart" :key="item.lineId" class="cart-item">
            <img :src="item.image">
            <div class="cart-info">
              <AppLink :to="`/product/${item.slug}`">
                <h3>{{ item.name }}</h3>
              </AppLink>
              <p class="name-alt" dir="auto">{{ item.nameAlt }}</p>
              <ul
                v-if="item.variantName || item.addonNames.length || item.cakeText"
                class="line-options"
              >
                <li v-if="item.variantName">{{ item.variantName }}</li>
                <li v-for="addon in item.addonNames" :key="addon">{{ addon }}</li>
                <li v-if="item.cakeText">{{ t('cart.message', {text: item.cakeText}) }}</li>
              </ul>
              <strong>{{ money(item.unitPrice) }}</strong>
            </div>
            <div class="qty">
              <button @click="store.qty(item.lineId, item.quantity - 1)"><Minus :size="16"/></button>
              <b>{{ num(item.quantity) }}</b>
              <button @click="store.qty(item.lineId, item.quantity + 1)"><Plus :size="16"/></button>
            </div>
            <strong class="line-total">{{ money(item.unitPrice * item.quantity) }}</strong>
            <button class="trash" @click="store.remove(item.lineId)"><Trash2 :size="18"/></button>
          </article>
        </div>

        <aside class="summary">
          <h2>{{ t('cart.summary') }}</h2>
          <div><span>{{ t('cart.subtotal') }}</span><b>{{ money(store.cartTotal) }}</b></div>
          <div><span>{{ t('cart.delivery') }}</span><b>{{ t('cart.deliveryAtCheckout') }}</b></div>
          <div class="total">
            <span>{{ t('cart.total') }}</span><b>{{ money(store.cartTotal) }}</b>
          </div>
          <AppLink class="btn primary full" to="/checkout">
            {{ t('cart.checkout') }} <ArrowRight :size="17"/>
          </AppLink>
          <p>{{ t('cart.note') }}</p>
        </aside>
      </div>
    </div>
  </section>
</template>
