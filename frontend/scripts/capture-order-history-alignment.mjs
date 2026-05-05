import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:3000/demo-store/orders';
const outputDir = 'artifacts/order-history-alignment';

const mockOrders = [
  { order_id: 77, order_date: '2026-04-30T09:00:00.000Z', total_amount: 4050, payment_status: 'Pending', fulfillment_status: 'Processing', item_count: 1, primary_product_name: 'iPhone 17', primary_image_url: null },
  { order_id: 76, order_date: '2026-04-29T09:00:00.000Z', total_amount: 4050, payment_status: 'Pending', fulfillment_status: 'Packed', item_count: 1, primary_product_name: 'iPhone 17', primary_image_url: null },
  { order_id: 75, order_date: '2026-04-29T08:00:00.000Z', total_amount: 46772.5, payment_status: 'Paid', fulfillment_status: 'Delivered', item_count: 3, primary_product_name: 'iPhone 17', primary_image_url: null },
];

async function setupMocking(page) {
  await page.route('**/api/stores/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        store: {
          store_name: 'Demo Store',
          status: 'Active',
          theme: 'default',
          branding: {
            background: '#f4f0e8',
            text: '#222222',
            buttons: '#1FAE77',
            priceLabels: '#ad8552',
          },
        },
      }),
    });
  });

  await page.route('**/api/customers/orders?page=1&limit=25', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ orders: mockOrders }),
    });
  });

  await page.route('**/api/customers/orders/*/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'OK' }),
    });
  });
}

async function capture(language, width, height, fileName) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  await page.addInitScript(({ lang }) => {
    localStorage.setItem('customer_token', 'mock-token');
    localStorage.setItem('i18nextLng', lang);
  }, { lang: language });

  await setupMocking(page);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outputDir}/${fileName}`, fullPage: true });
  await browser.close();
}

await capture('en', 1280, 720, 'order-history-1280x720-en.png');
await capture('en', 1366, 768, 'order-history-1366x768-en.png');
await capture('en', 1440, 900, 'order-history-1440x900-en.png');
await capture('ar', 1280, 720, 'order-history-1280x720-ar.png');
await capture('ar', 1366, 768, 'order-history-1366x768-ar.png');
await capture('ar', 1440, 900, 'order-history-1440x900-ar.png');
