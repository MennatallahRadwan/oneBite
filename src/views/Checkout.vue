<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {useRouter} from 'vue-router';
import {ArrowLeft, ArrowRight, Check, Clock, Gift, MapPin, Wallet} from 'lucide-vue-next';
import {money, num} from '../data';
import {api, type DeliveryArea, type Quote, type Slot} from '../api/client';
import {useShopStore} from '../stores/shop';
import {localePath, locale, t, type MessageKey} from '../i18n';
import {errorMessage} from '../i18n/errors';
import AppLink from '../components/AppLink.vue';

const router = useRouter();
const store = useShopStore();

const areas = ref<DeliveryArea[]>([]);
const step = ref(0);
const loading = ref(false);
const error = ref('');
const quote = ref<Quote | null>(null);
const created = ref<{orderNumber: string; trackingToken: string} | null>(null);

const form = ref({
  first: '',
  last: '',
  phone: '',
  email: '',
  governorate: '',
  area: '',
  block: '',
  street: '',
  building: '',
  floor: '',
  instructions: '',
  date: '',
  slot: '',
  gift: false,
  recipient: '',
  recipientPhone: '',
  message: '',
  anonymous: false
});

// Values stay English because the server stores the governorate verbatim on
// the order; only the label shown to the customer is translated.
const governorates = ['Capital', 'Hawalli', 'Farwaniya', 'Mubarak Al-Kabeer', 'Ahmadi', 'Jahra'];
const stepLabels = computed(() => [
  t('checkout.step.delivery'),
  t('checkout.step.schedule'),
  t('checkout.step.gift')
]);

onMounted(async () => {
  try {
    areas.value = (await api.deliveryAreas()).items;
  } catch {
    error.value = t('error.areas');
  }
});

// The sentence wraps a link, so it is split around its {link} placeholder
// rather than being assembled from fragments — Arabic puts the link elsewhere
// in the sentence than English does.
const saveLinkParts = computed(() => t('checkout.saveLink').split('{link}'));

// Before a quote exists the fee comes from the selected area, so the customer
// sees what delivery costs without having to complete the whole form first.
const selectedArea = computed(() => areas.value.find(area => area.nameEn === form.value.area));

