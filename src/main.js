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
const healthRegenPerSecond = 1;
const shakeStrengthMultiplier = 1.6;
const dropStartHeight = 17;

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
    enemyCount: 6,
    spawnMaxDistanceFromCenter: 42,
    map: {
      hasWallsRoof: false,
      hasLightGrid: false,
      hasFire: false,
      useBlueSky: true,
      useGlobalLights: true,
      globalLightBoost: 1.35,
      hasDrillShaft: false,
    },
  },
  {
    name: 'Containment Ring',
    enemyCount: 8,
    spawnMaxDistanceFromCenter: 40,
    map: {
      hasWallsRoof: true,
      hasLightGrid: true,
      hasFire: true,
      useBlueSky: false,
      useGlobalLights: true,
      globalLightBoost: 1.95,
      hasDrillShaft: false,
    },
  },
  {
    name: 'Final Pressure',
    enemyCount: 10,
    spawnMaxDistanceFromCenter: 38,
    map: {
      hasWallsRoof: true,
      hasLightGrid: true,
      hasFire: true,
      useBlueSky: false,
      useGlobalLights: true,
      globalLightBoost: 0.42,
      hasDrillShaft: true,
      fireCountMultiplier: 0.62,
      fireNearDrillCount: 0,
      hasLargeDrillFire: true,
      largeDrillFireScale: 2.9,
    },
  },
];
let currentLevelIndex = 0;

oilRigMap.applyLevelConfig(levelConfigs[currentLevelIndex].map);
oilRigMap.regenerateLevelEnvironment();

const enemySpawnConfigs = oilZombieSpawner.spawn(levelConfigs[currentLevelIndex].enemyCount, {
  playerPosition: { x: camera.position.x, z: camera.position.z },
  minDistanceFromPlayer: 24,
  maxDistanceFromCenter: levelConfigs[currentLevelIndex].spawnMaxDistanceFromCenter,
});
let levelStartEnemyCount = Math.max(1, enemySpawnConfigs.length);

const enemyManager = new EnemyManager(scene, hud, enemySpawnConfigs, 0.55, oilRigMap);
const shootingSystem = new ShootingSystem(scene, camera, enemyManager, oilRigMap);
const maxEnemyRangedRadius = enemySpawnConfigs.reduce(
  (maxRadius, config) => Math.max(maxRadius, config.rangedAttackRadius ?? 16),
  16
);
shootingSystem.maxLaserRange = maxEnemyRangedRadius + 2.6;
shootingSystem.maxLaserRange *= 1.2;
const rigFailure = new RigFailureSystem(120);
const drillObjective = new DrillShaftObjective(oilRigMap.getDrillPosition(), 4.2);
const repairInteraction = new RepairInteraction(4.5);
const maxDrillDurability = 100;
const respawnPosition = new THREE.Vector3(0, player.playerHeight - 0.85, 10);

let playerHealth = maxPlayerHealth;
let dropSequenceRemaining = 2;
let hitboxDebugVisible = false;
let failureReasonText = 'Operator down.';
let deathAnimationTime = 0;
let deathAnimationStarted = false;
const deathAnimationDuration = 1.1;
const deathSimulationDuration = 2.5;
const levelClearDelaySeconds = 2;
let deathSimulationRemaining = 0;
let levelClearCountdown = 0;
let pendingLevelAdvance = false;
let cameraShakeStrength = 0;
let cameraShakeTime = 0;
let appliedShakePitch = 0;
let appliedShakeRoll = 0;

oilRigMap.setHitboxDebugVisible(hitboxDebugVisible);
hud.showMessage('Hitbox debug: OFF (press F2 to toggle)');

hud.setHealth(playerHealth, maxPlayerHealth);
hud.setObjective('Drop into the oil rig');
hud.setLevelStatus(currentLevelIndex + 1, levelConfigs.length);
hud.setDrillMarkerVisible(currentLevelIndex >= levelConfigs.length - 1);
hud.setDeathDim(0);
hud.setWeaponCooldown(0);

