export class RigFailureSystem {
  constructor(totalSeconds = 480) {
    this.remainingSeconds = totalSeconds;
  }

  update(deltaTime) {
    this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaTime);
  }
}
