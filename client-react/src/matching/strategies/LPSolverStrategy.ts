import { ReformatLP, Solve } from 'javascript-lp-solver'
import { Allocation } from '../../types'
import { AllocationStrategy } from './AllocationStrategy'
import { idMappingService } from '../../services/IdMappingService'

const DELETE_PROPERTIES = ['feasible', 'bounded', 'result', 'isIntegral']

export class LPSolverStrategy implements AllocationStrategy {
  async solve(constraints: string[]): Promise<Allocation[] | null> {
    return new Promise((resolve, reject) => {
      try {
        const startTime = Date.now()
        const reformatted = new ReformatLP(constraints)
        const solution = new Solve(reformatted)
        const allocations = this.transformSolution(solution)
        console.log(`LP solve took ${Date.now() - startTime}ms`)
        if (!allocations) {
          reject(new Error('No feasible solution found'))
          return
        }
        resolve(allocations)
      } catch (err) {
        reject(err)
      }
    })
  }

  private transformSolution(solution: Solve): Allocation[] | null {
    if (!solution.feasible) return null

    // Remove meta-properties.
    for (const prop of DELETE_PROPERTIES) {
      delete (solution as Record<string, unknown>)[prop]
    }

    const allocations: Allocation[] = []
    for (const key of Object.keys(solution as Record<string, unknown>)) {
      const { studentId, projectId } = this.splitVariable(key)
      const existing = allocations.find(a => a.projectId === projectId)
      if (existing) {
        existing.students.push(studentId)
      } else {
        allocations.push({ projectId, students: [studentId] })
      }
    }
    return allocations
  }

  private splitVariable(variable: string): { studentId: string; projectId: string } {
    const parts = variable.split('y')
    const studentNumId = parts[0].slice(1) // remove leading 'x'
    const projectNumId = parts[1]
    const studentId = idMappingService.getId(studentNumId)
    const projectId = idMappingService.getId(projectNumId)
    if (!studentId) throw new Error(`No UUID for student numerical id "${studentNumId}"`)
    if (!projectId) throw new Error(`No UUID for project numerical id "${projectNumId}"`)
    return { studentId, projectId }
  }
}
