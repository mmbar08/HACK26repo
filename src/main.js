import * as THREE from 'three';

const app = document.getElementById('app');
const playerHeight = 2;
const maxMoveSpeed = 8.5;
const moveAcceleration = 34;
const groundDamping = 12;
const mouseSensitivity = 0.0022;
const jumpVelocity = 7;
const gravity = 18;
const playerRadius = 0.55;
const maxPlayerHealth = 100;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x101a22, 1);
renderer.domElement.tabIndex = 0;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x101a22, 20, 140);
scene.background = new THREE.Color(0x8fb9d9);

const camera = new THREE.PerspectiveCamera(
	80,
	window.innerWidth / window.innerHeight,
	0.1,
	500
);
camera.position.set(0, playerHeight, 10);

const hemiLight = new THREE.HemisphereLight(0xbfe5ff, 0x25313c, 1.45);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfff4d6, 1.35);
dirLight.position.set(8, 16, 10);
scene.add(dirLight);

const fillLight = new THREE.AmbientLight(0x9ac6e0, 0.35);
scene.add(fillLight);

const rigFloor = new THREE.Mesh(
	new THREE.PlaneGeometry(180, 180),
	new THREE.MeshStandardMaterial({
		color: 0x2f3e46,
		roughness: 0.9,
		metalness: 0.1,
	})
);
rigFloor.rotation.x = -Math.PI / 2;
scene.add(rigFloor);

const drillShaft = new THREE.Mesh(
	new THREE.CylinderGeometry(2.4, 2.4, 12, 24),
	new THREE.MeshStandardMaterial({
		color: 0x3a4a53,
		roughness: 0.55,
		metalness: 0.65,
	})
);
drillShaft.position.set(0, 6, -40);
scene.add(drillShaft);

const rigTower = new THREE.Mesh(
	new THREE.BoxGeometry(14, 10, 14),
	new THREE.MeshStandardMaterial({
		color: 0x5c6b73,
		roughness: 0.7,
		metalness: 0.35,
	})
);
rigTower.position.set(0, 5, -55);
scene.add(rigTower);

const platformA = new THREE.Mesh(
	new THREE.BoxGeometry(14, 0.8, 14),
	new THREE.MeshStandardMaterial({
		color: 0x1e88e5,
		roughness: 0.75,
		metalness: 0.35,
	})
);
platformA.position.set(0, 0.4, -10);
scene.add(platformA);

const platformB = new THREE.Mesh(
	new THREE.BoxGeometry(8, 0.6, 8),
	new THREE.MeshStandardMaterial({
		color: 0x43a047,
		roughness: 0.72,
		metalness: 0.32,
	})
);
platformB.position.set(-14, 0.3, -22);
scene.add(platformB);

const platformC = new THREE.Mesh(
	new THREE.BoxGeometry(10, 0.7, 10),
	new THREE.MeshStandardMaterial({
		color: 0xf9a825,
		roughness: 0.7,
		metalness: 0.3,
	})
);
platformC.position.set(16, 0.35, -30);
scene.add(platformC);

const staticCollisionBoxes = [];
const platformSurfaces = [];

function addStaticCollider(mesh, width, height, depth) {
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
	staticCollisionBoxes.push(collider);
}

function addPlatformSurface(mesh, width, depth, topY) {
	platformSurfaces.push({
		minX: mesh.position.x - width / 2,
		maxX: mesh.position.x + width / 2,
		minZ: mesh.position.z - depth / 2,
		maxZ: mesh.position.z + depth / 2,
		topY,
	});
}

addPlatformSurface(platformA, 14, 14, 0.8);
addPlatformSurface(platformB, 8, 8, 0.6);
addPlatformSurface(platformC, 10, 10, 0.7);
addStaticCollider(drillShaft, 5.2, 12, 5.2);
addStaticCollider(rigTower, 14, 10, 14);

const hud = document.createElement('div');
hud.style.position = 'fixed';
hud.style.top = '12px';
hud.style.left = '12px';
hud.style.padding = '10px 12px';
hud.style.background = 'rgba(0, 0, 0, 0.45)';
hud.style.border = '1px solid rgba(255, 255, 255, 0.2)';
hud.style.color = '#e6f4f1';
hud.style.fontFamily = 'system-ui, sans-serif';
hud.style.fontSize = '14px';
hud.style.lineHeight = '1.35';
hud.textContent =
	'Click to lock pointer | WASD move | Space jump | Mouse look | Left click shoot';
document.body.appendChild(hud);

