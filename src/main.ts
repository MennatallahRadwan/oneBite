import {createApp} from 'vue';
import {createPinia} from 'pinia';
import App from './App.vue';
import router from './router';
import {applyDocumentLocale, locale, localeFromPath} from './i18n';
import './style.css';

// Set before mount so the first paint is already in the right direction; the
// router keeps it in sync from then on.
locale.value = localeFromPath(window.location.pathname);
applyDocumentLocale();

createApp(App).use(createPinia()).use(router).mount('#app');
