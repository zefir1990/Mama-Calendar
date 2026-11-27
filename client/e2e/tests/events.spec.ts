import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8090';
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const MASTER_TOKEN = process.env.CLEAR_DATABASE_MASTER_TOKEN;
const USER_PASSWORD = 'e2e-password';
const TIMEOUT = 10000;

if (!MASTER_TOKEN) {
  throw new Error('CLEAR_DATABASE_MASTER_TOKEN is required to run the e2e tests');
}

const labels = {
  registerLink: { en: "Don't have an account? Register", ru: 'Нет аккаунта? Зарегистрироваться' },
  usernamePlaceholder: { en: 'Username', ru: 'Имя пользователя' },
  passwordPlaceholder: { en: 'Password', ru: 'Пароль' },
  confirmPasswordPlaceholder: { en: 'Confirm Password', ru: 'Подтвердите пароль' },
  createAccount: { en: 'Create Account', ru: 'Создать аккаунт' },
  enterInfoTab: { en: 'Enter Info / View', ru: 'Ввод / Просмотр' },
  emptyEventList: { en: 'No events yet', ru: 'Пока нет событий' },
  formPlaceholder: { en: "What's happening?", ru: 'Что происходит?' },
  addEvent: { en: 'Add Event', ru: 'Добавить' },
  logout: { en: 'Logout', ru: 'Выйти' },
  signIn: { en: 'Sign In', ru: 'Войти' },
};

const testEvent = {
  description: 'E2E test event for persistence check',
};

function textLocator(page: Page, label: { en: string; ru: string }) {
  return page.getByText(label.en, { exact: true }).or(page.getByText(label.ru, { exact: true }));
}

function placeholderLocator(page: Page, label: { en: string; ru: string }) {
  return page.getByPlaceholder(label.en, { exact: true }).or(page.getByPlaceholder(label.ru, { exact: true }));
}

function generateUsername(): string {
  return `e2e-user-${Date.now()}`;
}

async function clearDatabase(request: APIRequestContext): Promise<void> {
  const clearResponse = await request.delete(`${API_URL}/clear-database`, {
    headers: { Authorization: `Bearer ${MASTER_TOKEN}` },
  });
  expect(clearResponse.ok()).toBe(true);
}

async function openEventsPage(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
}

async function registerUserViaForm(page: Page, username: string): Promise<void> {
  await textLocator(page, labels.registerLink).click();
  await placeholderLocator(page, labels.usernamePlaceholder).fill(username);
  await placeholderLocator(page, labels.passwordPlaceholder).fill(USER_PASSWORD);
  await placeholderLocator(page, labels.confirmPasswordPlaceholder).fill(USER_PASSWORD);
  await page.waitForTimeout(500);
  await textLocator(page, labels.createAccount).last().click();
}

async function openEnterInfoTab(page: Page): Promise<void> {
  await textLocator(page, labels.enterInfoTab).click();
}

async function expectEmptyEventList(page: Page): Promise<void> {
  await expect(textLocator(page, labels.emptyEventList)).toBeVisible({ timeout: TIMEOUT });
}

async function addEventViaForm(page: Page, description: string): Promise<void> {
  await page.getByText('+', { exact: true }).click();
  await placeholderLocator(page, labels.formPlaceholder).fill(description);
  await page.waitForTimeout(500);
  await textLocator(page, labels.addEvent).last().click();
  await expect(page.getByText(description)).toBeVisible({ timeout: TIMEOUT });
}

async function expectUsernameFieldHidden(page: Page): Promise<void> {
  await expect(placeholderLocator(page, labels.usernamePlaceholder)).not.toBeVisible();
}