const fpsCounter = document.createElement('div');
fpsCounter.style.position = 'fixed';
fpsCounter.style.top = '12px';
fpsCounter.style.right = '12px';
fpsCounter.style.padding = '8px 10px';
fpsCounter.style.background = 'rgba(0, 0, 0, 0.45)';
fpsCounter.style.border = '1px solid rgba(255, 255, 255, 0.2)';
fpsCounter.style.color = '#e6f4f1';
fpsCounter.style.fontFamily = 'system-ui, sans-serif';
fpsCounter.style.fontSize = '13px';
fpsCounter.textContent = 'FPS: --';
document.body.appendChild(fpsCounter);

const crosshair = document.createElement('div');
crosshair.style.position = 'fixed';
crosshair.style.left = '50%';
crosshair.style.top = '50%';
crosshair.style.transform = 'translate(-50%, -50%)';
crosshair.style.color = '#ffffff';
crosshair.style.fontFamily = 'monospace';
crosshair.style.fontSize = '20px';
crosshair.style.userSelect = 'none';
crosshair.textContent = '+';
document.body.appendChild(crosshair);

const inputDebug = document.createElement('div');
inputDebug.style.position = 'fixed';
inputDebug.style.left = '12px';
inputDebug.style.bottom = '12px';
inputDebug.style.padding = '6px 8px';
inputDebug.style.background = 'rgba(0, 0, 0, 0.45)';
inputDebug.style.border = '1px solid rgba(255, 255, 255, 0.2)';
inputDebug.style.color = '#e6f4f1';
inputDebug.style.fontFamily = 'system-ui, sans-serif';
inputDebug.style.fontSize = '12px';
inputDebug.textContent = 'Keys: none';
document.body.appendChild(inputDebug);

const healthUi = document.createElement('div');
healthUi.style.position = 'fixed';
healthUi.style.right = '12px';
healthUi.style.bottom = '12px';
healthUi.style.padding = '8px';
healthUi.style.background = 'rgba(0, 0, 0, 0.45)';
healthUi.style.border = '1px solid rgba(255, 255, 255, 0.2)';
healthUi.style.width = '220px';
healthUi.style.fontFamily = 'system-ui, sans-serif';
healthUi.style.fontSize = '12px';
healthUi.style.color = '#e6f4f1';

const healthLabel = document.createElement('div');
healthLabel.style.marginBottom = '6px';
healthLabel.textContent = 'Health: 100';

const healthTrack = document.createElement('div');
healthTrack.style.width = '100%';
healthTrack.style.height = '14px';
healthTrack.style.background = 'rgba(255, 255, 255, 0.2)';
healthTrack.style.border = '1px solid rgba(255, 255, 255, 0.25)';

const healthFill = document.createElement('div');
healthFill.style.height = '100%';
healthFill.style.width = '100%';
healthFill.style.background = 'linear-gradient(90deg, #23c06f 0%, #f4d03f 65%, #d53f3f 100%)';

healthTrack.appendChild(healthFill);
healthUi.appendChild(healthLabel);
healthUi.appendChild(healthTrack);
document.body.appendChild(healthUi);

const lockHint = document.createElement('div');
lockHint.style.position = 'fixed';
lockHint.style.inset = '0';
lockHint.style.display = 'grid';
lockHint.style.placeItems = 'center';
lockHint.style.background = 'rgba(7, 12, 16, 0.6)';
lockHint.style.color = '#dff3ed';
lockHint.style.fontFamily = 'system-ui, sans-serif';
lockHint.style.fontSize = '20px';
lockHint.style.textAlign = 'center';
lockHint.style.cursor = 'pointer';
lockHint.innerHTML = 'Click to enter FPS controls<br/>ESC to unlock cursor';
document.body.appendChild(lockHint);

const activeKeys = new Set();
const gameplayCodes = new Set([
	'KeyW',
	'KeyA',
	'KeyS',
	'KeyD',
	'Space',
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
]);

let yaw = Math.PI;
let pitch = 0;
let fpsFrames = 0;
let fpsAccumulator = 0;
let verticalVelocity = 0;
let jumpQueued = false;
let playerHealth = maxPlayerHealth;
let elapsedTime = 0;

const shotRay = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const moveDirection = new THREE.Vector3();
const horizontalVelocity = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);
const playerCollider = new THREE.Box3();
const collisionSize = new THREE.Vector3(playerRadius * 2, 2, playerRadius * 2);
const laserTraces = [];
const tempVector = new THREE.Vector3();

