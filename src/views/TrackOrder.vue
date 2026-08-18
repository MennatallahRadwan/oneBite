<script setup lang="ts">
import {ref} from 'vue';
import {useRouter} from 'vue-router';
import {PackageSearch} from 'lucide-vue-next';
import PageHero from '../components/PageHero.vue';
import {api} from '../api/client';
import {localePath} from '../i18n';

const router = useRouter();
const orderNumber = ref('');
const phone = ref('');
const error = ref('');
const loading = ref(false);

// The API answers a wrong order number and a wrong phone identically, so the
// message here stays generic and never confirms whether the number exists.
const notFound = 'We could not find an order matching that number and phone number.';

async function lookup() {
  if (!orderNumber.value.trim() || !phone.value.trim()) {
    error.value = 'Please enter both your order number and the phone number used at checkout.';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const {trackingToken} = await api.trackingLookup(orderNumber.value.trim(), phone.value.trim());
    router.replace(localePath(`/order/${trackingToken}`));
  } catch {
    error.value = notFound;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <PageHero
    eyebrow="Order tracking"
    title="Find Your Order"
    subtitle="Enter your order number and the phone number you used at checkout."
  />

  <section class="section">
    <div class="container track-card">
      <p v-if="error" class="form-note" role="alert">{{ error }}</p>

      <form class="form-grid" @submit.prevent="lookup">
        <label class="span2">
          Order number
          <input v-model="orderNumber" placeholder="OB-XXXXXXXX" autocomplete="off" required>
        </label>
        <label class="span2">
          Kuwait phone
          <input v-model="phone" placeholder="+965 9XXX XXXX" autocomplete="tel" required>
        </label>
        <button class="btn primary span2" :disabled="loading">
          <PackageSearch :size="17"/> {{ loading ? 'Looking up…' : 'Find my order' }}
        </button>
      </form>

      <p class="form-note">
        Keep the tracking link from your confirmation screen — it opens your order directly without
        this step.
      </p>
    </div>
  </section>
</template>
