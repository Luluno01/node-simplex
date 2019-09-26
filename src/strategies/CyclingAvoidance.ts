import PS from './PickingStrategy'
import { Equation } from 'algebra.js'
import LinearProgram, { Result } from '../LinearProgram'


export class CyclingAvoidance extends PS {
  private history: Set<string> = new Set

  constructor(lp?: LinearProgram) {
    super(lp)
    const clearHistory = () => this.history.clear()
    lp
      .on(Result.OPTIMAL, clearHistory)
      .on(Result.UNBOUNDED, clearHistory)
      .on(Result.INFEASIBLE, clearHistory)
    this.attachedListeners.push({ event: Result.OPTIMAL, listener: clearHistory })
    this.attachedListeners.push({ event: Result.UNBOUNDED, listener: clearHistory })
    this.attachedListeners.push({ event: Result.INFEASIBLE, listener: clearHistory })
  }

  pick(candidates: [string, Equation, number][]) {
    const { history, lp } = this
    let res = candidates[0]
    if(res[2] == 0) {  // Degeneracy
      const signature = lp.objective.toString()
      if(history.has(signature)) {  // Cycling
        if(candidates.length > 1) {
          res = candidates[1]
        }
      } else history.add(signature)
    } else history.clear()
    return res
  }
}

export default CyclingAvoidance
