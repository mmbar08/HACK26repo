export class PlayerHealth {
  constructor(value = 100) {
    this.value = value;
  }

  damage(amount) {
    this.value = Math.max(0, this.value - amount);
  }
}
