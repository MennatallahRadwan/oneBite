<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Package, X} from 'lucide-vue-next';
import PageHero from '../components/PageHero.vue';
import AppLink from '../components/AppLink.vue';
import {money} from '../data';
import {t, type MessageKey} from '../i18n';
import {errorMessage} from '../i18n/errors';
import {useCustomerStore} from '../stores/customer';
import {useShopStore} from '../stores/shop';

const customer = useCustomerStore();
const shop = useShopStore();
const busy = ref(false);
const error = ref('');

onMounted(() => customer.load());

// Orders placed before signing in only exist in this browser, so the two lists
// are shown together rather than the account list replacing the local one.
const alsoOnAccount = (orderNumber: string) =>
  customer.orders.some(order => order.publicNumber === orderNumber);

async function cancel(publicNumber: string) {
  if (!window.confirm(t('tracking.cancelConfirm'))) return;
  busy.value = true;
  error.value = '';
  try {
    await customer.cancelOrder(publicNumber);
  } catch (reason) {
    error.value = errorMessage(reason, 'error.generic');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <PageHero :eyebrow="t('orders.eyebrow')" :title="t('orders.title')" :subtitle="t('orders.subtitle')"/>

  <section class="section">
    <div class="container">
      <p v-if="error" class="form-note" role="alert">{{ error }}</p>

      <div v-if="customer.signedIn && customer.orders.length" class="account-panel">
        <h2><Package/> {{ t('orders.accountTitle') }}</h2>
        <div v-for="order in customer.orders" :key="order.publicNumber" class="order-row">
          <span>
            <b>{{ order.publicNumber }}</b>
            <small>{{ order.areaName }} · <bdi>{{ order.deliveryWindow }}</bdi></small>
            <small>{{ t(`tracking.fulfilment.${order.fulfilmentStatus}` as MessageKey) }}</small>
          </span>
          <strong>{{ money(order.totalFils / 1000) }}</strong>
          <AppLink class="btn secondary" :to="`/order/${order.trackingToken}`">
            {{ t('checkout.track') }}
          </AppLink>
          <button
            v-if="order.status === 'PENDING_CONFIRMATION'"
            class="btn secondary"
            :disabled="busy"
            @click="cancel(order.publicNumber)"
          >
            <X :size="15"/> {{ t('tracking.cancel') }}
          </button>
        </div>
      </div>

      <div v-if="shop.orders.length" class="account-panel">
        <h2><Package/> {{ t('profile.deviceOrders') }}</h2>
        <p class="form-note">{{ t('profile.deviceOrdersHint') }}</p>
        <template v-for="order in shop.orders" :key="order.orderNumber">
          <div v-if="!alsoOnAccount(order.orderNumber)" class="order-row">
            <span>
              <b>{{ order.orderNumber }}</b>
              <small>{{ new Date(order.placedAt).toLocaleDateString() }}</small>
            </span>
            <strong>{{ money(order.totalFils / 1000) }}</strong>
            <AppLink class="btn secondary" :to="`/order/${order.trackingToken}`">
              {{ t('checkout.track') }}
            </AppLink>
          </div>
        </template>
      </div>

      <div v-if="!shop.orders.length && !customer.orders.length" class="empty">
        <Package :size="48"/>
        <h2>{{ t('orders.emptyTitle') }}</h2>
        <p>{{ t('orders.emptyBlurb') }}</p>
        <AppLink class="btn primary" to="/shop">{{ t('cart.empty.cta') }}</AppLink>
      </div>
    </div>
  </section>
</template>
