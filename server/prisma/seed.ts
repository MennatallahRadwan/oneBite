import 'dotenv/config';
import {prisma} from '../src/db.js';

const img = (id: string, w = 900, h = 700) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=82`;

// Prices are written in KWD to stay readable against the storefront, and
// converted to the integer fils the schema stores.
const fils = (kwd: number) => Math.round(kwd * 1000);

type SeedVariant = {id: string; nameEn: string; nameAr: string; price: number; points: number; leadDays: number};
type SeedAddon = {id: string; nameEn: string; nameAr: string; price: number; points: number};

type SeedProduct = {
  slug: string;
  category: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number;
  image: string;
  tags: string[];
  servingsEn?: string;
  servingsAr?: string;
  allergens: string[];
  bestSeller?: boolean;
  seasonal?: boolean;
  giftable?: boolean;
  variants: SeedVariant[];
  addons?: SeedAddon[];
  cakeText?: {maxLength: number; price: number; points: number};
};

const categories = [
  {
    slug: 'cakes',
    nameEn: 'Cakes',
    nameAr: 'الكيكات',
    descriptionEn: 'Layered cakes crafted for every occasion',
    descriptionAr: 'كيكات متعددة الطبقات لكل مناسبة',
    imageUrl: img('1578985545062-69928b1d9587')
  },
  {
    slug: 'pastries',
    nameEn: 'Pastries',
    nameAr: 'المعجنات',
    descriptionEn: 'Buttery baked goods fresh each morning',
    descriptionAr: 'مخبوزات بالزبدة طازجة كل صباح',
    imageUrl: img('1555507036-ab1f4038808a')
  },
  {
    slug: 'cheesecakes',
    nameEn: 'Cheesecakes',
    nameAr: 'تشيز كيك',
    descriptionEn: 'Creamy, indulgent in every flavor',
    descriptionAr: 'كريمية وغنية بكل النكهات',
    imageUrl: img('1565958011703-44f9829ba187')
  },
  {
    slug: 'oriental',
    nameEn: 'Oriental Sweets',
    nameAr: 'حلويات شرقية',
    descriptionEn: 'Traditional Gulf sweets, modern twist',
    descriptionAr: 'حلويات خليجية تقليدية بلمسة عصرية',
    imageUrl: img('1603532648955-039310d9ed75')
  },
  {
    slug: 'tarts',
    nameEn: 'Tarts & Slices',
    nameAr: 'تارت وشرائح',
    descriptionEn: 'Elegant tarts with seasonal fruits',
    descriptionAr: 'تارت أنيقة بالفواكه الموسمية',
    imageUrl: img('1464305795204-6f5bbfc7fb81')
  },
  {
    slug: 'cookies',
    nameEn: 'Cookies',
    nameAr: 'بسكويت',
    descriptionEn: 'Handcrafted cookies baked fresh daily',
    descriptionAr: 'بسكويت مصنوع يدويًا ويخبز طازجًا يوميًا',
    imageUrl: img('1499636136210-6f4ee915583e')
  },
  {
    slug: 'giftboxes',
    nameEn: 'Gift Boxes',
    nameAr: 'صناديق الهدايا',
    descriptionEn: 'Curated boxes for gifting occasions',
    descriptionAr: 'صناديق مختارة لمناسبات الإهداء',
    imageUrl: img('1549465220-1a8b9238cd48')
  },
  {
    slug: 'seasonal',
    nameEn: 'Seasonal',
    nameAr: 'موسمي',
    descriptionEn: 'Limited edition seasonal collections',
    descriptionAr: 'مجموعات موسمية بإصدار محدود',
    imageUrl: img('1558326567-98ae2405596b')
  }
];

const cakeOptions = {
  variants: [
    {id: 'six', nameEn: 'Serves 6–8', nameAr: 'يكفي ٦–٨', price: 0, points: 8, leadDays: 2},
    {id: 'ten', nameEn: 'Serves 10–12', nameAr: 'يكفي ١٠–١٢', price: 2.5, points: 12, leadDays: 3}
  ],
  addons: [{id: 'gift-box', nameEn: 'Gift packaging', nameAr: 'تغليف الهدايا', price: 0.75, points: 0}],
  cakeText: {maxLength: 40, price: 0.5, points: 0}
};

const products: SeedProduct[] = [
  {
    slug: 'chocolate-truffle-cake',
    category: 'cakes',
    nameEn: 'Chocolate Truffle Cake',
    nameAr: 'كيكة تروفيل الشوكولاتة',
    descriptionEn:
      'Rich dark chocolate layers with silky truffle ganache, Belgian chocolate curls and edible gold leaf.',
    descriptionAr: 'طبقات شوكولاتة داكنة غنية مع غاناش الترافل الناعم ورقائق الشوكولاتة البلجيكية.',
    price: 8.5,
    image: img('1578985545062-69928b1d9587'),
    tags: ['Signature'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    bestSeller: true,
    ...cakeOptions
  },
  {
    slug: 'lotus-cheesecake',
    category: 'cheesecakes',
    nameEn: 'Lotus Cheesecake',
    nameAr: 'تشيز كيك اللوتس',
    descriptionEn: 'Creamy New York-style cheesecake on a buttery Lotus biscuit base.',
    descriptionAr: 'تشيز كيك كريمي على طريقة نيويورك على قاعدة بسكويت لوتس بالزبدة.',
    price: 6.5,
    image: img('1565958011703-44f9829ba187'),
    tags: ['Signature'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    bestSeller: true,
    ...cakeOptions
  },
  {
    slug: 'pistachio-rose-kunafa',
    category: 'oriental',
    nameEn: 'Pistachio Rose Kunafa',
    nameAr: 'كنافة الفستق والورد',
    descriptionEn:
      'Fine kunafa threads with pistachio cream, rose water syrup and crushed pistachios.',
    descriptionAr: 'خيوط كنافة ناعمة مع كريمة الفستق وشراب ماء الورد والفستق المجروش.',
    price: 5,
    image: img('1603532648955-039310d9ed75'),
    tags: ['New'],
    servingsEn: '6–8 servings',
    servingsAr: '٦–٨ حصص',
    allergens: ['Gluten', 'Nuts', 'Dairy'],
    seasonal: true,
    variants: [
      {id: 'box', nameEn: 'Sharing box', nameAr: 'صندوق للمشاركة', price: 0, points: 6, leadDays: 2}
    ]
  },
  {
    slug: 'vanilla-bean-cake',
    category: 'cakes',
    nameEn: 'Vanilla Bean Cake',
    nameAr: 'كيكة الفانيلا',
    descriptionEn: 'Light vanilla sponge with Madagascar vanilla bean cream and fresh berries.',
    descriptionAr: 'إسفنج فانيلا خفيف مع كريمة فانيلا مدغشقر والتوت الطازج.',
    price: 7,
    image: img('1542826438-bd32f3d81bbc'),
    tags: ['Signature'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    slug: 'caramel-croissant',
    category: 'pastries',
    nameEn: 'Salted Caramel Croissant',
    nameAr: 'كرواسون الكراميل المملح',
    descriptionEn: 'Buttery laminated croissant filled with house-made salted caramel cream.',
    descriptionAr: 'كرواسون بالزبدة محشو بكريمة الكراميل المملح المصنوعة في المخبز.',
    price: 1.5,
    image: img('1555507036-ab1f4038808a'),
    tags: ['Fresh daily'],
    servingsEn: '1 piece',
    servingsAr: 'قطعة واحدة',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    bestSeller: true,
    variants: [
      {id: 'single', nameEn: 'Single', nameAr: 'قطعة', price: 0, points: 1, leadDays: 1},
      {id: 'box6', nameEn: 'Box of 6', nameAr: 'علبة ٦ قطع', price: 7, points: 5, leadDays: 2}
    ]
  },
  {
    slug: 'cinnamon-roll',
    category: 'pastries',
    nameEn: 'Classic Cinnamon Roll',
    nameAr: 'رول القرفة',
    descriptionEn: 'Soft cinnamon rolls with signature cream cheese frosting.',
    descriptionAr: 'رول قرفة طري مع كريمة الجبن المميزة.',
    price: 2,
    image: img('1616198814651-e71f960c3180'),
    tags: ['Fresh daily'],
    servingsEn: '1 piece',
    servingsAr: 'قطعة واحدة',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    variants: [{id: 'single', nameEn: 'Single', nameAr: 'قطعة', price: 0, points: 1, leadDays: 1}]
  },
  {
    slug: 'red-velvet-cake',
    category: 'cakes',
    nameEn: 'Red Velvet Dream',
    nameAr: 'كيكة المخمل الأحمر',
    descriptionEn: 'Classic red velvet layers with velvety cream cheese frosting.',
    descriptionAr: 'طبقات المخمل الأحمر الكلاسيكية مع كريمة الجبن المخملية.',
    price: 8,
    image: img('1551529834-525807d6b4f3'),
    tags: ['Classic'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    slug: 'mango-passion-tart',
    category: 'tarts',
    nameEn: 'Mango Passion Tart',
    nameAr: 'تارت المانجو والباشن',
    descriptionEn: 'Buttery pastry shell with passionfruit curd and fresh mango.',
    descriptionAr: 'قاعدة عجين بالزبدة مع كريمة الباشن فروت والمانجو الطازج.',
    price: 4.5,
    image: img('1464305795204-6f5bbfc7fb81'),
    tags: ['Seasonal'],
    servingsEn: '6–8 servings',
    servingsAr: '٦–٨ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    seasonal: true,
    variants: [{id: 'tart', nameEn: 'One tart', nameAr: 'تارت واحدة', price: 0, points: 5, leadDays: 2}]
  },
  {
    slug: 'biscoff-tiramisu',
    category: 'cakes',
    nameEn: 'Biscoff Tiramisu',
    nameAr: 'تيراميسو البسكويت',
    descriptionEn: 'Coffee-soaked ladyfingers with mascarpone cream and Biscoff crumble.',
    descriptionAr: 'أصابع السيدة المنقوعة بالقهوة مع كريمة الماسكربوني وفتات البسكوف.',
    price: 6,
    image: img('1571877227200-a0d98ea607e9'),
    tags: ['New'],
    servingsEn: '6–8 servings',
    servingsAr: '٦–٨ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    slug: 'date-tahini-cookies',
    category: 'cookies',
    nameEn: 'Date & Tahini Cookies',
    nameAr: 'بسكويت التمر والطحينة',
    descriptionEn: 'Medjool dates, tahini and sesame in a soft-baked cookie.',
    descriptionAr: 'تمر المجدول والطحينة والسمسم في بسكويت طري.',
    price: 3.5,
    image: img('1499636136210-6f4ee915583e'),
    tags: ['Signature'],
    servingsEn: '12 cookies',
    servingsAr: '١٢ قطعة',
    allergens: ['Gluten', 'Sesame', 'Nuts'],
    bestSeller: true,
    variants: [{id: 'box', nameEn: 'Box of 12', nameAr: 'علبة ١٢ قطعة', price: 0, points: 3, leadDays: 1}]
  },
  {
    slug: 'matcha-white-chocolate',
    category: 'cakes',
    nameEn: 'Matcha White Choc Cake',
    nameAr: 'كيكة الماتشا والشوكولاتة البيضاء',
    descriptionEn: 'Ceremonial matcha layers with white chocolate ganache.',
    descriptionAr: 'طبقات ماتشا احتفالية مع غاناش الشوكولاتة البيضاء.',
    price: 7.5,
    image: img('1544025162-d76694265947'),
    tags: ['Specialty'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    slug: 'eid-gift-box',
    category: 'giftboxes',
    nameEn: 'Eid Celebration Box',
    nameAr: 'صندوق هدايا العيد',
    descriptionEn: 'Signature pastries, macarons and sweets in an elegant keepsake box.',
    descriptionAr: 'معجنات وماكرون وحلويات مميزة في صندوق أنيق للاحتفاظ به.',
    price: 18,
    image: img('1549465220-1a8b9238cd48'),
    tags: ['Seasonal'],
    servingsEn: '15–20 pieces',
    servingsAr: '١٥–٢٠ قطعة',
    allergens: ['Gluten', 'Dairy', 'Nuts'],
    seasonal: true,
    giftable: true,
    variants: [
      {id: 'box', nameEn: 'Celebration box', nameAr: 'صندوق الاحتفال', price: 0, points: 10, leadDays: 3}
    ],
    addons: [
      {id: 'gift-wrap', nameEn: 'Gift packaging', nameAr: 'تغليف الهدايا', price: 0.75, points: 0}
    ]
  },
  {
    slug: 'classic-gift-box',
    category: 'giftboxes',
    nameEn: 'Classic Gift Box',
    nameAr: 'صندوق الهدايا الكلاسيكي',
    descriptionEn: 'A refined selection of One Bite favorites, ready to gift.',
    descriptionAr: 'تشكيلة مختارة من أفضل منتجات ون بايت، جاهزة للإهداء.',
    price: 14,
    image: img('1607083206968-13611e3d76db'),
    tags: ['Gift'],
    servingsEn: '12–16 pieces',
    servingsAr: '١٢–١٦ قطعة',
    allergens: ['Gluten', 'Dairy', 'Nuts'],
    giftable: true,
    variants: [
      {id: 'box', nameEn: 'Classic box', nameAr: 'الصندوق الكلاسيكي', price: 0, points: 8, leadDays: 2}
    ],
    addons: [
      {id: 'gift-wrap', nameEn: 'Gift packaging', nameAr: 'تغليف الهدايا', price: 0.75, points: 0}
    ]
  }
];

const deliveryAreas = [
  {id: 'seed-salmiya', nameEn: 'Salmiya', nameAr: 'السالمية', feeFils: 1500},
  {id: 'seed-kuwait-city', nameEn: 'Kuwait City', nameAr: 'مدينة الكويت', feeFils: 1500},
  {id: 'seed-hawally', nameEn: 'Hawally', nameAr: 'حولي', feeFils: 1500},
  {id: 'seed-jabriya', nameEn: 'Jabriya', nameAr: 'الجابرية', feeFils: 1750},
  {id: 'seed-farwaniya', nameEn: 'Farwaniya', nameAr: 'الفروانية', feeFils: 2000},
  {id: 'seed-mangaf', nameEn: 'Mangaf', nameAr: 'المنقف', feeFils: 2500},
  {id: 'seed-jahra', nameEn: 'Jahra', nameAr: 'الجهراء', feeFils: 3000}
];

const deliveryWindows = [
  ['10:00', '13:00'],
  ['16:00', '19:00']
];

const horizonDays = 30;
const dailyProductionPoints = 60;
const slotCapacity = 20;

async function seedCategories() {
  for (const [index, category] of categories.entries()) {
    const data = {...category, sortOrder: index};
    await prisma.category.upsert({
      where: {slug: category.slug},
      create: data,
      update: {...data, archivedAt: null}
    });
  }

  // The original seed used a 'gift-boxes' slug that the storefront never
  // linked to; 'giftboxes' replaces it. Archive rather than delete so any
  // product still pointing at it keeps its foreign key.
  await prisma.category.updateMany({
    where: {slug: 'gift-boxes', products: {none: {}}},
    data: {archivedAt: new Date()}
  });
}

async function seedProducts() {
  const categoryIds = new Map(
    (await prisma.category.findMany({select: {slug: true, id: true}})).map(row => [row.slug, row.id])
  );

  for (const product of products) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Unknown category "${product.category}" for ${product.slug}`);

    // A product's base points and lead time follow its smallest variant, so a
    // cart priced on the base product is never cheaper than what is bakeable.
    const base = product.variants[0];

    const data = {
      categoryId,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      descriptionEn: product.descriptionEn,
      descriptionAr: product.descriptionAr,
      priceFils: fils(product.price),
      capacityPoints: base.points,
      leadDays: base.leadDays,
      imageUrl: product.image,
      tags: product.tags,
      servingsEn: product.servingsEn ?? null,
      servingsAr: product.servingsAr ?? null,
      allergens: product.allergens,
      bestSeller: product.bestSeller ?? false,
      seasonal: product.seasonal ?? false,
      giftable: product.giftable ?? false,
      cakeTextMaxLength: product.cakeText?.maxLength ?? null,
      cakeTextPriceFils: product.cakeText ? fils(product.cakeText.price) : null,
      cakeTextPoints: product.cakeText?.points ?? null,
      published: true,
      active: true
    };

    const saved = await prisma.product.upsert({
      where: {slug: product.slug},
      create: {slug: product.slug, ...data},
      update: {...data, archivedAt: null}
    });

    await seedOptions(saved.id, product);
  }
}

