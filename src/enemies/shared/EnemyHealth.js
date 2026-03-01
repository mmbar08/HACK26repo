export class EnemyHealth {
  constructor(value = 50) {
    this.value = value;
  }

  damage(amount) {
    this.value = Math.max(0, this.value - amount);
  }
}
