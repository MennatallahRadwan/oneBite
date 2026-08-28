<script setup lang="ts">
import {computed, ref} from 'vue';
import {img} from '../data';
import {t} from '../i18n';
import PageHero from '../components/PageHero.vue';

defineProps<{type: string}>();

const open = ref(0);

const faqs = computed(() => [
  {question: t('faq.q1'), answer: t('faq.a1')},
  {question: t('faq.q2'), answer: t('faq.a2')},
  {question: t('faq.q3'), answer: t('faq.a3')},
  {question: t('faq.q4'), answer: t('faq.a4')},
  {question: t('faq.q5'), answer: t('faq.a5')},
  {question: t('faq.q6'), answer: t('faq.a6')}
]);

const topics = computed(() => [
  t('contact.form.topicGeneral'),
  t('contact.form.topicCustom'),
  t('contact.form.topicExisting'),
  t('contact.form.topicFeedback')
]);

const values = computed(() => [
  {number: '01', title: t('about.value1'), copy: t('about.value1Blurb')},
  {number: '02', title: t('about.value2'), copy: t('about.value2Blurb')},
  {number: '03', title: t('about.value3'), copy: t('about.value3Blurb')}
]);
</script>

<template>
  <template v-if="type === 'about'">
    <PageHero
      :eyebrow="t('about.eyebrow')"
      :title="t('about.title')"
      :subtitle="t('about.subtitle')"
    />

    <section class="section">
      <div class="container story-grid">
        <img :src="img('1556909114-f6e7ad7d3136')">
        <div>
          <span class="eyebrow">{{ t('about.startedEyebrow') }}</span>
          <h2>{{ t('about.startedTitle') }}</h2>
          <p>{{ t('about.p1') }}</p>
          <p>{{ t('about.p2') }}</p>
        </div>
      </div>
    </section>

    <section class="section alt">
      <div class="container values">
        <article v-for="value in values" :key="value.number">
          <b>{{ value.number }}</b>
          <h3>{{ value.title }}</h3>
          <p>{{ value.copy }}</p>
        </article>
      </div>
    </section>
  </template>

  <template v-else-if="type === 'faq'">
    <PageHero :eyebrow="t('faq.eyebrow')" :title="t('faq.title')" :subtitle="t('faq.subtitle')"/>

    <section class="section">
      <div class="container faq-list">
        <article v-for="(faq, index) in faqs" :key="faq.question">
          <button @click="open = open === index ? -1 : index">
            <b>{{ faq.question }}</b>
            <span>{{ open === index ? '−' : '+' }}</span>
          </button>
          <p v-if="open === index">{{ faq.answer }}</p>
        </article>
      </div>
    </section>
  </template>

  <template v-else>
    <PageHero
      :eyebrow="t('contact.eyebrow')"
      :title="t('contact.title')"
      :subtitle="t('contact.subtitle')"
    />

    <section class="section">
      <div class="container contact-grid">
        <div>
          <h2>{{ t('contact.heading') }}</h2>
          <p>{{ t('contact.hours') }}</p>
          <div class="contact-card">
            <b>{{ t('contact.phoneLabel') }}</b>
            <p><bdi>+965 6909 9100</bdi></p>
          </div>
          <div class="contact-card">
            <b>{{ t('contact.instagramLabel') }}</b>
            <p>
              <a href="https://www.instagram.com/one_bite_q8?igsi=MXFjbDNybHppNjJlZw==" target="_blank" rel="noreferrer">
                @one_bite_q8
              </a>
            </p>
          </div>
          <div class="contact-card">
            <b>{{ t('contact.bakeryLabel') }}</b>
            <p>{{ t('footer.location') }}</p>
          </div>
        </div>

        <form class="contact-form" @submit.prevent>
          <label>
            {{ t('contact.form.name') }}
            <input :placeholder="t('contact.form.namePlaceholder')">
          </label>
          <label>
            {{ t('contact.form.email') }}
            <input dir="ltr" placeholder="you@example.com">
          </label>
          <label>
            {{ t('contact.form.topic') }}
            <select>
              <option v-for="topic in topics" :key="topic">{{ topic }}</option>
            </select>
          </label>
          <label>
            {{ t('contact.form.message') }}
            <textarea rows="6" :placeholder="t('contact.form.messagePlaceholder')"></textarea>
          </label>
          <button class="btn primary">{{ t('contact.form.send') }}</button>
        </form>
      </div>
    </section>
  </template>
</template>
