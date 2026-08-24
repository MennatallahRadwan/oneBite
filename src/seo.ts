import type {RouteLocationNormalizedLoaded} from 'vue-router';
import {basePath, locale, localePath, type Locale} from './i18n';

const siteName = 'One Bite';

const titles: Record<string, Record<Locale, string>> = {
  '/': {en: 'Premium Bakery in Kuwait', ar: 'مخبز فاخر في الكويت'},
  '/shop': {en: 'Shop Cakes and Pastries', ar: 'تسوق الكيك والمعجنات'},
  '/best-sellers': {en: 'Best Sellers', ar: 'الأكثر مبيعًا'},
  '/seasonal': {en: 'Seasonal Collection', ar: 'المجموعة الموسمية'},
  '/gift-boxes': {en: 'Gift Boxes', ar: 'صناديق الهدايا'},
  '/categories': {en: 'Bakery Categories', ar: 'تصنيفات المخبز'},
  '/cart': {en: 'Cart', ar: 'السلة'},
  '/checkout': {en: 'Checkout', ar: 'إتمام الطلب'},
  '/wishlist': {en: 'Wishlist', ar: 'المفضلة'},
  '/search': {en: 'Search', ar: 'البحث'},
  '/profile': {en: 'Customer Account', ar: 'حساب العميل'},
  '/track': {en: 'Track an Order', ar: 'تتبع طلب'},
  '/about': {en: 'About One Bite', ar: 'عن ون بايت'},
  '/faq': {en: 'FAQ', ar: 'الأسئلة الشائعة'},
  '/contact': {en: 'Contact', ar: 'تواصل معنا'}
};

const descriptions: Record<string, Record<Locale, string>> = {
  '/': {
    en: 'Premium cakes, pastries and gift boxes baked fresh in Kuwait.',
    ar: 'كيك ومعجنات وصناديق هدايا فاخرة تُخبز طازجة في الكويت.'
  },
  '/shop': {
    en: 'Browse One Bite cakes, pastries, cheesecakes, cookies and sweets.',
    ar: 'تصفح كيك ومعجنات وتشيز كيك وبسكويت وحلويات ون بايت.'
  },
  '/gift-boxes': {
    en: 'Curated bakery gift boxes for birthdays, visits and celebrations.',
    ar: 'صناديق هدايا مخبوزات مختارة للزيارات والمناسبات والاحتفالات.'
  }
};

function upsertMeta(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = name;
    document.head.append(tag);
  }
  tag.content = content;
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  let tag = document.head.querySelector<HTMLLinkElement>(selector);
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    if (hreflang) tag.hreflang = hreflang;
    document.head.append(tag);
  }
  tag.href = href;
}

export function applySeo(route: RouteLocationNormalizedLoaded) {
  const path = basePath(route.path);
  const current = locale.value;
  const title =
    titles[path]?.[current] ??
    (path.startsWith('/product/')
      ? current === 'ar'
        ? 'تفاصيل المنتج'
        : 'Product Details'
      : siteName);
  const description =
    descriptions[path]?.[current] ??
    (current === 'ar'
      ? 'مخبز ون بايت في الكويت للكيك والمعجنات والهدايا.'
      : 'One Bite bakery in Kuwait for cakes, pastries and gifts.');
  const origin = window.location.origin;

  document.title = `${title} | ${siteName}`;
  upsertMeta('description', description);
  upsertLink('canonical', `${origin}${localePath(path, current)}`);
  upsertLink('alternate', `${origin}${localePath(path, 'en')}`, 'en');
  upsertLink('alternate', `${origin}${localePath(path, 'ar')}`, 'ar');
  upsertLink('alternate', `${origin}${localePath(path, 'en')}`, 'x-default');
}