class EnemyManager {
	constructor(targetScene, spawnConfigs) {
		this.scene = targetScene;
		this.enemies = [];
		this.enemyId = 1;

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

		this.enemies.push({
			id: this.enemyId++,
			mesh,
			color: config.color,
			health: config.health,
			speed: config.speed,
			attackRadius: config.attackRadius,
			damagePerSecond: config.damagePerSecond,
			collisionRadius: 0.8,
			alive: true,
		});
	}

	update(delta, playerPosition) {
		let totalDamage = 0;

		for (const enemy of this.enemies) {
			if (!enemy.alive) {
				continue;
			}

			tempVector
				.copy(playerPosition)
				.sub(enemy.mesh.position)
				.setY(0);

			const distance = tempVector.length();

			if (distance > 0.001) {
				tempVector.normalize();
				enemy.mesh.position.addScaledVector(tempVector, enemy.speed * delta);
			}

			enemy.mesh.rotation.y += delta * 1.7;

			if (distance <= enemy.attackRadius) {
				totalDamage += enemy.damagePerSecond * delta;
			}
		}

		return totalDamage;
	}

	resolvePlayerEnemyCollision(playerPosition) {
		for (const enemy of this.enemies) {
			if (!enemy.alive) {
				continue;
			}

			tempVector
				.copy(playerPosition)
				.sub(enemy.mesh.position)
				.setY(0);

			const distance = tempVector.length();
			const minDistance = playerRadius + enemy.collisionRadius;

			if (distance >= minDistance || distance < 0.0001) {
				continue;
			}

			const pushDistance = minDistance - distance;
			tempVector.normalize();
			playerPosition.addScaledVector(tempVector, pushDistance);
		}
	}

	shoot(raycaster) {
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
		const targetEnemy = this.enemies.find((enemy) => enemy.mesh === hit.object);

		if (!targetEnemy) {
			return null;
		}

		targetEnemy.health = Math.max(0, targetEnemy.health - 34);
		targetEnemy.mesh.material.color.setHex(0xffffff);

		setTimeout(() => {
			if (targetEnemy.alive) {
				targetEnemy.mesh.material.color.setHex(targetEnemy.color);
			}
		}, 75);

		if (targetEnemy.health === 0) {
			targetEnemy.alive = false;
			targetEnemy.mesh.visible = false;
		}

		return hit.point.clone();
	}

	getAliveCount() {
		return this.enemies.filter((enemy) => enemy.alive).length;
	}
}

const enemySpawnConfigs = [
	{
		position: { x: 0, z: -16 },
		color: 0x6a3dad,
		health: 100,
		speed: 2.8,
		attackRadius: 2.2,
		damagePerSecond: 10,
	},
	{
		position: { x: 6, z: -26 },
		color: 0xd04f2a,
		health: 90,
		speed: 3.2,
		attackRadius: 2.4,
		damagePerSecond: 12,
	},
	{
		position: { x: -8, z: -34 },
		color: 0x00897b,
		health: 110,
		speed: 2.6,
		attackRadius: 2.6,
		damagePerSecond: 14,
	},
];

const enemyManager = new EnemyManager(scene, enemySpawnConfigs);

function createLaserTrace(startPoint, endPoint) {
	const points = [startPoint.clone(), endPoint.clone()];
	const geometry = new THREE.BufferGeometry().setFromPoints(points);
	const material = new THREE.LineBasicMaterial({
		color: 0x8ee7ff,
		transparent: true,
		opacity: 0.9,
	});
	const line = new THREE.Line(geometry, material);

	scene.add(line);
	laserTraces.push({ line, ttl: 0.08 });
}

function updateLaserTraces(delta) {
	for (let index = laserTraces.length - 1; index >= 0; index -= 1) {
		const trace = laserTraces[index];
		trace.ttl -= delta;

		if (trace.ttl <= 0) {
			scene.remove(trace.line);
			trace.line.geometry.dispose();
			trace.line.material.dispose();
			laserTraces.splice(index, 1);
			continue;
		}

		trace.line.material.opacity = Math.max(0, trace.ttl / 0.08);
	}
}

function collidesWithStaticWorld(nextPosition) {
	playerCollider.setFromCenterAndSize(nextPosition, collisionSize);

	for (const box of staticCollisionBoxes) {
		if (playerCollider.intersectsBox(box)) {
			return true;
		}
	}

	return false;
}

