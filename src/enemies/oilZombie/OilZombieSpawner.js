export class OilZombieSpawner {
  constructor(worldMap = null) {
    this.worldMap = worldMap;
    this.archetypes = [
      {
        typeName: 'Oil Monster',
        color: 0x7a52c7,
        health: 100,
        speed: 2.8,
        attackRadius: 2.2,
        damagePerSecond: 10,
        rangedAttackRadius: 16,
        coalShotCooldown: 1.55,
        coalProjectileSpeed: 12,
        coalDamage: 9,
        bodySize: {
          width: 1.2,
          height: 2.4,
          depth: 1.2,
        },
      },
      {
        typeName: 'Oil Brute',
        color: 0xd86a2f,
        health: 120,
        speed: 2.35,
        attackRadius: 2.55,
        damagePerSecond: 13,
        rangedAttackRadius: 14,
        coalShotCooldown: 1.85,
        coalProjectileSpeed: 11,
        coalDamage: 12,
        bodySize: {
          width: 1.7,
          height: 2.0,
          depth: 1.7,
        },
      },
      {
        typeName: 'Oil Stalker',
        color: 0x15ad93,
        health: 85,
        speed: 3.15,
        attackRadius: 2.1,
        damagePerSecond: 11,
        rangedAttackRadius: 17,
        coalShotCooldown: 1.35,
        coalProjectileSpeed: 13.5,
        coalDamage: 8,
        bodySize: {
          width: 0.85,
          height: 3.0,
          depth: 0.85,
        },
      },
    ];
  }

  isBlocked(x, z, radius = 1.4) {
    if (!this.worldMap || typeof this.worldMap.isBlockedByZone !== 'function') {
      return false;
    }

    const inElevated = this.worldMap.isBlockedByZone(
      x,
      z,
      this.worldMap.elevatedPlatformZones ?? [],
      radius
    );
    if (inElevated) {
      return true;
    }

    const blockedByRampZone = this.worldMap.isBlockedByZone(
      x,
      z,
      this.worldMap.rampForbiddenZones ?? [],
      radius
    );

    if (blockedByRampZone) {
      return true;
    }

    if (typeof this.worldMap.isSpawnPositionBlocked === 'function') {
      const spawnCollisionSize = { x: radius * 2.1, y: 2.6, z: radius * 2.1 };
      return this.worldMap.isSpawnPositionBlocked(x, z, spawnCollisionSize);
    }

    return false;
  }

  spawn(count = 10, options = {}) {
    const spawnCount = Math.max(1, options.count ?? count);
    const playerPosition = options.playerPosition ?? { x: 0, z: 0 };
    const minDistanceFromPlayer = options.minDistanceFromPlayer ?? 22;
    const minDistanceBetweenSpawns = options.minDistanceBetweenSpawns ?? 6;
    const margin = options.margin ?? 12;

    const levelSize = this.worldMap?.levelSize ?? 130;
    const halfLevel = levelSize * 0.5 - margin;
    const minDistanceFromCenter = options.minDistanceFromCenter ?? 6;
    const maxDistanceFromCenter = Math.min(
      halfLevel,
      options.maxDistanceFromCenter ?? halfLevel * 0.62
    );
    const maxAttempts = spawnCount * 90;
    const spawnConfigs = [];

    let attempts = 0;
    while (spawnConfigs.length < spawnCount && attempts < maxAttempts) {
      attempts += 1;
      const angle = Math.random() * Math.PI * 2;
      const radiusFactor = Math.pow(Math.random(), 0.78);
      const radius =
        minDistanceFromCenter +
        (maxDistanceFromCenter - minDistanceFromCenter) * radiusFactor;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const playerDistance = Math.hypot(x - playerPosition.x, z - playerPosition.z);
      if (playerDistance < minDistanceFromPlayer) {
        continue;
      }

      const tooCloseToOtherSpawn = spawnConfigs.some((spawn) => {
        return Math.hypot(spawn.position.x - x, spawn.position.z - z) < minDistanceBetweenSpawns;
      });
      if (tooCloseToOtherSpawn) {
        continue;
      }

      if (this.isBlocked(x, z, 1.2)) {
        continue;
      }

      const archetype = this.archetypes[Math.floor(Math.random() * this.archetypes.length)];
      spawnConfigs.push({
        ...archetype,
        position: { x, z },
      });
    }

    if (spawnConfigs.length < spawnCount) {
      const fallbackRadius = Math.min(
        maxDistanceFromCenter * 0.85,
        Math.max(minDistanceFromPlayer + 4, minDistanceFromCenter + 5)
      );
      for (let i = spawnConfigs.length; i < spawnCount; i += 1) {
        const angle = (Math.PI * 2 * i) / spawnCount;
        const x = Math.cos(angle) * fallbackRadius;
        const z = Math.sin(angle) * fallbackRadius;
        const archetype = this.archetypes[i % this.archetypes.length];
        spawnConfigs.push({
          ...archetype,
          position: { x, z },
        });
      }
    }

    return spawnConfigs;
  }
}