test.describe('Events end-to-end', () => {
  test('should persist event after page refresh', async ({ page, request }) => {
    await clearDatabase(request);

    await openEventsPage(page);
    await registerUserViaForm(page, generateUsername());
    await openEnterInfoTab(page);
    await expectEmptyEventList(page);

    await addEventViaForm(page, testEvent.description);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await openEnterInfoTab(page);

    await expect(page.getByText(testEvent.description)).toBeVisible({ timeout: TIMEOUT });
  });

  test('should persist cyrillic text in event description', async ({ page, request }) => {
    await clearDatabase(request);

    const cyrillicDescription = 'Тестовое событие на русском';

    await openEventsPage(page);
    await registerUserViaForm(page, generateUsername());
    await openEnterInfoTab(page);
    await expectEmptyEventList(page);

    await addEventViaForm(page, cyrillicDescription);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await openEnterInfoTab(page);

    await expect(page.getByText(cyrillicDescription)).toBeVisible({ timeout: TIMEOUT });
  });

  test('should show events page after successful authorization', async ({ page, request }) => {
    await clearDatabase(request);

    await openEventsPage(page);
    await registerUserViaForm(page, generateUsername());
    await openEnterInfoTab(page);
    await expectEmptyEventList(page);
    await expectUsernameFieldHidden(page);
  });

  test('should logout user after confirmation', async ({ page, request }) => {
    await clearDatabase(request);

    await openEventsPage(page);
    await registerUserViaForm(page, generateUsername());
    await openEnterInfoTab(page);
    await expectEmptyEventList(page);

    const logoutButton = textLocator(page, labels.logout);
    await expect(logoutButton).toBeVisible();

    const dialogHandled = new Promise<void>((resolve) => {
      page.once('dialog', (dialog) => {
        dialog.accept();
        resolve();
      });
    });

    await logoutButton.click();
    await dialogHandled;

    await expect(textLocator(page, labels.signIn).first()).toBeVisible({ timeout: TIMEOUT });
  });

  test('should cancel logout and stay on events page', async ({ page, request }) => {
    await clearDatabase(request);

    await openEventsPage(page);
    await registerUserViaForm(page, generateUsername());
    await openEnterInfoTab(page);
    await expectEmptyEventList(page);

    const logoutButton = textLocator(page, labels.logout);
    await expect(logoutButton).toBeVisible();

    const dialogHandled = new Promise<void>((resolve) => {
      page.once('dialog', (dialog) => {
        dialog.dismiss();
        resolve();
      });
    });

    await logoutButton.click();
    await dialogHandled;

    await expectEmptyEventList(page);
  });

  test('should stay on events page after refresh when already authorized', async ({ page, request }) => {
    await clearDatabase(request);

    await openEventsPage(page);
    await registerUserViaForm(page, generateUsername());
    await openEnterInfoTab(page);
    await expectEmptyEventList(page);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await openEnterInfoTab(page);

    await expectEmptyEventList(page);
    await expectUsernameFieldHidden(page);
  });

  test('should remove event after confirmation', async ({ page, request }) => {
    await clearDatabase(request);

    const eventDescription = 'E2E test event for removal';

    await openEventsPage(page);
    await registerUserViaForm(page, generateUsername());
    await openEnterInfoTab(page);
    await expectEmptyEventList(page);

    await addEventViaForm(page, eventDescription);

    const dialogHandled = new Promise<void>((resolve) => {
      page.once('dialog', (dialog) => {
        dialog.accept();
        resolve();
      });
    });

    await page.getByText('✕').first().click();
    await dialogHandled;

    await expect(page.getByText(eventDescription)).not.toBeVisible();
    await expectEmptyEventList(page);
  });

  test('should cancel event removal and keep event visible', async ({ page, request }) => {
    await clearDatabase(request);

    const eventDescription = 'E2E test event for keeping';

    await openEventsPage(page);
    await registerUserViaForm(page, generateUsername());
    await openEnterInfoTab(page);
    await expectEmptyEventList(page);

    await addEventViaForm(page, eventDescription);

    const dialogHandled = new Promise<void>((resolve) => {
      page.once('dialog', (dialog) => {
        dialog.dismiss();
        resolve();
      });
    });

    await page.getByText('✕').first().click();
    await dialogHandled;

    await expect(page.getByText(eventDescription)).toBeVisible({ timeout: TIMEOUT });
  });
});
