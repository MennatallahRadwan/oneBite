<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {PackageSearch} from 'lucide-vue-next';
import PageHero from '../components/PageHero.vue';
import TrackingStatus from '../components/TrackingStatus.vue';
import {api, type TrackingOrder} from '../api/client';
import {t} from '../i18n';
import {errorMessage} from '../i18n/errors';

const route = useRoute();
const router = useRouter();
const orderNumber = ref('');
const order = ref<TrackingOrder | null>(null);
const error = ref('');
const loading = ref(false);
const refreshedAt = ref<Date | null>(null);
let poll: number | undefined;

const normalizedOrderNumber = computed(() => orderNumber.value.trim().toUpperCase());

async function load(publicNumber = normalizedOrderNumber.value, {quiet = false} = {}) {
  if (!publicNumber) return;
  if (!quiet) loading.value = true;
  error.value = '';
  try {
    order.value = await api.trackingByNumber(publicNumber);
    orderNumber.value = order.value.publicNumber;
    refreshedAt.value = new Date();
  } catch (reason) {
    order.value = null;
    error.value = errorMessage(reason, 'track.notFound');
  } finally {
    loading.value = false;
  }
}

function startPolling() {
  if (poll) window.clearInterval(poll);
  poll = window.setInterval(() => {
    if (order.value) load(order.value.publicNumber, {quiet: true});
  }, 15000);
}

onMounted(() => {
  const initial = typeof route.query.order === 'string' ? route.query.order.trim() : '';
  if (initial) {
    orderNumber.value = initial;
    load(initial);
  }
  startPolling();
});

onBeforeUnmount(() => {
  if (poll) window.clearInterval(poll);
});

watch(
  () => route.query.order,
  value => {
    if (typeof value === 'string' && value.trim() && value.trim() !== order.value?.publicNumber) {
      orderNumber.value = value;
      load(value);
    }
  }
);

async function lookup() {
  if (!normalizedOrderNumber.value) {
    error.value = t('track.missing');
    return;
  }

  await router.replace({query: {...route.query, order: normalizedOrderNumber.value}});
  await load(normalizedOrderNumber.value);
}
</script>

<template>
  <PageHero
    :eyebrow="t('tracking.eyebrow')"
    :title="t('track.title')"
    :subtitle="t('track.subtitle')"
  />

  <section class="section">
    <div class="container track-card">
      <p v-if="error" class="form-note" role="alert">{{ error }}</p>

      <form class="form-grid" @submit.prevent="lookup">
        <label class="span2">
          {{ t('track.orderNumber') }}
          <input
            v-model="orderNumber"
            dir="ltr"
            :placeholder="t('track.orderPlaceholder')"
            autocomplete="off"
            required
          >
        </label>
        <button class="btn primary span2" :disabled="loading">
          <PackageSearch :size="17"/> {{ loading ? t('track.searching') : t('track.submit') }}
        </button>
      </form>

      <p class="form-note">{{ t('track.hint') }}</p>

      <p v-if="loading && !order" class="form-note">{{ t('tracking.loadingDetails') }}</p>
      <TrackingStatus v-if="order" :order="order" :refreshed-at="refreshedAt"/>
    </div>
  </section>
</template>
