<script setup lang="ts">
import {Instagram, Mail, MapPin, Phone} from 'lucide-vue-next';
</script>

<template>
  <footer>
    <div class="container footer-grid">
      <div>
        <RouterLink to="/" class="brand footer-brand">
          <span class="brand-mark">OB</span>
          <span><b>ONE BITE</b><small>premium bakery</small></span>
        </RouterLink>
        <p class="muted">
          Baked with love in Kuwait. Premium cakes, pastries and gifts delivered fresh to your door.
        </p>
        <div class="social"><Instagram/><Mail/></div>
      </div>

      <div>
        <h4>Shop</h4>
        <RouterLink to="/shop">All products</RouterLink>
        <RouterLink to="/best-sellers">Best sellers</RouterLink>
        <RouterLink to="/seasonal">Seasonal</RouterLink>
        <RouterLink to="/gift-boxes">Gift boxes</RouterLink>
      </div>

      <div>
        <h4>Help</h4>
        <RouterLink to="/faq">FAQ</RouterLink>
        <RouterLink to="/order/OB-24071">Track order</RouterLink>
        <RouterLink to="/contact">Contact us</RouterLink>
        <RouterLink to="/about">Our story</RouterLink>
      </div>

      <div>
        <h4>Contact</h4>
        <p><MapPin/> Kuwait City, Kuwait</p>
        <p><Phone/> +965 2222 1000</p>
        <p><Mail/> hello@onebite.com</p>
        <h4 class="newsletter-title">The sweet list</h4>
        <div class="newsletter">
          <input placeholder="Your email address">
          <button>Join</button>
        </div>
      </div>
    </div>

    <div class="container footer-bottom">
      <span>© 2026 One Bite Bakery</span>
      <span>Privacy · Terms · Allergens</span>
    </div>
  </footer>
</template>
