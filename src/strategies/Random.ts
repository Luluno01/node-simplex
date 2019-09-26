import PS from './PickingStrategy'
import { Equation } from 'algebra.js'


export class Random extends PS {
  pick(candidates: [string, Equation, number][]) {
    return candidates[Math.floor(Math.random() * candidates.length)]
  }
}

export default Random
