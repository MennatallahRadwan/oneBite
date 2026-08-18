<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {Archive, Cake, Plus, RotateCcw, Save, X} from 'lucide-vue-next';
import {
  api,
  type AdminCategory,
  type AdminOption,
  type AdminProduct,
  type AdminVariant
} from '../../api/client';
import {messageFrom, money, slugify, splitList, toFils, toKwd} from './admin-ui';

type Draft = {
  slug: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: string;
  capacityPoints: number;
  leadDays: number;
  published: boolean;
  active: boolean;
  imageUrl: string;
  tags: string;
  tagsAr: string;
  servingsEn: string;
  servingsAr: string;
  allergens: string;
  bestSeller: boolean;
  seasonal: boolean;
  giftable: boolean;
  cakeTextMaxLength: string;
  cakeTextPrice: string;
  cakeTextPoints: string;
};

type OptionDraft = {
  nameEn: string;
  nameAr: string;
  price: string;
  capacityPoints: number;
  leadDays: number;
};

const products = ref<AdminProduct[]>([]);
const categories = ref<AdminCategory[]>([]);
const editing = ref<string | 'new' | null>(null);
const draft = ref<Draft>(blank());
const newVariant = ref<OptionDraft>(blankOption());
const newAddon = ref<OptionDraft>(blankOption());
const error = ref('');
const busy = ref(false);

const current = computed(() =>
  editing.value && editing.value !== 'new'
    ? products.value.find(product => product.id === editing.value)
    : undefined
);

// The base points and lead time are the smallest active variant's whenever one
// exists, so the fields are shown as read-out rather than as inputs.
const derivedBase = computed(() => (current.value?.variants ?? []).some(variant => variant.active));

const categoryName = (id: string) => categories.value.find(row => row.id === id)?.nameEn ?? '—';

function blank(): Draft {
  return {
    slug: '',
    categoryId: categories.value[0]?.id ?? '',
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    price: '0.000',
    capacityPoints: 1,
    leadDays: 1,
    published: false,
    active: true,
    imageUrl: '',
    tags: '',
    tagsAr: '',
    servingsEn: '',
    servingsAr: '',
    allergens: '',
    bestSeller: false,
    seasonal: false,
    giftable: false,
    cakeTextMaxLength: '',
    cakeTextPrice: '',
    cakeTextPoints: ''
  };
}

function blankOption(): OptionDraft {
  return {nameEn: '', nameAr: '', price: '0.000', capacityPoints: 1, leadDays: 1};
}

async function load() {
  const [productList, categoryList] = await Promise.all([api.owner.products(), api.owner.categories()]);
  products.value = productList.items;
  categories.value = categoryList.items;
}

onMounted(async () => {
  try {
    await load();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to load products.');
  }
});

function startNew() {
  draft.value = blank();
  editing.value = 'new';
  error.value = '';
}

function startEdit(product: AdminProduct) {
  draft.value = {
    slug: product.slug,
    categoryId: product.categoryId,
    nameEn: product.nameEn,
    nameAr: product.nameAr,
    descriptionEn: product.descriptionEn,
    descriptionAr: product.descriptionAr,
    price: toKwd(product.priceFils),
    capacityPoints: product.capacityPoints,
    leadDays: product.leadDays,
    published: product.published,
    active: product.active,
    imageUrl: product.imageUrl ?? '',
    tags: product.tags.join(', '),
    tagsAr: product.tagsAr.join(', '),
    servingsEn: product.servingsEn ?? '',
    servingsAr: product.servingsAr ?? '',
    allergens: product.allergens.join(', '),
    bestSeller: product.bestSeller,
    seasonal: product.seasonal,
    giftable: product.giftable,
    cakeTextMaxLength: product.cakeTextMaxLength?.toString() ?? '',
    cakeTextPrice: product.cakeTextPriceFils === null ? '' : toKwd(product.cakeTextPriceFils),
    cakeTextPoints: product.cakeTextPoints?.toString() ?? ''
  };
  newVariant.value = blankOption();
  newAddon.value = blankOption();
  editing.value = product.id;
  error.value = '';
}

