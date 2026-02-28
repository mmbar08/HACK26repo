export class GameStateMachine {
  constructor() {
    this.state = 'menu';
    this.listeners = new Set();
  }

  setState(nextState) {
    const prevState = this.state;
    this.state = nextState;

    for (const listener of this.listeners) {
      listener(nextState, prevState);
    }
  }

  is(state) {
    return this.state === state;
  }

  onChange(listener) {
    this.listeners.add(listener);
  }
}
