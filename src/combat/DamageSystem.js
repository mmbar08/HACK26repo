export class DamageSystem {
  apply(target, amount) {
    if (typeof target?.damage === 'function') {
      target.damage(amount);
    }
  }
}
