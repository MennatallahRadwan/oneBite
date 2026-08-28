import {createRouter, createWebHistory, type RouteRecordRaw} from 'vue-router';
import {applyDocumentLocale, locale, localeFromPath, localePath, storedLocale} from '../i18n';
import {applySeo} from '../seo';
import Home from '../views/Home.vue';
import Listing from '../views/Listing.vue';
import Categories from '../views/Categories.vue';
import Product from '../views/Product.vue';
import Cart from '../views/Cart.vue';
import Checkout from '../views/Checkout.vue';
import Wishlist from '../views/Wishlist.vue';
import Search from '../views/Search.vue';
import StaticPage from '../views/StaticPage.vue';
import Profile from '../views/Profile.vue';
import OrderTracking from '../views/OrderTracking.vue';
import TrackOrder from '../views/TrackOrder.vue';
import Admin from '../views/Admin.vue';
import NotFound from '../views/NotFound.vue';

// Declared once, then mounted twice: at the root for English and under /ar for
// Arabic, so each language has its own shareable, indexable URL.
const pages: RouteRecordRaw[] = [
  {path: '/', component: Home},
  {path: '/shop', component: Listing, props: {mode: 'all'}},
  {path: '/best-sellers', component: Listing, props: {mode: 'best'}},
  {path: '/seasonal', component: Listing, props: {mode: 'seasonal'}},
  {path: '/gift-boxes', component: Listing, props: {mode: 'gift'}},
  {path: '/categories', component: Categories},
  {path: '/product/:id', component: Product},
  {path: '/cart', component: Cart},
  {path: '/checkout', component: Checkout},
  {path: '/wishlist', component: Wishlist},
  {path: '/search', component: Search},
  {path: '/profile', component: Profile},
  {path: '/admin', component: Admin},
  {path: '/track', component: TrackOrder},
  {path: '/order/:id', component: OrderTracking},
  {path: '/about', component: StaticPage, props: {type: 'about'}},
  {path: '/faq', component: StaticPage, props: {type: 'faq'}},
  {path: '/contact', component: StaticPage, props: {type: 'contact'}}
];

const arabicPages: RouteRecordRaw[] = pages.map(page => ({
  ...page,
  path: page.path === '/' ? '/ar' : `/ar${page.path}`
}));

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: to => (to.hash ? {el: to.hash, top: 90} : {top: 0}),
  routes: [...pages, ...arabicPages, {path: '/:pathMatch(.*)*', component: NotFound}]
});

router.beforeEach(to => {
  const requested = localeFromPath(to.path);

  // An unprefixed URL honours a remembered Arabic preference by redirecting to
  // its Arabic twin, so the choice survives a new session. Switching back to
  // English stores 'en', which stops this from fighting the toggle.
  if (requested === 'en' && storedLocale() === 'ar') {
    return {path: localePath(to.path, 'ar'), query: to.query, hash: to.hash, replace: true};
  }

  locale.value = requested;
  return true;
});

router.afterEach(to => {
  applyDocumentLocale();
  applySeo(to);
});

export default router;
