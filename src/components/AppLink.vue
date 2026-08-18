<script setup lang="ts">
import {computed} from 'vue';
import {localePath} from '../i18n';

// Every internal link goes through here so that browsing in Arabic stays in
// Arabic: paths are written unprefixed and gain /ar automatically.
const props = defineProps<{to: string}>();

const target = computed(() => localePath(props.to));
</script>

<template>
  <RouterLink :to="target"><slot/></RouterLink>
</template>
