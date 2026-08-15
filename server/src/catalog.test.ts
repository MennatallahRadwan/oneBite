import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import request from 'supertest';
import {prisma} from './db.js';
import {createApp} from './app.js';

const categorySlug = 'integration-test-category';
const productSlug = 'integration-test-product';

beforeAll(async () => {
  const category = await prisma.category.upsert({
    where: {slug: categorySlug},
    create: {slug: categorySlug, nameEn: 'Integration Test', nameAr: 'اختبار التكامل'},
    update: {archivedAt: null}
  });
  await prisma.product.upsert({
    where: {slug: productSlug},
    create: {
      slug: productSlug,
      categoryId: category.id,
      nameEn: 'Integration Product',
      nameAr: 'منتج التكامل',
      descriptionEn: 'Test product',
      descriptionAr: 'منتج اختبار',
      priceFils: 1000,
      capacityPoints: 1,
      leadDays: 1,
      published: true,
      active: true
    },
    update: {published: true, active: true, archivedAt: null}
  });
});

afterAll(async () => {
  await prisma.product.deleteMany({where: {slug: productSlug}});
  await prisma.category.deleteMany({where: {slug: categorySlug}});
  await prisma.$disconnect();
});

describe('catalog API', () => {
  it('returns published products from PostgreSQL', async () => {
    const response = await request(createApp()).get('/api/v1/catalog/products');
    expect(response.status).toBe(200);
    expect(response.body.items).toContainEqual(
      expect.objectContaining({slug: productSlug, priceFils: 1000})
    );
  });
});
