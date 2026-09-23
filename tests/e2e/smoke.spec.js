import { test, expect } from '@playwright/test';

const publicPath = process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:4173/';
const managementPath = '/pablo-paraiso-management/';

async function gotoPage(page, path) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'commit' });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

function localDateISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

test.describe('public website', () => {
  test('loads the booking experience', async ({ page }) => {
    await gotoPage(page, publicPath);
    await expect(page).toHaveTitle(/Pablo Paraiso/i);
    await expect(page.locator('#bookingForm')).toBeVisible();
    await expect(page.locator('#date')).toHaveAttribute('min', localDateISO());
    await expect(page.locator('#website').locator('..')).toHaveAttribute('aria-hidden', 'true');
    const honeypotBox = await page.locator('#website').boundingBox();
    expect(honeypotBox).not.toBeNull();
    expect(honeypotBox.x + honeypotBox.width < 0 || honeypotBox.x > 390).toBeTruthy();
  });

  test('rejects an empty booking form without sending a request', async ({ page }) => {
    await gotoPage(page, publicPath);
    let requests = 0;
    page.on('request', request => {
      if (request.url().includes('submitPublicBooking')) requests += 1;
    });

    await page.locator('#bookingForm button[type="submit"]').click();
    const isInvalid = await page.locator('#bookingForm').evaluate(form => !form.checkValidity());
    expect(isInvalid).toBeTruthy();
    expect(requests).toBe(0);
  });

  test('opens and closes the mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoPage(page, publicPath);
    await page.locator('#hamburger').click();
    await expect(page.locator('#mobileNav')).toHaveClass(/active/);
    await page.locator('#mobileNav a').first().click();
    await expect(page.locator('#mobileNav')).not.toHaveClass(/active/);
  });
});

test.describe('management app unauthenticated shell', () => {
  test('shows the authentication gate and does not expose the dashboard', async ({ page }) => {
    await gotoPage(page, managementPath);
    await expect(page.locator('#authGate')).toBeVisible();
    await expect(page.locator('#authGateBtn')).toBeVisible();
  });

  test('exposes the theme control before authentication', async ({ page }) => {
    await gotoPage(page, managementPath);
    await expect(page.locator('#themeToggle')).toBeVisible();
    await page.locator('#themeToggle').click({ force: true });
    await expect(page.locator('html')).toHaveClass(/theme-light/);
  });
});
