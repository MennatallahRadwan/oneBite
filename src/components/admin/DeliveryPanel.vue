<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {MapPin, Plus, Save, Trash2, Truck, X} from 'lucide-vue-next';
import {api, type AdminArea, type AdminSlot} from '../../api/client';
import {addDays, messageFrom, money, today, toFils, toKwd, weekdayOf, weekdays} from './admin-ui';

const areas = ref<AdminArea[]>([]);
const slots = ref<AdminSlot[]>([]);
const error = ref('');
const notice = ref('');
const busy = ref(false);

const editingArea = ref<string | 'new' | null>(null);
const areaDraft = ref({nameEn: '', nameAr: '', fee: '0.000', active: true});

const from = ref(today());
const to = ref(addDays(today(), 13));
const areaFilter = ref('');

const plan = ref({
  areaIds: [] as string[],
  windows: [
    {start: '10:00', end: '13:00'},
    {start: '16:00', end: '19:00'}
  ],
  capacity: 20,
  skipWeekdays: [5]
});

const areaName = (id: string) => areas.value.find(area => area.id === id)?.nameEn ?? '—';

/** Slots read best grouped by the day they belong to. */
const slotDays = computed(() => {
  const byDate = new Map<string, AdminSlot[]>();
  for (const slot of slots.value) {
    const existing = byDate.get(slot.date);
    if (existing) existing.push(slot);
    else byDate.set(slot.date, [slot]);
  }
  return [...byDate.entries()].map(([date, entries]) => ({date, entries}));
});

async function loadAreas() {
  areas.value = (await api.owner.areas()).items;
  if (!plan.value.areaIds.length) plan.value.areaIds = areas.value.filter(a => a.active).map(a => a.id);
}

async function loadSlots() {
  slots.value = (await api.owner.slots(from.value, to.value, areaFilter.value || undefined)).items;
}

async function run(work: () => Promise<unknown>, fallback: string) {
  busy.value = true;
  error.value = '';
  try {
    await work();
    return true;
  } catch (reason) {
    error.value = messageFrom(reason, fallback);
    return false;
  } finally {
    busy.value = false;
  }
}

onMounted(() => run(async () => {
  await loadAreas();
  await loadSlots();
}, 'Unable to load delivery settings.'));

function startNewArea() {
  areaDraft.value = {nameEn: '', nameAr: '', fee: '0.000', active: true};
  editingArea.value = 'new';
}

function startEditArea(area: AdminArea) {
  areaDraft.value = {
    nameEn: area.nameEn,
    nameAr: area.nameAr,
    fee: toKwd(area.feeFils),
    active: area.active
  };
  editingArea.value = area.id;
}

async function saveArea() {
  const payload = {
    nameEn: areaDraft.value.nameEn,
    nameAr: areaDraft.value.nameAr,
    feeFils: toFils(areaDraft.value.fee),
    active: areaDraft.value.active
  };
  const target = editingArea.value;
  const saved = await run(
    () => (target === 'new' ? api.owner.createArea(payload) : api.owner.updateArea(target!, payload)),
    'Unable to save this area.'
  );
  if (!saved) return;
  await loadAreas();
  editingArea.value = null;
}

const toggleArea = (area: AdminArea) =>
  run(async () => {
    await api.owner.updateArea(area.id, {active: !area.active});
    await loadAreas();
  }, 'Unable to change this area.');

const refreshSlots = () => run(loadSlots, 'Unable to load slots.');

async function saveCapacity(slot: AdminSlot, capacity: number) {
  if (capacity === slot.capacity) return;
  await run(async () => {
    await api.owner.updateSlot(slot.id, capacity);
    await loadSlots();
  }, 'Unable to change this slot.');
}

const removeSlot = (slot: AdminSlot) =>
  run(async () => {
    await api.owner.deleteSlot(slot.id);
    await loadSlots();
  }, 'Unable to remove this slot.');

async function generate() {
  notice.value = '';
  const done = await run(async () => {
    const result = await api.owner.generateSlots({
      areaIds: plan.value.areaIds,
      from: from.value,
      to: to.value,
      windows: plan.value.windows,
      capacity: Number(plan.value.capacity),
      skipWeekdays: plan.value.skipWeekdays
    });
    notice.value =
      `Wrote ${result.written} slots across ${result.days} days.` +
      (result.held ? ` ${result.held} were left alone because they hold more reservations than the new capacity.` : '');
    await loadSlots();
  }, 'Unable to generate slots.');
  if (!done) notice.value = '';
}

function addWindow() {
  plan.value.windows.push({start: '09:00', end: '12:00'});
}
</script>

