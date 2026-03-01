import { OilRigMap } from './maps/OilRigMap.js';

export class SceneManager {
  constructor() {
    this.map = new OilRigMap();
  }

  update(deltaTime) {
    this.map.update(deltaTime);
  }
}
