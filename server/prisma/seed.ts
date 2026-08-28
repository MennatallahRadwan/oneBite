import 'dotenv/config';
import {prisma} from '../src/db.js';

const productImages = {
  largeBox: '/images/products/bteforlarge.png',
  filledMalban: '/images/products/filledmalban.png',
  filledMalbanCookies: '/images/products/cookiesfilledmalban.png',
  filledWalnuts: '/images/products/filledgoz.png',
  filledDates: '/images/products/filledates.png',
  plainCookies: '/images/products/plaincookies.png',
  sugarCookies: '/images/products/sugarcookes.png',
  regularBox: '/images/products/bteforregular.png',
  vanillaBtefor: '/images/products/vanillabtefor.png',
  chocoBtefor: '/images/products/chocobtefor.png',
  filledCookies: '/images/products/filledcookies.png',
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

const retiredCategorySlugs = [
  'cakes',
  'pastries',
  'cheesecakes',
  'oriental',
  'tarts',
  'cookies',
  'giftboxes',
  'seasonal'
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
    category: 'kahk',
    nameEn: 'Kahk with Malban',
    nameAr: 'كحك بالملبن',
    descriptionEn: 'Soft, buttery kahk filled with sweet malban for a rich traditional taste.',
    descriptionAr: 'كحك ناعم وهش محشو بالملبن الحلو بطعم شرقي أصيل.',
    price: 12,
    image: productImages.filledMalban,
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
    descriptionEn: 'A delicious selection of fresh cookies in a convenient regular-size box.',
    descriptionAr: 'تشكيلة شهية من البتيفور الطازج في علبة بحجم مناسب.',
    price: 7,
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
    descriptionEn: 'Classic buttery kahk with a soft, crumbly texture and traditional flavor.',
    descriptionAr: 'كحك سادة بطعم زبدي أصيل وقوام ناعم وهش.',
    price: 10,
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
    descriptionEn: 'Traditional kahk topped with powdered sugar for a sweet, delicate finish.',
    descriptionAr: 'كحك تقليدي مغطى بالسكر البودرة لمذاق حلو وخفيف.',
    price: 10.5,
    image: productImages.sugarCookies,
    tags: ['Signature'],
    tagsAr: ['مميز'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    slug: 'kahk-filled-walnuts',
    category: 'kahk',
    nameEn: 'Kahk with Walnuts',
    nameAr: 'كحك بالجوز',
    descriptionEn: 'Soft, buttery kahk filled with crunchy walnuts for a rich nutty flavor.',
    descriptionAr: 'كحك ناعم وهش محشو بعين الجمل المقرمش لمذاق غني ولذيذ.',
    price: 14,
    image: productImages.filledWalnuts,
    tags: ['New'],
    tagsAr: ['جديد'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs', 'Nuts'],
    variants: [
      {id: 'box', nameEn: 'Sharing box', nameAr: 'صندوق للمشاركة', price: 0, points: 6, leadDays: 2}
    ]
  },
  {
    slug: 'kahk-filled-dates',
    category: 'kahk',
    nameEn: 'Kahk with Dates',
    nameAr: 'كحك بالعجوة',
    descriptionEn: 'Traditional kahk filled with sweet dates for a warm, classic flavor.',
    descriptionAr: 'كحك تقليدي محشو بالعجوة الحلوة لمذاق دافئ وكلاسيكي.',
    price: 11,
    image: productImages.filledDates,
    tags: ['New'],
    tagsAr: ['جديد'],
    servingsEn: '8–10 servings',
    servingsAr: '٨–١٠ حصص',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    variants: [
      {id: 'box', nameEn: 'Sharing box', nameAr: 'صندوق للمشاركة', price: 0, points: 6, leadDays: 2}
    ]
  },
  {
    slug: 'caramel-croissant',
    category: 'gift-box',
    nameEn: 'Gift Box',
    nameAr: 'علبة الهدايا',
    descriptionEn: 'An elegant box filled with a delicious assortment of cookies, perfect for gifting.',
    descriptionAr: 'علبة أنيقة تضم تشكيلة شهية من البتيفور، مثالية للهدايا.',
    price: 15,
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
    descriptionEn: 'A generous selection of fresh cookies, perfect for sharing with family and friends.',
    descriptionAr: 'تشكيلة كبيرة من البتيفور الطازج، مثالية للمشاركة مع العائلة والأصدقاء.',
    price: 9,
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
    descriptionEn: 'Light, buttery vanilla cookies with a soft, delicate flavor.',
    descriptionAr: 'بتيفور فانيليا خفيف وهش بطعم زبدي ناعم ولذيذ.',
    price: 5.5,
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
    descriptionEn: 'Rich chocolate cookies with a soft texture and deep cocoa flavor.',
    descriptionAr: 'بتيفور شوكولاتة غني بقوام ناعم ونكهة كاكاو مميزة.',
    price: 5.5,
    image: productImages.chocoBtefor,
    tags: ['Signature'],
    tagsAr: ['مميز'],
    servingsEn: '12 cookies',
    servingsAr: '١٢ قطعة',
    allergens: ['Gluten', 'Sesame', 'Nuts'],
    bestSeller: true,
    variants: [{id: 'box', nameEn: 'Box of 12', nameAr: 'علبة ١٢ قطعة', price: 0, points: 3, leadDays: 1}]
  },
  {
    slug: 'filled-cookies',
    category: 'butter-cookies',
    nameEn: 'Filled Cookies',
    nameAr: 'بتيفور محشو',
    descriptionEn: 'Buttery sandwich cookies filled with smooth, sweet centers in a mixed assortment.',
    descriptionAr: 'بتيفور زبدي محشو بحشوات ناعمة وحلوة ضمن تشكيلة متنوعة.',
    price: 7.25,
    image: productImages.filledCookies,
    tags: ['New'],
    tagsAr: ['جديد'],
    servingsEn: '12 cookies',
    servingsAr: '١٢ قطعة',
    allergens: ['Gluten', 'Dairy', 'Eggs', 'Nuts'],
    variants: [{id: 'box', nameEn: 'Box of 12', nameAr: 'علبة ١٢ قطعة', price: 0, points: 4, leadDays: 1}]
  }
];

const retiredProductSlugs = [
  'cinnamon-roll',
  'classic-gift-box',
  'eid-gift-box',
  'mango-passion-tart',
  'matcha-white-chocolate'
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

}

// These slugs belonged to the original prototype catalog. Delete them when they
// have no products so admin views do not keep showing dummy categories. This runs
// after seedProducts, because the prototype products are only moved off these
// categories there - cleaning up earlier would always find them non-empty.
async function cleanupRetiredCategories() {
  await prisma.category.deleteMany({
    where: {slug: {in: retiredCategorySlugs}, products: {none: {}}}
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

  const retiredProducts = await prisma.product.findMany({
    where: {slug: {in: retiredProductSlugs}},
    select: {id: true}
  });
  const retiredProductIds = retiredProducts.map(product => product.id);

  if (retiredProductIds.length) {
    await prisma.productAddon.deleteMany({where: {productId: {in: retiredProductIds}}});
    await prisma.productVariant.deleteMany({where: {productId: {in: retiredProductIds}}});
    await prisma.wishlistItem.deleteMany({where: {productId: {in: retiredProductIds}}});
    await prisma.product.deleteMany({where: {id: {in: retiredProductIds}}});
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
  await cleanupRetiredCategories();
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
