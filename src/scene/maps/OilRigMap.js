import * as THREE from 'three';
import { ModelLoader } from '../ModelLoader.js';

export class OilRigMap {
  constructor(scene) {
    this.scene = scene;
    this.hullColliderEntries = [];
    this.playerCollisionBox = new THREE.Box3();
    this.hitboxHelpers = [];
    this.hitboxDebugVisible = true;
    this.platformSurfaces = [];
    this.raycastObjects = [];
    this.horizontalSampleOffsets = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.65, 0),
      new THREE.Vector2(-0.65, 0),
      new THREE.Vector2(0, 0.65),
      new THREE.Vector2(0, -0.65),
    ];
    this.tempColliderMatrix = new THREE.Matrix4();
    this.tempInverseMatrix = new THREE.Matrix4();
    this.tempSphereCenter = new THREE.Vector3();
    this.modelLoader = new ModelLoader();

    this.levelSize = 260;
    this.spawnProtectionRadius = 18;
    this.drillProtectionRadius = 16;
    this.globalModelScale = 0.1;
    this.modelConfigs = [
      {
        url: '/assets/models/barrel.glb',
        scale: 8.0,
        randomMin: 0.85,
        randomMax: 1.25,
        colliderScale: 0.9,
      },
      {
        url: '/assets/models/dirty_oil_barrel_-_5mb.glb',
        scale: 8.0,
        randomMin: 0.85,
        randomMax: 1.25,
        colliderScale: 0.9,
      },
      {
        url: '/assets/models/motor_oil_can.glb',
        scale: 0.1,
        randomMin: 0.8,
        randomMax: 1.2,
        colliderScale: 0.82,
      },
      {
        url: '/assets/models/old_oil_tank.glb',
        scale: 0.5,
        randomMin: 0.9,
        randomMax: 1.35,
        colliderScale: 0.94,
      },
      {
        url: '/assets/models/old_oil_tank_.2.glb',
        scale: 0.2,
        randomMin: 0.9,
        randomMax: 1.35,
        colliderScale: 0.94,
      },
      {
        url: '/assets/models/crate_box.glb',
        scale: 0.06,
        randomMin: 0.9,
        randomMax: 1.25,
        colliderScale: 0.92,
      },
      {
        url: '/assets/models/crate_pile.glb',
        scale: 0.05,
        randomMin: 0.9,
        randomMax: 1.2,
        colliderScale: 0.95,
      },
      {
        url: '/assets/models/wooden_crate.glb',
        scale: 0.06,
        randomMin: 0.9,
        randomMax: 1.25,
        colliderScale: 0.92,
      },
      {
        url: '/assets/models/rusty_and_oil_stained_oil_barrel.glb',
        scale: 5.0,
        randomMin: 0.85,
        randomMax: 1.25,
        colliderScale: 0.9,
      },
    ];

    this.rigFloor = new THREE.Mesh(
      new THREE.BoxGeometry(this.levelSize, 1, this.levelSize),
      new THREE.MeshStandardMaterial({
        color: 0x2f3e46,
        roughness: 0.9,
        metalness: 0.1,
      })
    );
    this.rigFloor.position.y = -0.5;
    this.scene.add(this.rigFloor);
    this.raycastObjects.push(this.rigFloor);

    this.drillShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 12, 24),
      new THREE.MeshStandardMaterial({
        color: 0x3a4a53,
        roughness: 0.55,
        metalness: 0.65,
      })
    );
    this.drillShaft.position.set(0, 6, -92);
    this.scene.add(this.drillShaft);
    this.raycastObjects.push(this.drillShaft);

    this.rigTower = new THREE.Mesh(
      new THREE.BoxGeometry(14, 10, 14),
      new THREE.MeshStandardMaterial({
        color: 0x5c6b73,
        roughness: 0.7,
        metalness: 0.35,
      })
    );
    this.rigTower.position.set(0, 5, -106);
    this.scene.add(this.rigTower);
    this.raycastObjects.push(this.rigTower);

    this.addPlatformSurface(this.rigFloor, this.levelSize, this.levelSize, 0);
    this.addStaticCollider(this.drillShaft, 5.2, 12, 5.2, true);
    this.addStaticCollider(this.rigTower, 14, 10, 14, true);
  }

  async initialize() {
    const loadResults = await Promise.allSettled(
      this.modelConfigs.map((config) => this.modelLoader.loadModel(config.url))
    );

    const templates = loadResults
      .map((result, index) => ({ result, config: this.modelConfigs[index] }))
      .filter(({ result }) => result.status === 'fulfilled')
      .map(({ result, config }) => ({ scene: result.value, config }));

    this.scatterProceduralProps(templates);
  }

  scatterProceduralProps(modelTemplates) {
    const hasTemplates = modelTemplates.length > 0;
    const propCount = hasTemplates ? 60 : 36;
    const drillXZ = new THREE.Vector2(this.drillShaft.position.x, this.drillShaft.position.z);

    for (let i = 0; i < propCount; i += 1) {
      const x = THREE.MathUtils.randFloat(-(this.levelSize / 2 - 8), this.levelSize / 2 - 8);
      const z = THREE.MathUtils.randFloat(-(this.levelSize / 2 - 8), this.levelSize / 2 - 8);

      const spawnDistance = Math.hypot(x, z);
      const drillDistance = drillXZ.distanceTo(new THREE.Vector2(x, z));

      if (spawnDistance < this.spawnProtectionRadius || drillDistance < this.drillProtectionRadius) {
        continue;
      }

      let prop;
      let chosenTemplate = null;

      if (hasTemplates) {
        chosenTemplate = modelTemplates[Math.floor(Math.random() * modelTemplates.length)];
        prop = chosenTemplate.scene.clone(true);

        const randomScaleFactor = THREE.MathUtils.randFloat(
          chosenTemplate.config.randomMin ?? 0.9,
          chosenTemplate.config.randomMax ?? 1.3
        );
        const modelScale =
          this.globalModelScale *
          (chosenTemplate.config.scale ?? 1) *
          randomScaleFactor;
        prop.scale.setScalar(modelScale);
      } else {
        prop = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.45, 1.2, 12),
          new THREE.MeshStandardMaterial({ color: 0x5d5044, roughness: 0.9, metalness: 0.18 })
        );
        const fallbackScale = THREE.MathUtils.randFloat(0.6, 2.1);
        prop.scale.setScalar(fallbackScale);
      }

      prop.position.set(x, 0, z);
      prop.rotation.y = THREE.MathUtils.randFloat(0, Math.PI * 2);

      this.scene.add(prop);
      this.raycastObjects.push(prop);
      this.placeOnFloor(prop);
      prop.updateMatrixWorld(true);
      prop.traverse((child) => {
        if (child.isMesh) {
          child.matrixAutoUpdate = false;
        }
      });
      this.addStaticColliderFromObject(prop, {
        padding: 0.03,
        colliderScale: chosenTemplate?.config?.colliderScale ?? 0.9,
      });
    }
  }

  placeOnFloor(object3d) {
    object3d.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object3d);

    if (!Number.isFinite(bounds.min.y)) {
      return;
    }

    object3d.position.y += -bounds.min.y;
    object3d.updateMatrixWorld(true);
  }

  addStaticColliderFromObject(object3d, options = {}) {
    const padding = options.padding ?? 0.03;
    const colliderScale = options.colliderScale ?? 1;
    const hullData = this.computeLocalHullData(object3d);

    if (!hullData || !hullData.hull.length) {
      return;
    }

    if (colliderScale !== 1) {
      for (const point of hullData.hull) {
        point.multiplyScalar(colliderScale);
      }
    }

    hullData.minY -= padding;
    hullData.maxY += padding;
    this.registerHullCollider(object3d, hullData, 0x00ffaa, false);
  }

  computeLocalHullData(object3d) {
    const hullPoints = [];
    const rootInverse = this.tempInverseMatrix.copy(object3d.matrixWorld).invert();
    let minY = Infinity;
    let maxY = -Infinity;

    object3d.updateMatrixWorld(true);
    object3d.traverse((child) => {
      if (!child.isMesh || !child.visible || !child.geometry) {
        return;
      }

      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox();
      }

      if (!child.geometry.boundingBox) {
        return;
      }

      const localBounds = child.geometry.boundingBox;
      this.tempColliderMatrix.multiplyMatrices(rootInverse, child.matrixWorld);

      const corners = [
        new THREE.Vector3(localBounds.min.x, localBounds.min.y, localBounds.min.z),
        new THREE.Vector3(localBounds.min.x, localBounds.min.y, localBounds.max.z),
        new THREE.Vector3(localBounds.min.x, localBounds.max.y, localBounds.min.z),
        new THREE.Vector3(localBounds.min.x, localBounds.max.y, localBounds.max.z),
        new THREE.Vector3(localBounds.max.x, localBounds.min.y, localBounds.min.z),
        new THREE.Vector3(localBounds.max.x, localBounds.min.y, localBounds.max.z),
        new THREE.Vector3(localBounds.max.x, localBounds.max.y, localBounds.min.z),
        new THREE.Vector3(localBounds.max.x, localBounds.max.y, localBounds.max.z),
      ];

      for (const corner of corners) {
        corner.applyMatrix4(this.tempColliderMatrix);
        hullPoints.push(new THREE.Vector2(corner.x, corner.z));
        minY = Math.min(minY, corner.y);
        maxY = Math.max(maxY, corner.y);
      }
    });

    if (!hullPoints.length) {
      const fallback = new THREE.Box3().setFromObject(object3d);
      if (!Number.isFinite(fallback.min.x)) {
        return null;
      }

      fallback.applyMatrix4(rootInverse);
      hullPoints.push(
        new THREE.Vector2(fallback.min.x, fallback.min.z),
        new THREE.Vector2(fallback.min.x, fallback.max.z),
        new THREE.Vector2(fallback.max.x, fallback.max.z),
        new THREE.Vector2(fallback.max.x, fallback.min.z)
      );
      minY = fallback.min.y;
      maxY = fallback.max.y;
    }

    const convexHull = this.computeConvexHull2D(hullPoints);
    if (!convexHull.length) {
      return null;
    }

    const simplifiedHull = this.simplifyHull(convexHull, 10);
    return {
      hull: simplifiedHull,
      minY,
      maxY,
    };
  }

  registerHullCollider(object3d, hullData, color = 0x00ffaa, dynamic = false) {
    object3d.updateMatrixWorld(true);
    const worldMatrix = object3d.matrixWorld.clone();
    const worldBounds = new THREE.Box3().setFromObject(object3d);

    if (!Number.isFinite(worldBounds.min.x)) {
      return;
    }

    const colliderEntry = {
      object3d,
      hull: hullData.hull.map((point) => point.clone()),
      minY: hullData.minY,
      maxY: hullData.maxY,
      inverseWorldMatrix: worldMatrix.clone().invert(),
      dynamic,
      broadphase: {
        minX: worldBounds.min.x,
        maxX: worldBounds.max.x,
        minY: worldBounds.min.y,
        maxY: worldBounds.max.y,
        minZ: worldBounds.min.z,
        maxZ: worldBounds.max.z,
      },
    };
    this.hullColliderEntries.push(colliderEntry);

    const helper = this.createHullDebugHelper(hullData, color);
    helper.visible = this.hitboxDebugVisible;
    this.hitboxHelpers.push(helper);
    object3d.add(helper);
  }

  createHullDebugHelper(hullData, color) {
    const positions = [];
    const pushSegment = (x1, y1, z1, x2, y2, z2) => {
      positions.push(x1, y1, z1, x2, y2, z2);
    };

    const hull = hullData.hull;
    for (let i = 0; i < hull.length; i += 1) {
      const nextIndex = (i + 1) % hull.length;
      const current = hull[i];
      const next = hull[nextIndex];

      pushSegment(current.x, hullData.minY, current.y, next.x, hullData.minY, next.y);
      pushSegment(current.x, hullData.maxY, current.y, next.x, hullData.maxY, next.y);
      pushSegment(current.x, hullData.minY, current.y, current.x, hullData.maxY, current.y);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const helper = new THREE.LineSegments(geometry, material);
    return helper;
  }

  computeConvexHull2D(points) {
    const uniquePoints = [];
    const seen = new Set();

    for (const point of points) {
      const key = `${point.x.toFixed(3)}:${point.y.toFixed(3)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      uniquePoints.push(point.clone());
    }

    if (uniquePoints.length <= 3) {
      return uniquePoints;
    }

    uniquePoints.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

    const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

    const lower = [];
    for (const point of uniquePoints) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop();
      }
      lower.push(point);
    }

    const upper = [];
    for (let i = uniquePoints.length - 1; i >= 0; i -= 1) {
      const point = uniquePoints[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
        upper.pop();
      }
      upper.push(point);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  simplifyHull(hull, maxPoints) {
    if (hull.length <= maxPoints) {
      return hull;
    }

    const simplified = [];
    const step = hull.length / maxPoints;
    for (let i = 0; i < maxPoints; i += 1) {
      simplified.push(hull[Math.floor(i * step)].clone());
    }
    return simplified;
  }

  isPointInConvexPolygon(point, polygon) {
    if (polygon.length < 3) {
      return false;
    }

    let sign = 0;
    for (let i = 0; i < polygon.length; i += 1) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);

      if (Math.abs(cross) < 1e-6) {
        continue;
      }

      const currentSign = Math.sign(cross);
      if (sign === 0) {
        sign = currentSign;
      } else if (currentSign !== sign) {
        return false;
      }
    }

    return true;
  }

  distanceSqPointToSegment2D(point, start, end) {
    const abX = end.x - start.x;
    const abY = end.y - start.y;
    const apX = point.x - start.x;
    const apY = point.y - start.y;
    const abLenSq = abX * abX + abY * abY;

    if (abLenSq <= 1e-6) {
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      return dx * dx + dy * dy;
    }

    const t = THREE.MathUtils.clamp((apX * abX + apY * abY) / abLenSq, 0, 1);
    const closestX = start.x + abX * t;
    const closestY = start.y + abY * t;
    const dx = point.x - closestX;
    const dy = point.y - closestY;
    return dx * dx + dy * dy;
  }

  collidesWithHull(localPoint, radius, collider) {
    const point2D = new THREE.Vector2(localPoint.x, localPoint.z);
    const hull = collider.hull;

    if (this.isPointInConvexPolygon(point2D, hull)) {
      return true;
    }

    const radiusSq = radius * radius;
    for (let i = 0; i < hull.length; i += 1) {
      const start = hull[i];
      const end = hull[(i + 1) % hull.length];
      if (this.distanceSqPointToSegment2D(point2D, start, end) <= radiusSq) {
        return true;
      }
    }

    return false;
  }

  addStaticCollider(mesh, width, height, depth, dynamic = false) {
    const halfHeight = height / 2;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;

    this.registerHullCollider(
      mesh,
      {
        hull: [
          new THREE.Vector2(-halfWidth, -halfDepth),
          new THREE.Vector2(-halfWidth, halfDepth),
          new THREE.Vector2(halfWidth, halfDepth),
          new THREE.Vector2(halfWidth, -halfDepth),
        ],
        minY: -halfHeight,
        maxY: halfHeight,
      },
      0xffb347,
      dynamic
    );
  }

  updateDynamicCollider(collider) {
    if (!collider.dynamic || !collider.object3d) {
      return;
    }

    collider.object3d.updateMatrixWorld(true);
    const worldMatrix = collider.object3d.matrixWorld;
    collider.inverseWorldMatrix.copy(worldMatrix).invert();

    const worldBounds = new THREE.Box3().setFromObject(collider.object3d);
    if (!Number.isFinite(worldBounds.min.x)) {
      return;
    }

    collider.broadphase.minX = worldBounds.min.x;
    collider.broadphase.maxX = worldBounds.max.x;
    collider.broadphase.minY = worldBounds.min.y;
    collider.broadphase.maxY = worldBounds.max.y;
    collider.broadphase.minZ = worldBounds.min.z;
    collider.broadphase.maxZ = worldBounds.max.z;
  }

  setHitboxDebugVisible(visible) {
    this.hitboxDebugVisible = visible;
    for (const helper of this.hitboxHelpers) {
      helper.visible = visible;
    }
  }

  addPlatformSurface(mesh, width, depth, topY) {
    this.platformSurfaces.push({
      minX: mesh.position.x - width / 2,
      maxX: mesh.position.x + width / 2,
      minZ: mesh.position.z - depth / 2,
      maxZ: mesh.position.z + depth / 2,
      topY,
    });
  }

  collidesWithWorld(nextPosition, _playerCollider, collisionSize, _currentPosition = null) {
    const halfWidth = (collisionSize?.x ?? 1) * 0.5;
    const bodyHeight = collisionSize?.y ?? 2;

    this.playerCollisionBox.min.set(
      nextPosition.x - halfWidth,
      nextPosition.y - bodyHeight,
      nextPosition.z - halfWidth
    );

    this.playerCollisionBox.max.set(
      nextPosition.x + halfWidth,
      nextPosition.y,
      nextPosition.z + halfWidth
    );

    const min = this.playerCollisionBox.min;
    const max = this.playerCollisionBox.max;

    for (const collider of this.hullColliderEntries) {
      const broad = collider.broadphase;
      const separated =
        max.x <= broad.minX ||
        min.x >= broad.maxX ||
        max.y <= broad.minY ||
        min.y >= broad.maxY ||
        max.z <= broad.minZ ||
        min.z >= broad.maxZ;

      if (separated) {
        continue;
      }

      const radius = halfWidth;
      const bottomY = nextPosition.y - bodyHeight + radius;
      const topY = nextPosition.y - radius;
      const midY = (bottomY + topY) * 0.5;
      const sampleHeights = [bottomY, midY, topY];

      for (const offset of this.horizontalSampleOffsets) {
        for (const sampleY of sampleHeights) {
          this.tempSphereCenter.set(
            nextPosition.x + offset.x * radius,
            sampleY,
            nextPosition.z + offset.y * radius
          );

          this.tempSphereCenter.applyMatrix4(collider.inverseWorldMatrix);

          if (
            this.tempSphereCenter.y < collider.minY - radius ||
            this.tempSphereCenter.y > collider.maxY + radius
          ) {
            continue;
          }

          if (this.collidesWithHull(this.tempSphereCenter, radius, collider)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  getGroundHeightAt(x, z, cameraY, playerHeight) {
    let groundHeight = 0;

    for (const surface of this.platformSurfaces) {
      const withinX = x >= surface.minX && x <= surface.maxX;
      const withinZ = z >= surface.minZ && z <= surface.maxZ;

      if (!withinX || !withinZ) {
        continue;
      }

      const platformEyeHeight = playerHeight + surface.topY;
      const canLandOnSurface =
        cameraY >= surface.topY - 0.2 && cameraY <= platformEyeHeight + 3;

      if (canLandOnSurface) {
        groundHeight = Math.max(groundHeight, surface.topY);
      }
    }

    return groundHeight;
  }

  getDrillPosition() {
    return this.drillShaft.position;
  }

  getRaycastTargets() {
    return this.raycastObjects;
  }

  update(delta) {
    this.drillShaft.rotation.y += delta * 0.35;
    this.rigTower.rotation.y += delta * 0.08;

    for (const collider of this.hullColliderEntries) {
      this.updateDynamicCollider(collider);
    }
  }
}
