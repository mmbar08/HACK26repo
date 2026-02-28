export class GameLoop {
  constructor(onUpdate) {
    this.onUpdate = onUpdate;
    this.lastTime = 0;
    this.rafId = null;
  }

  start() {
    const loop = (timestamp) => {
      const deltaTime = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      this.onUpdate(deltaTime || 0);
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
