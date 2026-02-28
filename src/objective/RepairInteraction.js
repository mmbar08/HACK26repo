export class RepairInteraction {
  constructor(requiredSeconds = 5) {
    this.requiredSeconds = requiredSeconds;
    this.progressSeconds = 0;
  }
}
