<script setup lang="ts">
import {ref} from 'vue';
import {img} from '../data';
import PageHero from '../components/PageHero.vue';

defineProps<{type: string}>();

const open = ref(0);

const faqs = [
  {
    question: 'How far in advance should I order?',
    answer:
      'Each product has its own lead time, and the earliest date we can offer is calculated from everything in your cart together. The available dates shown at checkout already account for it.'
  },
  {
    question: 'Do you offer same-day delivery?',
    answer:
      'No. Every order is made to order and needs at least its lead time before the earliest available delivery date, so we do not promise same-day delivery.'
  },
  {
    question: 'Can I customize a cake?',
    answer:
      'You can choose from the sizes and packaging options listed on each product, and add a short message on cakes that offer it. We do not take free-form custom designs through the website.'
  },
  {
    question: 'What are your delivery fees?',
    answer:
      'The fee depends on your delivery area and is shown at checkout once you select it. There is no free-delivery threshold.'
  },
  {
    question: 'How should I store my order?',
    answer:
      'Cakes and cheesecakes should be refrigerated and are best enjoyed within two days. Pastries and cookies keep at room temperature in a sealed container.'
  },
  {
    question: 'Do you cater for allergies?',
    answer:
      'Every product lists the allergens it contains on its page. Our kitchen handles gluten, dairy, eggs, nuts and sesame, so we cannot guarantee any product is free from traces of them.'
  }
];

const topics = ['General question', 'Custom order', 'Existing order', 'Feedback'];

const values = [
  {number: '01', title: 'Fresh, always', copy: 'We bake daily and never compromise on freshness.'},
  {number: '02', title: 'Made by hand', copy: 'Every finish, garnish and package gets a human touch.'},
  {number: '03', title: 'Made for Kuwait', copy: 'Global inspiration, local tastes and dependable delivery.'}
];
</script>

<template>
  <template v-if="type === 'about'">
    <PageHero
      eyebrow="Our Story"
      title="A little bakery with a big heart"
      subtitle="Creating beautiful, memorable bites in Kuwait since 2021."
    />

    <section class="section">
      <div class="container story-grid">
        <img :src="img('1556909114-f6e7ad7d3136')">
        <div>
          <span class="eyebrow">How It Started</span>
          <h2>From one kitchen to thousands of celebrations</h2>
          <p>
            One Bite began with a simple belief: dessert should do more than taste good. It should
            bring people together, make ordinary moments feel special and become part of the memories
            we keep.
          </p>
          <p>
            We bake every product in small batches, choose ingredients with care and put the same
            attention into a weekday pastry as we do a celebration cake.
          </p>
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
    <PageHero
      eyebrow="Help Center"
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about ordering from One Bite."
    />

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
      eyebrow="We’re Here to Help"
      title="Contact One Bite"
      subtitle="Questions, custom orders or feedback? We would love to hear from you."
    />

    <section class="section">
      <div class="container contact-grid">
        <div>
          <h2>Get in touch</h2>
          <p>Our customer care team is available daily from 9 AM to 10 PM.</p>
          <div class="contact-card"><b>WhatsApp &amp; Phone</b><p>+965 2222 1000</p></div>
          <div class="contact-card"><b>Email</b><p>hello@onebite.com</p></div>
          <div class="contact-card"><b>Bakery</b><p>Kuwait City, Kuwait</p></div>
        </div>

        <form class="contact-form" @submit.prevent>
          <label>Name<input placeholder="Your name"></label>
          <label>Email<input placeholder="you@example.com"></label>
          <label>
            Topic
            <select>
              <option v-for="topic in topics" :key="topic">{{ topic }}</option>
            </select>
          </label>
          <label>Message<textarea rows="6" placeholder="How can we help?"></textarea></label>
          <button class="btn primary">Send Message</button>
        </form>
      </div>
    </section>
  </template>
</template>
