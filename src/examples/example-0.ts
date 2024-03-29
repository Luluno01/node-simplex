import * as algebra from 'algebra.js'
import { Expression, Equation } from 'algebra.js'
import LinearProgram from '../LinearProgram'
import printSolve from '../printSolve'


const lp = new LinearProgram({
  variables: 2,
  objective: <Expression>algebra.parse('2 * x1 + 3 * x2'),
  constraints: [
    <Equation>algebra.parse('w1 = 6 - x1 - x2'),
    <Equation>algebra.parse('w2 = 10 - 2 * x1 - x2'),
    <Equation>algebra.parse('w3 = 4 + x1 - x2')
  ]
})

printSolve(lp)