function refreshLevelProgressHud() {
  const aliveEnemies = enemyManager.getAliveCount();
  const defeatedEnemies = Math.max(0, levelStartEnemyCount - aliveEnemies);
  const ratio = levelStartEnemyCount > 0 ? defeatedEnemies / levelStartEnemyCount : 1;
  hud.setLevelProgress(ratio, `Enemies Killed: ${defeatedEnemies}/${levelStartEnemyCount}`);
}

refreshLevelProgressHud();

function createEnemySpawnSet(playerPos) {
  const levelConfig = levelConfigs[currentLevelIndex] ?? levelConfigs[0];
  return oilZombieSpawner.spawn(levelConfig.enemyCount, {
    playerPosition: { x: playerPos.x, z: playerPos.z },
    minDistanceFromPlayer: 24,
    maxDistanceFromCenter: levelConfig.spawnMaxDistanceFromCenter,
  });
}

function getLevelLabel(index = currentLevelIndex) {
  return `Level ${index + 1}: ${levelConfigs[index].name}`;
}

function applyCurrentLevelConfig() {
  oilRigMap.applyLevelConfig(levelConfigs[currentLevelIndex].map);
}

function switchToLevel(nextLevelIndex) {
  const clampedIndex = THREE.MathUtils.clamp(nextLevelIndex, 0, levelConfigs.length - 1);
  if (clampedIndex === currentLevelIndex) {
    return false;
  }

  currentLevelIndex = clampedIndex;
  applyCurrentLevelConfig();
  oilRigMap.regenerateLevelEnvironment();
  repairInteraction.reset();
  drillObjective.reset();

  const spawnSet = createEnemySpawnSet(respawnPosition);
  enemyManager.reset(spawnSet);
  levelStartEnemyCount = Math.max(1, spawnSet.length);

  player.respawn(respawnPosition.x, respawnPosition.z, Math.PI, 0);
  dropSequenceRemaining = 1.4;
  pendingLevelAdvance = false;
  levelClearCountdown = 0;
  hud.hideLevelClearScreen();
  hud.setLevelStatus(currentLevelIndex + 1, levelConfigs.length);
  hud.setDrillMarkerVisible(currentLevelIndex >= levelConfigs.length - 1);
  hud.showMessage(`${getLevelLabel()} deployed.`);
  hud.setObjective('Drop into the oil rig');
  refreshLevelProgressHud();
  return true;
}

function advanceLevel() {
  if (currentLevelIndex >= levelConfigs.length - 1) {
    gameState.setState('success');
    return;
  }

  switchToLevel(currentLevelIndex + 1);
}

function beginFailureSequence(reasonText) {
  failureReasonText = reasonText;
  deathAnimationTime = 0;
  deathAnimationStarted = false;
  deathSimulationRemaining = deathSimulationDuration;
  gameState.setState('failure');
}

function respawnGame() {
  currentLevelIndex = 0;
  applyCurrentLevelConfig();
  oilRigMap.regenerateLevelEnvironment();
  rigFailure.reset();
  repairInteraction.reset();
  drillObjective.reset();

  playerHealth = maxPlayerHealth;
  hud.setHealth(playerHealth, maxPlayerHealth);
  hud.setLevelStatus(currentLevelIndex + 1, levelConfigs.length);
  hud.setDrillMarkerVisible(currentLevelIndex >= levelConfigs.length - 1);
  hud.setObjective('Drop into the oil rig');
  hud.setRepairProgress(false, 0, 'Move to drill shaft');
  hud.setRigFailure(rigFailure.remainingSeconds, rigFailure.getRatio());

  const spawnSet = createEnemySpawnSet(respawnPosition);
  enemyManager.reset(spawnSet);
  levelStartEnemyCount = Math.max(1, spawnSet.length);

  cameraShakeStrength = 0;
  cameraShakeTime = 0;
  appliedShakePitch = 0;
  appliedShakeRoll = 0;
  deathAnimationStarted = false;
  deathAnimationTime = 0;
  deathSimulationRemaining = 0;
  pendingLevelAdvance = false;
  levelClearCountdown = 0;

  player.respawn(respawnPosition.x, respawnPosition.z, Math.PI, 0);
  dropSequenceRemaining = 2;
  hud.hideDeathScreen();
  hud.hideLevelClearScreen();
  hud.setDeathDim(0);
  refreshLevelProgressHud();
  gameState.setState('in-game');
  input.requestPointerLock();
}

