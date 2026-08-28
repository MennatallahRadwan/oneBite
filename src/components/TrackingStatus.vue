<script setup lang="ts">
import {computed} from 'vue';
import {Check, ChefHat, Clock3, Home, PackageCheck, Truck} from 'lucide-vue-next';
import type {TrackingOrder} from '../api/client';
import {t, type MessageKey} from '../i18n';
import AppLink from './AppLink.vue';

const props = defineProps<{
  order: TrackingOrder;
  cancellable?: boolean;
  cancelling?: boolean;
  refreshedAt?: Date | null;
}>();

defineEmits<{cancel: []}>();

const stages = [
  {key: 'CONFIRMED', icon: Check},
  {key: 'PREPARING', icon: ChefHat},
  {key: 'READY', icon: PackageCheck},
  {key: 'OUT_FOR_DELIVERY', icon: Truck},
  {key: 'DELIVERED', icon: Home}
] as const;

const currentStage = computed(() => {
  if (props.order.status !== 'CONFIRMED') return -1;
  if (props.order.fulfilmentStatus === 'DELIVERY_ISSUE') return 3;
  const index = stages.findIndex(stage => stage.key === props.order.fulfilmentStatus);
  return Math.max(0, index);
});

const statusText = computed(() => {
  if (props.order.status === 'PENDING_CONFIRMATION') return t('tracking.status.pending');
  if (props.order.status === 'REJECTED') return t('tracking.status.rejected');
  if (props.order.status === 'CANCELLED') return t('tracking.status.cancelled');
  return t(`tracking.fulfilment.${props.order.fulfilmentStatus}` as MessageKey);
});

const stageNote = (index: number) => {
  if (index === currentStage.value) return t('tracking.stage.current');
  return index < currentStage.value ? t('tracking.stage.complete') : t('tracking.stage.upcoming');
};

const refreshedLabel = computed(() => {
  if (!props.refreshedAt) return '';
  return props.refreshedAt.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
});
</script>

<template>
  <div class="tracking-summary">
    <div>
      <span class="eyebrow">{{ t('tracking.orderEyebrow', {number: order.publicNumber}) }}</span>
      <h2>{{ statusText }}</h2>
      <p v-if="refreshedLabel" class="form-note">
        {{ t('tracking.refreshed', {time: refreshedLabel}) }}
      </p>
    </div>
    <button
      v-if="cancellable && order.status === 'PENDING_CONFIRMATION'"
      class="btn secondary"
      :disabled="cancelling"
      @click="$emit('cancel')"
    >
      {{ cancelling ? t('tracking.cancelWait') : t('tracking.cancel') }}
    </button>
  </div>

  <div v-if="order.status === 'PENDING_CONFIRMATION'" class="availability-notice">
    <Clock3/> {{ t('tracking.pendingNotice') }}
  </div>
  <div v-else-if="order.status === 'REJECTED' || order.status === 'CANCELLED'" class="availability-notice">
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
      <p><b><bdi>{{ order.deliveryWindow }}</bdi></b><br>{{ t('tracking.codStatus', {status: t(`tracking.cod.${order.codStatus}` as MessageKey)}) }}</p>
    </div>
    <div>
      <h2>{{ t('tracking.help') }}</h2>
      <p>{{ t('tracking.helpBlurb') }}</p>
      <AppLink to="/contact">{{ t('tracking.helpLink') }}</AppLink>
    </div>
  </div>
</template>
