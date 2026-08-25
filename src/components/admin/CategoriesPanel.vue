<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Archive, FolderTree, Plus, RotateCcw, Save, X} from 'lucide-vue-next';
import {api, type AdminCategory} from '../../api/client';
import {messageFrom, slugify} from './admin-ui';

type Draft = {
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  imageUrl: string;
  sortOrder: number;
};

const categories = ref<AdminCategory[]>([]);
const editing = ref<string | 'new' | null>(null);
const draft = ref<Draft>(blank());
const error = ref('');
const busy = ref(false);

function blank(): Draft {
  return {
    slug: '',
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    imageUrl: '',
    sortOrder: categories.value.length * 10
  };
}

async function load() {
  categories.value = (await api.owner.categories()).items;
}

onMounted(async () => {
  try {
    await load();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to load categories.');
  }
});

function startNew() {
  draft.value = blank();
  editing.value = 'new';
  error.value = '';
}

function startEdit(category: AdminCategory) {
  draft.value = {
    slug: category.slug,
    nameEn: category.nameEn,
    nameAr: category.nameAr,
    descriptionEn: category.descriptionEn ?? '',
    descriptionAr: category.descriptionAr ?? '',
    imageUrl: category.imageUrl ?? '',
    sortOrder: category.sortOrder
  };
  editing.value = category.id;
  error.value = '';
}

// Empty optional text is sent as null rather than '', so clearing a field
// actually clears the column instead of storing a blank string.
const orNull = (value: string) => (value.trim() ? value.trim() : null);

async function save() {
  busy.value = true;
  error.value = '';
  const payload = {
    slug: draft.value.slug || slugify(draft.value.nameEn),
    nameEn: draft.value.nameEn,
    nameAr: draft.value.nameAr,
    descriptionEn: orNull(draft.value.descriptionEn),
    descriptionAr: orNull(draft.value.descriptionAr),
    imageUrl: orNull(draft.value.imageUrl),
    sortOrder: Number(draft.value.sortOrder)
  };

  try {
    if (editing.value === 'new') await api.owner.createCategory(payload);
    else if (editing.value) await api.owner.updateCategory(editing.value, payload);
    await load();
    editing.value = null;
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to save this category.');
  } finally {
    busy.value = false;
  }
}

async function setArchived(category: AdminCategory, archived: boolean) {
  busy.value = true;
  error.value = '';
  try {
    await api.owner.updateCategory(category.id, {archived});
    await load();
  } catch (reason) {
    error.value = messageFrom(reason, 'Unable to change this category.');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="account-panel">
    <div class="admin-head">
      <h2><FolderTree/> Categories</h2>
      <button class="btn primary" :disabled="busy" @click="startNew">
        <Plus :size="16"/> New category
      </button>
    </div>
    <p v-if="error" class="form-note" role="alert">{{ error }}</p>

    <form v-if="editing" class="form-grid admin-form" @submit.prevent="save">
      <label>Slug<input v-model="draft.slug" :placeholder="slugify(draft.nameEn)" required></label>
      <label>Sort order<input v-model.number="draft.sortOrder" type="number" min="0"></label>
      <label>Name (English)<input v-model="draft.nameEn" required></label>
      <label>Name (Arabic)<input v-model="draft.nameAr" dir="rtl" required></label>
      <label>Description (English)<input v-model="draft.descriptionEn"></label>
      <label>Description (Arabic)<input v-model="draft.descriptionAr" dir="rtl"></label>
      <label class="span2">Image URL<input v-model="draft.imageUrl" type="url"></label>
      <div class="span2 admin-actions">
        <button class="btn primary" :disabled="busy"><Save :size="16"/> Save category</button>
        <button class="btn secondary" type="button" :disabled="busy" @click="editing = null">
          <X :size="16"/> Cancel
        </button>
      </div>
    </form>

    <p v-if="!categories.length" class="form-note">No categories yet.</p>

    <div class="admin-table" role="table">
      <div v-for="category in categories" :key="category.id" class="admin-row" role="row">
        <span class="admin-cell grow">
          <b>{{ category.nameEn }}</b>
          <small dir="auto">{{ category.nameAr }} · {{ category.slug }}</small>
        </span>
        <span class="admin-cell">
          {{ category.productCount }} products
          <small v-if="!category.productCount">hidden until it has a published product</small>
        </span>
        <span class="admin-cell">order {{ category.sortOrder }}</span>
        <em v-if="category.archivedAt" class="admin-flag muted">archived</em>
        <em v-else class="admin-flag live">live</em>
        <span class="admin-cell admin-actions">
          <button class="btn secondary" :disabled="busy" @click="startEdit(category)">Edit</button>
          <button
            v-if="category.archivedAt"
            class="btn secondary"
            :disabled="busy"
            @click="setArchived(category, false)"
          >
            <RotateCcw :size="15"/> Restore
          </button>
          <button v-else class="btn secondary" :disabled="busy" @click="setArchived(category, true)">
            <Archive :size="15"/> Archive
          </button>
        </span>
      </div>
    </div>
  </div>
</template>
