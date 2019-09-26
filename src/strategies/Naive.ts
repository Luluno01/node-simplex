import PS from './PickingStrategy'
import { Equation } from 'algebra.js'


export class Naive extends PS {
  pick(candidates: [string, Equation, number][]) {
    return candidates[0]
  }
}

export default Naive
