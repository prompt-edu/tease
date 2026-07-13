import { test, expect, Page } from '@playwright/test'

// Helper: navigate to demo mode, load example data, and optionally solve
async function loadDemo(page: Page, { solve = false } = {}) {
  await page.goto('/?demo=true')
  await page.getByRole('button', { name: /load example/i }).click()
  await expect(page.getByRole('button', { name: /solve/i })).toBeEnabled({ timeout: 5000 })
  if (solve) {
    await page.getByRole('button', { name: /solve/i }).click()
    await expect(page.getByText(/allocated/i)).toBeVisible({ timeout: 15000 })
  }
}

// ─── Statistics ───────────────────────────────────────────────────────────────

test.describe('Statistics dialog', () => {
  test('Statistics button opens the dialog', async ({ page }) => {
    await loadDemo(page)
    await page.getByRole('button', { name: /statistics/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/statistics/i)).toBeVisible()
  })

  test('Statistics dialog has a metric selector', async ({ page }) => {
    await loadDemo(page, { solve: true })
    await page.getByRole('button', { name: /statistics/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // The metric <select> should be present
    await expect(page.locator('select')).toBeVisible()
  })

  test('closing the dialog dismisses it', async ({ page }) => {
    await loadDemo(page)
    await page.getByRole('button', { name: /statistics/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // Press Escape to close
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 })
  })
})

// ─── Student detail sheet ─────────────────────────────────────────────────────

test.describe('Student detail sheet', () => {
  test('clicking a student card opens the detail sheet', async ({ page }) => {
    await loadDemo(page, { solve: true })
    // Wait for student cards to render (they appear after solve)
    // Student cards render inside project cards — find any student name text
    // We'll use a small helper: click on the first student card's name area
    const firstCard = page.locator('.cursor-grab').first()
    // Wait for it to be visible
    await expect(firstCard).toBeVisible({ timeout: 5000 })
    await firstCard.click()
    // Detail sheet should slide in — it's a Radix dialog with role=dialog
    await expect(page.getByRole('dialog').last()).toBeVisible({ timeout: 3000 })
  })

  test('detail sheet contains student information sections', async ({ page }) => {
    await loadDemo(page, { solve: true })
    const firstCard = page.locator('.cursor-grab').first()
    await expect(firstCard).toBeVisible({ timeout: 5000 })
    await firstCard.click()
    const sheet = page.getByRole('dialog').last()
    await expect(sheet).toBeVisible({ timeout: 3000 })
    // Sheet should contain some info text
    await expect(sheet.getByText(/program|degree|semester/i)).toBeVisible({ timeout: 2000 })
  })

  test('closing detail sheet via Escape works', async ({ page }) => {
    await loadDemo(page, { solve: true })
    const firstCard = page.locator('.cursor-grab').first()
    await expect(firstCard).toBeVisible({ timeout: 5000 })
    await firstCard.click()
    await expect(page.getByRole('dialog').last()).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 })
  })
})

// ─── Lock / Unlock ────────────────────────────────────────────────────────────