const orNull = (value: string) => (value.trim() ? value.trim() : null);
const numberOrNull = (value: string) => (value.trim() ? Number(value) : null);

async function run(work: () => Promise<unknown>, fallback: string) {
  busy.value = true;
  error.value = '';
  try {
    await work();
    await load();
    return true;
  } catch (reason) {
    error.value = messageFrom(reason, fallback);
    return false;
  } finally {
    busy.value = false;
  }
}

async function save() {
  const payload = {
    slug: draft.value.slug || slugify(draft.value.nameEn),
    categoryId: draft.value.categoryId,
    nameEn: draft.value.nameEn,
    nameAr: draft.value.nameAr,
    descriptionEn: draft.value.descriptionEn,
    descriptionAr: draft.value.descriptionAr,
    priceFils: toFils(draft.value.price),
    capacityPoints: Number(draft.value.capacityPoints),
    leadDays: Number(draft.value.leadDays),
    published: draft.value.published,
    active: draft.value.active,
    imageUrl: orNull(draft.value.imageUrl),
    tags: splitList(draft.value.tags),
    tagsAr: splitList(draft.value.tagsAr),
    servingsEn: orNull(draft.value.servingsEn),
    servingsAr: orNull(draft.value.servingsAr),
    allergens: splitList(draft.value.allergens),
    bestSeller: draft.value.bestSeller,
    seasonal: draft.value.seasonal,
    giftable: draft.value.giftable,
    cakeTextMaxLength: numberOrNull(draft.value.cakeTextMaxLength),
    cakeTextPriceFils: draft.value.cakeTextPrice.trim() ? toFils(draft.value.cakeTextPrice) : null,
    cakeTextPoints: numberOrNull(draft.value.cakeTextPoints)
  };

  const target = editing.value;
  const saved = await run(
    () => (target === 'new' ? api.owner.createProduct(payload) : api.owner.updateProduct(target!, payload)),
    'Unable to save this product.'
  );
  // A new product stays open on its own record so its variants can be added
  // straight away.
  if (saved && target === 'new') {
    const created = products.value.find(product => product.slug === payload.slug);
    if (created) startEdit(created);
    else editing.value = null;
  }
}

const setArchived = (product: AdminProduct, archived: boolean) =>
  run(() => api.owner.updateProduct(product.id, {archived}), 'Unable to change this product.');

const setPublished = (product: AdminProduct, published: boolean) =>
  run(() => api.owner.updateProduct(product.id, {published}), 'Unable to change this product.');

const optionPayload = (option: OptionDraft) => ({
  nameEn: option.nameEn,
  nameAr: option.nameAr,
  priceFils: toFils(option.price),
  capacityPoints: Number(option.capacityPoints),
  leadDays: Number(option.leadDays)
});

async function addVariant(productId: string) {
  const added = await run(
    () => api.owner.createVariant(productId, optionPayload(newVariant.value)),
    'Unable to add this variant.'
  );
  if (added) newVariant.value = blankOption();
}

async function addAddon(productId: string) {
  const added = await run(
    () => api.owner.createAddon(productId, optionPayload(newAddon.value)),
    'Unable to add this add-on.'
  );
  if (added) newAddon.value = blankOption();
}

const toggleVariant = (variant: AdminVariant) =>
  run(() => api.owner.updateVariant(variant.id, {active: !variant.active}), 'Unable to change this variant.');

const toggleAddon = (addon: AdminOption) =>
  run(() => api.owner.updateAddon(addon.id, {active: !addon.active}), 'Unable to change this add-on.');
</script>

