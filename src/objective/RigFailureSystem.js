export class RigFailureSystem {
  constructor(totalSeconds = 480) {
    this.totalSeconds = totalSeconds;
    this.remainingSeconds = totalSeconds;
  }

  update(deltaTime, multiplier = 1) {
    this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaTime * multiplier);
  }

  isFailed() {
    return this.remainingSeconds <= 0;
  }

  getRatio() {
    return this.remainingSeconds / this.totalSeconds;
  }

  reset() {
    this.remainingSeconds = this.totalSeconds;
  }
}
