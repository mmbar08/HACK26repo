export class RepairInteraction {
  constructor(requiredSeconds = 5) {
    this.requiredSeconds = requiredSeconds;
    this.progressSeconds = 0;
  }

  update(deltaTime, isHolding, canRepair) {
    if (!canRepair) {
      this.progressSeconds = Math.max(0, this.progressSeconds - deltaTime * 1.6);
      return false;
    }

    if (isHolding) {
      this.progressSeconds = Math.min(
        this.requiredSeconds,
        this.progressSeconds + deltaTime
      );
    } else {
      this.progressSeconds = Math.max(0, this.progressSeconds - deltaTime * 0.9);
    }

    return this.progressSeconds >= this.requiredSeconds;
  }

  getRatio() {
    return this.progressSeconds / this.requiredSeconds;
  }

  reset() {
    this.progressSeconds = 0;
  }
}
