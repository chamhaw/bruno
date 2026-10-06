import { test, expect } from '../../playwright';
import {
  clickResponseAction,
  closeAllCollections,
  createCollection,
  createRequest,
  sendRequest,
  switchResponseFormat,
  switchToEditorTab
} from '../utils/page/actions';

test.describe('Response Pane Actions', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should copy response to clipboard', async ({ page, createTmpDir }) => {
    const collectionName = 'response-copy-test';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'copy-test', collectionName, { url: 'https://testbench-sanity.usebruno.com/ping' });
    });

    await test.step('Send request and wait for response', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Copy response to clipboard', async () => {
      await page.evaluate(() => navigator.clipboard.writeText(''));
      await clickResponseAction(page, 'response-copy-btn');
      await expect(page.getByText('Response copied to clipboard')).toBeVisible({ timeout: 10000 }).catch(() => {});
      await expect.poll(async () => await page.evaluate(() => navigator.clipboard.readText().catch(() => ''))).toBeTruthy();
    });
  });

  test('should copy Base64 when editor mode and Base64 format selected', async ({ page, createTmpDir }) => {
    const collectionName = 'response-copy-base64-test';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'base64-copy-test', collectionName, {
        url: 'https://testbench-sanity.usebruno.com/ping'
      });
    });

    await test.step('Send request and wait for response', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Switch to Base64 format (editor mode - preview OFF)', async () => {
      await switchToEditorTab(page);
      await switchResponseFormat(page, 'Base64');
    });

    await test.step('Copy response and verify clipboard contains Base64', async () => {
      await clickResponseAction(page, 'response-copy-btn');
      await expect(page.getByText('Response copied to clipboard')).toBeVisible({ timeout: 10000 }).catch(() => {});

      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      // "pong" in Base64 is "cG9uZw=="
      expect(clipboardText).toBe('cG9uZw==');
    });
  });

  test('should copy AI debug context in wide and collapsed action layouts', async ({ page, createTmpDir }) => {
    const collectionName = 'response-copy-ai-layout-test';
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await createRequest(page, 'copy-ai-test', collectionName, { url: 'http://localhost:8081/ping' });
    await sendRequest(page, 200);

    for (const width of [1800, 800]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => navigator.clipboard.writeText(''));
      const toolbar = page.locator('.actions-buttons');
      if (width === 1800) {
        await expect(toolbar).toBeVisible();
        await toolbar.getByRole('button', { name: 'Copy for AI' }).click();
      } else {
        await expect(toolbar).toBeHidden();
        await page.getByTestId('response-actions-menu').click();
        await page.getByRole('menuitem', { name: 'Copy for AI' }).click();
      }
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('# API Debug Context');
      const text = await page.evaluate(() => navigator.clipboard.readText());
      expect(text).toContain('# Request (cURL)');
      expect(text).toContain('localhost:8081/ping');
      expect(text).toContain('# Response');
    }
  });
});
