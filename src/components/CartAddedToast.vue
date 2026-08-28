<script setup lang="ts">
import {CheckCircle2, ShoppingBag, X} from 'lucide-vue-next';
import {money} from '../data';
import type {CartItem} from '../stores/shop';
import {t} from '../i18n';
import AppLink from './AppLink.vue';

defineProps<{item: CartItem | null}>();
defineEmits<{close: []}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="cart-toast">
      <aside v-if="item" class="cart-toast" role="dialog" aria-live="polite">
        <button class="cart-toast-close" :aria-label="t('common.close')" @click="$emit('close')">
          <X :size="16"/>
        </button>

        <div class="cart-toast-head">
          <CheckCircle2 :size="22"/>
          <div>
            <b>{{ t('cartToast.title') }}</b>
            <small>{{ t('cart.quantity', {count: item.quantity}) }}</small>
          </div>
        </div>

        <div class="cart-toast-item">
          <img :src="item.image" :alt="item.name">
          <span>
            <strong>{{ item.name }}</strong>
            <small v-if="item.variantName">{{ item.variantName }}</small>
            <small v-if="item.addonNames.length">{{ item.addonNames.join(', ') }}</small>
            <small>{{ money(item.unitPrice * item.quantity) }}</small>
          </span>
        </div>

        <div class="cart-toast-actions">
          <AppLink class="btn primary" to="/checkout">
            <ShoppingBag :size="16"/> {{ t('cartToast.checkout') }}
          </AppLink>
          <button class="btn secondary" @click="$emit('close')">
            {{ t('cartToast.continue') }}
          </button>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
