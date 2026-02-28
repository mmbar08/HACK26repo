import * as THREE from 'three';

export class OilRigMap {
  constructor(scene) {
    this.scene = scene;
    this.staticCollisionBoxes = [];
    this.platformSurfaces = [];

    this.rigFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({
        color: 0x2f3e46,
        roughness: 0.9,
        metalness: 0.1,
      })
    );
    this.rigFloor.rotation.x = -Math.PI / 2;
    this.scene.add(this.rigFloor);

    this.drillShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 12, 24),
      new THREE.MeshStandardMaterial({
        color: 0x3a4a53,
        roughness: 0.55,
        metalness: 0.65,
      })
    );
    this.drillShaft.position.set(0, 6, -40);
    this.scene.add(this.drillShaft);

    this.rigTower = new THREE.Mesh(
      new THREE.BoxGeometry(14, 10, 14),
      new THREE.MeshStandardMaterial({
        color: 0x5c6b73,
        roughness: 0.7,
        metalness: 0.35,
      })
    );
    this.rigTower.position.set(0, 5, -55);
    this.scene.add(this.rigTower);

    this.platformA = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.8, 14),
      new THREE.MeshStandardMaterial({
        color: 0x1e88e5,
        roughness: 0.75,
        metalness: 0.35,
      })
    );
    this.platformA.position.set(0, 0.4, -10);
    this.scene.add(this.platformA);

    this.platformB = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.6, 8),
      new THREE.MeshStandardMaterial({
        color: 0x43a047,
        roughness: 0.72,
        metalness: 0.32,
      })
    );
    this.platformB.position.set(-14, 0.3, -22);
    this.scene.add(this.platformB);

    this.platformC = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.7, 10),
      new THREE.MeshStandardMaterial({
        color: 0xf9a825,
        roughness: 0.7,
        metalness: 0.3,
      })
    );
    this.platformC.position.set(16, 0.35, -30);
    this.scene.add(this.platformC);

    this.addPlatformSurface(this.platformA, 14, 14, 0.8);
    this.addPlatformSurface(this.platformB, 8, 8, 0.6);
    this.addPlatformSurface(this.platformC, 10, 10, 0.7);
    this.addStaticCollider(this.drillShaft, 5.2, 12, 5.2);
    this.addStaticCollider(this.rigTower, 14, 10, 14);
  }

  addStaticCollider(mesh, width, height, depth) {
    const halfHeight = height / 2;
    const collider = new THREE.Box3(
      new THREE.Vector3(
        mesh.position.x - width / 2,
        mesh.position.y - halfHeight,
        mesh.position.z - depth / 2
      ),
      new THREE.Vector3(
        mesh.position.x + width / 2,
        mesh.position.y + halfHeight,
        mesh.position.z + depth / 2
      )
    );
    this.staticCollisionBoxes.push(collider);
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

  collidesWithWorld(nextPosition, playerCollider, collisionSize) {
    playerCollider.setFromCenterAndSize(nextPosition, collisionSize);

    for (const box of this.staticCollisionBoxes) {
      if (playerCollider.intersectsBox(box)) {
        return true;
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

  update(delta) {
    this.drillShaft.rotation.y += delta * 0.35;
    this.rigTower.rotation.y += delta * 0.08;
  }
}
