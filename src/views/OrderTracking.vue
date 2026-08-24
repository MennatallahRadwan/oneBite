<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import {Check, ChefHat, Clock3, Home, Truck} from 'lucide-vue-next';
import PageHero from '../components/PageHero.vue';
import {api, type TrackingOrder} from '../api/client';
import AppLink from '../components/AppLink.vue';
import {t, type MessageKey} from '../i18n';
import {errorMessage} from '../i18n/errors';

const route = useRoute();
const order = ref<TrackingOrder | null>(null);
const error = ref('');
const loading = ref(true);
const cancelling = ref(false);

const stages = [
  {key: 'CONFIRMED', icon: Check},
  {key: 'PREPARING', icon: ChefHat},
  {key: 'OUT_FOR_DELIVERY', icon: Truck},
  {key: 'DELIVERED', icon: Home}
];

const currentStage = computed(() => {
  const current = order.value;
  if (!current) return -1;
  if (current.status !== 'CONFIRMED') return -1;
  return Math.max(0, stages.findIndex(stage => stage.key === current.fulfilmentStatus));
});

const statusText = computed(() => {
  const current = order.value;
  if (!current) return '';
  if (current.status === 'PENDING_CONFIRMATION') return t('tracking.status.pending');
  if (current.status === 'REJECTED') return t('tracking.status.rejected');
  if (current.status === 'CANCELLED') return t('tracking.status.cancelled');
  return t(`tracking.fulfilment.${current.fulfilmentStatus}` as MessageKey);
});

const stageNote = (index: number) => {
  if (index === currentStage.value) return t('tracking.stage.current');
  return index < currentStage.value ? t('tracking.stage.complete') : t('tracking.stage.upcoming');
};

onMounted(async () => {
  try {
    order.value = await api.tracking(String(route.params.id));
  } catch (reason) {
    error.value = errorMessage(reason, 'error.notFound');
  } finally {
    loading.value = false;
  }
});

async function cancelOrder() {
  if (!window.confirm(t('tracking.cancelConfirm'))) return;
  cancelling.value = true;
  error.value = '';
  try {
    await api.cancelOrder(String(route.params.id));
    order.value = await api.tracking(String(route.params.id));
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
    :subtitle="loading ? t('tracking.loadingOrder') : statusText"
  />

  <section class="section">
    <div class="container track-card">
      <p v-if="error" class="form-note" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="form-note">{{ t('tracking.loadingDetails') }}</p>

      <template v-else-if="order">
        <div v-if="order.status === 'PENDING_CONFIRMATION'" class="availability-notice">
          <Clock3/> {{ t('tracking.pendingNotice') }}
        </div>
        <button
          v-if="order.status === 'PENDING_CONFIRMATION'"
          class="btn secondary"
          :disabled="cancelling"
          @click="cancelOrder"
        >
          {{ cancelling ? t('tracking.cancelWait') : t('tracking.cancel') }}
        </button>
        <div
          v-else-if="order.status === 'REJECTED' || order.status === 'CANCELLED'"
          class="availability-notice"
        >
          {{ statusText }}.
        </div>

        <div v-else class="order-status">
          <div class="status-line">
            <template v-for="(stage, index) in stages" :key="stage.key">
              <i v-if="index"></i>
              <span :class="{complete: index < currentStage, active: index === currentStage}">
                <component :is="stage.icon"/>
              </span>
            </template>
          </div>
          <div class="status-labels">
            <span v-for="(stage, index) in stages" :key="stage.key">
              <b>{{ t(`tracking.stage.${stage.key}` as MessageKey) }}</b>
              <small>{{ stageNote(index) }}</small>
            </span>
          </div>
        </div>

        <p v-if="order.isDelayed" class="form-note">
          {{ t('tracking.delay', {reason: order.delayReason || t('tracking.delayDefault')}) }}
        </p>

        <div class="tracking-grid">
          <div>
            <h2>{{ t('tracking.area') }}</h2>
            <p><b>{{ order.areaName }}</b><br>{{ t('tracking.areaPrivate') }}</p>
          </div>
          <div>
            <h2>{{ t('tracking.window') }}</h2>
            <p><b><bdi>{{ order.deliveryWindow }}</bdi></b><br>{{ t('tracking.cod') }}</p>
          </div>
          <div>
            <h2>{{ t('tracking.help') }}</h2>
            <p>{{ t('tracking.helpBlurb') }}</p>
            <AppLink to="/contact">{{ t('tracking.helpLink') }}</AppLink>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
