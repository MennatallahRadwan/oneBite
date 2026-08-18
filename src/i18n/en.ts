// English is the source of truth for the key set: ar.ts is typed against it,
// so a missing or misspelled Arabic key fails the build rather than silently
// rendering the key name.
export const en = {
  'locale.name': 'English',
  'locale.switchTo': 'العربية',
  'locale.switchLabel': 'Switch to Arabic',

  'announcement': 'Made to order · Kuwait delivery · Cash on delivery only',

  'brand.name': 'ONE BITE',
  'brand.tagline': 'premium bakery',

  'nav.shop': 'Shop',
  'nav.categories': 'Categories',
  'nav.bestSellers': 'Best Sellers',
  'nav.seasonal': 'Seasonal',
  'nav.giftBoxes': 'Gift Boxes',
  'nav.ourStory': 'Our Story',
  'nav.search': 'Search',
  'nav.account': 'Account',
  'nav.wishlist': 'Wishlist',
  'nav.cart': 'Cart',
  'nav.menu': 'Menu',

  'footer.blurb':
    'Baked with love in Kuwait. Premium cakes, pastries and gifts delivered fresh to your door.',
  'footer.shop': 'Shop',
  'footer.allProducts': 'All products',
  'footer.help': 'Help',
  'footer.faq': 'FAQ',
  'footer.trackOrder': 'Track order',
  'footer.contact': 'Contact us',
  'footer.contactHeading': 'Contact',
  'footer.location': 'Kuwait City, Kuwait',
  'footer.newsletterTitle': 'The sweet list',
  'footer.newsletterPlaceholder': 'Your email address',
  'footer.newsletterJoin': 'Join',
  'footer.rights': '© 2026 One Bite Bakery',
  'footer.legal': 'Privacy · Terms · Allergens'
};

export type Dictionary = typeof en;
export type MessageKey = keyof Dictionary;
