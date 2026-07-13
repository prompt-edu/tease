import { Allocation } from '../../types'

export interface AllocationStrategy {
  solve(constraints: string[]): Promise<Allocation[] | null>
}
