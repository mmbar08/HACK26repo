import { GameLoop } from './GameLoop.js';
import { GameStateMachine } from './GameStateMachine.js';
import { SceneManager } from '../scene/SceneManager.js';

export class Game {
  constructor() {
    this.stateMachine = new GameStateMachine();
    this.sceneManager = new SceneManager();
    this.loop = new GameLoop((deltaTime) => this.update(deltaTime));
  }

  start() {
    this.stateMachine.setState('in-game');
    this.loop.start();
  }

  update(deltaTime) {
    this.sceneManager.update(deltaTime);
  }
}