<template>
  <div class="account-panel">
    <div class="admin-head">
      <h2><Cake/> Products</h2>
      <button class="btn primary" :disabled="busy || !categories.length" @click="startNew">
        <Plus :size="16"/> New product
      </button>
    </div>
    <p v-if="error" class="form-note" role="alert">{{ error }}</p>
    <p v-if="!categories.length" class="form-note">Add a category before adding products.</p>

    <form v-if="editing" class="form-grid admin-form" @submit.prevent="save">
      <label>Slug<input v-model="draft.slug" :placeholder="slugify(draft.nameEn)" required></label>
      <label>
        Category
        <select v-model="draft.categoryId" required>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.nameEn }}
          </option>
        </select>
      </label>
      <label>Name (English)<input v-model="draft.nameEn" required></label>
      <label>Name (Arabic)<input v-model="draft.nameAr" dir="rtl" required></label>
      <label class="span2">
        Description (English)<textarea v-model="draft.descriptionEn" rows="2" required></textarea>
      </label>
      <label class="span2">
        Description (Arabic)
        <textarea v-model="draft.descriptionAr" rows="2" dir="rtl" required></textarea>
      </label>
      <label>Price (KWD)<input v-model="draft.price" type="number" step="0.001" min="0" required></label>
      <label class="span2">Image URL<input v-model="draft.imageUrl" type="url"></label>

      <label v-if="!derivedBase">
        Capacity points<input v-model.number="draft.capacityPoints" type="number" min="0" required>
      </label>
      <label v-if="!derivedBase">
        Lead days<input v-model.number="draft.leadDays" type="number" min="0" required>
      </label>
      <p v-else class="form-note span2">
        Capacity points ({{ draft.capacityPoints }}) and lead days ({{ draft.leadDays }}) follow the
        smallest active variant and are set from it.
      </p>

      <label>Tags (English, comma separated)<input v-model="draft.tags"></label>
      <label>Tags (Arabic, comma separated)<input v-model="draft.tagsAr" dir="rtl"></label>
      <label>Servings (English)<input v-model="draft.servingsEn"></label>
      <label>Servings (Arabic)<input v-model="draft.servingsAr" dir="rtl"></label>
      <label class="span2">Allergens (comma separated)<input v-model="draft.allergens"></label>

      <label>Cake text max length<input v-model="draft.cakeTextMaxLength" type="number" min="1"></label>
      <label>Cake text price (KWD)<input v-model="draft.cakeTextPrice" type="number" step="0.001" min="0"></label>
      <label>Cake text points<input v-model="draft.cakeTextPoints" type="number" min="0"></label>

      <div class="span2 admin-checks">
        <label><input v-model="draft.published" type="checkbox"> Published</label>
        <label><input v-model="draft.active" type="checkbox"> Active</label>
        <label><input v-model="draft.bestSeller" type="checkbox"> Best seller</label>
        <label><input v-model="draft.seasonal" type="checkbox"> Seasonal</label>
        <label><input v-model="draft.giftable" type="checkbox"> Giftable</label>
      </div>

      <div class="span2 admin-actions">
        <button class="btn primary" :disabled="busy"><Save :size="16"/> Save product</button>
        <button class="btn secondary" type="button" :disabled="busy" @click="editing = null">
          <X :size="16"/> Close
        </button>
      </div>
    </form>

    <template v-if="current">
      <div class="admin-subsection">
        <h3>Variants</h3>
        <p class="form-note">
          A variant replaces the product's capacity points and adds its price. The smallest one sets
          what the storefront shows before a choice is made.
        </p>
        <div class="admin-table">
          <div v-for="variant in current.variants" :key="variant.id" class="admin-row">
            <span class="admin-cell grow">
              <b>{{ variant.nameEn }}</b>
              <small dir="auto">{{ variant.nameAr }}</small>
            </span>
            <span class="admin-cell">{{ money(variant.priceFils) }}</span>
            <span class="admin-cell">{{ variant.capacityPoints }} pts</span>
            <span class="admin-cell">{{ variant.leadDays }}d lead</span>
            <em class="admin-flag" :class="variant.active ? 'live' : 'muted'">
              {{ variant.active ? 'offered' : 'retired' }}
            </em>
            <button class="btn secondary" :disabled="busy" @click="toggleVariant(variant)">
              {{ variant.active ? 'Retire' : 'Offer' }}
            </button>
          </div>
        </div>

        <form class="form-grid admin-form" @submit.prevent="addVariant(current.id)">
          <label>Name (English)<input v-model="newVariant.nameEn" required></label>
          <label>Name (Arabic)<input v-model="newVariant.nameAr" dir="rtl" required></label>
          <label>Price (KWD)<input v-model="newVariant.price" type="number" step="0.001" min="0" required></label>
          <label>Capacity points<input v-model.number="newVariant.capacityPoints" type="number" min="0" required></label>
          <label>Lead days<input v-model.number="newVariant.leadDays" type="number" min="0" required></label>
          <button class="btn primary" :disabled="busy"><Plus :size="16"/> Add variant</button>
        </form>
      </div>

      <div class="admin-subsection">
        <h3>Add-ons</h3>
        <p class="form-note">An add-on adds both its price and its capacity points to the line.</p>
        <div class="admin-table">
          <div v-for="addon in current.addons" :key="addon.id" class="admin-row">
            <span class="admin-cell grow">
              <b>{{ addon.nameEn }}</b>
              <small dir="auto">{{ addon.nameAr }}</small>
            </span>
            <span class="admin-cell">{{ money(addon.priceFils) }}</span>
            <span class="admin-cell">{{ addon.capacityPoints }} pts</span>
            <em class="admin-flag" :class="addon.active ? 'live' : 'muted'">
              {{ addon.active ? 'offered' : 'retired' }}
            </em>
            <button class="btn secondary" :disabled="busy" @click="toggleAddon(addon)">
              {{ addon.active ? 'Retire' : 'Offer' }}
            </button>
          </div>
        </div>

        <form class="form-grid admin-form" @submit.prevent="addAddon(current.id)">
          <label>Name (English)<input v-model="newAddon.nameEn" required></label>
          <label>Name (Arabic)<input v-model="newAddon.nameAr" dir="rtl" required></label>
          <label>Price (KWD)<input v-model="newAddon.price" type="number" step="0.001" min="0" required></label>
          <label>Capacity points<input v-model.number="newAddon.capacityPoints" type="number" min="0" required></label>
          <button class="btn primary" :disabled="busy"><Plus :size="16"/> Add add-on</button>
        </form>
      </div>
    </template>

    <p v-if="!products.length" class="form-note">No products yet.</p>

    <div class="admin-table">
      <div v-for="product in products" :key="product.id" class="admin-row">
        <span class="admin-cell grow">
          <b>{{ product.nameEn }}</b>
          <small dir="auto">{{ product.nameAr }} · {{ categoryName(product.categoryId) }}</small>
        </span>
        <span class="admin-cell">{{ money(product.priceFils) }}</span>
        <span class="admin-cell">{{ product.capacityPoints }} pts · {{ product.leadDays }}d</span>
        <em v-if="product.archivedAt" class="admin-flag muted">archived</em>
        <em v-else-if="!product.published" class="admin-flag draft">draft</em>
        <em v-else class="admin-flag live">live</em>
        <span class="admin-cell admin-actions">
          <button class="btn secondary" :disabled="busy" @click="startEdit(product)">Edit</button>
          <button
            v-if="!product.archivedAt"
            class="btn secondary"
            :disabled="busy"
            @click="setPublished(product, !product.published)"
          >
            {{ product.published ? 'Unpublish' : 'Publish' }}
          </button>
          <button
            v-if="product.archivedAt"
            class="btn secondary"
            :disabled="busy"
            @click="setArchived(product, false)"
          >
            <RotateCcw :size="15"/> Restore
          </button>
          <button v-else class="btn secondary" :disabled="busy" @click="setArchived(product, true)">
            <Archive :size="15"/> Archive
          </button>
        </span>
      </div>
    </div>
  </div>
</template>