function getGroundHeightAt(x, z, cameraY) {
	let groundHeight = 0;

	for (const surface of platformSurfaces) {
		const withinX = x >= surface.minX && x <= surface.maxX;
		const withinZ = z >= surface.minZ && z <= surface.maxZ;

		if (!withinX || !withinZ) {
			continue;
		}

		const platformEyeHeight = playerHeight + surface.topY;
		const canLandOnSurface = cameraY >= surface.topY - 0.2 && cameraY <= platformEyeHeight + 3;

		if (canLandOnSurface) {
			groundHeight = Math.max(groundHeight, surface.topY);
		}
	}

	return groundHeight;
}

function isPressed(code) {
	return activeKeys.has(code);
}

function isLogicalPressed(codes) {
	return codes.some((code) => isPressed(code));
}

function onMouseMove(event) {
	if (document.pointerLockElement !== renderer.domElement) {
		return;
	}

	yaw -= event.movementX * mouseSensitivity;
	pitch -= event.movementY * mouseSensitivity;
	pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));

	camera.rotation.order = 'YXZ';
	camera.rotation.y = yaw;
	camera.rotation.x = pitch;
}

function shoot() {
	if (document.pointerLockElement !== renderer.domElement) {
		return;
	}

	shotRay.setFromCamera(screenCenter, camera);

	const hitPoint = enemyManager.shoot(shotRay);
	const shotStart = new THREE.Vector3();
	camera.getWorldPosition(shotStart);

	if (hitPoint) {
		createLaserTrace(shotStart, hitPoint);
	} else {
		const missPoint = shotStart.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(80));
		createLaserTrace(shotStart, missPoint);
	}
}

function updateMovement(delta) {
	forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
	forward.y = 0;

	if (forward.lengthSq() < 0.0001) {
		forward.set(0, 0, -1);
	} else {
		forward.normalize();
	}

	right.crossVectors(forward, upAxis).normalize();

	moveDirection.set(0, 0, 0);

	if (isLogicalPressed(['KeyW', 'ArrowUp'])) {
		moveDirection.add(forward);
	}
	if (isLogicalPressed(['KeyS', 'ArrowDown'])) {
		moveDirection.sub(forward);
	}
	if (isLogicalPressed(['KeyA', 'ArrowLeft'])) {
		moveDirection.sub(right);
	}
	if (isLogicalPressed(['KeyD', 'ArrowRight'])) {
		moveDirection.add(right);
	}

	if (moveDirection.lengthSq() > 0) {
		moveDirection.normalize();
		horizontalVelocity.x += moveDirection.x * moveAcceleration * delta;
		horizontalVelocity.z += moveDirection.z * moveAcceleration * delta;
	} else {
		const damping = Math.exp(-groundDamping * delta);
		horizontalVelocity.x *= damping;
		horizontalVelocity.z *= damping;
	}

	const horizontalSpeed = Math.hypot(horizontalVelocity.x, horizontalVelocity.z);

	if (horizontalSpeed > maxMoveSpeed) {
		const speedScale = maxMoveSpeed / horizontalSpeed;
		horizontalVelocity.x *= speedScale;
		horizontalVelocity.z *= speedScale;
	}

	const currentGroundHeight = getGroundHeightAt(
		camera.position.x,
		camera.position.z,
		camera.position.y
	);
	const currentGroundEyeY = playerHeight + currentGroundHeight;
	const isGrounded =
		camera.position.y <= currentGroundEyeY + 0.001 && verticalVelocity <= 0.001;

	if (jumpQueued && isGrounded) {
		verticalVelocity = jumpVelocity;
		jumpQueued = false;
	}

	verticalVelocity -= gravity * delta;

	const nextPositionX = camera.position.clone();
	nextPositionX.x += horizontalVelocity.x * delta;

	if (!collidesWithStaticWorld(nextPositionX)) {
		camera.position.x = nextPositionX.x;
	} else {
		horizontalVelocity.x = 0;
	}

	const nextPositionZ = camera.position.clone();
	nextPositionZ.z += horizontalVelocity.z * delta;

	if (!collidesWithStaticWorld(nextPositionZ)) {
		camera.position.z = nextPositionZ.z;
	} else {
		horizontalVelocity.z = 0;
	}

	camera.position.y += verticalVelocity * delta;

	const groundHeight = getGroundHeightAt(
		camera.position.x,
		camera.position.z,
		camera.position.y
	);
	const minEyeHeight = playerHeight + groundHeight;

	if (camera.position.y < minEyeHeight) {
		camera.position.y = minEyeHeight;
		verticalVelocity = 0;
		if (!isPressed('Space')) {
			jumpQueued = false;
		}
	}

	camera.position.x = THREE.MathUtils.clamp(camera.position.x, -85, 85);
	camera.position.z = THREE.MathUtils.clamp(camera.position.z, -85, 85);
}

