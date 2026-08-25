<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Check, Gift, Package, ShieldCheck, Truck, Wallet, X} from 'lucide-vue-next';
import {api, type CodStatus, type FulfilmentStatus, type OwnerOrder} from '../../api/client';
import {messageFrom, money, readable} from './admin-ui';

const orders = ref<OwnerOrder[]>([]);
const error = ref('');
const busy = ref(false);

const fulfilmentStatuses: FulfilmentStatus[] = [
  'NOT_STARTED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_ISSUE'
];
const codStatuses: CodStatus[] = ['COD_DUE', 'COLLECTED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'WAIVED'];

async function load() {
  orders.value = (await api.owner.orders()).items;
}

onMounted(load);

async function updateOrder(order: OwnerOrder, status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED') {
  const rejectionReason =
    status === 'REJECTED' ? window.prompt('Why is this order being rejected?')?.trim() : undefined;
  if (status === 'REJECTED' && !rejectionReason) return;

  busy.value = true;
  error.value = '';
  try {
    await api.owner.updateOrder(order.publicNumber, {status, rejectionReason});
    await load();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to update the order.');
  } finally {
    busy.value = false;
  }
}

async function updateFulfilment(order: OwnerOrder, fulfilmentStatus: FulfilmentStatus) {
  busy.value = true;
  error.value = '';
  try {
    await api.owner.updateOrder(order.publicNumber, {fulfilmentStatus});
    await load();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to update fulfilment.');
  } finally {
    busy.value = false;
  }
}

async function updateCod(order: OwnerOrder, codStatus: CodStatus) {
  busy.value = true;
  error.value = '';
  try {
    await api.owner.updateOrder(order.publicNumber, {codStatus});
    await load();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to update COD status.');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="account-panel">
    <h2><Package/> Recent orders</h2>
    <p v-if="error" class="form-note" role="alert">{{ error }}</p>
    <p v-if="!orders.length" class="form-note">No orders have been created yet.</p>

    <div v-for="order in orders" :key="order.publicNumber" class="order-row">
      <span>
        <b>{{ order.publicNumber }}</b>
        <small>
          {{ order.customerName }} · {{ order.customerPhone }} · {{ order.areaName }} ·
          {{ order.deliveryWindow }}
        </small>
        <small v-if="order.isGift" class="gift-note">
          <Gift :size="14"/>
          Gift for {{ order.giftRecipientName }} · {{ order.giftRecipientPhone }}
          <template v-if="order.giftMessage"> · “{{ order.giftMessage }}”</template>
          <template v-if="order.giftAnonymous"> · anonymous note</template>
        </small>
      </span>
      <strong>{{ money(order.totalFils) }}</strong>
      <em><ShieldCheck :size="15"/> {{ readable(order.status) }}</em>
      <label class="admin-mini-select">
        <Truck :size="15"/>
        <select
          :value="order.fulfilmentStatus"
          :disabled="busy || order.status !== 'CONFIRMED'"
          @change="updateFulfilment(order, ($event.target as HTMLSelectElement).value as FulfilmentStatus)"
        >
          <option v-for="status in fulfilmentStatuses" :key="status" :value="status">
            {{ readable(status) }}
          </option>
        </select>
      </label>
      <label class="admin-mini-select">
        <Wallet :size="15"/>
        <select
          :value="order.codStatus"
          :disabled="busy || order.status !== 'CONFIRMED'"
          @change="updateCod(order, ($event.target as HTMLSelectElement).value as CodStatus)"
        >
          <option v-for="status in codStatuses" :key="status" :value="status">
            {{ readable(status) }}
          </option>
        </select>
      </label>
      <span v-if="order.status === 'PENDING_CONFIRMATION'" class="order-actions">
        <button class="btn primary" :disabled="busy" @click="updateOrder(order, 'CONFIRMED')">
          <Check :size="15"/> Confirm
        </button>
        <button class="btn secondary" :disabled="busy" @click="updateOrder(order, 'REJECTED')">
          <X :size="15"/> Reject
        </button>
        <button class="btn secondary" :disabled="busy" @click="updateOrder(order, 'CANCELLED')">
          <X :size="15"/> Cancel
        </button>
      </span>
    </div>
  </div>
</template>
