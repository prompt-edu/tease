import { test, expect } from '@playwright/test'

test.describe('Dashboard loads', () => {
  test('shows the TEASE header', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('TEASE')).toBeVisible()
  })

  test('shows Import button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /import/i })).toBeVisible()
  })

  test('shows Solve button (disabled when no data)', async ({ page }) => {
    await page.goto('/')
    const solveBtn = page.getByRole('button', { name: /solve/i })
    await expect(solveBtn).toBeVisible()
    await expect(solveBtn).toBeDisabled()
  })
})
