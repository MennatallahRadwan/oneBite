import 'dotenv/config';
import {prisma} from '../src/db.js';

const img = (id: string, w = 900, h = 700) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=82`;

const productImages = {
  largeBox: '/images/products/bteforlarge.png',
  filledMalbanCookies: '/images/products/cookiesfilledmalban.png',
  plainCookies: '/images/products/plaincookies.png',
  sugarCookies: '/images/products/sugarcookes.png',
  regularBox: '/images/products/bteforregular.png',
  vanillaBtefor: '/images/products/vanillabtefor.png',
  chocoBtefor: '/images/products/chocobtefor.png',
  giftBox: '/images/products/giftBox.png'
};

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
  tagsAr: string[];
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
    slug: 'kahk',
    nameEn: 'Kahk',
    nameAr: 'كحك',
    descriptionEn: 'Buttery, soft, crumbly cookies for every occasion',
    descriptionAr: 'كوكيز زبدية طرية وهشة تناسب كل المناسبات',
    imageUrl: productImages.plainCookies
  },
  {
    slug: 'butter-cookies',
    nameEn: 'Butter Cookies',
    nameAr: 'بسكويت الزبدة',
    descriptionEn: 'Classic butter cookies in plain, sugar and filled styles',
    descriptionAr: 'بسكويت زبدة كلاسيكي سادة وبالسكر ومحشو',
    imageUrl: productImages.regularBox
  },
  {
    slug: 'gift-box',
    nameEn: 'Gift Box',
    nameAr: 'صندوق هدايا',
    descriptionEn: 'Elegant boxed selections ready for gifting',
    descriptionAr: 'تشكيلات أنيقة في صناديق جاهزة للإهداء',
    imageUrl: productImages.giftBox
  }
];

const activeCategorySlugs = categories.map(category => category.slug);

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
    category: 'kahk',
    nameEn: 'Kahk with Malban',
    nameAr: 'كحك بالملبن',
    descriptionEn:
      'Rich dark chocolate layers with silky truffle ganache, Belgian chocolate curls and edible gold leaf.',
    descriptionAr: 'طبقات شوكولاتة داكنة غنية مع غاناش الترافل الناعم ورقائق الشوكولاتة البلجيكية.',
    price: 8.5,
    image: productImages.plainCookies,
    tags: ['Signature'],
    tagsAr: ['مميز'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    bestSeller: true,
    ...cakeOptions
  },
  {
    slug: 'lotus-cheesecake',
    category: 'butter-cookies',
    nameEn: 'Cookies Regular Box',
    nameAr: 'علبة بتيفور متوسطة',
    descriptionEn: 'Creamy New York-style cheesecake on a buttery Lotus biscuit base.',
    descriptionAr: 'تشيز كيك كريمي على طريقة نيويورك على قاعدة بسكويت لوتس بالزبدة.',
    price: 6.5,
    image: productImages.regularBox,
    tags: ['Signature'],
    tagsAr: ['مميز'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    bestSeller: true,
    ...cakeOptions
  },
  {
    slug: 'pistachio-rose-kunafa',
    category: 'kahk',
    nameEn: 'Plain Kahk',
    nameAr: 'كحك سادة',
    descriptionEn:
      'Fine kunafa threads with pistachio cream, rose water syrup and crushed pistachios.',
    descriptionAr: 'خيوط كنافة ناعمة مع كريمة الفستق وشراب ماء الورد والفستق المجروش.',
    price: 5,
    image: productImages.filledMalbanCookies,
    tags: ['New'],
    tagsAr: ['جديد'],
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
    category: 'kahk',
    nameEn: 'Kahk with Sugar',
    nameAr: 'كحك بالسكر',
    descriptionEn: 'Light vanilla sponge with Madagascar vanilla bean cream and fresh berries.',
    descriptionAr: 'إسفنج فانيلا خفيف مع كريمة فانيلا مدغشقر والتوت الطازج.',
    price: 7,
    image: productImages.sugarCookies,
    tags: ['Signature'],
    tagsAr: ['مميز'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    slug: 'caramel-croissant',
    category: 'gift-box',
    nameEn: 'Gift Box',
    nameAr: 'علبة الهدايا',
    descriptionEn: 'Buttery laminated croissant filled with house-made salted caramel cream.',
    descriptionAr: 'كرواسون بالزبدة محشو بكريمة الكراميل المملح المصنوعة في المخبز.',
    price: 1.5,
    image: productImages.giftBox,
    tags: ['Fresh daily'],
    tagsAr: ['طازج يوميًا'],
    servingsEn: '1 piece',
    servingsAr: 'قطعة واحدة',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    bestSeller: true,
    giftable: true,
    variants: [
      {id: 'single', nameEn: 'Single', nameAr: 'قطعة', price: 0, points: 1, leadDays: 1},
      {id: 'box6', nameEn: 'Box of 6', nameAr: 'علبة ٦ قطع', price: 7, points: 5, leadDays: 2}
    ]
  },
  {
    slug: 'red-velvet-cake',
    category: 'butter-cookies',
    nameEn: 'Cookies Large Box',
    nameAr: 'علبة بتيفور كبيرة',
    descriptionEn: 'Classic red velvet layers with velvety cream cheese frosting.',
    descriptionAr: 'طبقات المخمل الأحمر الكلاسيكية مع كريمة الجبن المخملية.',
    price: 8,
    image: productImages.largeBox,
    tags: ['Classic'],
    tagsAr: ['كلاسيكي'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    slug: 'biscoff-tiramisu',
    category: 'butter-cookies',
    nameEn: 'Vanilla Cookies',
    nameAr: 'بتيفور بالفانيلا',
    descriptionEn: 'Coffee-soaked ladyfingers with mascarpone cream and Biscoff crumble.',
    descriptionAr: 'أصابع السيدة المنقوعة بالقهوة مع كريمة الماسكربوني وفتات البسكوف.',
    price: 6,
    image: productImages.vanillaBtefor,
    tags: ['New'],
    tagsAr: ['جديد'],
    servingsEn: '6–8 servings',
    servingsAr: '٦–٨ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    slug: 'date-tahini-cookies',
    category: 'butter-cookies',
    nameEn: 'Chocolate Cookies',
    nameAr: 'بتيفور بالشوكولاتة',
    descriptionEn: 'Medjool dates, tahini and sesame in a soft-baked cookie.',
    descriptionAr: 'تمر المجدول والطحينة والسمسم في بسكويت طري.',
    price: 3.5,
    image: productImages.chocoBtefor,
    tags: ['Signature'],
    tagsAr: ['مميز'],
    servingsEn: '12 cookies',
    servingsAr: '١٢ قطعة',
    allergens: ['Gluten', 'Sesame', 'Nuts'],
    bestSeller: true,
    variants: [{id: 'box', nameEn: 'Box of 12', nameAr: 'علبة ١٢ قطعة', price: 0, points: 3, leadDays: 1}]
  }
];

const activeProductSlugs = products.map(product => product.slug);

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

  // Keep old category rows out of the storefront after the catalog is narrowed.
  await prisma.category.updateMany({
    where: {slug: {notIn: activeCategorySlugs}, products: {none: {}}},
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
      tagsAr: product.tagsAr,
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

  await prisma.product.updateMany({
    where: {slug: {notIn: activeProductSlugs}},
    data: {published: false, active: false, archivedAt: new Date()}
  });
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
