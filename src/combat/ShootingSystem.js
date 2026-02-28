import * as THREE from 'three';

export class ShootingSystem {
  constructor(scene, camera, enemyManager, worldMap) {
    this.scene = scene;
    this.camera = camera;
    this.enemyManager = enemyManager;
    this.worldMap = worldMap;

    this.shotLaserTtl = 0.1;
    this.maxLaserRange = 45;
    this.shotRay = new THREE.Raycaster();
    this.worldRay = new THREE.Raycaster();
    this.screenCenter = new THREE.Vector2(0, 0);
    this.upAxis = new THREE.Vector3(0, 1, 0);
    this.muzzleOffset = new THREE.Vector3(0.35, -0.25, -0.8);

    this.laserTraces = [];
    this.particleBursts = [];

    this.tempVector = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    this.tempQuaternion = new THREE.Quaternion();
  }

  shoot() {
    this.shotRay.setFromCamera(this.screenCenter, this.camera);

    const shotStart = this.camera.localToWorld(this.muzzleOffset.clone());
    const shotDirection = this.camera.getWorldDirection(this.tempVector).normalize();

    this.worldRay.set(shotStart, shotDirection);
    this.worldRay.far = this.maxLaserRange;

    const worldHits = this.worldRay.intersectObjects(this.worldMap.getRaycastTargets(), true);
    const worldHit = worldHits.length ? worldHits[0] : null;

    const enemyHit = this.enemyManager.getClosestShotHit(this.shotRay, this.maxLaserRange);
    const shouldHitEnemy =
      enemyHit && (!worldHit || enemyHit.distance <= worldHit.distance);

    let endPoint = shotStart
      .clone()
      .add(shotDirection.clone().multiplyScalar(this.maxLaserRange));

    if (worldHit) {
      endPoint = worldHit.point.clone();
    }

    if (shouldHitEnemy) {
      this.enemyManager.applyShotHit(enemyHit.targetEnemy);
      endPoint = enemyHit.point.clone();
    }

    this.createLaserTrace(shotStart, endPoint);
    this.createBeamTrailParticles(shotStart, endPoint);

    if (shouldHitEnemy) {
      this.createParticleBurst(endPoint, {
        color: 0xffd8a8,
        count: 12,
        size: 0.085,
        ttl: 0.2,
        speed: 4.8,
        spread: 1.1,
        gravityScale: 0.35,
      });
      return;
    }

    if (worldHit) {
      this.createParticleBurst(endPoint, {
        color: 0xc7e7ff,
        count: 9,
        size: 0.07,
        ttl: 0.18,
        speed: 3.8,
        spread: 0.9,
        gravityScale: 0.2,
      });
    }
  }

  spawnPlayerHitParticles(origin) {
    this.createParticleBurst(origin, {
      color: 0xff5f5f,
      count: 10,
      size: 0.08,
      ttl: 0.22,
      speed: 3.5,
      spread: 1.3,
      gravityScale: 0.5,
    });
  }

  createLaserTrace(startPoint, endPoint) {
    const direction = this.tempVector2.copy(endPoint).sub(startPoint);
    const length = direction.length();

    if (length < 0.001) {
      return;
    }

    direction.normalize();
    const geometry = new THREE.CylinderGeometry(0.045, 0.045, length, 8, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: 0x8ee7ff,
      transparent: true,
      opacity: 0.95,
    });
    const beam = new THREE.Mesh(geometry, material);

    beam.position.copy(startPoint).add(endPoint).multiplyScalar(0.5);
    this.tempQuaternion.setFromUnitVectors(this.upAxis, direction);
    beam.quaternion.copy(this.tempQuaternion);

    this.scene.add(beam);
    this.laserTraces.push({ beam, material, ttl: this.shotLaserTtl });
  }

  createParticleBurst(origin, options = {}) {
    const count = options.count ?? 12;
    const speed = options.speed ?? 6;
    const ttl = options.ttl ?? 0.2;
    const gravityScale = options.gravityScale ?? 0;
    const color = options.color ?? 0xffffff;
    const spread = options.spread ?? 1;
    const baseDirection = options.baseDirection ?? null;

    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i += 1) {
      const offset = i * 3;
      positions[offset] = origin.x;
      positions[offset + 1] = origin.y;
      positions[offset + 2] = origin.z;

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        Math.random() * spread,
        (Math.random() - 0.5) * spread
      );

      if (baseDirection) {
        dir.add(baseDirection);
      }

      dir.normalize().multiplyScalar(speed * (0.65 + Math.random() * 0.55));
      velocities.push(dir);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color,
      size: options.size ?? 0.09,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.particleBursts.push({
      points,
      geometry,
      material,
      positions,
      velocities,
      ttl,
      maxTtl: ttl,
      gravityScale,
    });
  }

  createBeamTrailParticles(startPoint, endPoint) {
    const length = startPoint.distanceTo(endPoint);
    if (length < 1) {
      return;
    }

    const steps = Math.max(6, Math.min(18, Math.floor(length / 2.8)));
    const point = new THREE.Vector3();

    for (let i = 1; i <= steps; i += 1) {
      const t = i / (steps + 1);
      point.lerpVectors(startPoint, endPoint, t);

      this.createParticleBurst(point, {
        color: 0xff8f2f,
        count: 3,
        size: 0.09,
        ttl: 0.14,
        speed: 0.35,
        spread: 0.18,
        gravityScale: 0,
      });
    }
  }

  update(delta, gravity) {
    for (let index = this.laserTraces.length - 1; index >= 0; index -= 1) {
      const trace = this.laserTraces[index];
      trace.ttl -= delta;

      if (trace.ttl <= 0) {
        this.scene.remove(trace.beam);
        trace.beam.geometry.dispose();
        trace.material.dispose();
        this.laserTraces.splice(index, 1);
        continue;
      }

      trace.material.opacity = Math.max(0, trace.ttl / this.shotLaserTtl);
    }

    for (
      let burstIndex = this.particleBursts.length - 1;
      burstIndex >= 0;
      burstIndex -= 1
    ) {
      const burst = this.particleBursts[burstIndex];
      burst.ttl -= delta;

      if (burst.ttl <= 0) {
        this.scene.remove(burst.points);
        burst.geometry.dispose();
        burst.material.dispose();
        this.particleBursts.splice(burstIndex, 1);
        continue;
      }

      const positions = burst.positions;
      for (let i = 0; i < burst.velocities.length; i += 1) {
        const velocity = burst.velocities[i];
        velocity.y -= gravity * burst.gravityScale * delta;

        const offset = i * 3;
        positions[offset] += velocity.x * delta;
        positions[offset + 1] += velocity.y * delta;
        positions[offset + 2] += velocity.z * delta;
      }

      burst.geometry.attributes.position.needsUpdate = true;
      burst.material.opacity = Math.max(0, burst.ttl / burst.maxTtl);
    }
  }
}
