export type Variant = {id: string; name: string; price: number; points: number; leadDays: number};
export type Addon = {id: string; name: string; price: number; points: number};

export type Product = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  price: number;
  category: string;
  image: string;
  tags: string[];
  best?: boolean;
  seasonal?: boolean;
  gift?: boolean;
  servings?: string;
  allergens?: string[];
  variants?: Variant[];
  addons?: Addon[];
  cakeText?: {maxLength: number; price: number; points: number};
  available?: boolean;
};

export const img = (id: string, w = 900, h = 700) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=82`;

export const money = (value: number) => `KWD ${value.toFixed(3)}`;

export const categories = [
  {
    id: 'cakes',
    name: 'Cakes',
    nameAr: 'الكيكات',
    description: 'Layered cakes crafted for every occasion',
    image: img('1578985545062-69928b1d9587')
  },
  {
    id: 'pastries',
    name: 'Pastries',
    nameAr: 'المعجنات',
    description: 'Buttery baked goods fresh each morning',
    image: img('1555507036-ab1f4038808a')
  },
  {
    id: 'cheesecakes',
    name: 'Cheesecakes',
    nameAr: 'تشيز كيك',
    description: 'Creamy, indulgent in every flavor',
    image: img('1565958011703-44f9829ba187')
  },
  {
    id: 'oriental',
    name: 'Oriental Sweets',
    nameAr: 'حلويات شرقية',
    description: 'Traditional Gulf sweets, modern twist',
    image: img('1603532648955-039310d9ed75')
  },
  {
    id: 'tarts',
    name: 'Tarts & Slices',
    nameAr: 'تارت وشرائح',
    description: 'Elegant tarts with seasonal fruits',
    image: img('1464305795204-6f5bbfc7fb81')
  },
  {
    id: 'cookies',
    name: 'Cookies',
    nameAr: 'بسكويت',
    description: 'Handcrafted cookies baked fresh daily',
    image: img('1499636136210-6f4ee915583e')
  },
  {
    id: 'giftboxes',
    name: 'Gift Boxes',
    nameAr: 'صناديق الهدايا',
    description: 'Curated boxes for gifting occasions',
    image: img('1549465220-1a8b9238cd48')
  },
  {
    id: 'seasonal',
    name: 'Seasonal',
    nameAr: 'موسمي',
    description: 'Limited edition seasonal collections',
    image: img('1558326567-98ae2405596b')
  }
];

const cakeOptions = {
  variants: [
    {id: 'six', name: 'Serves 6–8', price: 0, points: 8, leadDays: 2},
    {id: 'ten', name: 'Serves 10–12', price: 2.5, points: 12, leadDays: 3}
  ],
  addons: [{id: 'gift-box', name: 'Gift packaging', price: 0.75, points: 0}],
  cakeText: {maxLength: 40, price: 0.5, points: 0}
};

export const products: Product[] = [
  {
    id: 'chocolate-truffle-cake',
    name: 'Chocolate Truffle Cake',
    nameAr: 'كيكة تروفيل الشوكولاتة',
    description: 'Rich dark chocolate layers with silky truffle ganache, Belgian chocolate curls and edible gold leaf.',
    price: 8.5,
    category: 'cakes',
    image: img('1578985545062-69928b1d9587'),
    tags: ['Signature'],
    best: true,
    servings: '8–10 servings',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    id: 'lotus-cheesecake',
    name: 'Lotus Cheesecake',
    nameAr: 'تشيز كيك اللوتس',
    description: 'Creamy New York-style cheesecake on a buttery Lotus biscuit base.',
    price: 6.5,
    category: 'cheesecakes',
    image: img('1565958011703-44f9829ba187'),
    tags: ['Signature'],
    best: true,
    servings: '8–10 servings',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    id: 'pistachio-rose-kunafa',
    name: 'Pistachio Rose Kunafa',
    nameAr: 'كنافة الفستق والورد',
    description: 'Fine kunafa threads with pistachio cream, rose water syrup and crushed pistachios.',
    price: 5,
    category: 'oriental',
    image: img('1603532648955-039310d9ed75'),
    tags: ['New'],
    seasonal: true,
    servings: '6–8 servings',
    allergens: ['Gluten', 'Nuts', 'Dairy'],
    variants: [{id: 'box', name: 'Sharing box', price: 0, points: 6, leadDays: 2}]
  },
  {
    id: 'vanilla-bean-cake',
    name: 'Vanilla Bean Cake',
    nameAr: 'كيكة الفانيلا',
    description: 'Light vanilla sponge with Madagascar vanilla bean cream and fresh berries.',
    price: 7,
    category: 'cakes',
    image: img('1542826438-bd32f3d81bbc'),
    tags: ['Signature'],
    servings: '8–10 servings',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    id: 'caramel-croissant',
    name: 'Salted Caramel Croissant',
    nameAr: 'كرواسون الكراميل المملح',
    description: 'Buttery laminated croissant filled with house-made salted caramel cream.',
    price: 1.5,
    category: 'pastries',
    image: img('1555507036-ab1f4038808a'),
    tags: ['Fresh daily'],
    best: true,
    servings: '1 piece',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    variants: [
      {id: 'single', name: 'Single', price: 0, points: 1, leadDays: 1},
      {id: 'box6', name: 'Box of 6', price: 7, points: 5, leadDays: 2}
    ]
  },
  {
    id: 'cinnamon-roll',
    name: 'Classic Cinnamon Roll',
    nameAr: 'رول القرفة',
    description: 'Soft cinnamon rolls with signature cream cheese frosting.',
    price: 2,
    category: 'pastries',
    image: img('1616198814651-e71f960c3180'),
    tags: ['Fresh daily'],
    servings: '1 piece',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    variants: [{id: 'single', name: 'Single', price: 0, points: 1, leadDays: 1}]
  },
  {
    id: 'red-velvet-cake',
    name: 'Red Velvet Dream',
    nameAr: 'كيكة المخمل الأحمر',
    description: 'Classic red velvet layers with velvety cream cheese frosting.',
    price: 8,
    category: 'cakes',
    image: img('1551529834-525807d6b4f3'),
    tags: ['Classic'],
    servings: '8–10 servings',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    id: 'mango-passion-tart',
    name: 'Mango Passion Tart',
    nameAr: 'تارت المانجو والباشن',
    description: 'Buttery pastry shell with passionfruit curd and fresh mango.',
    price: 4.5,
    category: 'tarts',
    image: img('1464305795204-6f5bbfc7fb81'),
    tags: ['Seasonal'],
    seasonal: true,
    servings: '6–8 servings',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    variants: [{id: 'tart', name: 'One tart', price: 0, points: 5, leadDays: 2}]
  },
  {
    id: 'biscoff-tiramisu',
    name: 'Biscoff Tiramisu',
    nameAr: 'تيراميسو البسكويت',
    description: 'Coffee-soaked ladyfingers with mascarpone cream and Biscoff crumble.',
    price: 6,
    category: 'cakes',
    image: img('1571877227200-a0d98ea607e9'),
    tags: ['New'],
    servings: '6–8 servings',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    id: 'date-tahini-cookies',
    name: 'Date & Tahini Cookies',
    nameAr: 'بسكويت التمر والطحينة',
    description: 'Medjool dates, tahini and sesame in a soft-baked cookie.',
    price: 3.5,
    category: 'cookies',
    image: img('1499636136210-6f4ee915583e'),
    tags: ['Signature'],
    best: true,
    servings: '12 cookies',
    allergens: ['Gluten', 'Sesame', 'Nuts'],
    variants: [{id: 'box', name: 'Box of 12', price: 0, points: 3, leadDays: 1}]
  },
  {
    id: 'matcha-white-chocolate',
    name: 'Matcha White Choc Cake',
    nameAr: 'كيكة الماتشا والشوكولاتة البيضاء',
    description: 'Ceremonial matcha layers with white chocolate ganache.',
    price: 7.5,
    category: 'cakes',
    image: img('1544025162-d76694265947'),
    tags: ['Specialty'],
    servings: '8–10 servings',
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    ...cakeOptions
  },
  {
    id: 'eid-gift-box',
    name: 'Eid Celebration Box',
    nameAr: 'صندوق هدايا العيد',
    description: 'Signature pastries, macarons and sweets in an elegant keepsake box.',
    price: 18,
    category: 'giftboxes',
    image: img('1549465220-1a8b9238cd48'),
    tags: ['Seasonal'],
    seasonal: true,
    gift: true,
    servings: '15–20 pieces',
    allergens: ['Gluten', 'Dairy', 'Nuts'],
    variants: [{id: 'box', name: 'Celebration box', price: 0, points: 10, leadDays: 3}],
    addons: [{id: 'gift-wrap', name: 'Gift packaging', price: 0.75, points: 0}]
  },
  {
    id: 'classic-gift-box',
    name: 'Classic Gift Box',
    nameAr: 'صندوق الهدايا الكلاسيكي',
    description: 'A refined selection of One Bite favorites, ready to gift.',
    price: 14,
    category: 'giftboxes',
    image: img('1607083206968-13611e3d76db'),
    tags: ['Gift'],
    gift: true,
    servings: '12–16 pieces',
    allergens: ['Gluten', 'Dairy', 'Nuts'],
    variants: [{id: 'box', name: 'Classic box', price: 0, points: 8, leadDays: 2}],
    addons: [{id: 'gift-wrap', name: 'Gift packaging', price: 0.75, points: 0}]
  }
];
