<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Megaphone, Plus, Save, X} from 'lucide-vue-next';
import {api, type AdminContentBlock, type AdminPromotion} from '../../api/client';
import {messageFrom, toFils, toKwd} from './admin-ui';

type PromotionDraft = {
  code: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  discountType: AdminPromotion['discountType'];
  discountValue: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

type ContentDraft = {
  key: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  active: boolean;
};

const promotions = ref<AdminPromotion[]>([]);
const blocks = ref<AdminContentBlock[]>([]);
const editingPromotion = ref<string | 'new' | null>(null);
const editingBlock = ref<string | 'new' | null>(null);
const promotionDraft = ref<PromotionDraft>(blankPromotion());
const contentDraft = ref<ContentDraft>(blankContent());
const error = ref('');
const busy = ref(false);

function blankPromotion(): PromotionDraft {
  return {
    code: '',
    titleEn: '',
    titleAr: '',
    descriptionEn: '',
    descriptionAr: '',
    discountType: 'PERCENT',
    discountValue: '10',
    startsAt: '',
    endsAt: '',
    active: true
  };
}

function blankContent(): ContentDraft {
  return {key: '', titleEn: '', titleAr: '', bodyEn: '', bodyAr: '', active: true};
}

async function load() {
  const [promotionResult, contentResult] = await Promise.all([
    api.owner.promotions(),
    api.owner.contentBlocks()
  ]);
  promotions.value = promotionResult.items;
  blocks.value = contentResult.items;
}

onMounted(async () => {
  try {
    await load();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to load marketing content.');
  }
});

const dateOnly = (value: string | null) => (value ? value.slice(0, 10) : '');
const optional = (value: string) => (value.trim() ? value.trim() : null);

function startPromotion(promotion?: AdminPromotion) {
  promotionDraft.value = promotion
    ? {
        code: promotion.code,
        titleEn: promotion.titleEn,
        titleAr: promotion.titleAr,
        descriptionEn: promotion.descriptionEn ?? '',
        descriptionAr: promotion.descriptionAr ?? '',
        discountType: promotion.discountType,
        discountValue:
          promotion.discountType === 'FIXED_FILS'
            ? toKwd(promotion.discountValue)
            : String(promotion.discountValue),
        startsAt: dateOnly(promotion.startsAt),
        endsAt: dateOnly(promotion.endsAt),
        active: promotion.active
      }
    : blankPromotion();
  editingPromotion.value = promotion?.id ?? 'new';
  error.value = '';
}

function startContent(block?: AdminContentBlock) {
  contentDraft.value = block
    ? {
        key: block.key,
        titleEn: block.titleEn,
        titleAr: block.titleAr,
        bodyEn: block.bodyEn,
        bodyAr: block.bodyAr,
        active: block.active
      }
    : blankContent();
  editingBlock.value = block?.id ?? 'new';
  error.value = '';
}

async function savePromotion() {
  busy.value = true;
  error.value = '';
  const draft = promotionDraft.value;
  const payload = {
    code: draft.code.trim().toUpperCase(),
    titleEn: draft.titleEn.trim(),
    titleAr: draft.titleAr.trim(),
    descriptionEn: optional(draft.descriptionEn),
    descriptionAr: optional(draft.descriptionAr),
    discountType: draft.discountType,
    discountValue:
      draft.discountType === 'FIXED_FILS'
        ? toFils(draft.discountValue)
        : Number(draft.discountValue),
    startsAt: draft.startsAt || null,
    endsAt: draft.endsAt || null,
    active: draft.active
  };

  try {
    if (editingPromotion.value === 'new') await api.owner.createPromotion(payload);
    else if (editingPromotion.value) await api.owner.updatePromotion(editingPromotion.value, payload);
    editingPromotion.value = null;
    await load();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to save this promotion.');
  } finally {
    busy.value = false;
  }
}

async function saveContent() {
  busy.value = true;
  error.value = '';
  const payload = {...contentDraft.value, key: contentDraft.value.key.trim()};

  try {
    if (editingBlock.value === 'new') await api.owner.createContentBlock(payload);
    else if (editingBlock.value) await api.owner.updateContentBlock(editingBlock.value, payload);
    editingBlock.value = null;
    await load();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to save this content block.');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="account-panel">
    <div class="admin-head">
      <h2><Megaphone/> Marketing</h2>
      <div class="admin-actions">
        <button class="btn primary" :disabled="busy" @click="startPromotion()">
          <Plus :size="16"/> New promotion
        </button>
        <button class="btn secondary" :disabled="busy" @click="startContent()">
          <Plus :size="16"/> New content
        </button>
      </div>
    </div>
    <p v-if="error" class="form-note" role="alert">{{ error }}</p>

    <form v-if="editingPromotion" class="form-grid admin-form" @submit.prevent="savePromotion">
      <label>Code<input v-model="promotionDraft.code" required></label>
      <label>
        Discount type
        <select v-model="promotionDraft.discountType">
          <option value="PERCENT">Percent</option>
          <option value="FIXED_FILS">Fixed KWD</option>
        </select>
      </label>
      <label>Name (English)<input v-model="promotionDraft.titleEn" required></label>
      <label>Name (Arabic)<input v-model="promotionDraft.titleAr" dir="rtl" required></label>
      <label>
        {{ promotionDraft.discountType === 'PERCENT' ? 'Percent off' : 'KWD off' }}
        <input v-model="promotionDraft.discountValue" type="number" min="0" step="0.001" required>
      </label>
      <label>Starts<input v-model="promotionDraft.startsAt" type="date"></label>
      <label>Ends<input v-model="promotionDraft.endsAt" type="date"></label>
      <label class="toggle-line"><input v-model="promotionDraft.active" type="checkbox"> Active</label>
      <label class="span2">Description (English)<textarea v-model="promotionDraft.descriptionEn"></textarea></label>
      <label class="span2">Description (Arabic)<textarea v-model="promotionDraft.descriptionAr" dir="rtl"></textarea></label>
      <div class="span2 admin-actions">
        <button class="btn primary" :disabled="busy"><Save :size="16"/> Save promotion</button>
        <button class="btn secondary" type="button" :disabled="busy" @click="editingPromotion = null">
          <X :size="16"/> Cancel
        </button>
      </div>
    </form>

    <form v-if="editingBlock" class="form-grid admin-form" @submit.prevent="saveContent">
      <label>Key<input v-model="contentDraft.key" required></label>
      <label class="toggle-line"><input v-model="contentDraft.active" type="checkbox"> Active</label>
      <label>Name (English)<input v-model="contentDraft.titleEn" required></label>
      <label>Name (Arabic)<input v-model="contentDraft.titleAr" dir="rtl" required></label>
      <label class="span2">Body (English)<textarea v-model="contentDraft.bodyEn" required></textarea></label>
      <label class="span2">Body (Arabic)<textarea v-model="contentDraft.bodyAr" dir="rtl" required></textarea></label>
      <div class="span2 admin-actions">
        <button class="btn primary" :disabled="busy"><Save :size="16"/> Save content</button>
        <button class="btn secondary" type="button" :disabled="busy" @click="editingBlock = null">
          <X :size="16"/> Cancel
        </button>
      </div>
    </form>

    <div class="admin-subsection">
      <h3>Promotions</h3>
      <p v-if="!promotions.length" class="form-note">No promotions yet.</p>
      <div v-for="promotion in promotions" :key="promotion.id" class="admin-row">
        <span class="admin-cell grow">
          <b>{{ promotion.code }} · {{ promotion.titleEn }}</b>
          <small dir="auto">{{ promotion.titleAr }}</small>
        </span>
        <span class="admin-cell">
          {{ promotion.discountType === 'PERCENT' ? `${promotion.discountValue}%` : `${toKwd(promotion.discountValue)} KWD` }}
          <small>{{ promotion.startsAt?.slice(0, 10) || 'no start' }} to {{ promotion.endsAt?.slice(0, 10) || 'no end' }}</small>
        </span>
        <em class="admin-flag" :class="promotion.active ? 'live' : 'muted'">
          {{ promotion.active ? 'active' : 'inactive' }}
        </em>
        <button class="btn secondary" :disabled="busy" @click="startPromotion(promotion)">Edit</button>
      </div>
    </div>

    <div class="admin-subsection">
      <h3>Content blocks</h3>
      <p v-if="!blocks.length" class="form-note">No content blocks yet.</p>
      <div v-for="block in blocks" :key="block.id" class="admin-row">
        <span class="admin-cell grow">
          <b>{{ block.key }} · {{ block.titleEn }}</b>
          <small dir="auto">{{ block.titleAr }}</small>
        </span>
        <em class="admin-flag" :class="block.active ? 'live' : 'muted'">
          {{ block.active ? 'active' : 'inactive' }}
        </em>
        <button class="btn secondary" :disabled="busy" @click="startContent(block)">Edit</button>
      </div>
    </div>
  </div>
</template>