function updateFps(delta) {
	fpsFrames += 1;
	fpsAccumulator += delta;

	if (fpsAccumulator >= 0.5) {
		const fps = Math.round(fpsFrames / fpsAccumulator);
		fpsCounter.textContent = `FPS: ${fps}`;
		fpsFrames = 0;
		fpsAccumulator = 0;
	}
}

function preventGameplayKeyScroll(event) {
	if (gameplayCodes.has(event.code)) {
		event.preventDefault();
		event.stopPropagation();
	}
}

function mapKeyToCode(event) {
	if (gameplayCodes.has(event.code)) {
		return event.code;
	}

	const key = event.key.toLowerCase();

	if (key === 'w') {
		return 'KeyW';
	}
	if (key === 'a') {
		return 'KeyA';
	}
	if (key === 's') {
		return 'KeyS';
	}
	if (key === 'd') {
		return 'KeyD';
	}
	if (key === ' ') {
		return 'Space';
	}

	return null;
}

function onKeyDown(event) {
	preventGameplayKeyScroll(event);
	const mappedCode = mapKeyToCode(event);

	if (mappedCode) {
		activeKeys.add(mappedCode);
		if (mappedCode === 'Space') {
			jumpQueued = true;
		}
	}
}

function onKeyUp(event) {
	preventGameplayKeyScroll(event);
	const mappedCode = mapKeyToCode(event);

	if (mappedCode) {
		activeKeys.delete(mappedCode);
	}
}

function resetInputState() {
	activeKeys.clear();
	jumpQueued = false;
	horizontalVelocity.set(0, 0, 0);
}

function updateInputDebug() {
	const pressedKeys = Array.from(activeKeys.values()).join(', ');
	inputDebug.textContent = `Keys: ${pressedKeys || 'none'} | Enemies: ${enemyManager.getAliveCount()}`;
}

function applyDamage(amount) {
	playerHealth = Math.max(0, playerHealth - amount);
	const percent = (playerHealth / maxPlayerHealth) * 100;
	healthFill.style.width = `${percent}%`;
	healthLabel.textContent = `Health: ${Math.ceil(playerHealth)}`;

	if (playerHealth === 0) {
		hud.style.display = 'block';
		hud.textContent = 'You were overwhelmed. Refresh to restart.';
	}
}

renderer.domElement.addEventListener('click', () => {
	renderer.domElement.focus();
	renderer.domElement.requestPointerLock();
});

lockHint.addEventListener('click', () => {
	renderer.domElement.focus();
	renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
	const isLocked = document.pointerLockElement === renderer.domElement;
	lockHint.style.display = isLocked ? 'none' : 'grid';
	hud.style.display = isLocked ? 'none' : 'block';

	if (isLocked) {
		renderer.domElement.focus();
	} else {
		resetInputState();
	}
});

document.addEventListener('pointerlockerror', () => {
	lockHint.innerHTML = 'Pointer lock was blocked.<br/>Click again on the game view.';
});

document.addEventListener('keydown', onKeyDown, {
	capture: true,
	passive: false,
});
document.addEventListener('keyup', onKeyUp, {
	capture: true,
	passive: false,
});
window.addEventListener('keydown', onKeyDown, { passive: false });
window.addEventListener('keyup', onKeyUp, { passive: false });
window.addEventListener('blur', resetInputState);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mousedown', (event) => {
	if (event.button === 0) {
		shoot();
	}
});

const clock = new THREE.Clock();

function animate() {
	const delta = clock.getDelta();
	elapsedTime += delta;

	updateMovement(delta);
	enemyManager.resolvePlayerEnemyCollision(camera.position);

	updateFps(delta);
	updateInputDebug();
	updateLaserTraces(delta);

	const damageTaken = enemyManager.update(delta, camera.position);

	if (damageTaken > 0 && playerHealth > 0) {
		applyDamage(damageTaken);
	}

	if (enemyManager.getAliveCount() === 0) {
		hud.style.display = 'block';
		hud.textContent = 'All enemies cleared. Reach the drill shaft!';
	}

	drillShaft.rotation.y += delta * 0.35;
	rigTower.rotation.y += delta * 0.08;

	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);
animate();
