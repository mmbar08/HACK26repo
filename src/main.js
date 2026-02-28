import * as THREE from 'three';
import { OilRigMap } from './scene/maps/OilRigMap.js';
import { InputManager } from './input/InputManager.js';
import { PlayerController } from './player/PlayerController.js';
import { EnemyManager } from './enemies/EnemyManager.js';
import { OilZombieSpawner } from './enemies/oilZombie/OilZombieSpawner.js';
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
scene.fog = new THREE.Fog(0x0b0f14, 18, 95);
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(
  80,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

const oilRigMap = new OilRigMap(scene);
await oilRigMap.initialize();
const hud = new HUDManager();
const input = new InputManager(renderer.domElement);
const player = new PlayerController(camera, input, oilRigMap);
const gameState = new GameStateMachine();

const oilZombieSpawner = new OilZombieSpawner(oilRigMap);
const levelConfigs = [
  {
    name: 'Open Deck',
    enemyCount: 8,
    map: {
      hasWallsRoof: false,
    },
  },
  {
    name: 'Containment Ring',
    enemyCount: 10,
    map: {
      hasWallsRoof: true,
    },
  },
  {
    name: 'Final Pressure',
    enemyCount: 12,
    map: {
      hasWallsRoof: true,
    },
  },
];
let currentLevelIndex = 0;

oilRigMap.applyLevelConfig(levelConfigs[currentLevelIndex].map);

const enemySpawnConfigs = oilZombieSpawner.spawn(levelConfigs[currentLevelIndex].enemyCount, {
  playerPosition: { x: camera.position.x, z: camera.position.z },
  minDistanceFromPlayer: 24,
});

const enemyManager = new EnemyManager(scene, hud, enemySpawnConfigs, 0.55, oilRigMap);
const shootingSystem = new ShootingSystem(scene, camera, enemyManager, oilRigMap);
const maxEnemyRangedRadius = enemySpawnConfigs.reduce(
  (maxRadius, config) => Math.max(maxRadius, config.rangedAttackRadius ?? 16),
  16
);
shootingSystem.maxLaserRange = maxEnemyRangedRadius + 2.6;
shootingSystem.maxLaserRange *= 1.2;
const rigFailure = new RigFailureSystem(360);
const drillObjective = new DrillShaftObjective(oilRigMap.getDrillPosition(), 4.2);
const repairInteraction = new RepairInteraction(4.5);
const maxDrillDurability = 100;
const respawnPosition = new THREE.Vector3(0, player.playerHeight, 10);

let playerHealth = maxPlayerHealth;
let dropSequenceRemaining = 2;
let hitboxDebugVisible = true;
let failureReasonText = 'Operator down.';
let deathAnimationTime = 0;
let deathAnimationStarted = false;
const deathAnimationDuration = 1.1;
const deathSimulationDuration = 2.5;
let deathSimulationRemaining = 0;
let cameraShakeStrength = 0;
let cameraShakeTime = 0;
let appliedShakePitch = 0;
let appliedShakeRoll = 0;

oilRigMap.setHitboxDebugVisible(hitboxDebugVisible);
hud.showMessage('Hitbox debug: ON (press F2 to toggle)');

hud.setHealth(playerHealth, maxPlayerHealth);
hud.setObjective('Drop into the oil rig');
hud.setLevelStatus(currentLevelIndex + 1, levelConfigs.length);
hud.setDrillDurability(maxDrillDurability, maxDrillDurability);
hud.setDeathDim(0);
hud.setWeaponCooldown(0);

function createEnemySpawnSet(playerPos) {
  const levelConfig = levelConfigs[currentLevelIndex] ?? levelConfigs[0];
  return oilZombieSpawner.spawn(levelConfig.enemyCount, {
    playerPosition: { x: playerPos.x, z: playerPos.z },
    minDistanceFromPlayer: 24,
  });
}

function getLevelLabel(index = currentLevelIndex) {
  return `Level ${index + 1}: ${levelConfigs[index].name}`;
}

function applyCurrentLevelConfig() {
  oilRigMap.applyLevelConfig(levelConfigs[currentLevelIndex].map);
}

function advanceLevel() {
  if (currentLevelIndex >= levelConfigs.length - 1) {
    gameState.setState('success');
    return;
  }

  currentLevelIndex += 1;
  applyCurrentLevelConfig();
  rigFailure.reset();
  repairInteraction.reset();
  drillObjective.reset();

  const spawnSet = createEnemySpawnSet(respawnPosition);
  enemyManager.reset(spawnSet);

  player.respawn(respawnPosition.x, respawnPosition.z, Math.PI, 0);
  dropSequenceRemaining = 1.4;
  hud.setLevelStatus(currentLevelIndex + 1, levelConfigs.length);
  hud.showMessage(`${getLevelLabel()} deployed.`);
  hud.setObjective('Drop into the oil rig');
}

function beginFailureSequence(reasonText) {
  failureReasonText = reasonText;
  deathAnimationTime = 0;
  deathAnimationStarted = false;
  deathSimulationRemaining = deathSimulationDuration;
  gameState.setState('failure');
}

function respawnGame() {
  applyCurrentLevelConfig();
  rigFailure.reset();
  repairInteraction.reset();
  drillObjective.reset();

  playerHealth = maxPlayerHealth;
  hud.setHealth(playerHealth, maxPlayerHealth);
  hud.setLevelStatus(currentLevelIndex + 1, levelConfigs.length);
  hud.setObjective('Drop into the oil rig');
  hud.setRepairProgress(false, 0, 'Move to drill shaft');
  hud.setRigFailure(rigFailure.remainingSeconds, rigFailure.getRatio());
  hud.setDrillDurability(maxDrillDurability, maxDrillDurability);

  const spawnSet = createEnemySpawnSet(respawnPosition);
  enemyManager.reset(spawnSet);

  cameraShakeStrength = 0;
  cameraShakeTime = 0;
  appliedShakePitch = 0;
  appliedShakeRoll = 0;
  deathAnimationStarted = false;
  deathAnimationTime = 0;
  deathSimulationRemaining = 0;

  player.respawn(respawnPosition.x, respawnPosition.z, Math.PI, 0);
  dropSequenceRemaining = 2;
  hud.hideDeathScreen();
  hud.setDeathDim(0);
  gameState.setState('in-game');
  input.requestPointerLock();
}

function applyDamage(amount) {
  playerHealth = Math.max(0, playerHealth - amount);
  hud.setHealth(playerHealth, maxPlayerHealth);
  hud.triggerDamageFlash(amount / 40);
  hud.triggerHitBorder(amount / 32);
  cameraShakeStrength = Math.min(1, cameraShakeStrength + amount / 46);

  const hitOrigin = camera.position.clone().add(new THREE.Vector3(0, -0.15, 0));
  shootingSystem.spawnPlayerHitParticles(hitOrigin);

  if (playerHealth === 0 && !gameState.is('failure')) {
    beginFailureSequence('You were overwhelmed by hostile oil creatures.');
  }
}

gameState.onChange((state) => {
  if (state === 'menu') {
    hud.showMessage('Click to lock pointer and deploy to the oil rig.');
  }
  if (state === 'in-game') {
    hud.setObjective(`${getLevelLabel()} - Survive and reach the drill shaft`);
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
    hud.showDeathScreen(failureReasonText);
    document.exitPointerLock?.();
  }
});

gameState.setState('menu');
hud.showMessage(`${getLevelLabel()} ready. Click to deploy.`);

renderer.domElement.addEventListener('click', () => {
  input.requestPointerLock();
});

hud.onStartClick(() => {
  input.requestPointerLock();
});

hud.onRespawnClick(() => {
  respawnGame();
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
  if (event.code !== 'F2' && event.code !== 'F3') {
    return;
  }

  if (event.code === 'F3') {
    const nextVisible = !oilRigMap.invisibleBlockerDebugVisible;
    oilRigMap.setInvisibleBlockerDebugVisible(nextVisible);
    const report = oilRigMap.getInvisibleBlockerDebugReport();
    hud.showMessage(
      `Invisible blocker debug: ${nextVisible ? 'ON' : 'OFF'} | total=${report.total}, ramps=${report.ramps}, meshes=${report.raycastMeshes}`
    );
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

function updateObjectiveFlow() {
  const enemiesCleared = enemyManager.getAliveCount() === 0;
  hud.setRepairProgress(false, 0, 'Eliminate hostiles');

  if (enemiesCleared) {
    hud.setObjective('Hostiles cleared. Advancing level...');
    advanceLevel();
    return;
  }

  hud.setObjective(`${getLevelLabel()} - Eliminate all Oil zombies`);
}

function animate() {
  const delta = clock.getDelta();

  camera.rotation.x -= appliedShakePitch;
  camera.rotation.z -= appliedShakeRoll;
  appliedShakePitch = 0;
  appliedShakeRoll = 0;

  if (gameState.is('in-game')) {
    if (dropSequenceRemaining > 0) {
      updateDropSequence(delta);
    } else {
      player.update(delta);

      const dangerMultiplier = enemyManager.getAliveCount() > 0 ? 1.12 : 0.85;
      rigFailure.update(delta, dangerMultiplier);

      if (rigFailure.isFailed()) {
        beginFailureSequence('Rig stability dropped to zero.');
      }

      const damageTaken = enemyManager.update(delta, camera.position);
      if (damageTaken > 0 && playerHealth > 0) {
        applyDamage(damageTaken);
      }

      updateObjectiveFlow();
    }
  } else if (gameState.is('failure')) {
    if (!deathAnimationStarted) {
      deathAnimationStarted = true;
      deathAnimationTime = 0;
    }

    if (deathSimulationRemaining > 0) {
      enemyManager.update(delta, camera.position);
      deathSimulationRemaining = Math.max(0, deathSimulationRemaining - delta);
    }

    deathAnimationTime = Math.min(deathAnimationDuration, deathAnimationTime + delta);
    const t = THREE.MathUtils.smoothstep(deathAnimationTime / deathAnimationDuration, 0, 1);
    hud.setDeathDim(0.42 + t * 0.3);
  }

  if (gameState.is('in-game') && cameraShakeStrength > 0.0001) {
    cameraShakeTime += delta;
    const noisePitch = Math.sin(cameraShakeTime * 78) * 0.006 * cameraShakeStrength;
    const noiseRoll = Math.cos(cameraShakeTime * 64) * 0.0045 * cameraShakeStrength;
    const randomPitch = (Math.random() - 0.5) * 0.0032 * cameraShakeStrength;
    const randomRoll = (Math.random() - 0.5) * 0.0025 * cameraShakeStrength;
    appliedShakePitch = noisePitch + randomPitch;
    appliedShakeRoll = noiseRoll + randomRoll;
    camera.rotation.x += appliedShakePitch;
    camera.rotation.z += appliedShakeRoll;
    cameraShakeStrength = Math.max(0, cameraShakeStrength - delta * 2.9);
  } else {
    cameraShakeStrength = Math.max(0, cameraShakeStrength - delta * 3.8);
  }

  oilRigMap.update(delta);
  shootingSystem.update(delta, player.gravity);
  enemyManager.updateUi(camera);

  hud.updateFps(delta);
  hud.setInputDebug(input.getPressedKeysText(), enemyManager.getAliveCount());
  hud.setWeaponCooldown(shootingSystem.getCooldownRatio());
  hud.updateDamageFlash(delta);
  hud.updateHitBorder(delta);
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
