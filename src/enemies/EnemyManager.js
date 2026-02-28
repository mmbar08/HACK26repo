import * as THREE from 'three';

function createEnemyUi(typeName) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.transform = 'translate(-50%, -120%)';
  container.style.pointerEvents = 'none';
  container.style.minWidth = '110px';
  container.style.padding = '4px 6px';
  container.style.background = 'rgba(0, 0, 0, 0.5)';
  container.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  container.style.fontFamily = 'system-ui, sans-serif';
  container.style.fontSize = '11px';
  container.style.color = '#f3f8ff';

  const name = document.createElement('div');
  name.style.marginBottom = '4px';
  name.style.textAlign = 'center';
  name.textContent = typeName;

  const barTrack = document.createElement('div');
  barTrack.style.width = '100%';
  barTrack.style.height = '8px';
  barTrack.style.background = 'rgba(255, 255, 255, 0.22)';

  const barFill = document.createElement('div');
  barFill.style.height = '100%';
  barFill.style.width = '100%';
  barFill.style.background = 'linear-gradient(90deg, #29d27b 0%, #f6d54b 60%, #de4848 100%)';

  barTrack.appendChild(barFill);
  container.appendChild(name);
  container.appendChild(barTrack);
  document.body.appendChild(container);

  return { container, barFill };
}

export class EnemyManager {
  constructor(scene, _hud, spawnConfigs, playerRadius = 0.55, worldMap = null) {
    this.scene = scene;
    this.enemies = [];
    this.enemyId = 1;
    this.playerRadius = playerRadius;
    this.worldMap = worldMap;
    this.tempVector = new THREE.Vector3();
    this.tempPosition = new THREE.Vector3();
    this.currentCollisionProbe = new THREE.Vector3();
    this.nextCollisionProbe = new THREE.Vector3();
    this.clipSpaceVector = new THREE.Vector3();
    this.enemyCollider = new THREE.Box3();
    this.attackVerticalRange = 2.8;
    this.elapsedTime = 0;

    this.hotCoals = [];
    this.hotCoalImpacts = [];
    this.hotCoalTrails = [];
    this.hotCoalMuzzleBursts = [];
    this.projectileCollider = new THREE.Box3();
    this.projectileCollisionSize = new THREE.Vector3(0.42, 0.42, 0.42);
    this.projectilePrevPosition = new THREE.Vector3();
    this.projectileDirection = new THREE.Vector3();
    this.projectileVelocityStep = new THREE.Vector3();
    this.projectileToPlayer = new THREE.Vector3();
    this.projectileToTorso = new THREE.Vector3();
    this.projectileToFeet = new THREE.Vector3();
    this.playerTorsoPosition = new THREE.Vector3();
    this.playerFeetPosition = new THREE.Vector3();
    this.impactDrift = new THREE.Vector3();
    this.chaseDirection = new THREE.Vector3();
    this.separationDirection = new THREE.Vector3();
    this.enemyOffset = new THREE.Vector3();
    this.targetDirection = new THREE.Vector3();
    this.leadTargetPosition = new THREE.Vector3();
    this.playerVelocityEstimate = new THREE.Vector3();
    this.lastPlayerPosition = new THREE.Vector3();
    this.hasLastPlayerPosition = false;
    this.enemyEyePosition = new THREE.Vector3();
    this.playerAimPosition = new THREE.Vector3();
    this.sightRaycaster = new THREE.Raycaster();

    this.spotRadius = 38;
    this.disengageRadius = 48;
    this.chaseMemoryDuration = 2.5;
    this.separationDistance = 3.4;
    this.separationStrength = 1.35;

    this.enemyCollisionSize = new THREE.Vector3(1.6, 2.4, 1.6);

    for (const config of spawnConfigs) {
      this.spawn(config);
    }
  }