const cartLines = computed(() =>
  store.cart.map(item => ({
    slug: item.slug,
    quantity: item.quantity,
    variantId: item.variantId,
    addonIds: item.addonIds,
    cakeText: item.cakeText
  }))
);
const deliveryFee = computed(() => {
  const fils = quote.value?.deliveryFeeFils ?? selectedArea.value?.feeFils;
  return fils === undefined ? null : fils / 1000;
});
const total = computed(() =>
  quote.value ? quote.value.totalFils / 1000 : store.cartTotal + (deliveryFee.value || 0)
);
const dates = computed(() => [...new Set((quote.value?.availableSlots || []).map(slot => slot.date))]);
const slots = computed(
  () => quote.value?.availableSlots.filter(slot => slot.date === form.value.date) || []
);
const selectedSlot = computed<Slot | null>(
  () => slots.value.find(slot => slot.window === form.value.slot) || null
);

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat(locale.value === 'ar' ? 'ar-KW' : 'en-KW', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(
    new Date(`${date}T12:00:00Z`)
  );

const requiredAddress = () =>
  form.value.first.trim() &&
  form.value.last.trim() &&
  form.value.phone.trim() &&
  form.value.governorate &&
  form.value.area &&
  form.value.block &&
  form.value.street &&
  form.value.building;

async function getQuote() {
  if (!requiredAddress()) {
    error.value = t('checkout.error.address');
    return;
  }
  if (!cartLines.value.length) {
    error.value = t('checkout.error.emptyCart');
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    quote.value = await api.quote(cartLines.value, form.value.area);
    const earliest = quote.value.earliestSlot;
    if (earliest) {
      form.value.date = earliest.date;
      form.value.slot = earliest.window;
    }
    step.value = 1;
  } catch (reason) {
    error.value = errorMessage(reason, 'error.availability');
  } finally {
    loading.value = false;
  }
}

async function submitOrder() {
  if (!quote.value || !selectedSlot.value) return;

  loading.value = true;
  try {
    created.value = await api.createOrder({
      quoteId: quote.value.quoteId,
      selectedSlot: selectedSlot.value,
      customer: {
        name: `${form.value.first} ${form.value.last}`.trim(),
        phone: form.value.phone,
        email: form.value.email.trim() || undefined
      },
      address: {
        governorate: form.value.governorate,
        area: form.value.area,
        block: form.value.block,
        street: form.value.street,
        building: form.value.building,
        floor: form.value.floor,
        instructions: form.value.instructions
      },
      gift: {
        isGift: form.value.gift,
        recipientName: form.value.recipient.trim() || undefined,
        recipientPhone: form.value.recipientPhone.trim() || undefined,
        message: form.value.message.trim() || undefined,
        anonymous: form.value.anonymous
      }
    });
    store.rememberOrder({
      orderNumber: created.value.orderNumber,
      trackingToken: created.value.trackingToken,
      placedAt: new Date().toISOString(),
      totalFils: quote.value.totalFils
    });
    store.clear();
  } catch (reason) {
    error.value = errorMessage(reason, 'error.order');
  } finally {
    loading.value = false;
  }
}

async function next() {
  error.value = '';

  if (step.value === 0) return getQuote();

  if (step.value === 1) {
    if (!selectedSlot.value) {
      error.value = t('checkout.error.slot');
      return;
    }
    step.value = 2;
    return;
  }

  if (form.value.gift && (!form.value.recipient.trim() || !form.value.recipientPhone.trim())) {
    error.value = t('checkout.error.gift');
    return;
  }

  return submitOrder();
}
</script>

<template>
  <section class="section checkout-page">
    <div class="container">
      <div v-if="created" class="success-card">
        <div class="success-icon"><Check/></div>
        <span class="eyebrow">{{ t('checkout.received') }}</span>
        <h1>{{ t('checkout.awaiting') }}</h1>
        <p>{{ t('checkout.holding', {number: created.orderNumber}) }}</p>
        <button class="btn primary" @click="router.push(localePath(`/order/${created!.trackingToken}`))">
          {{ t('checkout.track') }}
        </button>
        <p class="form-note">
          {{ saveLinkParts[0] }}<AppLink to="/track">{{ t('checkout.saveLinkTarget') }}</AppLink>{{ saveLinkParts[1] }}
        </p>
      </div>

      <template v-else>
        <div class="checkout-head">
          <span class="eyebrow">{{ t('checkout.eyebrow') }}</span>
          <h1>{{ t('checkout.title') }}</h1>
          <p>{{ t('checkout.subtitle') }}</p>
        </div>

        <div class="steps">
          <span
            v-for="(label, index) in stepLabels"
            :key="label"
            :class="{active: index === step, done: index < step}"
          >
            <b>{{ index < step ? '✓' : num(index + 1) }}</b>{{ label }}
          </span>
        </div>

        <div class="checkout-layout">
          <div class="checkout-form">
            <p v-if="error" class="form-note" role="alert">{{ error }}</p>

            <section v-if="step === 0">
              <h2><MapPin/> {{ t('checkout.delivery.title') }}</h2>
              <p class="form-note">{{ t('checkout.delivery.blurb') }}</p>
              <div class="form-grid">
                <label>{{ t('checkout.field.first') }}<input v-model="form.first"></label>
                <label>{{ t('checkout.field.last') }}<input v-model="form.last"></label>
                <label class="span2">
                  {{ t('checkout.field.phone') }}
                  <input v-model="form.phone" dir="ltr" :placeholder="t('checkout.field.phonePlaceholder')">
                </label>
                <label class="span2">
                  {{ t('checkout.field.email') }} <small>{{ t('checkout.field.emailHint') }}</small>
                  <input v-model="form.email" type="email" autocomplete="email">
                </label>
                <label>
                  {{ t('checkout.field.governorate') }}
                  <select v-model="form.governorate">
                    <option disabled value="">{{ t('checkout.field.governoratePlaceholder') }}</option>
                    <option v-for="name in governorates" :key="name" :value="name">{{ t((`governorate.${name}`) as MessageKey) }}</option>
                  </select>
                </label>
                <label>
                  {{ t('checkout.field.area') }}
                  <select v-model="form.area">
                    <option disabled value="">{{ t('checkout.field.areaPlaceholder') }}</option>
                    <option v-for="area in areas" :key="area.nameEn" :value="area.nameEn">
                      {{ locale === 'ar' ? area.nameAr : area.nameEn }} · {{ money(area.feeFils / 1000) }}
                    </option>
                  </select>
                </label>
                <label>{{ t('checkout.field.block') }}<input v-model="form.block"></label>
                <label>{{ t('checkout.field.street') }}<input v-model="form.street"></label>
                <label>{{ t('checkout.field.building') }}<input v-model="form.building"></label>
                <label>
                  {{ t('checkout.field.floor') }} <small>{{ t('checkout.field.floorHint') }}</small>
                  <input v-model="form.floor">
                </label>
                <label class="span2">
                  {{ t('checkout.field.instructions') }}
                  <textarea
                    v-model="form.instructions"
                    :placeholder="t('checkout.field.instructionsPlaceholder')"
                  ></textarea>
                </label>
              </div>
            </section>

            <section v-else-if="step === 1">
              <h2><Clock/> {{ t('checkout.schedule.title') }}</h2>
              <div class="availability-notice">
                {{ t('checkout.schedule.notice') }}
              </div>
              <h3>{{ t('checkout.schedule.pickDate') }}</h3>
              <div class="choice-grid">
                <button
                  v-for="date in dates"
                  :key="date"
                  :class="{selected: form.date === date}"
                  @click="form.date = date; form.slot = ''"
                >
                  {{ dateLabel(date) }}
                </button>
              </div>
              <h3>{{ t('checkout.schedule.pickWindow') }}</h3>
              <div class="choice-grid">
                <button
                  v-for="slot in slots"
                  :key="slot.window"
                  :class="{selected: form.slot === slot.window}"
                  @click="form.slot = slot.window"
                >
                  <bdi>{{ slot.window }}</bdi>
                </button>
              </div>
            </section>

            <section v-else>
              <h2><Gift/> {{ t('checkout.gift.title') }}</h2>
              <label class="toggle-card">
                <input v-model="form.gift" type="checkbox">
                <span>
                  <b>{{ t('checkout.gift.toggle') }}</b>
                  <small>{{ t('checkout.gift.notice') }}</small>
                </span>
              </label>
              <div v-if="form.gift" class="form-grid gift-fields">
                <label>{{ t('checkout.gift.recipient') }}<input v-model="form.recipient"></label>
                <label>
                  {{ t('checkout.gift.recipientPhone') }}
                  <input v-model="form.recipientPhone" dir="ltr">
                </label>
                <label class="span2">
                  {{ t('checkout.gift.message') }}
                  <textarea v-model="form.message" :maxlength="500"></textarea>
                </label>
                <label class="span2 toggle-line">
                  <input v-model="form.anonymous" type="checkbox">
                  {{ t('checkout.gift.anonymous') }}
                </label>
              </div>
              <div class="cod-notice">
                <Wallet/>
                <span>
                  <b>{{ t('checkout.cod.title') }}</b>
                  <small>{{ t('checkout.cod.blurb') }}</small>
                </span>
              </div>
            </section>

            <div class="checkout-actions">
              <button class="btn secondary" :disabled="step === 0 || loading" @click="step--">
                <ArrowLeft class="dir-icon" :size="17"/> {{ t('checkout.back') }}
              </button>
              <button class="btn primary" :disabled="loading" @click="next">
                {{ loading ? t('checkout.wait') : step === 2 ? t('checkout.submit') : t('checkout.continue') }}
                <ArrowRight v-if="!loading" class="dir-icon" :size="17"/>
              </button>
            </div>
          </div>

          <aside class="summary">
            <h2>{{ t('checkout.summary') }}</h2>
            <div v-for="item in store.cart" :key="item.lineId" class="mini-order">
              <img :src="item.image" alt="">
              <span>
                <b>{{ item.name }}</b>
                <small>{{ [item.variantName, ...item.addonNames].filter(Boolean).join(' · ') }}</small>
                <small v-if="item.cakeText">{{ t('cart.message', {text: item.cakeText}) }}</small>
                <small>{{ t('cart.quantity', {count: item.quantity}) }}</small>
              </span>
              <strong>{{ money(item.unitPrice * item.quantity) }}</strong>
            </div>
            <div>
              <span>{{ t('cart.subtotal') }}</span>
              <b>{{ quote ? money(quote.subtotalFils / 1000) : money(store.cartTotal) }}</b>
            </div>
            <div>
              <span>{{ t('checkout.areaFee') }}</span>
              <b>{{ deliveryFee === null ? t('checkout.selectArea') : money(deliveryFee) }}</b>
            </div>
            <div class="total"><span>{{ t('cart.total') }}</span><b>{{ money(total) }}</b></div>
            <p>{{ t('checkout.verifyNote') }}</p>
          </aside>
        </div>
      </template>
    </div>
  </section>
</template>
