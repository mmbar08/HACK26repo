import * as THREE from 'three';
import { ModelLoader } from '../ModelLoader.js';
import { TextureAssetLoader } from '../TextureLoader.js';

export class OilRigMap {
  constructor(scene) {
    this.scene = scene;
    this.hullColliderEntries = [];
    this.playerCollisionBox = new THREE.Box3();
    this.hitboxHelpers = [];
    this.hitboxDebugVisible = true;
    this.platformSurfaces = [];
    this.rampSurfaces = [];
    this.elevatedPlatformZones = [];
    this.rampForbiddenZones = [];
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
    this.textureLoader = new TextureAssetLoader();

    this.levelSize = 130;
    this.spawnProtectionRadius = 18;
    this.drillProtectionRadius = 16;
    this.floorTextureRepeatScale = 8;
    this.elevatedPlatformCountMin = 4;
    this.elevatedPlatformCountMax = 7;
    this.rampSpawnChancePerSide = 0.55;
    this.globalModelScale = 0.1;
    this.platformPbrSet = null;
    this.showPropDebugColliders = true;
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
        scale: 0.2,
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
        scale: 100,
        randomMin: 0.9,
        randomMax: 1.25,
        colliderScale: 0.92,
      },
      {
        url: '/assets/models/crate_pile.glb',
        scale: 5,
        randomMin: 0.9,
        randomMax: 1.2,
        colliderScale: 0.95,
      },
      {
        url: '/assets/models/wooden_crate.glb',
        scale: 2,
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

    this.rigFloorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f3e46,
      roughness: 0.9,
      metalness: 0.1,
    });

    this.rigFloor = new THREE.Mesh(
      new THREE.BoxGeometry(this.levelSize, 1, this.levelSize),
      this.rigFloorMaterial
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
    this.drillShaft.position.set(0, 6, -44);
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
    this.rigTower.position.set(0, 5, -58);
    this.scene.add(this.rigTower);
    this.raycastObjects.push(this.rigTower);

    this.addPlatformSurface(this.rigFloor, this.levelSize, this.levelSize, 0);
    this.addStaticCollider(this.drillShaft, 5.2, 12, 5.2, true);
    this.addStaticCollider(this.rigTower, 14, 10, 14, true);
  }

  async initialize() {
    const [loadResults] = await Promise.all([
      Promise.allSettled(this.modelConfigs.map((config) => this.modelLoader.loadModel(config.url))),
      this.applyPbrTextures(),
    ]);

    const templates = loadResults
      .map((result, index) => ({ result, config: this.modelConfigs[index] }))
      .filter(({ result }) => result.status === 'fulfilled')
      .map(({ result, config }) => ({ scene: result.value, config }));

    this.generateElevatedPlatforms();
    this.scatterProceduralProps(templates);
  }

  ensureUv2(geometry) {
    if (!geometry || geometry.attributes.uv2 || !geometry.attributes.uv) {
      return;
    }

    geometry.setAttribute('uv2', geometry.attributes.uv.clone());
  }

  applyPbrSetToMaterial(material, pbrSet, options = {}) {
    if (!material || !pbrSet) {
      return;
    }

    material.map = pbrSet.albedo;
    material.normalMap = pbrSet.normal;
    material.aoMap = pbrSet.arm;
    material.roughnessMap = pbrSet.arm;
    material.metalnessMap = pbrSet.arm;

    material.roughness = options.roughness ?? 1;
    material.metalness = options.metalness ?? 1;
    material.aoMapIntensity = options.aoMapIntensity ?? 1;
    material.normalScale = options.normalScale ?? new THREE.Vector2(1, 1);
    material.flatShading = false;
    material.envMapIntensity = options.envMapIntensity ?? 1;
    material.side = options.side ?? THREE.FrontSide;
    material.color.setHex(0xffffff);
    material.needsUpdate = true;
  }

  cloneTextureWithRepeat(sourceTexture, repeatX, repeatY) {
    const clone = sourceTexture.clone();
    clone.needsUpdate = true;
    clone.repeat.set(repeatX, repeatY);
    clone.wrapS = THREE.RepeatWrapping;
    clone.wrapT = THREE.RepeatWrapping;
    clone.colorSpace = sourceTexture.colorSpace;
    return clone;
  }

  createPbrMaterialFromSet(pbrSet, repeatX, repeatY, options = {}) {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const albedo = this.cloneTextureWithRepeat(pbrSet.albedo, repeatX, repeatY);
    const normal = this.cloneTextureWithRepeat(pbrSet.normal, repeatX, repeatY);
    const arm = this.cloneTextureWithRepeat(pbrSet.arm, repeatX, repeatY);

    this.applyPbrSetToMaterial(material, { albedo, normal, arm }, options);
    return material;
  }

  async applyPbrTextures() {
    const floorRepeat = this.levelSize / this.floorTextureRepeatScale;

    const [rubberTilesSet, towerSet, drillSet, platformSet] = await Promise.all([
      this.textureLoader.loadPbrSet({
        albedoUrl: '/assets/textures/rubber_tiles_diff_1k.jpg',
        normalUrl: '/assets/textures/rubber_tiles_nor_gl_1k.jpg',
        armUrl: '/assets/textures/rubber_tiles_arm_1k.jpg',
        repeatX: floorRepeat,
        repeatY: floorRepeat,
      }),
      this.textureLoader.loadPbrSet({
        albedoUrl: '/assets/textures/rusty_metal_05_diff_1k.jpg',
        normalUrl: '/assets/textures/rusty_metal_05_nor_gl_1k.jpg',
        armUrl: '/assets/textures/rusty_metal_05_arm_1k.jpg',
        repeatX: 3,
        repeatY: 2,
      }),
      this.textureLoader.loadPbrSet({
        albedoUrl: '/assets/textures/rusty_metal_04_diff_1k.jpg',
        normalUrl: '/assets/textures/rusty_metal_04_nor_gl_1k.jpg',
        armUrl: '/assets/textures/rusty_metal_04_arm_1k.jpg',
        repeatX: 2,
        repeatY: 4,
      }),
      this.textureLoader.loadPbrSet({
        albedoUrl: '/assets/textures/hangar_concrete_floor_diff_1k.jpg',
        normalUrl: '/assets/textures/hangar_concrete_floor_nor_gl_1k.jpg',
        armUrl: '/assets/textures/hangar_concrete_floor_arm_1k.jpg',
        repeatX: 2,
        repeatY: 2,
      }),
    ]);

    this.platformPbrSet = platformSet;

    this.ensureUv2(this.rigFloor.geometry);
    this.ensureUv2(this.rigTower.geometry);
    this.ensureUv2(this.drillShaft.geometry);

    this.applyPbrSetToMaterial(this.rigFloorMaterial, rubberTilesSet, {
      roughness: 1,
      metalness: 0.6,
      aoMapIntensity: 1,
      normalScale: new THREE.Vector2(1.2, 1.2),
    });

    this.applyPbrSetToMaterial(this.rigTower.material, towerSet, {
      roughness: 1,
      metalness: 0.95,
      aoMapIntensity: 0.95,
      normalScale: new THREE.Vector2(0.8, 0.8),
    });

    this.applyPbrSetToMaterial(this.drillShaft.material, drillSet, {
      roughness: 1,
      metalness: 1,
      aoMapIntensity: 1,
      normalScale: new THREE.Vector2(0.9, 0.9),
    });
  }

  generateElevatedPlatforms() {
    const targetCount = THREE.MathUtils.randInt(
      this.elevatedPlatformCountMin,
      this.elevatedPlatformCountMax
    );
    const halfLevel = this.levelSize * 0.5;
    const margin = 12;
    const maxAttempts = 120;
    let generatedCount = 0;
    let attempts = 0;

    while (generatedCount < targetCount && attempts < maxAttempts) {
      attempts += 1;

      const size = THREE.MathUtils.randFloat(16, 28);
      const height = THREE.MathUtils.randFloat(3.8, 7.2);
      const halfSize = size * 0.5;
      const x = THREE.MathUtils.randFloat(-halfLevel + halfSize + margin, halfLevel - halfSize - margin);
      const z = THREE.MathUtils.randFloat(-halfLevel + halfSize + margin, halfLevel - halfSize - margin);

      const zone = {
        minX: x - halfSize,
        maxX: x + halfSize,
        minZ: z - halfSize,
        maxZ: z + halfSize,
        topY: height,
      };

      const zoneCenterDist = Math.hypot(x, z);
      const drillDist = Math.hypot(x - this.drillShaft.position.x, z - this.drillShaft.position.z);
      if (zoneCenterDist < this.spawnProtectionRadius + 10 || drillDist < this.drillProtectionRadius + 8) {
        continue;
      }

      const overlapsExisting = this.elevatedPlatformZones.some((existing) => {
        const separated =
          zone.maxX + 8 <= existing.minX ||
          zone.minX - 8 >= existing.maxX ||
          zone.maxZ + 8 <= existing.minZ ||
          zone.minZ - 8 >= existing.maxZ;
        return !separated;
      });

      if (overlapsExisting) {
        continue;
      }

      const repeat = Math.max(1.5, size / 9);
      const material = this.platformPbrSet
        ? this.createPbrMaterialFromSet(this.platformPbrSet, repeat, repeat, {
            roughness: 1,
            metalness: 0.22,
            aoMapIntensity: 1,
            normalScale: new THREE.Vector2(1, 1),
          })
        : new THREE.MeshStandardMaterial({ color: 0x626a70, roughness: 0.92, metalness: 0.08 });

      const platformMesh = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), material);
      this.ensureUv2(platformMesh.geometry);
      platformMesh.position.set(x, height * 0.5, z);

      this.scene.add(platformMesh);
      this.raycastObjects.push(platformMesh);
      this.addStaticCollider(platformMesh, size, height, size, false);
      this.addPlatformSurface(platformMesh, size, size, height);

      this.elevatedPlatformZones.push(zone);
      this.tryGenerateRampsForPlatform(zone, size, height);
      generatedCount += 1;
    }
  }

  tryGenerateRampsForPlatform(zone, size, topY) {
    const sides = ['north', 'south', 'east', 'west'];
    for (const side of sides) {
      if (Math.random() > this.rampSpawnChancePerSide) {
        continue;
      }

      this.createRampForPlatform(zone, size, topY, side);
    }
  }

  createSolidRampGeometry(runLength, rampWidth, rampHeight) {
    const halfWidth = rampWidth * 0.5;
    const geometry = new THREE.BufferGeometry();

    const A = new THREE.Vector3(-halfWidth, 0, 0);
    const B = new THREE.Vector3(halfWidth, 0, 0);
    const C = new THREE.Vector3(-halfWidth, 0, runLength);
    const D = new THREE.Vector3(halfWidth, 0, runLength);
    const E = new THREE.Vector3(-halfWidth, rampHeight, runLength);
    const F = new THREE.Vector3(halfWidth, rampHeight, runLength);

    const positions = [];
    const uvs = [];

    const pushTri = (v1, v2, v3, mapU, mapV) => {
      positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
      uvs.push(mapU(v1), mapV(v1), mapU(v2), mapV(v2), mapU(v3), mapV(v3));
    };

    const mapXZU = (v) => (v.x + halfWidth) / rampWidth;
    const mapXZV = (v) => v.z / Math.max(0.001, runLength);
    const mapXYU = (v) => (v.x + halfWidth) / rampWidth;
    const mapXYV = (v) => v.y / Math.max(0.001, rampHeight);
    const mapZYU = (v) => v.z / Math.max(0.001, runLength);
    const mapZYV = (v) => v.y / Math.max(0.001, rampHeight);

    pushTri(A, D, B, mapXZU, mapXZV);
    pushTri(A, C, D, mapXZU, mapXZV);
    pushTri(A, B, F, mapXZU, mapXZV);
    pushTri(A, F, E, mapXZU, mapXZV);
    pushTri(C, D, F, mapXYU, mapXYV);
    pushTri(C, F, E, mapXYU, mapXYV);
    pushTri(A, E, C, mapZYU, mapZYV);
    pushTri(B, D, F, mapZYU, mapZYV);

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return geometry;
  }

  createRampForPlatform(zone, size, topY, side) {
    const rampRunLength = THREE.MathUtils.randFloat(8.5, 14.5);
    const rampWidth = THREE.MathUtils.clamp(size * THREE.MathUtils.randFloat(0.42, 0.72), 7, size - 2);
    const rampGeometry = this.createSolidRampGeometry(rampRunLength, rampWidth, topY);
    let rampRotationY = 0;
    let originX = 0;
    let originZ = 0;
    let minX = 0;
    let maxX = 0;
    let minZ = 0;
    let maxZ = 0;

    if (side === 'north' || side === 'south') {
      const centerX = (zone.minX + zone.maxX) * 0.5;
      originX = centerX;

      if (side === 'north') {
        maxZ = zone.minZ;
        minZ = maxZ - rampRunLength;
        originZ = minZ;
        rampRotationY = 0;
      } else {
        minZ = zone.maxZ;
        maxZ = minZ + rampRunLength;
        originZ = maxZ;
        rampRotationY = Math.PI;
      }

      minX = originX - rampWidth * 0.5;
      maxX = originX + rampWidth * 0.5;
    } else {
      const centerZ = (zone.minZ + zone.maxZ) * 0.5;
      originZ = centerZ;

      if (side === 'east') {
        minX = zone.maxX;
        maxX = minX + rampRunLength;
        originX = minX;
        rampRotationY = -Math.PI * 0.5;
      } else {
        maxX = zone.minX;
        minX = maxX - rampRunLength;
        originX = maxX;
        rampRotationY = Math.PI * 0.5;
      }

      minZ = originZ - rampWidth * 0.5;
      maxZ = originZ + rampWidth * 0.5;
    }

    const repeatX = Math.max(1.2, rampWidth / 6);
    const repeatY = Math.max(1.2, rampRunLength / 6);
    const material = this.platformPbrSet
      ? this.createPbrMaterialFromSet(this.platformPbrSet, repeatX, repeatY, {
          roughness: 1,
          metalness: 0.18,
          aoMapIntensity: 0.95,
          normalScale: new THREE.Vector2(0.9, 0.9),
          side: THREE.DoubleSide,
        })
      : new THREE.MeshStandardMaterial({ color: 0x6d7478, roughness: 0.93, metalness: 0.07 });

    const rampMesh = new THREE.Mesh(rampGeometry, material);
    this.ensureUv2(rampMesh.geometry);
    rampMesh.position.set(originX, 0, originZ);
    rampMesh.rotation.y = rampRotationY;

    this.scene.add(rampMesh);
    this.raycastObjects.push(rampMesh);
    this.addStaticColliderFromObject(rampMesh, {
      padding: 0.01,
      colliderScale: 1,
      color: 0x00ffaa,
    });

    this.rampForbiddenZones.push({
      minX: minX - 0.6,
      maxX: maxX + 0.6,
      minZ: minZ - 0.6,
      maxZ: maxZ + 0.6,
    });

    this.rampSurfaces.push({
      side,
      minX,
      maxX,
      minZ,
      maxZ,
      topY,
    });
  }

  scatterProceduralProps(modelTemplates) {
    const hasTemplates = modelTemplates.length > 0;
    const propCount = hasTemplates ? 60 : 36;

    for (let i = 0; i < propCount; i += 1) {
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

      prop.rotation.y = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const placed = this.tryPlacePropOnAllowedSurface(prop);
      if (!placed) {
        continue;
      }

      this.scene.add(prop);
      this.raycastObjects.push(prop);
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

  footprintIntersectsZone(minX, maxX, minZ, maxZ, zone) {
    const separated =
      maxX <= zone.minX || minX >= zone.maxX || maxZ <= zone.minZ || minZ >= zone.maxZ;
    return !separated;
  }

  getRandomSpawnSurface() {
    if (!this.platformSurfaces.length) {
      return null;
    }

    const baseSurfaces = this.platformSurfaces.filter((surface) => surface.topY <= 0.001);
    const elevatedSurfaces = this.platformSurfaces.filter((surface) => surface.topY > 0.001);

    const pickBase =
      !elevatedSurfaces.length ||
      (baseSurfaces.length > 0 && Math.random() < 0.5);

    const pool = pickBase ? baseSurfaces : elevatedSurfaces;
    if (!pool.length) {
      const fallback = this.platformSurfaces;
      return fallback[Math.floor(Math.random() * fallback.length)];
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  isValidPropPlacement(x, z, halfWidth, halfDepth, surface) {
    const minX = x - halfWidth;
    const maxX = x + halfWidth;
    const minZ = z - halfDepth;
    const maxZ = z + halfDepth;

    for (const zone of this.rampForbiddenZones) {
      if (this.footprintIntersectsZone(minX, maxX, minZ, maxZ, zone)) {
        return false;
      }
    }

    const spawnDistance = Math.hypot(x, z);
    const drillDistance = Math.hypot(x - this.drillShaft.position.x, z - this.drillShaft.position.z);
    if (spawnDistance < this.spawnProtectionRadius || drillDistance < this.drillProtectionRadius) {
      return false;
    }

    if (surface.topY <= 0.001) {
      for (const zone of this.elevatedPlatformZones) {
        if (this.footprintIntersectsZone(minX, maxX, minZ, maxZ, zone)) {
          return false;
        }
      }
    }

    return true;
  }

  tryPlacePropOnAllowedSurface(prop) {
    prop.position.set(0, 0, 0);
    prop.updateMatrixWorld(true);
    const previewBounds = new THREE.Box3().setFromObject(prop);

    if (!Number.isFinite(previewBounds.min.x)) {
      return false;
    }

    const footprintHalfWidth = (previewBounds.max.x - previewBounds.min.x) * 0.5;
    const footprintHalfDepth = (previewBounds.max.z - previewBounds.min.z) * 0.5;
    const baseOffset = -previewBounds.min.y;

    const attempts = 42;
    for (let i = 0; i < attempts; i += 1) {
      const surface = this.getRandomSpawnSurface();
      if (!surface) {
        return false;
      }

      const margin = 0.35;
      const minX = surface.minX + footprintHalfWidth + margin;
      const maxX = surface.maxX - footprintHalfWidth - margin;
      const minZ = surface.minZ + footprintHalfDepth + margin;
      const maxZ = surface.maxZ - footprintHalfDepth - margin;

      if (minX >= maxX || minZ >= maxZ) {
        continue;
      }

      const x = THREE.MathUtils.randFloat(minX, maxX);
      const z = THREE.MathUtils.randFloat(minZ, maxZ);

      if (!this.isValidPropPlacement(x, z, footprintHalfWidth, footprintHalfDepth, surface)) {
        continue;
      }

      prop.position.set(x, surface.topY + baseOffset, z);
      prop.updateMatrixWorld(true);
      return true;
    }

    return false;
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
    const color = options.color ?? 0x00ffaa;
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
    this.registerHullCollider(object3d, hullData, color, false);
  }

  createRectHullFromBounds(bounds) {
    return [
      new THREE.Vector2(bounds.min.x, bounds.min.z),
      new THREE.Vector2(bounds.min.x, bounds.max.z),
      new THREE.Vector2(bounds.max.x, bounds.max.z),
      new THREE.Vector2(bounds.max.x, bounds.min.z),
    ];
  }

  computeLocalHullData(object3d) {
    const hullPoints = [];
    const rootInverse = this.tempInverseMatrix.copy(object3d.matrixWorld).invert();
    let minY = Infinity;
    let maxY = -Infinity;
    const sampleBounds = new THREE.Box3();
    let hasSampleBounds = false;

    object3d.updateMatrixWorld(true);
    object3d.traverse((child) => {
      if (!child.isMesh || !child.visible || !child.geometry) {
        return;
      }

      const positionAttribute = child.geometry.attributes?.position;
      if (!positionAttribute) {
        return;
      }
      this.tempColliderMatrix.multiplyMatrices(rootInverse, child.matrixWorld);

      const step = Math.max(1, Math.floor(positionAttribute.count / 320));
      for (let index = 0; index < positionAttribute.count; index += step) {
        const vertex = new THREE.Vector3(
          positionAttribute.getX(index),
          positionAttribute.getY(index),
          positionAttribute.getZ(index)
        );
        vertex.applyMatrix4(this.tempColliderMatrix);
        hullPoints.push(new THREE.Vector2(vertex.x, vertex.z));
        minY = Math.min(minY, vertex.y);
        maxY = Math.max(maxY, vertex.y);

        if (!hasSampleBounds) {
          sampleBounds.min.copy(vertex);
          sampleBounds.max.copy(vertex);
          hasSampleBounds = true;
        } else {
          sampleBounds.expandByPoint(vertex);
        }
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

    let convexHull = this.computeConvexHull2D(hullPoints);

    if (convexHull.length < 3) {
      const boundsSource = hasSampleBounds
        ? sampleBounds
        : new THREE.Box3().setFromObject(object3d).applyMatrix4(rootInverse);

      if (!Number.isFinite(boundsSource.min.x) || !Number.isFinite(boundsSource.max.x)) {
        return null;
      }

      convexHull = this.createRectHullFromBounds(boundsSource);
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

    const shouldRenderHelper =
      dynamic || color !== 0x00ffaa || this.showPropDebugColliders;

    if (shouldRenderHelper) {
      const helper = this.createHullDebugHelper(hullData, color);
      helper.visible = this.hitboxDebugVisible;
      this.hitboxHelpers.push(helper);
      object3d.add(helper);
    }
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
    const feetY = nextPosition.y - bodyHeight;
    const supportSurfaceEpsilon = 0.08;

    for (const collider of this.hullColliderEntries) {
      if (feetY >= collider.maxY - supportSurfaceEpsilon) {
        continue;
      }

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

    for (const ramp of this.rampSurfaces) {
      const withinX = x >= ramp.minX && x <= ramp.maxX;
      const withinZ = z >= ramp.minZ && z <= ramp.maxZ;
      if (!withinX || !withinZ) {
        continue;
      }

      let rampHeight = 0;
      if (ramp.side === 'north') {
        const t = (z - ramp.minZ) / Math.max(0.001, ramp.maxZ - ramp.minZ);
        rampHeight = THREE.MathUtils.clamp(t, 0, 1) * ramp.topY;
      } else if (ramp.side === 'south') {
        const t = (ramp.maxZ - z) / Math.max(0.001, ramp.maxZ - ramp.minZ);
        rampHeight = THREE.MathUtils.clamp(t, 0, 1) * ramp.topY;
      } else if (ramp.side === 'east') {
        const t = (ramp.maxX - x) / Math.max(0.001, ramp.maxX - ramp.minX);
        rampHeight = THREE.MathUtils.clamp(t, 0, 1) * ramp.topY;
      } else if (ramp.side === 'west') {
        const t = (x - ramp.minX) / Math.max(0.001, ramp.maxX - ramp.minX);
        rampHeight = THREE.MathUtils.clamp(t, 0, 1) * ramp.topY;
      }

      const rampEyeHeight = playerHeight + rampHeight;
      const canLandOnRamp = cameraY >= rampHeight - 0.25 && cameraY <= rampEyeHeight + 2.2;
      if (canLandOnRamp) {
        groundHeight = Math.max(groundHeight, rampHeight);
      }
    }

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

  getPlayBoundsLimit() {
    return this.levelSize * 0.5 - 2;
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
