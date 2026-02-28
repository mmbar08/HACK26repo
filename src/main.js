import * as THREE from 'three';

const app = document.getElementById('app');
const playerHeight = 2;
const maxMoveSpeed = 8.5;
const moveAcceleration = 34;
const groundDamping = 12;
const mouseSensitivity = 0.0022;
const jumpVelocity = 7;
const gravity = 18;

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
	new THREE.CylinderGeometry(1.2, 1.2, 12, 24),
	new THREE.MeshStandardMaterial({
		color: 0x3a4a53,
		roughness: 0.55,
		metalness: 0.65,
	})
);
drillShaft.position.set(0, 6, -40);
scene.add(drillShaft);

const oilZombie = new THREE.Mesh(
	new THREE.BoxGeometry(1.2, 2.4, 1.2),
	new THREE.MeshStandardMaterial({
		color: 0x6a3dad,
		roughness: 0.85,
		metalness: 0.15,
	})
);
oilZombie.position.set(0, 1.2, -16);
scene.add(oilZombie);

const oilZombie2 = new THREE.Mesh(
	new THREE.BoxGeometry(1.2, 2.4, 1.2),
	new THREE.MeshStandardMaterial({
		color: 0xd04f2a,
		roughness: 0.82,
		metalness: 0.18,
	})
);
oilZombie2.position.set(6, 1.2, -26);
scene.add(oilZombie2);

const platform = new THREE.Mesh(
	new THREE.BoxGeometry(14, 0.8, 14),
	new THREE.MeshStandardMaterial({
		color: 0x1e88e5,
		roughness: 0.75,
		metalness: 0.35,
	})
);
platform.position.set(0, 0.4, -10);
scene.add(platform);

const platform2 = new THREE.Mesh(
	new THREE.BoxGeometry(8, 0.6, 8),
	new THREE.MeshStandardMaterial({
		color: 0x43a047,
		roughness: 0.72,
		metalness: 0.32,
	})
);
platform2.position.set(-14, 0.3, -22);
scene.add(platform2);

const platform3 = new THREE.Mesh(
	new THREE.BoxGeometry(10, 0.7, 10),
	new THREE.MeshStandardMaterial({
		color: 0xf9a825,
		roughness: 0.7,
		metalness: 0.3,
	})
);
platform3.position.set(16, 0.35, -30);
scene.add(platform3);

const zombieHitbox = new THREE.Box3();
let zombieHealth = 100;

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
hud.textContent = 'Click to lock pointer | WASD move | Mouse look | Left click shoot';
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

const shotRay = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const moveDirection = new THREE.Vector3();
const horizontalVelocity = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);

function setZombieAliveState(isAlive) {
	oilZombie.visible = isAlive;
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
	if (document.pointerLockElement !== renderer.domElement || !oilZombie.visible) {
		return;
	}

	shotRay.setFromCamera(screenCenter, camera);
	const hits = shotRay.intersectObject(oilZombie, false);

	if (!hits.length) {
		return;
	}

	zombieHealth = Math.max(0, zombieHealth - 34);
	oilZombie.material.color.setHex(0x403535);

	setTimeout(() => {
		if (oilZombie.visible) {
			oilZombie.material.color.setHex(0x6a3dad);
		}
	}, 80);

	if (zombieHealth === 0) {
		setZombieAliveState(false);
		hud.textContent = 'Target neutralized. Proceed to drill shaft.';
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

	const isGrounded = camera.position.y <= playerHeight + 0.001;

	if (jumpQueued && isGrounded) {
		verticalVelocity = jumpVelocity;
		jumpQueued = false;
	}

	verticalVelocity -= gravity * delta;

	camera.position.x += horizontalVelocity.x * delta;
	camera.position.z += horizontalVelocity.z * delta;
	camera.position.y += verticalVelocity * delta;

	if (camera.position.y < playerHeight) {
		camera.position.y = playerHeight;
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
	inputDebug.textContent = `Keys: ${pressedKeys || 'none'}`;
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
	const elapsed = clock.elapsedTime;
	const isLocked = document.pointerLockElement === renderer.domElement;

	updateMovement(delta);

	updateFps(delta);
	updateInputDebug();

	if (oilZombie.visible) {
		oilZombie.position.x = Math.sin(elapsed * 0.8) * 4;
		oilZombie.rotation.y += delta * 0.8;
		zombieHitbox.setFromObject(oilZombie);
	}

	oilZombie2.position.x = 6 + Math.cos(elapsed * 0.75) * 3;
	oilZombie2.rotation.y -= delta * 0.6;

	drillShaft.rotation.y += delta * 0.35;

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