async function seedOptions(productId: string, product: SeedProduct) {
  const variantId = (variant: SeedVariant) => `seed-${product.slug}-${variant.id}`;
  const addonId = (addon: SeedAddon) => `seed-${product.slug}-${addon.id}`;
  const addons = product.addons ?? [];

  for (const variant of product.variants) {
    const data = {
      nameEn: variant.nameEn,
      nameAr: variant.nameAr,
      priceFils: fils(variant.price),
      capacityPoints: variant.points,
      leadDays: variant.leadDays,
      active: true
    };
    await prisma.productVariant.upsert({
      where: {id: variantId(variant)},
      create: {id: variantId(variant), productId, ...data},
      update: data
    });
  }

  for (const addon of addons) {
    const data = {
      nameEn: addon.nameEn,
      nameAr: addon.nameAr,
      priceFils: fils(addon.price),
      capacityPoints: addon.points,
      active: true
    };
    await prisma.productAddon.upsert({
      where: {id: addonId(addon)},
      create: {id: addonId(addon), productId, ...data},
      update: data
    });
  }

  // Drop options this seed no longer defines so re-running it cannot leave
  // stale choices selectable. Orders snapshot their options as text, so no
  // order data depends on these rows.
  await prisma.productVariant.deleteMany({
    where: {productId, id: {notIn: product.variants.map(variantId)}}
  });
  await prisma.productAddon.deleteMany({
    where: {productId, id: {notIn: addons.length ? addons.map(addonId) : ['none']}}
  });
}

