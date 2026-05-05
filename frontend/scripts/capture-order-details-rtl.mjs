import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:3000/demo-store/orders/77';
const outputDir = 'artifacts/order-details-rtl';

const orderPayload = {
  order: {
    order_id: 77,
    order_date: '2026-04-30T13:21:47.000Z',
    total_amount: 4050,
    payment_status: 'Pending',
    fulfillment_status: 'Processing',
    items: [
      {
        order_item_id: 1,
        product_name: 'iPhone 17',
        option_name: 'Black Pro',
        option_value: 'Black Pro',
        quantity: 1,
        subtotal: 3500,
        image_url: null,
      },
    ],
    shipping: {
      shipping_name: 'Customer 2',
      shipping_phone: '0550110221',
      shipping_address: JSON.stringify({
        city: 'riyadh',
        region: 'Riyadh',
        postal_code: '13316',
        country: 'SA',
      }),
      tracking_number: null,
    },
  },
};

async function setupMocking(page) {
  await page.route('**/api/stores/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        store: {
          store_name: 'Live2',
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

  await page.route('**/api/customers/orders/77', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(orderPayload),
    });
  });

  await page.route('**/api/customers/orders/77/*', async (route) => {
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
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outputDir}/${fileName}`, fullPage: true });
  await browser.close();
}

await capture('ar', 1280, 800, 'order-details-1280x800-ar.png');
await capture('ar', 900, 760, 'order-details-900x760-ar.png');
await capture('en', 1280, 800, 'order-details-1280x800-en.png');
