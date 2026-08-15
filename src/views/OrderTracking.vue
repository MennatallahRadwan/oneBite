<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import {Check, ChefHat, Clock3, Home, Truck} from 'lucide-vue-next';
import PageHero from '../components/PageHero.vue';
import {api, type TrackingOrder} from '../api/client';

const route = useRoute();
const order = ref<TrackingOrder | null>(null);
const error = ref('');
const loading = ref(true);

const stages = [
  {key: 'CONFIRMED', label: 'Confirmed', icon: Check},
  {key: 'PREPARING', label: 'Preparing', icon: ChefHat},
  {key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: Truck},
  {key: 'DELIVERED', label: 'Delivered', icon: Home}
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
  if (current.status === 'PENDING_CONFIRMATION') return 'Awaiting bakery confirmation';
  if (current.status === 'REJECTED') return 'This order request was not accepted';
  if (current.status === 'CANCELLED') return 'This order has been cancelled';
  return current.fulfilmentStatus.replace(/_/g, ' ').toLowerCase();
});

onMounted(async () => {
  try {
    order.value = await api.tracking(String(route.params.id));
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to load this tracking record.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <PageHero
    :eyebrow="order ? `Order ${order.publicNumber}` : 'Order tracking'"
    title="Track Your Order"
    :subtitle="loading ? 'Loading your order…' : statusText"
  />

  <section class="section">
    <div class="container track-card">
      <p v-if="error" class="form-note" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="form-note">Loading tracking details…</p>

      <template v-else-if="order">
        <div v-if="order.status === 'PENDING_CONFIRMATION'" class="availability-notice">
          <Clock3/> Your selected capacity is reserved while the bakery reviews this request.
        </div>
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
              <b>{{ stage.label }}</b>
              <small>
                {{ index === currentStage ? 'Current status' : index < currentStage ? 'Complete' : 'Upcoming' }}
              </small>
            </span>
          </div>
        </div>

        <p v-if="order.isDelayed" class="form-note">
          Delay notice: {{ order.delayReason || 'Please contact the bakery for an update.' }}
        </p>

        <div class="tracking-grid">
          <div>
            <h2>Delivery area</h2>
            <p><b>{{ order.areaName }}</b><br>Address details remain private.</p>
          </div>
          <div>
            <h2>Delivery window</h2>
            <p><b>{{ order.deliveryWindow }}</b><br>Cash on delivery</p>
          </div>
          <div>
            <h2>Need Help?</h2>
            <p>Our team is ready to help with your order.</p>
            <RouterLink to="/contact">Contact support →</RouterLink>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
