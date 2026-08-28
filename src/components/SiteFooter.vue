<script setup lang="ts">
import {Instagram, Mail, MapPin, Phone} from 'lucide-vue-next';
import {t} from '../i18n';
import AppLink from './AppLink.vue';
</script>

<template>
  <footer>
    <div class="container footer-grid">
      <div>
        <AppLink to="/" class="brand footer-brand">
          <span class="brand-mark">OB</span>
          <span><b>{{ t('brand.name') }}</b><small>{{ t('brand.tagline') }}</small></span>
        </AppLink>
        <p class="muted">{{ t('footer.blurb') }}</p>
        <div class="social"><Instagram/><Mail/></div>
      </div>

      <div>
        <h4>{{ t('footer.shop') }}</h4>
        <AppLink to="/shop">{{ t('footer.allProducts') }}</AppLink>
        <AppLink to="/best-sellers">{{ t('nav.bestSellers') }}</AppLink>
        <AppLink to="/seasonal">{{ t('nav.seasonal') }}</AppLink>
        <AppLink to="/gift-boxes">{{ t('nav.giftBoxes') }}</AppLink>
      </div>

      <div>
        <h4>{{ t('footer.help') }}</h4>
        <AppLink to="/faq">{{ t('footer.faq') }}</AppLink>
        <AppLink to="/orders">{{ t('nav.orders') }}</AppLink>
        <AppLink to="/contact">{{ t('footer.contact') }}</AppLink>
        <AppLink to="/about">{{ t('nav.ourStory') }}</AppLink>
      </div>

      <div>
        <h4>{{ t('footer.contactHeading') }}</h4>
        <p><MapPin/> {{ t('footer.location') }}</p>
        <p><Phone/> <bdi>+965 6909 9100</bdi></p>
        <p>
          <Instagram/>
          <a href="https://www.instagram.com/one_bite_q8?igsi=MXFjbDNybHppNjJlZw==" target="_blank" rel="noreferrer">
            @one_bite_q8
          </a>
        </p>
        <h4 class="newsletter-title">{{ t('footer.newsletterTitle') }}</h4>
        <div class="newsletter">
          <input :placeholder="t('footer.newsletterPlaceholder')">
          <button>{{ t('footer.newsletterJoin') }}</button>
        </div>
      </div>
    </div>

    <div class="container footer-bottom">
      <span>{{ t('footer.rights') }}</span>
      <span>{{ t('footer.legal') }}</span>
    </div>
  </footer>
</template>
