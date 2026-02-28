import * as THREE from 'three';
import { OilRigMap } from './scene/maps/OilRigMap.js';
import { InputManager } from './input/InputManager.js';
import { PlayerController } from './player/PlayerController.js';
import { EnemyManager } from './enemies/EnemyManager.js';
import { ShootingSystem } from './combat/ShootingSystem.js';
import { HUDManager } from './ui/HUDManager.js';
import { GameStateMachine } from './core/GameStateMachine.js';
import { RigFailureSystem } from './objective/RigFailureSystem.js';
import { DrillShaftObjective } from './objective/DrillShaftObjective.js';
import { RepairInteraction } from './objective/RepairInteraction.js';

const app = document.getElementById('app');
const maxPlayerHealth = 100;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
await oilRigMap.initialize();
const hud = new HUDManager();
const input = new InputManager(renderer.domElement);
const player = new PlayerController(camera, input, oilRigMap);
const gameState = new GameStateMachine();

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

const enemyManager = new EnemyManager(scene, hud, enemySpawnConfigs, 0.55, oilRigMap);
const shootingSystem = new ShootingSystem(scene, camera, enemyManager, oilRigMap);
const rigFailure = new RigFailureSystem(360);
const drillObjective = new DrillShaftObjective(oilRigMap.getDrillPosition(), 4.2);
const repairInteraction = new RepairInteraction(4.5);
const maxDrillDurability = 100;

let playerHealth = maxPlayerHealth;
let dropSequenceRemaining = 2;
let hitboxDebugVisible = true;

oilRigMap.setHitboxDebugVisible(hitboxDebugVisible);
hud.showMessage('Hitbox debug: ON (press F2 to toggle)');

hud.setHealth(playerHealth, maxPlayerHealth);
hud.setObjective('Drop into the oil rig');
hud.setDrillDurability(maxDrillDurability, maxDrillDurability);

function applyDamage(amount) {
  playerHealth = Math.max(0, playerHealth - amount);
  hud.setHealth(playerHealth, maxPlayerHealth);
  hud.triggerDamageFlash(amount / 40);

  const hitOrigin = camera.position.clone().add(new THREE.Vector3(0, -0.15, 0));
  shootingSystem.spawnPlayerHitParticles(hitOrigin);

  if (playerHealth === 0 && !gameState.is('failure')) {
    gameState.setState('failure');
  }
}

gameState.onChange((state) => {
  if (state === 'menu') {
    hud.showMessage('Click to lock pointer and deploy to the oil rig.');
  }
  if (state === 'in-game') {
    hud.setObjective('Survive and reach the drill shaft');
  }
  if (state === 'paused') {
    hud.showMessage('Paused. Click to resume operation.');
  }
  if (state === 'success') {
    hud.showMessage('Rig stabilized. Mission successful.');
    hud.setObjective('Mission complete');
  }
  if (state === 'failure') {
    hud.showMessage('Rig failure detected. Mission failed.');
    hud.setObjective('Mission failed');
  }
});

gameState.setState('menu');

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
    if (gameState.is('in-game')) {
      gameState.setState('paused');
    }
    return;
  }

  if (gameState.is('menu')) {
    gameState.setState('in-game');
  } else if (gameState.is('paused')) {
    gameState.setState('in-game');
  }
});

document.addEventListener('pointerlockerror', () => {
  hud.showPointerLockError();
});

document.addEventListener('mousemove', (event) => {
  if (input.isPointerLocked() && (gameState.is('in-game') || gameState.is('paused'))) {
    player.look(event.movementX, event.movementY);
  }
});

document.addEventListener('mousedown', (event) => {
  if (
    event.button === 0 &&
    input.isPointerLocked() &&
    gameState.is('in-game') &&
    dropSequenceRemaining <= 0
  ) {
    shootingSystem.shoot();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.code !== 'F2') {
    return;
  }

  hitboxDebugVisible = !hitboxDebugVisible;
  oilRigMap.setHitboxDebugVisible(hitboxDebugVisible);
  hud.showMessage(
    `Hitbox debug: ${hitboxDebugVisible ? 'ON' : 'OFF'} (press F2 to toggle)`
  );
});

const clock = new THREE.Clock();

function updateDropSequence(delta) {
  if (dropSequenceRemaining <= 0) {
    return;
  }

  dropSequenceRemaining = Math.max(0, dropSequenceRemaining - delta);

  const progress = 1 - dropSequenceRemaining / 2;
  const startY = 24;
  const endY = player.playerHeight;
  camera.position.y = THREE.MathUtils.lerp(startY, endY, progress);

  hud.setObjective('Drop-in sequence...');

  if (dropSequenceRemaining === 0) {
    hud.setObjective('Survive and reach the drill shaft');
  }
}

function updateObjectiveFlow(delta) {
  drillObjective.update(camera.position);

  if (drillObjective.completed) {
    hud.setRepairProgress(false, 1, 'Drill shaft repaired');
    return;
  }

  const enemiesCleared = enemyManager.getAliveCount() === 0;
  const canRepair = drillObjective.isReached() && enemiesCleared;
  const isHoldingRepair = input.isPressed('KeyE');
  const completedRepair = repairInteraction.update(delta, isHoldingRepair, canRepair);

  if (canRepair) {
    hud.setObjective('Hold E to repair the drill shaft');
    hud.setRepairProgress(true, repairInteraction.getRatio(), 'Repairing drill shaft...');
  } else if (drillObjective.isReached() && !enemiesCleared) {
    hud.setObjective('Clear nearby Oil zombies before repair');
    hud.setRepairProgress(false, 0, 'Repair unavailable');
  } else if (enemiesCleared) {
    hud.setObjective('Reach the drill shaft and hold E to repair');
    hud.setRepairProgress(false, 0, 'Move to drill shaft');
  } else {
    hud.setObjective('Survive and reach the drill shaft');
    hud.setRepairProgress(false, 0, 'Move to drill shaft');
  }

  if (completedRepair) {
    drillObjective.complete();
    gameState.setState('success');
  }
}

function animate() {
  const delta = clock.getDelta();

  if (gameState.is('in-game')) {
    if (dropSequenceRemaining > 0) {
      updateDropSequence(delta);
    } else {
      player.update(delta);
      enemyManager.resolvePlayerCollision(camera.position);

      const dangerMultiplier = enemyManager.getAliveCount() > 0 ? 1.12 : 0.85;
      rigFailure.update(delta, dangerMultiplier);

      if (rigFailure.isFailed()) {
        gameState.setState('failure');
      }

      const damageTaken = enemyManager.update(delta, camera.position);
      if (damageTaken > 0 && playerHealth > 0) {
        applyDamage(damageTaken);
      }

      updateObjectiveFlow(delta);
    }
  }

  oilRigMap.update(delta);
  shootingSystem.update(delta, player.gravity);
  enemyManager.updateUi(camera);

  hud.updateFps(delta);
  hud.setInputDebug(input.getPressedKeysText(), enemyManager.getAliveCount());
  hud.updateDamageFlash(delta);
  hud.updateDrillMarker(oilRigMap.getDrillPosition(), camera, camera.position);
  hud.setRigFailure(rigFailure.remainingSeconds, rigFailure.getRatio());
  hud.setDrillDurability(rigFailure.getRatio() * maxDrillDurability, maxDrillDurability);
  hud.updateDrillDurabilityAnchor(oilRigMap.getDrillPosition(), camera);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);
animate();
