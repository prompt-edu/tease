import { GLOBALS } from '../lib/utils'

type UUIDtoNumberMapping = Map<string, number>

/**
 * Maps UUID strings to sequential integers for the LP solver.
 * Persisted in localStorage.
 */
export class IdMappingService {
  private mapping: UUIDtoNumberMapping

  constructor() {
    this.mapping = new Map()
    try {
      const stored = localStorage.getItem(GLOBALS.LS_KEY_MAPPING) || '[]'
      this.mapping = new Map(JSON.parse(stored))
    } catch {
      this.mapping = new Map()
    }
  }

  getNumericalId(id: string): string {
    if (this.mapping.has(id)) {
      return `${this.mapping.get(id)}`
    }
    const usedValues = Array.from(this.mapping.values())
    let numId = 1
    while (usedValues.includes(numId)) {
      numId++
    }
    this.mapping.set(id, numId)
    this.persist()
    return `${numId}`
  }

  getId(numericalId: string): string | undefined {
    for (const [uuid, num] of this.mapping.entries()) {
      if (`${num}` === numericalId) return uuid
    }
    return undefined
  }

  reset(): void {
    this.mapping = new Map()
    this.persist()
  }

  private persist(): void {
    localStorage.setItem(GLOBALS.LS_KEY_MAPPING, JSON.stringify(Array.from(this.mapping.entries())))
  }
}

// Singleton instance
export const idMappingService = new IdMappingService()
