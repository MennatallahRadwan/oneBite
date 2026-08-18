import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import request from 'supertest';
import {prisma} from './db.js';
import {createApp} from './app.js';
import {removeOwner, signInOwner} from './test-support/owner-session.js';

const app = createApp();
const email = 'admin-catalog-test@onebite.local';
const categorySlug = 'admin-test-category';
const productSlug = 'admin-test-product';

let cookie: string;
let categoryId: string;
let productId: string;

const authed = (method: 'get' | 'post' | 'patch', path: string) =>
  request(app)[method](`/api/v1/owner${path}`).set('Cookie', cookie);

beforeAll(async () => {
  cookie = await signInOwner(app, email);
});

afterAll(async () => {
  await prisma.productVariant.deleteMany({where: {product: {slug: productSlug}}});
  await prisma.productAddon.deleteMany({where: {product: {slug: productSlug}}});
  await prisma.product.deleteMany({where: {slug: {in: [productSlug, `${productSlug}-two`]}}});
  await prisma.category.deleteMany({where: {slug: categorySlug}});
  await removeOwner(email);
});

describe('owner catalog CRUD', () => {
  it('refuses every write without a session', async () => {
    const paths = ['/categories', '/products', '/delivery/areas'];
    for (const path of paths) {
      expect((await request(app).post(`/api/v1/owner${path}`).send({})).status).toBe(401);
      expect((await request(app).get(`/api/v1/owner${path}`)).status).toBe(401);
    }
  });

  it('creates a category and lists it with its product count', async () => {
    const created = await authed('post', '/categories').send({
      slug: categorySlug,
      nameEn: 'Admin Test',
      nameAr: 'اختبار الإدارة',
      sortOrder: 900
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    categoryId = created.body.id;

    const list = await authed('get', '/categories');
    expect(list.body.items).toContainEqual(
      expect.objectContaining({slug: categorySlug, productCount: 0})
    );
  });

  it('reports a duplicate slug as a conflict rather than a failure', async () => {
    const duplicate = await authed('post', '/categories').send({
      slug: categorySlug,
      nameEn: 'Admin Test Again',
      nameAr: 'اختبار'
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });

  it('rejects a slug that is not url-safe', async () => {
    const bad = await authed('post', '/categories').send({
      slug: 'Not A Slug',
      nameEn: 'Bad',
      nameAr: 'سيئ'
    });
    expect(bad.status).toBe(400);
  });

  it('creates a product under that category', async () => {
    const created = await authed('post', '/products').send({
      slug: productSlug,
      categoryId,
      nameEn: 'Admin Product',
      nameAr: 'منتج الإدارة',
      descriptionEn: 'Created through the owner API',
      descriptionAr: 'أنشئ عبر واجهة المالك',
      priceFils: 4500,
      capacityPoints: 3,
      leadDays: 2
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    productId = created.body.id;

    // Unpublished by default, so nothing reaches the storefront until the owner
    // says so.
    expect(created.body.published).toBe(false);
    const storefront = await request(app).get(`/api/v1/catalog/products/${productSlug}`);
    expect(storefront.status).toBe(404);
  });

  it('refuses a product pointing at a category that does not exist', async () => {
    const orphan = await authed('post', '/products').send({
      slug: `${productSlug}-two`,
      categoryId: 'no-such-category',
      nameEn: 'Orphan',
      nameAr: 'يتيم',
      descriptionEn: 'x',
      descriptionAr: 'x',
      priceFils: 1000
    });
    expect(orphan.status).toBe(400);
  });

  it('publishes the product onto the storefront', async () => {
    const published = await authed('patch', `/products/${productId}`).send({published: true});
    expect(published.status, JSON.stringify(published.body)).toBe(200);

    const storefront = await request(app).get(`/api/v1/catalog/products/${productSlug}`);
    expect(storefront.status).toBe(200);
    expect(storefront.body.priceFils).toBe(4500);
  });

  it('follows the smallest variant for base points and lead time', async () => {
    const large = await authed('post', `/products/${productId}/variants`).send({
      nameEn: 'Large',
      nameAr: 'كبير',
      priceFils: 9000,
      capacityPoints: 8,
      leadDays: 4
    });
    expect(large.status, JSON.stringify(large.body)).toBe(201);
    expect((await authed('get', `/products/${productId}`)).body).toMatchObject({
      capacityPoints: 8,
      leadDays: 4
    });

    const small = await authed('post', `/products/${productId}/variants`).send({
      nameEn: 'Small',
      nameAr: 'صغير',
      priceFils: 3000,
      capacityPoints: 2,
      leadDays: 1
    });
    expect(small.status).toBe(201);
    expect((await authed('get', `/products/${productId}`)).body).toMatchObject({
      capacityPoints: 2,
      leadDays: 1
    });

    // Retiring the smallest variant hands the base back to the next one up.
    const retired = await authed('patch', `/variants/${small.body.id}`).send({active: false});
    expect(retired.status).toBe(200);
    expect((await authed('get', `/products/${productId}`)).body).toMatchObject({
      capacityPoints: 8,
      leadDays: 4
    });
  });

  it('ignores base points sent for a product that has variants', async () => {
    const attempted = await authed('patch', `/products/${productId}`).send({capacityPoints: 99});
    expect(attempted.status).toBe(200);
    expect(attempted.body.capacityPoints).toBe(8);
  });

  it('adds an add-on and offers it on the storefront once active', async () => {
    const addon = await authed('post', `/products/${productId}/addons`).send({
      nameEn: 'Gift wrap',
      nameAr: 'تغليف هدية',
      priceFils: 750,
      capacityPoints: 1
    });
    expect(addon.status, JSON.stringify(addon.body)).toBe(201);

    const storefront = await request(app).get(`/api/v1/catalog/products/${productSlug}`);
    expect(storefront.body.addons).toContainEqual(
      expect.objectContaining({nameEn: 'Gift wrap', priceFils: 750})
    );

    await authed('patch', `/addons/${addon.body.id}`).send({active: false});
    const hidden = await request(app).get(`/api/v1/catalog/products/${productSlug}`);
    expect(hidden.body.addons).toHaveLength(0);
  });

  it('archives a category out of the storefront and back again', async () => {
    const archived = await authed('patch', `/categories/${categoryId}`).send({archived: true});
    expect(archived.status).toBe(200);
    expect(archived.body.archivedAt).not.toBeNull();

    const categories = await request(app).get('/api/v1/catalog/categories');
    expect(categories.body.map((row: {slug: string}) => row.slug)).not.toContain(categorySlug);

    const restored = await authed('patch', `/categories/${categoryId}`).send({archived: false});
    expect(restored.body.archivedAt).toBeNull();
  });

  it('archives a product out of the storefront', async () => {
    expect((await authed('patch', `/products/${productId}`).send({archived: true})).status).toBe(200);
    expect((await request(app).get(`/api/v1/catalog/products/${productSlug}`)).status).toBe(404);
  });

  it('answers 404 for a product that is not there', async () => {
    expect((await authed('get', '/products/no-such-product')).status).toBe(404);
  });
});
