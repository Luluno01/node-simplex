import { Equation } from 'algebra.js'
import LinearProgram, { Result } from '../LinearProgram'


export class Strategy {
  protected lp: LinearProgram
  protected attachedListeners: { event: string, listener: (...args: any) => void }[] = []
  constructor(lp?: LinearProgram) {
    if(lp) this.bind(lp)
  }

  pick(candidates: [string, Equation, number][]): [string, Equation, number] {
    throw new Error('Not implemented')
  }

  bind(lp: LinearProgram) {
    this.lp = lp
    return this
  }

  unbind() {
    const { lp, attachedListeners } = this
    for(const { event, listener } of attachedListeners) {
      lp.off(event, listener)
    }
    this.attachedListeners = []
    delete this.lp
    delete lp.strategy
    return this
  }
}

export default Strategy
