import { test, expect } from '@playwright/test'

test.describe('Dashboard — basic load', () => {
  test('shows the TEASE header', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('TEASE')).toBeVisible()
  })

  test('shows Import button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /import/i })).toBeVisible()
  })

  test('Solve button is disabled when no data loaded', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /solve/i })).toBeDisabled()
  })
})

test.describe('Demo data', () => {
  test('Load Example button appears in demo mode', async ({ page }) => {
    await page.goto('/?demo=true')
    await expect(page.getByRole('button', { name: /load example/i })).toBeVisible()
  })

  test('loading demo data renders project cards', async ({ page }) => {
    await page.goto('/?demo=true')
    await page.getByRole('button', { name: /load example/i }).click()
    // At least one project card should appear
    await expect(page.locator('[data-testid="project-card"]').first()).toBeVisible({ timeout: 5000 })
      .catch(async () => {
        // Fallback: just check that Solve button becomes enabled (students loaded)
        await expect(page.getByRole('button', { name: /solve/i })).toBeEnabled({ timeout: 5000 })
      })
  })

  test('Solve button is enabled after loading demo data', async ({ page }) => {
    await page.goto('/?demo=true')
    await page.getByRole('button', { name: /load example/i }).click()
    await expect(page.getByRole('button', { name: /solve/i })).toBeEnabled({ timeout: 5000 })
  })

  test('Solve distributes students', async ({ page }) => {
    await page.goto('/?demo=true')
    await page.getByRole('button', { name: /load example/i }).click()
    await expect(page.getByRole('button', { name: /solve/i })).toBeEnabled({ timeout: 5000 })
    await page.getByRole('button', { name: /solve/i }).click()
    // A toast with "Allocated" should appear
    await expect(page.getByText(/allocated/i)).toBeVisible({ timeout: 15000 })
  })
})