function beginLevelClearTransition() {
  if (pendingLevelAdvance || currentLevelIndex >= levelConfigs.length - 1) {
    return;
  }

  pendingLevelAdvance = true;
  levelClearCountdown = levelClearDelaySeconds;
  hud.showLevelClearScreen(`${getLevelLabel()} CLEARED`);
  hud.setRepairProgress(false, 0, 'Preparing deployment...');
}

function updateLevelClearTransition(delta) {
  if (!pendingLevelAdvance) {
    return;
  }

  levelClearCountdown = Math.max(0, levelClearCountdown - delta);
  hud.setObjective(
    `Level cleared. Deploying to Level ${Math.min(levelConfigs.length, currentLevelIndex + 2)}...`
  );

  if (levelClearCountdown > 0) {
    return;
  }

  pendingLevelAdvance = false;
  hud.hideLevelClearScreen();
  switchToLevel(currentLevelIndex + 1);
}

function applyDamage(amount) {
  playerHealth = Math.max(0, playerHealth - amount);
  hud.setHealth(playerHealth, maxPlayerHealth);
  hud.triggerDamageFlash(amount / 20);
  hud.triggerHitBorder(amount / 32);
  cameraShakeStrength = Math.min(1, cameraShakeStrength + (amount / 24) * shakeStrengthMultiplier);

  const hitOrigin = camera.position.clone().add(new THREE.Vector3(0, -0.15, 0));
  shootingSystem.spawnPlayerHitParticles(hitOrigin);

  if (playerHealth === 0 && !gameState.is('failure')) {
    beginFailureSequence('You were overwhelmed by hostile oil creatures.');
  }
}

function applyHealthRegen(delta) {
  if (playerHealth <= 0 || playerHealth >= maxPlayerHealth) {
    return;
  }

  playerHealth = Math.min(maxPlayerHealth, playerHealth + healthRegenPerSecond * delta);
  hud.setHealth(playerHealth, maxPlayerHealth);
}

gameState.onChange((state) => {
  if (state === 'menu') {
    hud.hideLevelClearScreen();
    hud.showMessage('Click to lock pointer and deploy to the oil rig.');
  }
  if (state === 'in-game') {
    hud.hideLevelClearScreen();
    hud.setObjective(`${getLevelLabel()} - Survive and reach the drill shaft`);
  }
  if (state === 'paused') {
    hud.showMessage('Paused. Click to resume operation.');
  }
  if (state === 'success') {
    hud.showMessage('Rig stabilized. Mission successful.');
    hud.setObjective('Mission complete');
    hud.showLevelClearScreen('MISSION COMPLETE');
    document.exitPointerLock?.();
  }
  if (state === 'failure') {
    hud.hideLevelClearScreen();
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
    const didShoot = shootingSystem.shoot();
    if (didShoot) {
      cameraShakeStrength = Math.min(
        1,
        cameraShakeStrength + 0.09 * shakeStrengthMultiplier
      );
    }
  }
});

