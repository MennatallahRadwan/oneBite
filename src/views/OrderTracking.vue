<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import PageHero from '../components/PageHero.vue';
import TrackingStatus from '../components/TrackingStatus.vue';
import {api, type TrackingOrder} from '../api/client';
import {t} from '../i18n';
import {errorMessage} from '../i18n/errors';

const route = useRoute();
const order = ref<TrackingOrder | null>(null);
const error = ref('');
const loading = ref(true);
const cancelling = ref(false);
const refreshedAt = ref<Date | null>(null);
let poll: number | undefined;

const token = computed(() => String(route.params.id || ''));

async function load({quiet = false} = {}) {
  if (!quiet) loading.value = true;
  error.value = '';
  try {
    order.value = await api.tracking(token.value);
    refreshedAt.value = new Date();
  } catch (reason) {
    error.value = errorMessage(reason, 'error.notFound');
    if (!quiet) order.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  load();
  poll = window.setInterval(() => load({quiet: true}), 15000);
});

onBeforeUnmount(() => {
  if (poll) window.clearInterval(poll);
});

async function cancelOrder() {
  if (!window.confirm(t('tracking.cancelConfirm'))) return;
  cancelling.value = true;
  error.value = '';
  try {
    await api.cancelOrder(token.value);
    await load({quiet: true});
  } catch (reason) {
    error.value = errorMessage(reason, 'error.order');
  } finally {
    cancelling.value = false;
  }
}
</script>

<template>
  <PageHero
    :eyebrow="order ? t('tracking.orderEyebrow', {number: order.publicNumber}) : t('tracking.eyebrow')"
    :title="t('tracking.title')"
    :subtitle="loading ? t('tracking.loadingOrder') : order ? t('tracking.liveSubtitle') : ''"
  />

  <section class="section">
    <div class="container track-card">
      <p v-if="error" class="form-note" role="alert">{{ error }}</p>
      <p v-if="loading && !order" class="form-note">{{ t('tracking.loadingDetails') }}</p>

      <TrackingStatus
        v-if="order"
        :order="order"
        :cancellable="true"
        :cancelling="cancelling"
        :refreshed-at="refreshedAt"
        @cancel="cancelOrder"
      />
    </div>
  </section>
</template>
