declare module 'javascript-lp-solver' {
  export class ReformatLP {
    constructor(constraints: string[])
  }

  export class Solve {
    feasible: boolean
    bounded?: boolean
    result?: number
    isIntegral?: boolean
    [key: string]: unknown
    constructor(lp: ReformatLP)
  }
}