test.describe('Lock / Unlock student', () => {
  test('lock button is visible on student cards', async ({ page }) => {
    await loadDemo(page, { solve: true })
    // After solving, there should be student cards. Each has a lock/unlock button.
    const lockBtn = page.getByRole('button', { name: /lock/i }).first()
    await expect(lockBtn).toBeVisible({ timeout: 5000 })
  })

  test('clicking lock button locks the student (button becomes Unlock)', async ({ page }) => {
    await loadDemo(page, { solve: true })
    // Find first unlock button (student is initially unlocked)
    const unlockBtn = page.getByRole('button', { name: /^lock$/i }).first()
    await expect(unlockBtn).toBeVisible({ timeout: 5000 })
    await unlockBtn.click()
    // After locking, the button for this card should now say Unlock
    await expect(page.getByRole('button', { name: /unlock/i }).first()).toBeVisible({ timeout: 2000 })
  })

  test('clicking unlock button unlocks the student (button becomes Lock)', async ({ page }) => {
    await loadDemo(page, { solve: true })
    // Lock first
    const lockBtn = page.getByRole('button', { name: /^lock$/i }).first()
    await expect(lockBtn).toBeVisible({ timeout: 5000 })
    await lockBtn.click()
    // Verify locked
    const unlockBtn = page.getByRole('button', { name: /unlock/i }).first()
    await expect(unlockBtn).toBeVisible({ timeout: 2000 })
    // Now unlock
    await unlockBtn.click()
    // Should be back to lock
    await expect(page.getByRole('button', { name: /^lock$/i }).first()).toBeVisible({ timeout: 2000 })
  })

  test('locking a student does not open the detail sheet', async ({ page }) => {
    await loadDemo(page, { solve: true })
    const lockBtn = page.getByRole('button', { name: /^lock$/i }).first()
    await expect(lockBtn).toBeVisible({ timeout: 5000 })
    await lockBtn.click()
    // Detail sheet should NOT open
    await page.waitForTimeout(400)
    // No new dialog should have appeared (or if one is open, it's not from the lock action)
    const dialogs = page.getByRole('dialog')
    const count = await dialogs.count()
    expect(count).toBe(0)
  })
})

// ─── Constraint Builder ───────────────────────────────────────────────────────

test.describe('Constraint Builder', () => {
  test('Constraints button opens the dialog', async ({ page }) => {
    await loadDemo(page)
    await page.getByRole('button', { name: /constraints/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/constraint builder/i)).toBeVisible()
  })

  test('Add Constraint button switches to form view', async ({ page }) => {
    await loadDemo(page)
    await page.getByRole('button', { name: /constraints/i }).click()
    await page.getByRole('button', { name: /add constraint/i }).click()
    await expect(page.getByText(/add constraint/i)).toBeVisible()
    // Form elements should be present
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('adding a constraint appears in summary table', async ({ page }) => {
    await loadDemo(page)
    await page.getByRole('button', { name: /constraints/i }).click()
    await page.getByRole('button', { name: /add constraint/i }).click()

    // Select Gender type (should be 2nd item in the function list)
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption({ label: 'Gender' })

    // Select a value (Female)
    const valueSelects = page.locator('select')
    // Value dropdown is the last one in the form
    await valueSelects.last().selectOption({ label: 'Female' })

    // Select all projects
    await page.getByRole('button', { name: /^all$/i }).click()

    // Submit
    await page.getByRole('button', { name: /add constraint/i }).last().click()

    // Should be back in summary view with one constraint row
    await expect(page.getByText(/gender/i)).toBeVisible()
  })

  test('Cancel returns to summary view without adding', async ({ page }) => {
    await loadDemo(page)
    await page.getByRole('button', { name: /constraints/i }).click()
    const initialContent = await page.getByRole('dialog').textContent()
    await page.getByRole('button', { name: /add constraint/i }).click()
    await page.getByRole('button', { name: /cancel/i }).click()
    // Should be back at summary view
    await expect(page.getByText(/constraint builder/i)).toBeVisible()
  })

  test('closing the dialog works', async ({ page }) => {
    await loadDemo(page)
    await page.getByRole('button', { name: /constraints/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 })
  })
})

// ─── Sort button ──────────────────────────────────────────────────────────────

test.describe('Sort button', () => {
  test('Sort button is visible when students are loaded', async ({ page }) => {
    await loadDemo(page)
    await expect(page.getByRole('button', { name: /sort/i })).toBeVisible()
  })

  test('Sort button is disabled when no students loaded', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /sort/i })).toBeDisabled()
  })

  test('clicking Sort shows a toast', async ({ page }) => {
    await loadDemo(page, { solve: true })
    await page.getByRole('button', { name: /sort/i }).click()
    await expect(page.getByText(/sorted/i)).toBeVisible({ timeout: 3000 })
  })
})
