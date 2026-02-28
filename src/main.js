import * as THREE from 'three';

const app = document.getElementById('app');
const playerHeight = 2;
const moveSpeed = 9;
const mouseSensitivity = 0.0022;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x101a22, 1);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x101a22, 20, 140);

const camera = new THREE.PerspectiveCamera(
	80,
	window.innerWidth / window.innerHeight,
	0.1,
	500
);
camera.position.set(0, playerHeight, 10);

const hemiLight = new THREE.HemisphereLight(0x90b4c6, 0x101317, 1.2);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(8, 16, 10);
scene.add(dirLight);

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
		color: 0x1a1a1a,
		roughness: 0.85,
		metalness: 0.15,
	})
);
oilZombie.position.set(0, 1.2, -16);
scene.add(oilZombie);

const platform = new THREE.Mesh(
	new THREE.BoxGeometry(14, 0.8, 14),
	new THREE.MeshStandardMaterial({
		color: 0x44525a,
		roughness: 0.75,
		metalness: 0.35,
	})
);
platform.position.set(0, 0.4, -10);
scene.add(platform);

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

const keyState = {
	forward: false,
	back: false,
	left: false,
	right: false,
};

let yaw = Math.PI;
let pitch = 0;
let fpsFrames = 0;
let fpsAccumulator = 0;

const shotRay = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

function setZombieAliveState(isAlive) {
	oilZombie.visible = isAlive;
}

function onKeyChange(event, isDown) {
	switch (event.code) {
		case 'KeyW':
			keyState.forward = isDown;
			break;
		case 'KeyS':
			keyState.back = isDown;
			break;
		case 'KeyA':
			keyState.left = isDown;
			break;
		case 'KeyD':
			keyState.right = isDown;
			break;
		default:
	}
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
			oilZombie.material.color.setHex(0x1a1a1a);
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
	forward.normalize();

	right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

	const moveVector = new THREE.Vector3();

	if (keyState.forward) {
		moveVector.add(forward);
	}
	if (keyState.back) {
		moveVector.sub(forward);
	}
	if (keyState.left) {
		moveVector.sub(right);
	}
	if (keyState.right) {
		moveVector.add(right);
	}

	if (moveVector.lengthSq() > 0) {
		moveVector.normalize().multiplyScalar(moveSpeed * delta);
		camera.position.add(moveVector);
	}

	camera.position.y = playerHeight;
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

renderer.domElement.addEventListener('click', () => {
	renderer.domElement.requestPointerLock();
});

lockHint.addEventListener('click', () => {
	renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
	const isLocked = document.pointerLockElement === renderer.domElement;
	lockHint.style.display = isLocked ? 'none' : 'grid';
	hud.style.display = isLocked ? 'none' : 'block';
});

document.addEventListener('pointerlockerror', () => {
	lockHint.innerHTML = 'Pointer lock was blocked.<br/>Click again on the game view.';
});

document.addEventListener('keydown', (event) => onKeyChange(event, true));
document.addEventListener('keyup', (event) => onKeyChange(event, false));
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mousedown', (event) => {
	if (event.button === 0) {
		shoot();
	}
});

const clock = new THREE.Clock();

function animate() {
	const elapsed = clock.getElapsedTime();
	const delta = clock.getDelta();
	const isLocked = document.pointerLockElement === renderer.domElement;

	if (isLocked) {
		updateMovement(delta);
	}

	updateFps(delta);

	if (oilZombie.visible) {
		oilZombie.position.x = Math.sin(elapsed * 0.8) * 4;
		oilZombie.rotation.y += delta * 0.8;
		zombieHitbox.setFromObject(oilZombie);
	}

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
