import * as THREE from 'three';
import { OilRigMap } from './scene/maps/OilRigMap.js';
import { InputManager } from './input/InputManager.js';
import { PlayerController } from './player/PlayerController.js';
import { EnemyManager } from './enemies/EnemyManager.js';
import { ShootingSystem } from './combat/ShootingSystem.js';
import { HUDManager } from './ui/HUDManager.js';

const app = document.getElementById('app');
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

const hemiLight = new THREE.HemisphereLight(0xbfe5ff, 0x25313c, 1.45);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfff4d6, 1.35);
dirLight.position.set(8, 16, 10);
scene.add(dirLight);

const fillLight = new THREE.AmbientLight(0x9ac6e0, 0.35);
scene.add(fillLight);

const oilRigMap = new OilRigMap(scene);
const hud = new HUDManager();
const input = new InputManager(renderer.domElement);
const player = new PlayerController(camera, input, oilRigMap);

const enemySpawnConfigs = [
  {
    typeName: 'Oil Zombie',
    position: { x: 0, z: -16 },
    color: 0x6a3dad,
    health: 100,
    speed: 2.8,
    attackRadius: 2.2,
    damagePerSecond: 10,
  },
  {
    typeName: 'Oil Brute',
    position: { x: 6, z: -26 },
    color: 0xd04f2a,
    health: 90,
    speed: 3.2,
    attackRadius: 2.4,
    damagePerSecond: 12,
  },
  {
    typeName: 'Oil Stalker',
    position: { x: -8, z: -34 },
    color: 0x00897b,
    health: 110,
    speed: 2.6,
    attackRadius: 2.6,
    damagePerSecond: 14,
  },
];

const enemyManager = new EnemyManager(scene, hud, enemySpawnConfigs, 0.55);
const shootingSystem = new ShootingSystem(scene, camera, enemyManager);

let playerHealth = maxPlayerHealth;
hud.setHealth(playerHealth, maxPlayerHealth);

function applyDamage(amount) {
  playerHealth = Math.max(0, playerHealth - amount);
  hud.setHealth(playerHealth, maxPlayerHealth);
  hud.triggerDamageFlash(amount / 40);

  const hitOrigin = camera.position.clone().add(new THREE.Vector3(0, -0.15, 0));
  shootingSystem.spawnPlayerHitParticles(hitOrigin);

  if (playerHealth === 0) {
    hud.showMessage('You were overwhelmed. Refresh to restart.');
  }
}

renderer.domElement.addEventListener('click', () => {
  input.requestPointerLock();
});

hud.onStartClick(() => {
  input.requestPointerLock();
});

input.onPointerLockStateChange((isLocked) => {
  hud.setLockState(isLocked);
  if (!isLocked) {
    player.resetMotion();
  }
});

document.addEventListener('pointerlockerror', () => {
  hud.showPointerLockError();
});

document.addEventListener('mousemove', (event) => {
  if (input.isPointerLocked()) {
    player.look(event.movementX, event.movementY);
  }
});

document.addEventListener('mousedown', (event) => {
  if (event.button === 0 && input.isPointerLocked()) {
    shootingSystem.shoot();
  }
});

const clock = new THREE.Clock();

function animate() {
  const delta = clock.getDelta();

  player.update(delta);
  enemyManager.resolvePlayerCollision(camera.position);

  const damageTaken = enemyManager.update(delta, camera.position);
  if (damageTaken > 0 && playerHealth > 0) {
    applyDamage(damageTaken);
  }

  oilRigMap.update(delta);
  shootingSystem.update(delta, player.gravity);
  enemyManager.updateUi(camera);

  hud.updateFps(delta);
  hud.setInputDebug(input.getPressedKeysText(), enemyManager.getAliveCount());
  hud.updateDamageFlash(delta);
  hud.updateDrillMarker(oilRigMap.getDrillPosition(), camera, camera.position);

  if (enemyManager.getAliveCount() === 0) {
    hud.showMessage('All enemies cleared. Reach the drill shaft!');
  }

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
