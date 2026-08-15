<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Check, LogOut, LockKeyhole, Package, ShieldCheck, X} from 'lucide-vue-next';
import {api, type OwnerOrder} from '../api/client';
import {money} from '../data';

const stage = ref<'loading' | 'password' | 'totp' | 'dashboard'>('loading');
const email = ref('');
const password = ref('');
const code = ref('');
const error = ref('');
const busy = ref(false);
const owner = ref('');
const orders = ref<OwnerOrder[]>([]);

const readable = (value: string) => value.replace(/_/g, ' ').toLowerCase();
const messageFrom = (reason: unknown, fallback: string) =>
  reason instanceof Error ? reason.message : fallback;

async function loadDashboard() {
  const [me, result] = await Promise.all([api.owner.me(), api.owner.orders()]);
  owner.value = me.name;
  orders.value = result.items;
  stage.value = 'dashboard';
}

onMounted(async () => {
  try {
    await loadDashboard();
  } catch {
    stage.value = 'password';
  }
});

async function submitPassword() {
  busy.value = true;
  error.value = '';
  try {
    await api.owner.login(email.value, password.value);
    password.value = '';
    stage.value = 'totp';
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to sign in.');
  } finally {
    busy.value = false;
  }
}

async function submitTotp() {
  busy.value = true;
  error.value = '';
  try {
    await api.owner.verifyTotp(code.value);
    code.value = '';
    await loadDashboard();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to verify this code.');
  } finally {
    busy.value = false;
  }
}

async function logout() {
  await api.owner.logout();
  orders.value = [];
  stage.value = 'password';
}

async function updateOrder(order: OwnerOrder, status: 'CONFIRMED' | 'REJECTED') {
  const rejectionReason =
    status === 'REJECTED' ? window.prompt('Why is this order being rejected?')?.trim() : undefined;
  if (status === 'REJECTED' && !rejectionReason) return;

  busy.value = true;
  error.value = '';
  try {
    await api.owner.updateOrder(order.publicNumber, {status, rejectionReason});
    await loadDashboard();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to update the order.');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="section">
    <div class="container">
      <div v-if="stage === 'loading'" class="success-card">
        <p>Checking secure owner session…</p>
      </div>

      <div v-else-if="stage === 'password' || stage === 'totp'" class="success-card">
        <div class="success-icon"><LockKeyhole/></div>
        <span class="eyebrow">One Bite owner</span>
        <h1>{{ stage === 'password' ? 'Sign in' : 'Verify your authenticator code' }}</h1>
        <p v-if="stage === 'password'">Use the owner account configured for this environment.</p>
        <p v-else>Two-factor authentication is required before opening the dashboard.</p>
        <p v-if="error" class="form-note" role="alert">{{ error }}</p>

        <form v-if="stage === 'password'" class="form-grid" @submit.prevent="submitPassword">
          <label class="span2">
            Email<input v-model="email" type="email" autocomplete="username" required>
          </label>
          <label class="span2">
            Password
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              minlength="12"
              required
            >
          </label>
          <button class="btn primary span2" :disabled="busy">
            {{ busy ? 'Signing in…' : 'Continue' }}
          </button>
        </form>

        <form v-else class="form-grid" @submit.prevent="submitTotp">
          <label class="span2">
            Six-digit authenticator code
            <input
              v-model="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              pattern="[0-9]{6}"
              maxlength="6"
              required
            >
          </label>
          <button class="btn primary span2" :disabled="busy">
            {{ busy ? 'Verifying…' : 'Open dashboard' }}
          </button>
          <button class="btn secondary span2" type="button" :disabled="busy" @click="stage = 'password'">
            Back
          </button>
        </form>
      </div>

      <template v-else>
        <div class="checkout-head">
          <span class="eyebrow">One Bite owner</span>
          <h1>Orders dashboard</h1>
          <p>Signed in as {{ owner }}. Customer details are visible only to the owner.</p>
          <button class="btn secondary" @click="logout"><LogOut :size="17"/> Sign out</button>
        </div>
        <p v-if="error" class="form-note" role="alert">{{ error }}</p>

        <div class="account-panel">
          <h2><Package/> Recent orders</h2>
          <p v-if="!orders.length" class="form-note">No orders have been created yet.</p>

          <div v-for="order in orders" :key="order.publicNumber" class="order-row">
            <span>
              <b>{{ order.publicNumber }}</b>
              <small>
                {{ order.customerName }} · {{ order.customerPhone }} · {{ order.areaName }} ·
                {{ order.deliveryWindow }}
              </small>
            </span>
            <strong>{{ money(order.totalFils / 1000) }}</strong>
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
    </div>
  </section>
</template>
