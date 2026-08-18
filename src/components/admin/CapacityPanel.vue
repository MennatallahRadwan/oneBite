<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Factory} from 'lucide-vue-next';
import {api, type CapacityDay} from '../../api/client';
import {addDays, messageFrom, today, weekdays} from './admin-ui';

const days = ref<CapacityDay[]>([]);
const from = ref(today());
const to = ref(addDays(today(), 29));
const plan = ref({totalPoints: 60, skipWeekdays: [5]});
const error = ref('');
const notice = ref('');
const busy = ref(false);

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

async function load() {
  days.value = (await api.owner.capacity(from.value, to.value)).items;
}

onMounted(() => run(load, 'Unable to load production capacity.'));

const refresh = () => run(load, 'Unable to load production capacity.');

async function setDay(day: CapacityDay, value: string) {
  const totalPoints = Number(value);
  if (!value.trim() || totalPoints === day.totalPoints) return;
  notice.value = '';
  await run(async () => {
    await api.owner.setCapacity(day.date, totalPoints);
    await load();
  }, 'Unable to set capacity for this day.');
}

async function fillRange() {
  notice.value = '';
  await run(async () => {
    const result = await api.owner.setCapacityRange(
      from.value,
      to.value,
      Number(plan.value.totalPoints),
      plan.value.skipWeekdays
    );
    const held = Array.isArray(result.held) ? result.held : [];
    notice.value =
      `Set ${result.written} days to ${plan.value.totalPoints} points.` +
      (held.length
        ? ` ${held.join(', ')} kept their existing total because more points are already committed.`
        : '');
    await load();
  }, 'Unable to fill this range.');
}

/**
 * A day with no row is not zero capacity — availability falls back to its own
 * default for those, so they read as unset rather than as closed.
 */
const isUnset = (day: CapacityDay) => day.totalPoints === null;

const remaining = (day: CapacityDay) =>
  day.totalPoints === null ? null : day.totalPoints - day.usedPoints;
</script>

<template>
  <div class="account-panel">
    <div class="admin-head">
      <h2><Factory/> Production capacity</h2>
    </div>
    <p class="form-note">
      Capacity is counted in points per day. Every cart converts to points, and a day stops being
      offered once its committed points would exceed the total.
    </p>
    <p v-if="error" class="form-note" role="alert">{{ error }}</p>

    <form class="form-grid admin-form" @submit.prevent="refresh">
      <label>From<input v-model="from" type="date" required></label>
      <label>To<input v-model="to" type="date" required></label>
      <button class="btn secondary" :disabled="busy">Show range</button>
    </form>

    <div class="admin-subsection">
      <h3>Set the whole range</h3>
      <form class="form-grid admin-form" @submit.prevent="fillRange">
        <label>Points per day<input v-model.number="plan.totalPoints" type="number" min="0" required></label>
        <label class="span2">
          Skip weekdays
          <span class="admin-checks">
            <label v-for="day in weekdays" :key="day.index">
              <input v-model="plan.skipWeekdays" type="checkbox" :value="day.index"> {{ day.name }}
            </label>
          </span>
        </label>
        <button class="btn primary" :disabled="busy">Apply to range</button>
      </form>
      <p v-if="notice" class="form-note">{{ notice }}</p>
    </div>

    <div class="admin-table">
      <div v-for="day in days" :key="day.date" class="admin-row">
        <span class="admin-cell grow">
          <b>{{ day.date }}</b>
          <small>{{ weekdays[day.weekday].name }}</small>
        </span>
        <span class="admin-cell">{{ day.usedPoints }} committed</span>
        <span class="admin-cell">
          <template v-if="remaining(day) !== null">{{ remaining(day) }} left</template>
          <template v-else>no limit set</template>
        </span>
        <em v-if="isUnset(day)" class="admin-flag muted">unset</em>
        <em v-else-if="remaining(day)! <= 0" class="admin-flag draft">full</em>
        <em v-else class="admin-flag live">open</em>
        <label class="admin-inline">
          Total
          <input
            type="number"
            min="0"
            :value="day.totalPoints ?? ''"
            :disabled="busy"
            @change="setDay(day, ($event.target as HTMLInputElement).value)"
          >
        </label>
      </div>
    </div>
  </div>
</template>
