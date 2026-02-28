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

    this.reached = playerPosition.distanceTo(this.drillPosition) <= this.interactionRadius;
  }

  complete() {
    this.completed = true;
  }

  isReached() {
    return this.reached;
  }
}
