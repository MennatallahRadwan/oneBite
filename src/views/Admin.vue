<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {CalendarDays, ClipboardList, LockKeyhole, LogOut, Megaphone, Package, Tags, Truck} from 'lucide-vue-next';
import {api} from '../api/client';
import {messageFrom} from '../components/admin/admin-ui';
import OrdersPanel from '../components/admin/OrdersPanel.vue';
import ProductsPanel from '../components/admin/ProductsPanel.vue';
import CategoriesPanel from '../components/admin/CategoriesPanel.vue';
import DeliveryPanel from '../components/admin/DeliveryPanel.vue';
import CapacityPanel from '../components/admin/CapacityPanel.vue';
import MarketingPanel from '../components/admin/MarketingPanel.vue';

const sections = [
  {key: 'orders', label: 'Orders', icon: ClipboardList, component: OrdersPanel},
  {key: 'products', label: 'Products', icon: Package, component: ProductsPanel},
  {key: 'categories', label: 'Categories', icon: Tags, component: CategoriesPanel},
  {key: 'marketing', label: 'Marketing', icon: Megaphone, component: MarketingPanel},
  {key: 'delivery', label: 'Delivery', icon: Truck, component: DeliveryPanel},
  {key: 'capacity', label: 'Capacity', icon: CalendarDays, component: CapacityPanel}
] as const;

const stage = ref<'loading' | 'password' | 'totp' | 'dashboard'>('loading');
const section = ref<(typeof sections)[number]['key']>('orders');
const email = ref('');
const password = ref('');
const code = ref('');
const error = ref('');
const busy = ref(false);
const owner = ref('');

const panel = computed(() => sections.find(tab => tab.key === section.value)!.component);

async function openDashboard() {
  owner.value = (await api.owner.me()).name;
  stage.value = 'dashboard';
}

onMounted(async () => {
  try {
    await openDashboard();
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
    await openDashboard();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to verify this code.');
  } finally {
    busy.value = false;
  }
}

async function logout() {
  await api.owner.logout();
  stage.value = 'password';
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
        <div class="admin-shell">
          <div class="admin-dashboard-head">
            <div>
              <span class="eyebrow">One Bite owner</span>
              <h1>Bakery dashboard</h1>
              <p>Signed in as {{ owner }}. Customer details are visible only to the owner.</p>
            </div>
            <button class="btn secondary admin-logout" @click="logout"><LogOut :size="17"/> Sign out</button>
          </div>

          <nav class="admin-tabs" aria-label="Admin sections">
            <button
              v-for="tab in sections"
              :key="tab.key"
              class="admin-tab"
              :class="{active: section === tab.key}"
              @click="section = tab.key"
            >
              <component :is="tab.icon" :size="16"/>
              <span>{{ tab.label }}</span>
            </button>
          </nav>

          <!-- Keyed on the section so switching tabs mounts a fresh panel, and
               each one loads its own data rather than trusting what a sibling
               fetched earlier. -->
          <component :is="panel" :key="section"/>
        </div>
      </template>
    </div>
  </section>
</template>
