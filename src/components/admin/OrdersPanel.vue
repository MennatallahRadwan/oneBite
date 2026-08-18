<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Check, Package, ShieldCheck, X} from 'lucide-vue-next';
import {api, type OwnerOrder} from '../../api/client';
import {messageFrom, money, readable} from './admin-ui';

const orders = ref<OwnerOrder[]>([]);
const error = ref('');
const busy = ref(false);

async function load() {
  orders.value = (await api.owner.orders()).items;
}

onMounted(load);

async function updateOrder(order: OwnerOrder, status: 'CONFIRMED' | 'REJECTED') {
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
      </span>
      <strong>{{ money(order.totalFils) }}</strong>
      <em><ShieldCheck :size="15"/> {{ readable(order.status) }}</em>
      <span v-if="order.status === 'PENDING_CONFIRMATION'" class="order-actions">
        <button class="btn primary" :disabled="busy" @click="updateOrder(order, 'CONFIRMED')">
          <Check :size="15"/> Confirm
        </button>
        <button class="btn secondary" :disabled="busy" @click="updateOrder(order, 'REJECTED')">
          <X :size="15"/> Reject
        </button>
      </span>
    </div>
  </div>
</template>
