import * as THREE from 'three';

export class PlayerController {
  constructor(camera, input, oilRigMap) {
    this.camera = camera;
    this.input = input;
    this.map = oilRigMap;

    this.playerHeight = 2;
    this.playerRadius = 0.55;
    this.maxMoveSpeed = 8.5;
    this.moveAcceleration = 34;
    this.groundDamping = 12;
    this.mouseSensitivity = 0.0012;
    this.jumpVelocity = 7;
    this.gravity = 18;

    this.yaw = Math.PI;
    this.pitch = 0;
    this.verticalVelocity = 0;
    this.jumpQueued = false;

    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();
    this.horizontalVelocity = new THREE.Vector3();
    this.upAxis = new THREE.Vector3(0, 1, 0);
    this.playerCollider = new THREE.Box3();
    this.collisionSize = new THREE.Vector3(this.playerRadius * 2, 2, this.playerRadius * 2);

    this.camera.position.set(0, this.playerHeight, 10);
  }

  look(movementX, movementY) {
    this.yaw -= movementX * this.mouseSensitivity;
    this.pitch -= movementY * this.mouseSensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  resetMotion() {
    this.input.resetInputState();
    this.jumpQueued = false;
    this.horizontalVelocity.set(0, 0, 0);
    this.verticalVelocity = 0;
  }

  update(delta) {
    if (this.input.isPressed('Space')) {
      this.jumpQueued = true;
    }

    this.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.forward.y = 0;

    if (this.forward.lengthSq() < 0.0001) {
      this.forward.set(0, 0, -1);
    } else {
      this.forward.normalize();
    }

    this.right.crossVectors(this.forward, this.upAxis).normalize();

    this.moveDirection.set(0, 0, 0);

    if (this.input.isLogicalPressed(['KeyW', 'ArrowUp'])) {
      this.moveDirection.add(this.forward);
    }
    if (this.input.isLogicalPressed(['KeyS', 'ArrowDown'])) {
      this.moveDirection.sub(this.forward);
    }
    if (this.input.isLogicalPressed(['KeyA', 'ArrowLeft'])) {
      this.moveDirection.sub(this.right);
    }
    if (this.input.isLogicalPressed(['KeyD', 'ArrowRight'])) {
      this.moveDirection.add(this.right);
    }

    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
      this.horizontalVelocity.x += this.moveDirection.x * this.moveAcceleration * delta;
      this.horizontalVelocity.z += this.moveDirection.z * this.moveAcceleration * delta;
    } else {
      const damping = Math.exp(-this.groundDamping * delta);
      this.horizontalVelocity.x *= damping;
      this.horizontalVelocity.z *= damping;
    }

    const horizontalSpeed = Math.hypot(this.horizontalVelocity.x, this.horizontalVelocity.z);

    if (horizontalSpeed > this.maxMoveSpeed) {
      const speedScale = this.maxMoveSpeed / horizontalSpeed;
      this.horizontalVelocity.x *= speedScale;
      this.horizontalVelocity.z *= speedScale;
    }

    const currentGroundHeight = this.map.getGroundHeightAt(
      this.camera.position.x,
      this.camera.position.z,
      this.camera.position.y,
      this.playerHeight
    );
    const currentGroundEyeY = this.playerHeight + currentGroundHeight;
    const isGrounded =
      this.camera.position.y <= currentGroundEyeY + 0.001 && this.verticalVelocity <= 0.001;

    if (this.jumpQueued && isGrounded) {
      this.verticalVelocity = this.jumpVelocity;
      this.jumpQueued = false;
    }

    this.verticalVelocity -= this.gravity * delta;

    const nextPositionX = this.camera.position.clone();
    nextPositionX.x += this.horizontalVelocity.x * delta;

    if (!this.map.collidesWithWorld(nextPositionX, this.playerCollider, this.collisionSize)) {
      this.camera.position.x = nextPositionX.x;
    } else {
      this.horizontalVelocity.x = 0;
    }

    const nextPositionZ = this.camera.position.clone();
    nextPositionZ.z += this.horizontalVelocity.z * delta;

    if (!this.map.collidesWithWorld(nextPositionZ, this.playerCollider, this.collisionSize)) {
      this.camera.position.z = nextPositionZ.z;
    } else {
      this.horizontalVelocity.z = 0;
    }

    this.camera.position.y += this.verticalVelocity * delta;

    const groundHeight = this.map.getGroundHeightAt(
      this.camera.position.x,
      this.camera.position.z,
      this.camera.position.y,
      this.playerHeight
    );
    const minEyeHeight = this.playerHeight + groundHeight;

    if (this.camera.position.y < minEyeHeight) {
      this.camera.position.y = minEyeHeight;
      this.verticalVelocity = 0;
      if (!this.input.isPressed('Space')) {
        this.jumpQueued = false;
      }
    }

    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -85, 85);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -85, 85);
  }
}
