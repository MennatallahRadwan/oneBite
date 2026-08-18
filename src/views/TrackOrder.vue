<script setup lang="ts">
import {ref} from 'vue';
import {useRouter} from 'vue-router';
import {PackageSearch} from 'lucide-vue-next';
import PageHero from '../components/PageHero.vue';
import {api} from '../api/client';
import {localePath, t} from '../i18n';

const router = useRouter();
const orderNumber = ref('');
const phone = ref('');
const error = ref('');
const loading = ref(false);

async function lookup() {
  if (!orderNumber.value.trim() || !phone.value.trim()) {
    error.value = t('track.missing');
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const {trackingToken} = await api.trackingLookup(orderNumber.value.trim(), phone.value.trim());
    router.replace(localePath(`/order/${trackingToken}`));
  } catch {
    // The API answers a wrong order number and a wrong phone identically, so
    // this message stays generic and never confirms the number exists.
    error.value = t('track.notFound');
  } finally {
    loading.value = false;
  }
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
        <label class="span2">
          {{ t('track.phone') }}
          <input
            v-model="phone"
            dir="ltr"
            :placeholder="t('checkout.field.phonePlaceholder')"
            autocomplete="tel"
            required
          >
        </label>
        <button class="btn primary span2" :disabled="loading">
          <PackageSearch :size="17"/> {{ loading ? t('track.searching') : t('track.submit') }}
        </button>
      </form>

      <p class="form-note">{{ t('track.hint') }}</p>
    </div>
  </section>
</template>
