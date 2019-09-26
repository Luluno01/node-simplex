import LinearProgram from '../LinearProgram'


export function printSolve(lp: LinearProgram) {
  console.log(lp.toString() + '\n')
  for(const [ self, result ] of lp.solve()) {
    console.log(result)
    console.log(self.toString() + '\n')
  }
}

export default printSolve
