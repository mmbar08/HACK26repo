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
  barTrack.style.border = '1px solid rgba(255, 255, 255, 0.2)';

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
    this.clipSpaceVector = new THREE.Vector3();
    this.enemyCollider = new THREE.Box3();

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
      collisionRadius: 0.8,
      alive: true,
      ui,
    });
  }

  update(delta, playerPosition) {
    let totalDamage = 0;

    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue;
      }

      this.tempVector.copy(playerPosition).sub(enemy.mesh.position).setY(0);

      const distance = this.tempVector.length();

      if (distance > 0.001) {
        this.tempVector.normalize();
        const moveStep = enemy.speed * delta;

        this.tempPosition.copy(enemy.mesh.position);
        this.tempPosition.x += this.tempVector.x * moveStep;
        if (!this.collidesWithWorld(this.tempPosition, enemy.mesh.position)) {
          enemy.mesh.position.x = this.tempPosition.x;
        }

        this.tempPosition.copy(enemy.mesh.position);
        this.tempPosition.z += this.tempVector.z * moveStep;
        if (!this.collidesWithWorld(this.tempPosition, enemy.mesh.position)) {
          enemy.mesh.position.z = this.tempPosition.z;
        }
      }

      enemy.mesh.rotation.y += delta * 1.7;

      if (distance <= enemy.attackRadius) {
        totalDamage += enemy.damagePerSecond * delta;
      }
    }

    return totalDamage;
  }

  collidesWithWorld(nextPosition, currentPosition) {
    if (!this.worldMap) {
      return false;
    }

    return this.worldMap.collidesWithWorld(
      nextPosition,
      this.enemyCollider,
      this.enemyCollisionSize,
      currentPosition
    );
  }

  resolvePlayerCollision(playerPosition) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue;
      }

      this.tempVector.copy(playerPosition).sub(enemy.mesh.position).setY(0);

      const distance = this.tempVector.length();
      const minDistance = this.playerRadius + enemy.collisionRadius;

      if (distance >= minDistance || distance < 0.0001) {
        continue;
      }

      const pushDistance = minDistance - distance;
      this.tempVector.normalize();
      playerPosition.addScaledVector(this.tempVector, pushDistance);
    }
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

      const healthPercent = (enemy.health / enemy.maxHealth) * 100;
      enemy.ui.barFill.style.width = `${Math.max(0, healthPercent)}%`;
    }
  }

  getAliveCount() {
    return this.enemies.filter((enemy) => enemy.alive).length;
  }
}
