import { WeaponBase } from './WeaponBase.js';

export class RifleWeapon extends WeaponBase {
  fire() {
    return { fired: true };
  }
}
