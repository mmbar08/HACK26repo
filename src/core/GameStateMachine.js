export class GameStateMachine {
  constructor() {
    this.state = 'menu';
  }

  setState(nextState) {
    this.state = nextState;
  }

  is(state) {
    return this.state === state;
  }
}