async function seedCapacityAndSlots() {
  const areas = [];
  for (const area of deliveryAreas) {
    areas.push(
      await prisma.deliveryArea.upsert({
        where: {id: area.id},
        create: area,
        update: {nameEn: area.nameEn, nameAr: area.nameAr, feeFils: area.feeFils, active: true}
      })
    );
  }

  for (let offset = 1; offset <= horizonDays; offset++) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + offset);
    if (date.getUTCDay() === 5) continue;

    await prisma.productionCapacity.upsert({
      where: {date},
      create: {date, totalPoints: dailyProductionPoints},
      update: {totalPoints: dailyProductionPoints}
    });

    for (const area of areas) {
      for (const [windowStart, windowEnd] of deliveryWindows) {
        await prisma.deliverySlot.upsert({
          where: {areaId_date_windowStart: {areaId: area.id, date, windowStart}},
          create: {areaId: area.id, date, windowStart, windowEnd, capacity: slotCapacity},
          update: {windowEnd, capacity: slotCapacity}
        });
      }
    }
  }
}

async function main() {
  await seedCategories();
  await seedProducts();
  await seedCapacityAndSlots();

  const [productCount, variantCount, addonCount, areaCount] = await Promise.all([
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.productAddon.count(),
    prisma.deliveryArea.count({where: {active: true}})
  ]);
  console.log(
    `Seeded ${productCount} products, ${variantCount} variants, ${addonCount} add-ons and ${areaCount} delivery areas.`
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