<template>
  <div class="account-panel">
    <div class="admin-head">
      <h2><MapPin/> Delivery areas</h2>
      <button class="btn primary" :disabled="busy" @click="startNewArea">
        <Plus :size="16"/> New area
      </button>
    </div>
    <p v-if="error" class="form-note" role="alert">{{ error }}</p>

    <form v-if="editingArea" class="form-grid admin-form" @submit.prevent="saveArea">
      <label>Name (English)<input v-model="areaDraft.nameEn" required></label>
      <label>Name (Arabic)<input v-model="areaDraft.nameAr" dir="rtl" required></label>
      <label>Delivery fee (KWD)<input v-model="areaDraft.fee" type="number" step="0.001" min="0" required></label>
      <label class="admin-checks"><input v-model="areaDraft.active" type="checkbox"> Active</label>
      <p class="form-note span2">
        Orders record the area by its English name. An area with live orders cannot be renamed —
        deactivate it and add a new one instead.
      </p>
      <div class="span2 admin-actions">
        <button class="btn primary" :disabled="busy"><Save :size="16"/> Save area</button>
        <button class="btn secondary" type="button" :disabled="busy" @click="editingArea = null">
          <X :size="16"/> Cancel
        </button>
      </div>
    </form>

    <div class="admin-table">
      <div v-for="area in areas" :key="area.id" class="admin-row">
        <span class="admin-cell grow">
          <b>{{ area.nameEn }}</b>
          <small dir="auto">{{ area.nameAr }}</small>
        </span>
        <span class="admin-cell">{{ money(area.feeFils) }}</span>
        <em class="admin-flag" :class="area.active ? 'live' : 'muted'">
          {{ area.active ? 'delivering' : 'paused' }}
        </em>
        <span class="admin-cell admin-actions">
          <button class="btn secondary" :disabled="busy" @click="startEditArea(area)">Edit</button>
          <button class="btn secondary" :disabled="busy" @click="toggleArea(area)">
            {{ area.active ? 'Pause' : 'Resume' }}
          </button>
        </span>
      </div>
    </div>
  </div>

  <div class="account-panel">
    <div class="admin-head">
      <h2><Truck/> Delivery slots</h2>
    </div>

    <form class="form-grid admin-form" @submit.prevent="refreshSlots">
      <label>From<input v-model="from" type="date" required></label>
      <label>To<input v-model="to" type="date" required></label>
      <label>
        Area
        <select v-model="areaFilter">
          <option value="">All areas</option>
          <option v-for="area in areas" :key="area.id" :value="area.id">{{ area.nameEn }}</option>
        </select>
      </label>
      <button class="btn secondary" :disabled="busy">Show slots</button>
    </form>

    <div class="admin-subsection">
      <h3>Fill this range</h3>
      <form class="form-grid admin-form" @submit.prevent="generate">
        <label class="span2">
          Areas
          <span class="admin-checks">
            <label v-for="area in areas" :key="area.id">
              <input v-model="plan.areaIds" type="checkbox" :value="area.id"> {{ area.nameEn }}
            </label>
          </span>
        </label>
        <label class="span2">
          Skip weekdays
          <span class="admin-checks">
            <label v-for="day in weekdays" :key="day.index">
              <input v-model="plan.skipWeekdays" type="checkbox" :value="day.index"> {{ day.name }}
            </label>
          </span>
        </label>
        <div class="span2">
          <span class="admin-label">Windows</span>
          <div v-for="(window, index) in plan.windows" :key="index" class="admin-window">
            <input v-model="window.start" type="time" required>
            <input v-model="window.end" type="time" required>
            <button
              v-if="plan.windows.length > 1"
              class="btn secondary"
              type="button"
              @click="plan.windows.splice(index, 1)"
            >
              <X :size="15"/>
            </button>
          </div>
          <button class="btn secondary" type="button" @click="addWindow">
            <Plus :size="15"/> Add window
          </button>
        </div>
        <label>Capacity per slot<input v-model.number="plan.capacity" type="number" min="0" required></label>
        <button class="btn primary" :disabled="busy || !plan.areaIds.length">Fill range</button>
      </form>
      <p v-if="notice" class="form-note">{{ notice }}</p>
    </div>

    <p v-if="!slotDays.length" class="form-note">No slots in this range yet.</p>

    <div v-for="day in slotDays" :key="day.date" class="admin-subsection">
      <h3>{{ day.date }} · {{ weekdayOf(day.date) }}</h3>
      <div class="admin-table">
        <div v-for="slot in day.entries" :key="slot.id" class="admin-row">
          <span class="admin-cell grow">
            <b>{{ slot.windowStart }}–{{ slot.windowEnd }}</b>
            <small>{{ areaName(slot.areaId) }}</small>
          </span>
          <span class="admin-cell">{{ slot.reserved }} reserved</span>
          <label class="admin-inline">
            Capacity
            <input
              type="number"
              min="0"
              :value="slot.capacity"
              :disabled="busy"
              @change="saveCapacity(slot, Number(($event.target as HTMLInputElement).value))"
            >
          </label>
          <button
            class="btn secondary"
            :disabled="busy || slot.reserved > 0"
            :title="slot.reserved > 0 ? 'This slot has reservations against it.' : 'Remove this slot'"
            @click="removeSlot(slot)"
          >
            <Trash2 :size="15"/>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
