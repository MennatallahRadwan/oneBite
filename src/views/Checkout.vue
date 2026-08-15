<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {useRouter} from 'vue-router';
import {ArrowLeft, ArrowRight, Check, Clock, Gift, MapPin, Wallet} from 'lucide-vue-next';
import {money} from '../data';
import {api, type DeliveryArea, type Quote, type Slot} from '../api/client';
import {useShopStore} from '../stores/shop';

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

const governorates = ['Capital', 'Hawalli', 'Farwaniya', 'Mubarak Al-Kabeer', 'Ahmadi', 'Jahra'];
const stepLabels = ['Delivery', 'Schedule', 'Gift details'];

onMounted(async () => {
  try {
    areas.value = (await api.deliveryAreas()).items;
  } catch {
    error.value = 'Unable to load delivery areas. Please refresh and try again.';
  }
});

// Before a quote exists the fee comes from the selected area, so the customer
// sees what delivery costs without having to complete the whole form first.
const selectedArea = computed(() => areas.value.find(area => area.nameEn === form.value.area));

const cartLines = computed(() => store.cart.map(({product, quantity}) => ({slug: product.id, quantity})));
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
  new Intl.DateTimeFormat('en-KW', {weekday: 'short', day: 'numeric', month: 'short'}).format(
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

const messageFrom = (reason: unknown, fallback: string) =>
  reason instanceof Error ? reason.message : fallback;

async function getQuote() {
  if (!requiredAddress()) {
    error.value = 'Please complete the required delivery details.';
    return;
  }
  if (!cartLines.value.length) {
    error.value = 'Your cart is empty.';
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
    error.value = messageFrom(reason, 'Unable to check availability.');
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
        phone: form.value.phone
      },
      address: {
        governorate: form.value.governorate,
        area: form.value.area,
        block: form.value.block,
        street: form.value.street,
        building: form.value.building,
        floor: form.value.floor,
        instructions: form.value.instructions
      }
    });
    store.clear();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to create your order request.');
  } finally {
    loading.value = false;
  }
}

async function next() {
  error.value = '';

  if (step.value === 0) return getQuote();

  if (step.value === 1) {
    if (!selectedSlot.value) {
      error.value = 'Please select an available delivery window.';
      return;
    }
    step.value = 2;
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
        <span class="eyebrow">Order request received</span>
        <h1>Awaiting bakery confirmation</h1>
        <p>
          Your request <b>{{ created.orderNumber }}</b> is holding its selected capacity while the
          bakery reviews it.
        </p>
        <button class="btn primary" @click="router.push(`/order/${created!.trackingToken}`)">
          Track your order
        </button>
        <p class="form-note">
          Save this link. If you lose it you can find your order again from
          <RouterLink to="/track">order tracking</RouterLink> using your order number and phone
          number.
        </p>
      </div>

      <template v-else>
        <div class="checkout-head">
          <span class="eyebrow">Checkout</span>
          <h1>Reserve your delivery request</h1>
          <p>Cash on delivery. Final confirmation is always handled by the bakery.</p>
        </div>

        <div class="steps">
          <span
            v-for="(label, index) in stepLabels"
            :key="label"
            :class="{active: index === step, done: index < step}"
          >
            <b>{{ index < step ? '✓' : index + 1 }}</b>{{ label }}
          </span>
        </div>

        <div class="checkout-layout">
          <div class="checkout-form">
            <p v-if="error" class="form-note" role="alert">{{ error }}</p>

            <section v-if="step === 0">
              <h2><MapPin/> Delivery details</h2>
              <p class="form-note">Choose your area to see the delivery fee and available windows.</p>
              <div class="form-grid">
                <label>First name<input v-model="form.first" placeholder="First name"></label>
                <label>Last name<input v-model="form.last" placeholder="Last name"></label>
                <label class="span2">
                  Kuwait phone<input v-model="form.phone" placeholder="+965 9XXX XXXX">
                </label>
                <label>
                  Governorate
                  <select v-model="form.governorate">
                    <option disabled value="">Choose governorate</option>
                    <option v-for="name in governorates" :key="name">{{ name }}</option>
                  </select>
                </label>
                <label>
                  Delivery area
                  <select v-model="form.area">
                    <option disabled value="">Choose area</option>
                    <option v-for="area in areas" :key="area.nameEn" :value="area.nameEn">
                      {{ area.nameEn }} · {{ money(area.feeFils / 1000) }}
                    </option>
                  </select>
                </label>
                <label>Block<input v-model="form.block"></label>
                <label>Street<input v-model="form.street"></label>
                <label>Building<input v-model="form.building"></label>
                <label>Floor / apartment <small>(if applicable)</small><input v-model="form.floor"></label>
                <label class="span2">
                  Delivery instructions
                  <textarea
                    v-model="form.instructions"
                    placeholder="Written directions, gate code, or a preferred call time"
                  ></textarea>
                </label>
              </div>
            </section>

            <section v-else-if="step === 1">
              <h2><Clock/> Delivery schedule</h2>
              <div class="availability-notice">
                Availability below is calculated from current production and delivery capacity.
              </div>
              <h3>Select an available date</h3>
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
              <h3>Select a delivery window</h3>
              <div class="choice-grid">
                <button
                  v-for="slot in slots"
                  :key="slot.window"
                  :class="{selected: form.slot === slot.window}"
                  @click="form.slot = slot.window"
                >
                  {{ slot.window }}
                </button>
              </div>
            </section>

            <section v-else>
              <h2><Gift/> Gift details</h2>
              <label class="toggle-card">
                <input v-model="form.gift" type="checkbox">
                <span>
                  <b>This is a gift</b>
                  <small>Gift details are not yet sent to the bakery.</small>
                </span>
              </label>
              <div class="cod-notice">
                <Wallet/>
                <span>
                  <b>Cash on delivery</b>
                  <small>
                    Payment is collected by the driver after delivery. No cards or online payment
                    methods are accepted.
                  </small>
                </span>
              </div>
            </section>

            <div class="checkout-actions">
              <button class="btn secondary" :disabled="step === 0 || loading" @click="step--">
                <ArrowLeft :size="17"/> Back
              </button>
              <button class="btn primary" :disabled="loading" @click="next">
                {{ loading ? 'Please wait…' : step === 2 ? 'Submit order request' : 'Continue' }}
                <ArrowRight v-if="!loading" :size="17"/>
              </button>
            </div>
          </div>

          <aside class="summary">
            <h2>Your Order</h2>
            <div v-for="item in store.cart" :key="item.product.id" class="mini-order">
              <img :src="item.product.image" alt="">
              <span>
                <b>{{ item.product.name }}</b>
                <small>Qty {{ item.quantity }}</small>
              </span>
              <strong>{{ money(item.product.price * item.quantity) }}</strong>
            </div>
            <div>
              <span>Subtotal</span>
              <b>{{ quote ? money(quote.subtotalFils / 1000) : money(store.cartTotal) }}</b>
            </div>
            <div>
              <span>Area delivery fee</span>
              <b>{{ deliveryFee === null ? 'Select area' : money(deliveryFee) }}</b>
            </div>
            <div class="total"><span>Total</span><b>{{ money(total) }}</b></div>
            <p>Final price and availability are verified before your reservation is created.</p>
          </aside>
        </div>
      </template>
    </div>
  </section>
</template>
