import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8080';
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const MASTER_TOKEN = 'fatman';

function generateUsername(): string {
  return `e2e-user-${Date.now()}`;
}

const testUser = {
  username: generateUsername(),
  password: 'e2e-password',
};

const testEvent = {
  description: 'E2E test event for persistence check',
};

function placeholderLocator(page: Page, en: string, ru: string) {
  return page.getByPlaceholder(en, { exact: true }).or(page.getByPlaceholder(ru, { exact: true }));
}

function textLocator(page: Page, en: string, ru: string) {
  return page.getByText(en, { exact: true }).or(page.getByText(ru, { exact: true }));
}

async function clearDatabase(request: APIRequestContext): Promise<void> {
  const clearResponse = await request.delete(`${API_URL}/clear-database`, {
    headers: { Authorization: `Bearer ${MASTER_TOKEN}` },
  });
  expect(clearResponse.ok()).toBe(true);
}

async function registerUserViaForm(page: Page, username: string, password: string): Promise<void> {
  await textLocator(page, "Don't have an account? Register", 'Нет аккаунта? Зарегистрироваться').click();
  await placeholderLocator(page, 'Username', 'Имя пользователя').fill(username);
  await placeholderLocator(page, 'Password', 'Пароль').fill(password);
  await placeholderLocator(page, 'Confirm Password', 'Подтвердите пароль').fill(password);
  await page.waitForTimeout(500);

  const registerButton = textLocator(page, 'Create Account', 'Создать аккаунт').last();
  await registerButton.click();
}

test.describe('Events end-to-end', () => {
  test('should persist event after page refresh', async ({ page, request }) => {
    await clearDatabase(request);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    await registerUserViaForm(page, testUser.username, testUser.password);

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });

    await page.getByText('+', { exact: true }).click();

    await placeholderLocator(page, "What's happening?", 'Что происходит?').fill(testEvent.description);

    await page.waitForTimeout(500);

    const addButton = textLocator(page, 'Add Event', 'Добавить').last();
    await addButton.click();

    await expect(page.getByText(testEvent.description)).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(testEvent.description)).toBeVisible({ timeout: 10000 });
  });

  test('should persist cyrillic text in event description', async ({ page, request }) => {
    await clearDatabase(request);

    const cyrillicDescription = 'Тестовое событие на русском';

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const username = generateUsername();
    await registerUserViaForm(page, username, testUser.password);

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });

    await page.getByText('+', { exact: true }).click();

    await placeholderLocator(page, "What's happening?", 'Что происходит?').fill(cyrillicDescription);

    await page.waitForTimeout(500);

    const addButton = textLocator(page, 'Add Event', 'Добавить').last();
    await addButton.click();

    await expect(page.getByText(cyrillicDescription)).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(cyrillicDescription)).toBeVisible({ timeout: 10000 });
  });

  test('should show events page after successful authorization', async ({ page, request }) => {
    await clearDatabase(request);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const username = generateUsername();
    await registerUserViaForm(page, username, testUser.password);

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });

    await expect(
      placeholderLocator(page, 'Username', 'Имя пользователя')
    ).not.toBeVisible();
  });

  test('should logout user after confirmation', async ({ page, request }) => {
    await clearDatabase(request);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const username = generateUsername();
    await registerUserViaForm(page, username, testUser.password);

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });

    const logoutButton = textLocator(page, 'Logout', 'Выйти');
    await expect(logoutButton).toBeVisible();

    const dialogPromise = new Promise<boolean>((resolve) => {
      page.once('dialog', (dialog) => {
        dialog.accept();
        resolve(true);
      });
    });

    await logoutButton.click();
    await dialogPromise;

    await expect(
      textLocator(page, 'Sign In', 'Войти').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should cancel logout and stay on events page', async ({ page, request }) => {
    await clearDatabase(request);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const username = generateUsername();
    await registerUserViaForm(page, username, testUser.password);

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });

    const logoutButton = textLocator(page, 'Logout', 'Выйти');
    await expect(logoutButton).toBeVisible();

    const dialogPromise = new Promise<boolean>((resolve) => {
      page.once('dialog', (dialog) => {
        dialog.dismiss();
        resolve(false);
      });
    });

    await logoutButton.click();
    await dialogPromise;

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should stay on events page after refresh when already authorized', async ({ page, request }) => {
    await clearDatabase(request);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const username = generateUsername();
    await registerUserViaForm(page, username, testUser.password);

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });

    await expect(
      placeholderLocator(page, 'Username', 'Имя пользователя')
    ).not.toBeVisible();
  });

  test('should remove event after confirmation', async ({ page, request }) => {
    await clearDatabase(request);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const username = generateUsername();
    await registerUserViaForm(page, username, testUser.password);

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });

    await page.getByText('+', { exact: true }).click();

    const eventDescription = 'E2E test event for removal';
    await placeholderLocator(page, "What's happening?", 'Что происходит?').fill(eventDescription);

    await page.waitForTimeout(500);

    const addButton = textLocator(page, 'Add Event', 'Добавить').last();
    await addButton.click();

    await expect(page.getByText(eventDescription)).toBeVisible({ timeout: 10000 });

    const dialogPromise = new Promise<void>((resolve) => {
      page.once('dialog', (dialog) => {
        dialog.accept();
        resolve();
      });
    });

    await page.getByText('✕').first().click();
    await dialogPromise;

    await expect(page.getByText(eventDescription)).not.toBeVisible();

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should cancel event removal and keep event visible', async ({ page, request }) => {
    await clearDatabase(request);

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const username = generateUsername();
    await registerUserViaForm(page, username, testUser.password);

    await expect(
      textLocator(page, 'No events yet', 'Пока нет событий')
    ).toBeVisible({ timeout: 10000 });

    await page.getByText('+', { exact: true }).click();

    const eventDescription = 'E2E test event for keeping';
    await placeholderLocator(page, "What's happening?", 'Что происходит?').fill(eventDescription);

    await page.waitForTimeout(500);

    const addButton = textLocator(page, 'Add Event', 'Добавить').last();
    await addButton.click();

    await expect(page.getByText(eventDescription)).toBeVisible({ timeout: 10000 });

    const dialogPromise = new Promise<void>((resolve) => {
      page.once('dialog', (dialog) => {
        dialog.dismiss();
        resolve();
      });
    });

    await page.getByText('✕').first().click();
    await dialogPromise;

    await expect(page.getByText(eventDescription)).toBeVisible({ timeout: 10000 });
  });
});