  spawn(config) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.4, 1.2),
      new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: 0.85,
        metalness: 0.16,
      })
    );

    mesh.position.set(config.position.x, 1.2, config.position.z);
    this.scene.add(mesh);
    const ui = createEnemyUi(config.typeName);
    const goopEmitter = this.createOilGoopEmitter();
    mesh.add(goopEmitter.points);

    this.enemies.push({
      id: this.enemyId++,
      mesh,
      typeName: config.typeName,
      color: config.color,
      maxHealth: config.health,
      health: config.health,
      speed: config.speed,
      attackRadius: config.attackRadius,
      damagePerSecond: config.damagePerSecond,
      aiState: 'idle',
      lastSeenTime: -Infinity,
      rangedAttackRadius: config.rangedAttackRadius ?? 16,
      coalShotCooldown: (config.coalShotCooldown ?? 1.6) * 0.58,
      coalProjectileSpeed: (config.coalProjectileSpeed ?? 12) * 1.7,
      holdDistance: config.holdDistance ?? (config.attackRadius + 2.3),
      coalDamage: config.coalDamage ?? 10,
      lastCoalShotTime: -Math.random() * 1.5,
      collisionRadius: 0.8,
      alive: true,
      goopEmitter,
      ui,
    });
  }

  createOilGoopEmitter() {
    const count = 20;
    const positions = new Float32Array(count * 3);
    const velocities = [];
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      this.writeGoopEdgePosition(positions, i * 3);
      velocities.push(this.createGoopEdgeVelocity());
      lifetimes[i] = Math.random() * 0.55 + 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x21191d,
      size: 0.2,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);

    return {
      points,
      geometry,
      positions,
      velocities,
      lifetimes,
      count,
    };
  }

  writeGoopEdgePosition(positions, idx) {
    const halfX = 0.61;
    const halfZ = 0.61;
    const y = 0.15 + Math.random() * 2.05;

    const edgeChoice = Math.floor(Math.random() * 4);
    if (edgeChoice === 0) {
      positions[idx] = -halfX;
      positions[idx + 2] = (Math.random() - 0.5) * 1.18;
    } else if (edgeChoice === 1) {
      positions[idx] = halfX;
      positions[idx + 2] = (Math.random() - 0.5) * 1.18;
    } else if (edgeChoice === 2) {
      positions[idx] = (Math.random() - 0.5) * 1.18;
      positions[idx + 2] = -halfZ;
    } else {
      positions[idx] = (Math.random() - 0.5) * 1.18;
      positions[idx + 2] = halfZ;
    }

    positions[idx + 1] = y;
  }

  createGoopEdgeVelocity() {
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * 1.3,
      0.22 + Math.random() * 0.7,
      (Math.random() - 0.5) * 1.3
    );
    direction.normalize().multiplyScalar(0.42 + Math.random() * 0.62);
    return direction;
  }

  updateOilGoopEmitter(goopEmitter, delta) {
    if (!goopEmitter) {
      return;
    }

    const { positions, velocities, lifetimes, geometry, count } = goopEmitter;
    for (let i = 0; i < count; i += 1) {
      lifetimes[i] -= delta;
      const idx = i * 3;

      if (lifetimes[i] <= 0) {
        this.writeGoopEdgePosition(positions, idx);
        velocities[i].copy(this.createGoopEdgeVelocity());
        lifetimes[i] = 0.22 + Math.random() * 0.58;
        continue;
      }

      velocities[i].y += 0.28 * delta;
      positions[idx] += velocities[i].x * delta;
      positions[idx + 1] += velocities[i].y * delta;
      positions[idx + 2] += velocities[i].z * delta;
    }

    geometry.attributes.position.needsUpdate = true;
  }

  update(delta, playerPosition) {
    this.elapsedTime += delta;
    let totalDamage = 0;

    if (this.hasLastPlayerPosition && delta > 0.0001) {
      this.tempVector.copy(playerPosition).sub(this.lastPlayerPosition).multiplyScalar(1 / delta);
      this.playerVelocityEstimate.lerp(this.tempVector, 0.4);
    } else {
      this.playerVelocityEstimate.set(0, 0, 0);
      this.hasLastPlayerPosition = true;
    }
    this.lastPlayerPosition.copy(playerPosition);

    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue;
      }

      this.updateOilGoopEmitter(enemy.goopEmitter, delta);

      this.tempVector.copy(playerPosition).sub(enemy.mesh.position).setY(0);
      const distance = this.tempVector.length();
      const verticalDistance = Math.abs(playerPosition.y - enemy.mesh.position.y);
      const inSpotRange =
        distance <= this.spotRadius &&
        verticalDistance <= this.attackVerticalRange + 2.4;
      const hasSight = inSpotRange && this.hasLineOfSight(enemy, playerPosition);

      if (this.worldMap && typeof this.worldMap.getGroundHeightAt === 'function') {
        const enemyHeight = this.enemyCollisionSize.y;
        const topProbeY = enemy.mesh.position.y + enemyHeight * 0.5;
        const groundHeight = this.worldMap.getGroundHeightAt(
          enemy.mesh.position.x,
          enemy.mesh.position.z,
          topProbeY,
          enemyHeight
        );
        enemy.mesh.position.y = groundHeight + enemyHeight * 0.5;
      }

      if (hasSight) {
        enemy.aiState = 'chasing';
        enemy.lastSeenTime = this.elapsedTime;
      } else if (
        enemy.aiState === 'chasing' &&
        (distance > this.disengageRadius ||
          this.elapsedTime - enemy.lastSeenTime > this.chaseMemoryDuration)
      ) {
        enemy.aiState = 'idle';
      }

      const shouldHoldPosition = distance <= enemy.holdDistance;

      if (enemy.aiState === 'chasing' && distance > 0.001 && !shouldHoldPosition) {
        this.chaseDirection.copy(this.tempVector).normalize();
        this.separationDirection.copy(this.computeSeparationDirection(enemy));
        if (this.separationDirection.lengthSq() > 0.0001) {
          this.chaseDirection
            .addScaledVector(this.separationDirection, this.separationStrength)
            .normalize();
        }

        const moveStep = enemy.speed * delta;

        this.tempPosition.copy(enemy.mesh.position);
        this.tempPosition.x += this.chaseDirection.x * moveStep;
        if (!this.collidesWithWorld(this.tempPosition, enemy.mesh.position)) {
          enemy.mesh.position.x = this.tempPosition.x;
        }

        this.tempPosition.copy(enemy.mesh.position);
        this.tempPosition.z += this.chaseDirection.z * moveStep;
        if (!this.collidesWithWorld(this.tempPosition, enemy.mesh.position)) {
          enemy.mesh.position.z = this.tempPosition.z;
        }

        enemy.mesh.rotation.y = Math.atan2(this.chaseDirection.x, this.chaseDirection.z);
      } else if (distance > 0.001) {
        this.targetDirection.copy(this.tempVector).normalize();
        enemy.mesh.rotation.y = Math.atan2(this.targetDirection.x, this.targetDirection.z);
      }

      const canShootCoals =
        enemy.aiState === 'chasing' &&
        distance <= enemy.rangedAttackRadius &&
        verticalDistance <= this.attackVerticalRange + 1.6 &&
        hasSight;
      const closeRangeMultiplier = shouldHoldPosition ? 3.4 : 1;
      const effectiveCooldown = enemy.coalShotCooldown / closeRangeMultiplier;
      if (canShootCoals && this.elapsedTime - enemy.lastCoalShotTime >= effectiveCooldown) {
        this.spawnHotCoalProjectile(enemy, playerPosition, this.playerVelocityEstimate);
        enemy.lastCoalShotTime = this.elapsedTime;
      }
    }

    totalDamage += this.updateHotCoalProjectiles(delta, playerPosition);
    this.updateHotCoalImpacts(delta);
    this.updateHotCoalTrails(delta);
    this.updateHotCoalMuzzleBursts(delta);

    return totalDamage;
  }

  hasLineOfSight(enemy, playerPosition) {
    if (!this.worldMap || typeof this.worldMap.getRaycastTargets !== 'function') {
      return true;
    }

    const blockers = this.worldMap.getRaycastTargets();
    if (!Array.isArray(blockers) || blockers.length === 0) {
      return true;
    }

    this.enemyEyePosition.copy(enemy.mesh.position);
    this.enemyEyePosition.y += 1.1;
    this.playerAimPosition.copy(playerPosition);
    this.playerAimPosition.y -= 0.9;

    this.targetDirection
      .copy(this.playerAimPosition)
      .sub(this.enemyEyePosition);
    const distance = this.targetDirection.length();
    if (distance <= 0.001) {
      return true;
    }

    this.targetDirection.multiplyScalar(1 / distance);
    this.sightRaycaster.set(this.enemyEyePosition, this.targetDirection);
    const hits = this.sightRaycaster.intersectObjects(blockers, false);
    if (!hits.length) {
      return true;
    }

    return hits[0].distance >= distance - 0.5;
  }

  computeSeparationDirection(enemy) {
    this.separationDirection.set(0, 0, 0);

    for (const other of this.enemies) {
      if (other === enemy || !other.alive || other.aiState !== 'chasing') {
        continue;
      }

      this.enemyOffset.copy(enemy.mesh.position).sub(other.mesh.position).setY(0);
      const distance = this.enemyOffset.length();
      if (distance <= 0.0001 || distance >= this.separationDistance) {
        continue;
      }

      const pushStrength = (this.separationDistance - distance) / this.separationDistance;
      this.enemyOffset.multiplyScalar((1 / distance) * pushStrength);
      this.separationDirection.add(this.enemyOffset);
    }

    if (this.separationDirection.lengthSq() <= 0.0001) {
      return this.separationDirection;
    }

    return this.separationDirection.normalize();
  }

  spawnHotCoalProjectile(enemy, playerPosition, playerVelocity = null) {
    const projectileMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xff2b1f,
        emissive: 0xff341f,
        emissiveIntensity: 2.2,
        roughness: 0.42,
        metalness: 0.05,
      })
    );

    projectileMesh.position.copy(enemy.mesh.position);
    projectileMesh.position.y += 1.15;
    this.scene.add(projectileMesh);

    const directDistance = projectileMesh.position.distanceTo(playerPosition);
    const projectileSpeed = Math.max(0.01, enemy.coalProjectileSpeed);
    const leadTime = THREE.MathUtils.clamp(directDistance / projectileSpeed, 0.03, 0.62);

    this.leadTargetPosition.copy(playerPosition);
    this.leadTargetPosition.y -= 0.92;
    if (playerVelocity) {
      this.leadTargetPosition.addScaledVector(playerVelocity, leadTime * 0.86);
    }

    this.projectileDirection.copy(this.leadTargetPosition).sub(projectileMesh.position);
    if (this.projectileDirection.lengthSq() <= 0.0001) {
      this.projectileDirection.copy(playerPosition).sub(projectileMesh.position);
    }
    this.projectileDirection.normalize();
    const velocity = this.projectileDirection.clone().multiplyScalar(projectileSpeed);
    this.spawnHotCoalMuzzleBurst(projectileMesh.position, this.projectileDirection);

    this.hotCoals.push({
      mesh: projectileMesh,
      velocity,
      age: 0,
      maxAge: 4,
      damage: enemy.coalDamage,
      hitRadius: 0.7,
      trailAccumulator: 0,
    });
  }

  spawnHotCoalMuzzleBurst(position, direction) {
    const count = 10;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i += 1) {
      const idx = i * 3;
      positions[idx] = position.x;
      positions[idx + 1] = position.y;
      positions[idx + 2] = position.z;

      const burstVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.9,
        (Math.random() - 0.35) * 0.8,
        (Math.random() - 0.5) * 0.9
      );
      burstVelocity.addScaledVector(direction, 1.7 + Math.random() * 1.4);
      burstVelocity.multiplyScalar(1.1 + Math.random() * 1.4);
      velocities.push(burstVelocity);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xff7d40,
      size: 0.08,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.hotCoalMuzzleBursts.push({
      points,
      geometry,
      material,
      positions,
      velocities,
      age: 0,
      life: 0.13,
    });
  }

  updateHotCoalProjectiles(delta, playerPosition) {
    let damageTotal = 0;

    for (let index = this.hotCoals.length - 1; index >= 0; index -= 1) {
      const projectile = this.hotCoals[index];
      projectile.age += delta;
      if (projectile.age > projectile.maxAge) {
        this.destroyHotCoal(index, false);
        continue;
      }

      this.projectilePrevPosition.copy(projectile.mesh.position);
      this.projectileVelocityStep.copy(projectile.velocity).multiplyScalar(delta);
      projectile.mesh.position.add(this.projectileVelocityStep);

      projectile.trailAccumulator += delta;
      while (projectile.trailAccumulator >= 0.03) {
        this.spawnHotCoalTrail(projectile.mesh.position);
        projectile.trailAccumulator -= 0.03;
      }

      if (this.worldMap) {
        const hitWorld = this.worldMap.collidesWithWorld(
          projectile.mesh.position,
          this.projectileCollider,
          this.projectileCollisionSize,
          this.projectilePrevPosition
        );
        if (hitWorld) {
          this.spawnHotCoalImpact(projectile.mesh.position);
          this.destroyHotCoal(index, false);
          continue;
        }
      }

      this.projectileToPlayer.copy(playerPosition).sub(projectile.mesh.position);
      this.playerTorsoPosition.copy(playerPosition);
      this.playerTorsoPosition.y -= 0.9;
      this.playerFeetPosition.copy(playerPosition);
      this.playerFeetPosition.y -= 1.9;

      this.projectileToTorso.copy(this.playerTorsoPosition).sub(projectile.mesh.position);
      this.projectileToFeet.copy(this.playerFeetPosition).sub(projectile.mesh.position);

      const hitHead = this.projectileToPlayer.lengthSq() <= projectile.hitRadius * projectile.hitRadius;
      const hitTorso = this.projectileToTorso.lengthSq() <= 0.92 * 0.92;
      const hitFeet = this.projectileToFeet.lengthSq() <= 0.88 * 0.88;
      if (hitHead || hitTorso || hitFeet) {
        damageTotal += projectile.damage;
        this.spawnHotCoalImpact(projectile.mesh.position);
        this.destroyHotCoal(index, true);
      }
    }

    return damageTotal;
  }

  spawnHotCoalImpact(position) {
    const count = 14;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i += 1) {
      const idx = i * 3;
      positions[idx] = position.x;
      positions[idx + 1] = position.y;
      positions[idx + 2] = position.z;
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2.2,
          Math.random() * 2.4,
          (Math.random() - 0.5) * 2.2
        )
      );
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xff3b26,
      size: 0.11,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.hotCoalImpacts.push({
      points,
      geometry,
      positions,
      velocities,
      age: 0,
      life: 0.42,
    });
  }

  spawnHotCoalTrail(position) {
    const count = 8;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i += 1) {
      const idx = i * 3;
      positions[idx] = position.x + (Math.random() - 0.5) * 0.14;
      positions[idx + 1] = position.y + (Math.random() - 0.5) * 0.14;
      positions[idx + 2] = position.z + (Math.random() - 0.5) * 0.14;
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.85,
          0.5 + Math.random() * 1.2,
          (Math.random() - 0.5) * 0.85
        )
      );
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xff6a38,
      size: 0.085,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.hotCoalTrails.push({
      points,
      geometry,
      positions,
      velocities,
      age: 0,
      life: 0.24,
    });
  }

  updateHotCoalTrails(delta) {
    for (let i = this.hotCoalTrails.length - 1; i >= 0; i -= 1) {
      const trail = this.hotCoalTrails[i];
      trail.age += delta;
      if (trail.age >= trail.life) {
        this.scene.remove(trail.points);
        trail.geometry.dispose();
        trail.points.material.dispose();
        this.hotCoalTrails.splice(i, 1);
        continue;
      }

      const decay = 1 - trail.age / trail.life;
      const attribute = trail.geometry.attributes.position;
      for (let p = 0; p < trail.velocities.length; p += 1) {
        const idx = p * 3;
        const velocity = trail.velocities[p];
        trail.positions[idx] += velocity.x * delta;
        trail.positions[idx + 1] += velocity.y * delta;
        trail.positions[idx + 2] += velocity.z * delta;
      }
      attribute.needsUpdate = true;
      trail.points.material.opacity = 0.72 * decay;
    }
  }

  updateHotCoalImpacts(delta) {
    for (let i = this.hotCoalImpacts.length - 1; i >= 0; i -= 1) {
      const impact = this.hotCoalImpacts[i];
      impact.age += delta;
      if (impact.age >= impact.life) {
        this.scene.remove(impact.points);
        impact.geometry.dispose();
        impact.points.material.dispose();
        this.hotCoalImpacts.splice(i, 1);
        continue;
      }

      const decay = 1 - impact.age / impact.life;
      const attribute = impact.geometry.attributes.position;
      for (let p = 0; p < impact.velocities.length; p += 1) {
        const velocity = impact.velocities[p];
        this.impactDrift.copy(velocity).multiplyScalar(delta * decay);
        const idx = p * 3;
        impact.positions[idx] += this.impactDrift.x;
        impact.positions[idx + 1] += this.impactDrift.y;
        impact.positions[idx + 2] += this.impactDrift.z;
      }
      attribute.needsUpdate = true;
      impact.points.material.opacity = 0.95 * decay;
    }
  }

  updateHotCoalMuzzleBursts(delta) {
    for (let i = this.hotCoalMuzzleBursts.length - 1; i >= 0; i -= 1) {
      const burst = this.hotCoalMuzzleBursts[i];
      burst.age += delta;
      if (burst.age >= burst.life) {
        this.scene.remove(burst.points);
        burst.geometry.dispose();
        burst.material.dispose();
        this.hotCoalMuzzleBursts.splice(i, 1);
        continue;
      }

      const decay = 1 - burst.age / burst.life;
      const attribute = burst.geometry.attributes.position;
      for (let p = 0; p < burst.velocities.length; p += 1) {
        const idx = p * 3;
        const velocity = burst.velocities[p];
        burst.positions[idx] += velocity.x * delta;
        burst.positions[idx + 1] += velocity.y * delta;
        burst.positions[idx + 2] += velocity.z * delta;
      }

      attribute.needsUpdate = true;
      burst.material.opacity = 0.88 * decay;
    }
  }

  destroyHotCoal(index, hitPlayer) {
    const projectile = this.hotCoals[index];
    if (!projectile) {
      return;
    }

    if (!hitPlayer) {
      projectile.mesh.material.emissiveIntensity = 0.8;
    }

    this.scene.remove(projectile.mesh);
    projectile.mesh.material.dispose();

    this.hotCoals.splice(index, 1);
  }

  collidesWithWorld(nextPosition, currentPosition) {
    if (!this.worldMap) {
      return false;
    }

    const bodyHeight = this.enemyCollisionSize.y;
    this.nextCollisionProbe.copy(nextPosition);
    this.nextCollisionProbe.y += bodyHeight * 0.5;

    this.currentCollisionProbe.copy(currentPosition);
    this.currentCollisionProbe.y += bodyHeight * 0.5;

    return this.worldMap.collidesWithWorld(
      this.nextCollisionProbe,
      this.enemyCollider,
      this.enemyCollisionSize,
      this.currentCollisionProbe,
      'square'
    );
  }

  resolvePlayerCollision(playerPosition) {
    return playerPosition;
  }

  getClosestShotHit(raycaster, maxDistance = Infinity) {
    const aliveMeshes = this.enemies
      .filter((enemy) => enemy.alive)
      .map((enemy) => enemy.mesh);

    if (!aliveMeshes.length) {
      return null;
    }

    const hits = raycaster.intersectObjects(aliveMeshes, false);

    if (!hits.length) {
      return null;
    }

    const hit = hits[0];
    if (hit.distance > maxDistance) {
      return null;
    }

    const targetEnemy = this.enemies.find((enemy) => enemy.mesh === hit.object);

    if (!targetEnemy) {
      return null;
    }

    return {
      targetEnemy,
      point: hit.point.clone(),
      distance: hit.distance,
    };
  }

  applyShotHit(targetEnemy, damage = 34) {
    if (!targetEnemy || !targetEnemy.alive) {
      return;
    }

    targetEnemy.health = Math.max(0, targetEnemy.health - damage);
    targetEnemy.mesh.material.color.setHex(0xffffff);

    setTimeout(() => {
      if (targetEnemy.alive) {
        targetEnemy.mesh.material.color.setHex(targetEnemy.color);
      }
    }, 75);

    if (targetEnemy.health === 0) {
      targetEnemy.alive = false;
      targetEnemy.mesh.visible = false;
      targetEnemy.ui.container.style.display = 'none';
    }
  }

  shoot(raycaster, maxDistance = Infinity) {
    const hit = this.getClosestShotHit(raycaster, maxDistance);

    if (!hit) {
      return null;
    }

    this.applyShotHit(hit.targetEnemy);

    return hit.point;
  }

  updateUi(camera) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        enemy.ui.container.style.display = 'none';
        continue;
      }

      this.clipSpaceVector.copy(enemy.mesh.position);
      this.clipSpaceVector.y += 2.2;
      this.clipSpaceVector.project(camera);
      const isVisible = this.clipSpaceVector.z >= -1 && this.clipSpaceVector.z <= 1;

      if (!isVisible) {
        enemy.ui.container.style.display = 'none';
        continue;
      }

      enemy.ui.container.style.display = 'block';
      enemy.ui.container.style.left = `${(this.clipSpaceVector.x * 0.5 + 0.5) * window.innerWidth}px`;
      enemy.ui.container.style.top = `${(-this.clipSpaceVector.y * 0.5 + 0.5) * window.innerHeight}px`;

      const distance = camera.position.distanceTo(enemy.mesh.position);
      const fadeT = THREE.MathUtils.clamp((distance - 14) / 38, 0, 1);
      const opacity = THREE.MathUtils.lerp(1, 0.34, fadeT);
      const scale = THREE.MathUtils.lerp(1, 0.82, fadeT);
      enemy.ui.container.style.opacity = `${opacity}`;
      enemy.ui.container.style.transform = `translate(-50%, -120%) scale(${scale})`;

      const healthRatio = THREE.MathUtils.clamp(enemy.health / enemy.maxHealth, 0, 1);
      const healthPercent = healthRatio * 100;
      enemy.ui.barFill.style.width = `${Math.max(0, healthPercent)}%`;
      const red = Math.round(THREE.MathUtils.lerp(220, 40, healthRatio));
      const green = Math.round(THREE.MathUtils.lerp(62, 205, healthRatio));
      const blue = Math.round(THREE.MathUtils.lerp(62, 95, healthRatio));
      enemy.ui.barFill.style.background = `rgb(${red}, ${green}, ${blue})`;
    }
  }

  getAliveCount() {
    return this.enemies.filter((enemy) => enemy.alive).length;
  }

  clearAll() {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh);
      if (enemy.goopEmitter) {
        enemy.goopEmitter.geometry.dispose();
        enemy.goopEmitter.points.material.dispose();
      }
      enemy.mesh.geometry.dispose();
      enemy.mesh.material.dispose();
      enemy.ui.container.remove();
    }
    this.enemies = [];

    for (let i = this.hotCoals.length - 1; i >= 0; i -= 1) {
      this.destroyHotCoal(i, false);
    }

    for (const impact of this.hotCoalImpacts) {
      this.scene.remove(impact.points);
      impact.geometry.dispose();
      impact.points.material.dispose();
    }
    this.hotCoalImpacts = [];

    for (const trail of this.hotCoalTrails) {
      this.scene.remove(trail.points);
      trail.geometry.dispose();
      trail.points.material.dispose();
    }
    this.hotCoalTrails = [];

    for (const burst of this.hotCoalMuzzleBursts) {
      this.scene.remove(burst.points);
      burst.geometry.dispose();
      burst.material.dispose();
    }
    this.hotCoalMuzzleBursts = [];
  }

  reset(spawnConfigs) {
    this.clearAll();
    this.enemyId = 1;
    this.elapsedTime = 0;
    this.hasLastPlayerPosition = false;
    this.playerVelocityEstimate.set(0, 0, 0);

    for (const config of spawnConfigs) {
      this.spawn(config);
    }
  }
}
