import 'dotenv/config';
import {prisma} from '../src/db.js';

const categories=[
  {slug:'cakes',nameEn:'Cakes',nameAr:'الكيكات'},
  {slug:'pastries',nameEn:'Pastries',nameAr:'المعجنات'},
  {slug:'cheesecakes',nameEn:'Cheesecakes',nameAr:'تشيز كيك'},
  {slug:'gift-boxes',nameEn:'Gift Boxes',nameAr:'صناديق الهدايا'}
];

async function main(){
  for(const category of categories)await prisma.category.upsert({where:{slug:category.slug},create:category,update:{nameEn:category.nameEn,nameAr:category.nameAr,archivedAt:null}});
  const cakes=await prisma.category.findUniqueOrThrow({where:{slug:'cakes'}});
  const pastries=await prisma.category.findUniqueOrThrow({where:{slug:'pastries'}});
  const products=[
    {slug:'chocolate-truffle-cake',categoryId:cakes.id,nameEn:'Chocolate Truffle Cake',nameAr:'كيكة تروفيل الشوكولاتة',descriptionEn:'Rich dark chocolate layers with silky truffle ganache.',descriptionAr:'طبقات شوكولاتة داكنة غنية مع غاناش الترافل الناعم.',priceFils:8500,capacityPoints:8,leadDays:2},
    {slug:'lotus-cheesecake',categoryId:cakes.id,nameEn:'Lotus Cheesecake',nameAr:'تشيز كيك اللوتس',descriptionEn:'Creamy cheesecake on a buttery Lotus biscuit base.',descriptionAr:'تشيز كيك كريمي على قاعدة بسكويت لوتس بالزبدة.',priceFils:6500,capacityPoints:8,leadDays:2},
    {slug:'caramel-croissant',categoryId:pastries.id,nameEn:'Salted Caramel Croissant',nameAr:'كرواسون الكراميل المملح',descriptionEn:'Buttery croissant with salted caramel cream.',descriptionAr:'كرواسون بالزبدة محشو بكريمة الكراميل المملح.',priceFils:1500,capacityPoints:1,leadDays:1}
  ];
  for(const product of products)await prisma.product.upsert({where:{slug:product.slug},create:{...product,published:true,active:true},update:{...product,published:true,active:true,archivedAt:null}});
  const truffle=await prisma.product.findUniqueOrThrow({where:{slug:'chocolate-truffle-cake'}});
  await prisma.productVariant.upsert({where:{id:'seed-truffle-six'},create:{id:'seed-truffle-six',productId:truffle.id,nameEn:'Serves 6–8',nameAr:'يكفي ٦–٨',priceFils:0,capacityPoints:8,leadDays:2},update:{priceFils:0,capacityPoints:8,leadDays:2,active:true}});
  await prisma.productVariant.upsert({where:{id:'seed-truffle-ten'},create:{id:'seed-truffle-ten',productId:truffle.id,nameEn:'Serves 10–12',nameAr:'يكفي ١٠–١٢',priceFils:2500,capacityPoints:12,leadDays:3},update:{priceFils:2500,capacityPoints:12,leadDays:3,active:true}});
  await prisma.deliveryArea.upsert({where:{id:'seed-salmiya'},create:{id:'seed-salmiya',nameEn:'Salmiya',nameAr:'السالمية',feeFils:1500},update:{feeFils:1500,active:true}});
  console.log(`Seeded ${await prisma.product.count()} products, variants, and the Salmiya delivery area.`);
}

main().finally(()=>prisma.$disconnect());