document.addEventListener('keydown', (event) => {
  const isLevelUpHotkey = event.code === 'Equal' || event.code === 'NumpadAdd';
  const isLevelDownHotkey = event.code === 'Minus' || event.code === 'NumpadSubtract';

  if (
    event.code !== 'F2' &&
    event.code !== 'F3' &&
    !isLevelUpHotkey &&
    !isLevelDownHotkey
  ) {
    return;
  }

  if (isLevelUpHotkey) {
    const changed = switchToLevel(currentLevelIndex + 1);
    if (!changed) {
      hud.showMessage(`Already at ${getLevelLabel()}.`);
    }
    return;
  }

  if (isLevelDownHotkey) {
    const changed = switchToLevel(currentLevelIndex - 1);
    if (!changed) {
      hud.showMessage(`Already at ${getLevelLabel()}.`);
    }
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
  const startY = dropStartHeight;
  const endY = player.playerHeight;
  camera.position.y = THREE.MathUtils.lerp(startY, endY, progress);

  hud.setObjective('Drop-in sequence...');

  if (dropSequenceRemaining === 0) {
    hud.setObjective('Survive and reach the drill shaft');
  }
}

function updateObjectiveFlow(delta) {
  const isFinalLevel = currentLevelIndex >= levelConfigs.length - 1;
  const enemiesCleared = enemyManager.getAliveCount() === 0;
  drillObjective.update(camera.position);

  if (pendingLevelAdvance) {
    hud.setRepairProgress(false, 0, 'Preparing deployment...');
    return;
  }

  if (!isFinalLevel) {
    hud.setRepairProgress(false, 0, 'Eliminate hostiles');

    if (enemiesCleared) {
      beginLevelClearTransition();
      return;
    }

    hud.setObjective(`${getLevelLabel()} - Eliminate all Oil zombies`);
    return;
  }

  if (drillObjective.completed) {
    hud.setRepairProgress(false, 1, 'Drill repaired');
    return;
  }

  if (!enemiesCleared) {
    hud.setObjective(`${getLevelLabel()} - Eliminate all Oil zombies`);
    hud.setRepairProgress(false, 0, 'Eliminate hostiles first');
    return;
  }

  const isAtDrill = drillObjective.isReached();
  const isHoldingRepair = input.isPressed('KeyR');
  const repairCompleted = repairInteraction.update(delta, isHoldingRepair, isAtDrill);

  if (isAtDrill) {
    hud.setObjective('Hold R to repair the drill shaft');
    hud.setRepairProgress(true, repairInteraction.getRatio(), 'Repairing drill shaft...');
  } else {
    hud.setObjective('Final level clear. Reach the drill shaft and hold R to repair');
    hud.setRepairProgress(false, 0, 'Move to drill shaft');
  }

  if (repairCompleted) {
    drillObjective.complete();
    hud.setRepairProgress(false, 1, 'Drill shaft repaired');
    gameState.setState('success');
  }
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
    } else if (pendingLevelAdvance) {
      updateLevelClearTransition(delta);
    } else {
      player.update(delta);

      const dangerMultiplier = enemyManager.getAliveCount() > 0 ? 1.12 : 0.85;
      rigFailure.update(delta, dangerMultiplier);

      if (rigFailure.isFailed()) {
        beginFailureSequence('Rig stability dropped to zero.');
      }

      const damageTaken = enemyManager.update(delta, camera.position);
      const deathEvents = enemyManager.consumeDeathEvents();
      for (const deathEvent of deathEvents) {
        cameraShakeStrength = Math.min(
          1,
          cameraShakeStrength + (deathEvent.shakeStrength ?? 0.12) * shakeStrengthMultiplier
        );
      }
      if (damageTaken > 0 && playerHealth > 0) {
        applyDamage(damageTaken);
      }

      applyHealthRegen(delta);

      updateObjectiveFlow(delta);
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
    const noisePitch =
      Math.sin(cameraShakeTime * 78) * 0.006 * cameraShakeStrength * shakeStrengthMultiplier;
    const noiseRoll =
      Math.cos(cameraShakeTime * 64) * 0.0045 * cameraShakeStrength * shakeStrengthMultiplier;
    const randomPitch =
      (Math.random() - 0.5) * 0.0032 * cameraShakeStrength * shakeStrengthMultiplier;
    const randomRoll =
      (Math.random() - 0.5) * 0.0025 * cameraShakeStrength * shakeStrengthMultiplier;
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
  refreshLevelProgressHud();
  hud.setWeaponCooldown(shootingSystem.getCooldownRatio());
  hud.updateDamageFlash(delta);
  hud.updateHitBorder(delta);
  if (oilRigMap.isDrillShaftEnabled()) {
    hud.updateDrillMarker(oilRigMap.getDrillPosition(), camera, camera.position);
  }
  hud.setRigFailure(rigFailure.remainingSeconds, rigFailure.getRatio());

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
