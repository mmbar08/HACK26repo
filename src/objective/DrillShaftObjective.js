export class DrillShaftObjective {
  constructor(drillPosition, interactionRadius = 4) {
    this.drillPosition = drillPosition;
    this.interactionRadius = interactionRadius;
    this.completed = false;
    this.reached = false;
  }

  update(playerPosition) {
    if (this.completed) {
      return;
    }

    const dx = playerPosition.x - this.drillPosition.x;
    const dz = playerPosition.z - this.drillPosition.z;
    this.reached = dx * dx + dz * dz <= this.interactionRadius * this.interactionRadius;
  }

  complete() {
    this.completed = true;
  }

  isReached() {
    return this.reached;
  }

  reset() {
    this.completed = false;
    this.reached = false;
  }
}
