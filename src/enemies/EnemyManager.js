import * as THREE from 'three';
import { ModelLoader } from '../scene/ModelLoader.js';
import { TextureAssetLoader } from '../scene/TextureLoader.js';

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
  // attempt to load a model using the provided URL first; if that fails
  // and the path starts with "dist/" we'll try again after stripping it.
  // this lets callers continue using exactly the string their build process
  // generates while still working in dev where "dist/" may not be served.
  // attempt to load a model using various permutations of the URL in
  // case the server is mounted at `/` or `/dist/`.  order matters – we try
  // the original string first, then add a leading slash, then strip any
  // leading `dist/` (with or without the slash) and try again.
  async fetchModelWithFallback(url) {
    const candidates = [];
    candidates.push(url);
    if (!url.startsWith('/')) {
      candidates.push('/' + url);
    }
    // strip dist prefix versions
    for (const c of [...candidates]) {
      if (c.startsWith('/dist/')) {
        candidates.push(c.replace(/^\/?dist\//, '/'));
      }
    }

    let firstErr;
    for (const c of candidates) {
      try {
        return await this.modelLoader.loadModel(c);
      } catch (err) {
        firstErr = firstErr || err;
      }
    }
    throw firstErr;
  }

  async fetchTextureWithFallback(url) {
    const candidates = [];
    candidates.push(url);
    if (!url.startsWith('/')) {
      candidates.push('/' + url);
    }
    for (const c of [...candidates]) {
      if (c.startsWith('/dist/')) {
        candidates.push(c.replace(/^\/?dist\//, '/'));
      }
    }

    let firstErr;
    for (const c of candidates) {
      try {
        return await this.textureLoader.loadTexture(c);
      } catch (err) {
        firstErr = firstErr || err;
      }
    }
    throw firstErr;
  }

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
    this.attackVerticalRange = 2.8;

    this.enemyCollisionSize = new THREE.Vector3(1.6, 2.4, 1.6);

    // loaders for optional models/textures
    this.modelLoader = new ModelLoader();
    this.textureLoader = new TextureAssetLoader();

    // keep the spawn configs so initialization can run later
    this.spawnConfigs = spawnConfigs;
  }

  // spawn may perform asynchronous loading if the configuration includes
  // a modelUrl or textureUrl.  Returns a promise that resolves when the
  // enemy is ready.
  async spawn(config) {
    let mesh;

    // load a model if one is specified, otherwise fall back to a simple box
    if (config.modelUrl) {
      const url = config.modelUrl; // use exactly what caller provided
      try {
        const loaded = await this.fetchModelWithFallback(url);
        if (loaded) {
          mesh = loaded.clone();
          console.log('EnemyManager: successfully loaded model for', config.typeName, url);
        }

        if (mesh && config.scale) {
          mesh.scale.setScalar(config.scale);
        }

        // if a texture is specified, apply it to every mesh material in the
        // hierarchy once the texture has loaded
        if (mesh && config.textureUrl) {
          const textureUrl = config.textureUrl;
          try {
            const texture = await this.fetchTextureWithFallback(textureUrl);
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            mesh.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                  map: texture,
                  roughness: 0.85,
                  metalness: 0.16,
                });
              }
            });
          } catch (err) {
            console.warn('EnemyManager: failed to load texture for model', textureUrl, err);
          }
        }
      } catch (err) {
        console.warn('EnemyManager: failed to load model', url, err);
        mesh = null; // fall back to box below
      }
    }

    if (!mesh) {
      // simple box enemy, apply either color or texture
      const materialOptions = { roughness: 0.85, metalness: 0.16 };
      if (config.textureUrl) {
        const textureUrl = config.textureUrl;
        try {
          const texture = await this.fetchTextureWithFallback(textureUrl);
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          materialOptions.map = texture;
        } catch (err) {
          console.warn('EnemyManager: failed to load box texture', textureUrl, err);
        }
      } else {
        materialOptions.color = config.color;
      }

      mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 1.2),
        new THREE.MeshStandardMaterial(materialOptions)
      );
    }

    // default y position if not specified
    const yPos = config.position.y !== undefined ? config.position.y : 1.2;
    mesh.position.set(config.position.x, yPos, config.position.z);
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

        // rotate to face the player horizontally
        enemy.mesh.lookAt(playerPosition.x, enemy.mesh.position.y, playerPosition.z);
      }

      // remove continuous spinning; keep a small adjustment to avoid jerks

      const verticalDistance = Math.abs(playerPosition.y - enemy.mesh.position.y);
      if (distance <= enemy.attackRadius && verticalDistance <= this.attackVerticalRange) {
        totalDamage += enemy.damagePerSecond * delta;
      }
    }

    return totalDamage;
  }

  // call this once all spawnConfigs have been processed
  async initialize() {
    for (const config of this.spawnConfigs) {
      await this.spawn(config);
    }
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
    return playerPosition;
  }

  getClosestShotHit(raycaster, maxDistance = Infinity) {
    const aliveEnemies = this.enemies.filter((enemy) => enemy.alive);
    if (!aliveEnemies.length) {
      return null;
    }

    // gather root meshes for raycasting
    const aliveMeshes = aliveEnemies.map((enemy) => enemy.mesh);

    // recurse into groups so that hits on children count
    const hits = raycaster.intersectObjects(aliveMeshes, true);

    if (!hits.length) {
      return null;
    }

    const hit = hits[0];
    if (hit.distance > maxDistance) {
      return null;
    }

    // find which enemy contains the hit object; walk up the parent chain
    let foundEnemy = null;
    for (const enemy of aliveEnemies) {
      let obj = hit.object;
      while (obj) {
        if (obj === enemy.mesh) {
          foundEnemy = enemy;
          break;
        }
        obj = obj.parent;
      }
      if (foundEnemy) break;
    }

    if (!foundEnemy) {
      console.warn('EnemyManager: hit object did not match any enemy mesh', hit.object);
      return null;
    }

    return {
      targetEnemy: foundEnemy,
      point: hit.point.clone(),
      distance: hit.distance,
    };
  }

  applyShotHit(targetEnemy, damage = 34) {
    if (!targetEnemy || !targetEnemy.alive) {
      return;
    }

    console.log('EnemyManager.applyShotHit', targetEnemy.id, 'before', targetEnemy.health, 'damage', damage);
    targetEnemy.health = Math.max(0, targetEnemy.health - damage);
    console.log('EnemyManager.applyShotHit after', targetEnemy.health);

    // flash the material(s) on every mesh in the hierarchy
    targetEnemy.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.color && m.color.setHex(0xffffff));
        } else if (child.material.color) {
          child.material.color.setHex(0xffffff);
        }
      }
    });

    setTimeout(() => {
      if (targetEnemy.alive) {
        targetEnemy.mesh.traverse((child) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.color && m.color.setHex(targetEnemy.color));
            } else if (child.material.color) {
              child.material.color.setHex(targetEnemy.color);
            }
          }
        });
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
