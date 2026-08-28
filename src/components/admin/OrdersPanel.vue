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

function statusClass(status: string) {
  if (status === 'CONFIRMED') return 'live';
  if (status === 'PENDING_CONFIRMATION') return 'draft';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'danger';
  return 'muted';
}

function fulfilmentClass(status: string) {
  if (status === 'DELIVERED') return 'live';
  if (status === 'DELIVERY_ISSUE') return 'danger';
  if (status === 'NOT_STARTED') return 'muted';
  return 'draft';
}

function codClass(status: string) {
  if (status === 'COLLECTED' || status === 'WAIVED') return 'live';
  if (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') return 'muted';
  return 'draft';
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}).format(
    new Date(value)
  );
}
</script>

<template>
  <div class="account-panel">
    <div class="admin-head order-panel-head">
      <div>
        <h2><Package/> Recent orders</h2>
        <p class="form-note">Confirm orders, update fulfilment, and record cash collection.</p>
      </div>
      <button class="btn secondary" :disabled="busy" @click="load">Refresh</button>
    </div>
    <p v-if="error" class="form-note" role="alert">{{ error }}</p>
    <p v-if="!orders.length" class="form-note">No orders have been created yet.</p>

    <div class="admin-order-list">
      <article
        v-for="order in orders"
        :key="order.publicNumber"
        class="admin-order-card"
        :class="{cancelled: order.status === 'CANCELLED' || order.status === 'REJECTED'}"
      >
        <div class="admin-order-main">
          <div class="admin-order-title">
            <b>{{ order.publicNumber }}</b>
            <small>{{ shortDate(order.createdAt) }}</small>
          </div>
          <div class="admin-order-meta">
            <span>{{ order.customerName }}</span>
            <span>{{ order.customerPhone }}</span>
            <span>{{ order.areaName }}</span>
            <span>{{ order.deliveryWindow }}</span>
          </div>
          <small v-if="order.isGift" class="gift-note">
            <Gift :size="14"/>
            Gift for {{ order.giftRecipientName }} · {{ order.giftRecipientPhone }}
            <template v-if="order.giftMessage"> · “{{ order.giftMessage }}”</template>
            <template v-if="order.giftAnonymous"> · anonymous note</template>
          </small>
        </div>

        <strong class="admin-order-total">{{ money(order.totalFils) }}</strong>

        <div class="admin-order-statuses">
          <span class="admin-status-group">
            <small>Order status</small>
            <em class="admin-flag" :class="statusClass(order.status)">
              <ShieldCheck :size="14"/> {{ readable(order.status) }}
            </em>
          </span>
          <label class="admin-mini-select">
            <span><Truck :size="15"/> Fulfilment status</span>
            <select
              :value="order.fulfilmentStatus"
              :disabled="busy || order.status !== 'CONFIRMED'"
              @change="updateFulfilment(order, ($event.target as HTMLSelectElement).value as FulfilmentStatus)"
            >
              <option v-for="status in fulfilmentStatuses" :key="status" :value="status">
                {{ readable(status) }}
              </option>
            </select>
            <em class="admin-flag mobile-status-chip" :class="fulfilmentClass(order.fulfilmentStatus)">
              {{ readable(order.fulfilmentStatus) }}
            </em>
          </label>
          <label class="admin-mini-select">
            <span><Wallet :size="15"/> COD status</span>
            <select
              :value="order.codStatus"
              :disabled="busy || order.status !== 'CONFIRMED'"
              @change="updateCod(order, ($event.target as HTMLSelectElement).value as CodStatus)"
            >
              <option v-for="status in codStatuses" :key="status" :value="status">
                {{ readable(status) }}
              </option>
            </select>
            <em class="admin-flag mobile-status-chip" :class="codClass(order.codStatus)">
              {{ readable(order.codStatus) }}
            </em>
          </label>
        </div>

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
      </article>
    </div>
  </div>
</template>
