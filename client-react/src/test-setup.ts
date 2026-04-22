import '@testing-library/jest-dom'

// Provide a working localStorage for vitest/jsdom
class LocalStorageMock {
  private store: Record<string, string> = {}
  getItem(k: string) { return this.store[k] ?? null }
  setItem(k: string, v: string) { this.store[k] = v }
  removeItem(k: string) { delete this.store[k] }
  clear() { this.store = {} }
  get length() { return Object.keys(this.store).length }
  key(i: number) { return Object.keys(this.store)[i] ?? null }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new LocalStorageMock(),
  writable: true,
})
