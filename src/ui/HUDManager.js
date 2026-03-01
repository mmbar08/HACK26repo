import * as THREE from 'three';

export class HUDManager {
  constructor() {
    this.fpsFrames = 0;
    this.fpsAccumulator = 0;
    this.damageFlashStrength = 0;
    this.hitBorderStrength = 0;
    this.clipSpaceVector = new THREE.Vector3();

    this.message = document.createElement('div');
    this.message.style.position = 'fixed';
    this.message.style.top = '12px';
    this.message.style.left = '12px';
    this.message.style.padding = '10px 12px';
    this.message.style.background = 'rgba(0, 0, 0, 0.45)';
    this.message.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.message.style.color = '#e6f4f1';
    this.message.style.fontFamily = 'system-ui, sans-serif';
    this.message.style.fontSize = '14px';
    this.message.style.lineHeight = '1.35';
    this.message.textContent =
      'Click to lock pointer | WASD move | Space jump | Mouse look | Left click shoot';
    document.body.appendChild(this.message);

    this.objectiveUi = document.createElement('div');
    this.objectiveUi.style.position = 'fixed';
    this.objectiveUi.style.left = '12px';
    this.objectiveUi.style.top = '84px';
    this.objectiveUi.style.padding = '8px 10px';
    this.objectiveUi.style.background = 'rgba(0, 0, 0, 0.45)';
    this.objectiveUi.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.objectiveUi.style.color = '#e6f4f1';
    this.objectiveUi.style.fontFamily = 'system-ui, sans-serif';
    this.objectiveUi.style.fontSize = '12px';
    this.objectiveUi.textContent = 'Objective: Reach the drill shaft';
    document.body.appendChild(this.objectiveUi);

    this.levelUi = document.createElement('div');
    this.levelUi.style.position = 'fixed';
    this.levelUi.style.left = '12px';
    this.levelUi.style.top = '54px';
    this.levelUi.style.padding = '7px 10px';
    this.levelUi.style.background = 'rgba(0, 0, 0, 0.45)';
    this.levelUi.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.levelUi.style.color = '#e6f4f1';
    this.levelUi.style.fontFamily = 'system-ui, sans-serif';
    this.levelUi.style.fontSize = '12px';
    this.levelUi.textContent = 'Level: 1/1';
    document.body.appendChild(this.levelUi);

    this.levelProgressUi = document.createElement('div');
    this.levelProgressUi.style.position = 'fixed';
    this.levelProgressUi.style.left = '50%';
    this.levelProgressUi.style.top = '12px';
    this.levelProgressUi.style.transform = 'translateX(-50%)';
    this.levelProgressUi.style.padding = '7px 10px';
    this.levelProgressUi.style.background = 'rgba(0, 0, 0, 0.45)';
    this.levelProgressUi.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.levelProgressUi.style.color = '#e6f4f1';
    this.levelProgressUi.style.fontFamily = 'system-ui, sans-serif';
    this.levelProgressUi.style.fontSize = '12px';

    this.levelProgressLabel = document.createElement('div');
    this.levelProgressLabel.style.marginBottom = '5px';
    this.levelProgressLabel.style.textAlign = 'center';
    this.levelProgressLabel.textContent = 'Enemies Killed: 0/0';

    const levelProgressTrack = document.createElement('div');
    levelProgressTrack.style.width = '260px';
    levelProgressTrack.style.height = '8px';
    levelProgressTrack.style.background = 'rgba(255, 255, 255, 0.2)';

    this.levelProgressFill = document.createElement('div');
    this.levelProgressFill.style.height = '100%';
    this.levelProgressFill.style.width = '0%';
    this.levelProgressFill.style.background = 'linear-gradient(90deg, #30b5ff 0%, #59f4ff 100%)';

    levelProgressTrack.appendChild(this.levelProgressFill);
    this.levelProgressUi.appendChild(this.levelProgressLabel);
    this.levelProgressUi.appendChild(levelProgressTrack);
    document.body.appendChild(this.levelProgressUi);

    this.rigRiskUi = document.createElement('div');
    this.rigRiskUi.style.position = 'fixed';
    this.rigRiskUi.style.left = '12px';
    this.rigRiskUi.style.top = '124px';
    this.rigRiskUi.style.padding = '8px 10px';
    this.rigRiskUi.style.background = 'rgba(0, 0, 0, 0.45)';
    this.rigRiskUi.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.rigRiskUi.style.color = '#e6f4f1';
    this.rigRiskUi.style.fontFamily = 'system-ui, sans-serif';
    this.rigRiskUi.style.fontSize = '12px';

    this.rigRiskLabel = document.createElement('div');
    this.rigRiskLabel.style.marginBottom = '6px';
    this.rigRiskLabel.textContent = 'Drill Durability: 100% | 00:00';

    const rigRiskTrack = document.createElement('div');
    rigRiskTrack.style.width = '210px';
    rigRiskTrack.style.height = '10px';
    rigRiskTrack.style.background = 'rgba(255, 255, 255, 0.2)';
    rigRiskTrack.style.border = '1px solid rgba(255, 255, 255, 0.2)';

    this.rigRiskFill = document.createElement('div');
    this.rigRiskFill.style.height = '100%';
    this.rigRiskFill.style.width = '100%';
    this.rigRiskFill.style.background =
      'linear-gradient(90deg, #db4646 0%, #f4d03f 50%, #2dc778 100%)';

    rigRiskTrack.appendChild(this.rigRiskFill);
    this.rigRiskUi.appendChild(this.rigRiskLabel);
    this.rigRiskUi.appendChild(rigRiskTrack);
    document.body.appendChild(this.rigRiskUi);

    this.repairUi = document.createElement('div');
    this.repairUi.style.position = 'fixed';
    this.repairUi.style.left = '50%';
    this.repairUi.style.bottom = '90px';
    this.repairUi.style.transform = 'translateX(-50%)';
    this.repairUi.style.padding = '8px 10px';
    this.repairUi.style.background = 'rgba(0, 0, 0, 0.45)';
    this.repairUi.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.repairUi.style.color = '#e6f4f1';
    this.repairUi.style.fontFamily = 'system-ui, sans-serif';
    this.repairUi.style.fontSize = '12px';
    this.repairUi.style.display = 'none';

    this.repairLabel = document.createElement('div');
    this.repairLabel.style.marginBottom = '6px';
    this.repairLabel.textContent = 'Hold R to repair drill shaft';

    const repairTrack = document.createElement('div');
    repairTrack.style.width = '220px';
    repairTrack.style.height = '10px';
    repairTrack.style.background = 'rgba(255, 255, 255, 0.2)';
    repairTrack.style.border = '1px solid rgba(255, 255, 255, 0.2)';

    this.repairFill = document.createElement('div');
    this.repairFill.style.height = '100%';
    this.repairFill.style.width = '0%';
    this.repairFill.style.background = 'linear-gradient(90deg, #3aa7ff 0%, #78f0ff 100%)';

    repairTrack.appendChild(this.repairFill);
    this.repairUi.appendChild(this.repairLabel);
    this.repairUi.appendChild(repairTrack);
    document.body.appendChild(this.repairUi);

    this.fpsCounter = document.createElement('div');
    this.fpsCounter.style.position = 'fixed';
    this.fpsCounter.style.top = '12px';
    this.fpsCounter.style.right = '12px';
    this.fpsCounter.style.padding = '8px 10px';
    this.fpsCounter.style.background = 'rgba(0, 0, 0, 0.45)';
    this.fpsCounter.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.fpsCounter.style.color = '#e6f4f1';
    this.fpsCounter.style.fontFamily = 'system-ui, sans-serif';
    this.fpsCounter.style.fontSize = '13px';
    this.fpsCounter.textContent = 'FPS: --';
    document.body.appendChild(this.fpsCounter);

    this.crosshair = document.createElement('div');
    this.crosshair.style.position = 'fixed';
    this.crosshair.style.left = '50%';
    this.crosshair.style.top = '50%';
    this.crosshair.style.transform = 'translate(-50%, -50%)';
    this.crosshair.style.color = '#ffffff';
    this.crosshair.style.fontFamily = 'monospace';
    this.crosshair.style.fontSize = '20px';
    this.crosshair.style.userSelect = 'none';
    this.crosshair.textContent = '+';
    document.body.appendChild(this.crosshair);

    this.weaponCooldownUi = document.createElement('div');
    this.weaponCooldownUi.style.position = 'fixed';
    this.weaponCooldownUi.style.left = '50%';
    this.weaponCooldownUi.style.bottom = '56px';
    this.weaponCooldownUi.style.transform = 'translateX(-50%)';
    this.weaponCooldownUi.style.padding = '6px 8px';
    this.weaponCooldownUi.style.background = 'rgba(0, 0, 0, 0.42)';
    this.weaponCooldownUi.style.color = '#dff3ed';
    this.weaponCooldownUi.style.fontFamily = 'system-ui, sans-serif';
    this.weaponCooldownUi.style.fontSize = '11px';

    this.weaponCooldownLabel = document.createElement('div');
    this.weaponCooldownLabel.style.marginBottom = '4px';
    this.weaponCooldownLabel.textContent = 'Laser: READY';

    const weaponCooldownTrack = document.createElement('div');
    weaponCooldownTrack.style.width = '150px';
    weaponCooldownTrack.style.height = '7px';
    weaponCooldownTrack.style.background = 'rgba(255, 255, 255, 0.16)';

    this.weaponCooldownFill = document.createElement('div');
    this.weaponCooldownFill.style.height = '100%';
    this.weaponCooldownFill.style.width = '0%';
    this.weaponCooldownFill.style.background = 'linear-gradient(90deg, #ff664d 0%, #ffd86b 100%)';

    weaponCooldownTrack.appendChild(this.weaponCooldownFill);
    this.weaponCooldownUi.appendChild(this.weaponCooldownLabel);
    this.weaponCooldownUi.appendChild(weaponCooldownTrack);
    document.body.appendChild(this.weaponCooldownUi);

    this.inputDebug = document.createElement('div');
    this.inputDebug.style.position = 'fixed';
    this.inputDebug.style.left = '12px';
    this.inputDebug.style.bottom = '12px';
    this.inputDebug.style.padding = '6px 8px';
    this.inputDebug.style.background = 'rgba(0, 0, 0, 0.45)';
    this.inputDebug.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.inputDebug.style.color = '#e6f4f1';
    this.inputDebug.style.fontFamily = 'system-ui, sans-serif';
    this.inputDebug.style.fontSize = '12px';
    this.inputDebug.textContent = 'Keys: none';
    document.body.appendChild(this.inputDebug);

    this.healthUi = document.createElement('div');
    this.healthUi.style.position = 'fixed';
    this.healthUi.style.right = '12px';
    this.healthUi.style.bottom = '12px';
    this.healthUi.style.padding = '8px';
    this.healthUi.style.background = 'rgba(0, 0, 0, 0.45)';
    this.healthUi.style.width = '220px';
    this.healthUi.style.fontFamily = 'system-ui, sans-serif';
    this.healthUi.style.fontSize = '12px';
    this.healthUi.style.color = '#e6f4f1';

    this.healthLabel = document.createElement('div');
    this.healthLabel.style.marginBottom = '6px';
    this.healthLabel.textContent = 'Health: 100';

    const healthTrack = document.createElement('div');
    healthTrack.style.width = '100%';
    healthTrack.style.height = '14px';
    healthTrack.style.background = 'rgba(255, 255, 255, 0.2)';

    this.healthFill = document.createElement('div');
    this.healthFill.style.height = '100%';
    this.healthFill.style.width = '100%';
    this.healthFill.style.background =
      'linear-gradient(90deg, #23c06f 0%, #f4d03f 65%, #d53f3f 100%)';

    healthTrack.appendChild(this.healthFill);
    this.healthUi.appendChild(this.healthLabel);
    this.healthUi.appendChild(healthTrack);
    document.body.appendChild(this.healthUi);

    this.drillMarker = document.createElement('div');
    this.drillMarker.style.position = 'fixed';
    this.drillMarker.style.left = '50%';
    this.drillMarker.style.top = '18%';
    this.drillMarker.style.transform = 'translate(-50%, -50%)';
    this.drillMarker.style.padding = '6px 10px';
    this.drillMarker.style.background = 'rgba(0, 0, 0, 0.45)';
    this.drillMarker.style.border = '1px solid rgba(255, 255, 255, 0.28)';
    this.drillMarker.style.color = '#e6f4f1';
    this.drillMarker.style.fontFamily = 'system-ui, sans-serif';
    this.drillMarker.style.fontSize = '12px';
    this.drillMarker.style.pointerEvents = 'none';
    this.drillMarker.style.display = 'none';
    this.drillMarker.textContent = 'DRILL SHAFT';
    document.body.appendChild(this.drillMarker);

    this.damageFlash = document.createElement('div');
    this.damageFlash.style.position = 'fixed';
    this.damageFlash.style.inset = '0';
    this.damageFlash.style.pointerEvents = 'none';
    this.damageFlash.style.background = 'rgba(255, 50, 50, 0)';
    document.body.appendChild(this.damageFlash);

    this.hitBorder = document.createElement('div');
    this.hitBorder.style.position = 'fixed';
    this.hitBorder.style.inset = '0';
    this.hitBorder.style.pointerEvents = 'none';
    this.hitBorder.style.border = '0 solid rgba(220, 30, 30, 0)';
    this.hitBorder.style.boxSizing = 'border-box';
    document.body.appendChild(this.hitBorder);

    this.lockHint = document.createElement('div');
    this.lockHint.style.position = 'fixed';
    this.lockHint.style.inset = '0';
    this.lockHint.style.display = 'grid';
    this.lockHint.style.placeItems = 'center';
    this.lockHint.style.background = 'rgba(7, 12, 16, 0.6)';
    this.lockHint.style.color = '#dff3ed';
    this.lockHint.style.fontFamily = 'system-ui, sans-serif';
    this.lockHint.style.fontSize = '20px';
    this.lockHint.style.textAlign = 'center';
    this.lockHint.style.cursor = 'pointer';
    this.lockHint.innerHTML = 'Click to enter FPS controls<br/>ESC to unlock cursor';
    document.body.appendChild(this.lockHint);

    this.deathOverlay = document.createElement('div');
    this.deathOverlay.style.position = 'fixed';
    this.deathOverlay.style.inset = '0';
    this.deathOverlay.style.display = 'none';
    this.deathOverlay.style.pointerEvents = 'none';
    this.deathOverlay.style.background = 'rgba(5, 8, 12, 0.55)';
    this.deathOverlay.style.zIndex = '20';

    this.deathPanel = document.createElement('div');
    this.deathPanel.style.position = 'fixed';
    this.deathPanel.style.left = '50%';
    this.deathPanel.style.top = '50%';
    this.deathPanel.style.transform = 'translate(-50%, -50%)';
    this.deathPanel.style.padding = '20px 24px';
    this.deathPanel.style.background = 'rgba(10, 14, 20, 0.88)';
    this.deathPanel.style.border = '1px solid rgba(255, 255, 255, 0.28)';
    this.deathPanel.style.boxShadow = '0 10px 35px rgba(0, 0, 0, 0.45)';
    this.deathPanel.style.textAlign = 'center';
    this.deathPanel.style.pointerEvents = 'auto';

    this.deathTitle = document.createElement('div');
    this.deathTitle.style.fontFamily = 'system-ui, sans-serif';
    this.deathTitle.style.fontSize = '28px';
    this.deathTitle.style.fontWeight = '700';
    this.deathTitle.style.color = '#ffb3b3';
    this.deathTitle.style.marginBottom = '8px';
    this.deathTitle.textContent = 'MISSION FAILED';

    this.deathReason = document.createElement('div');
    this.deathReason.style.fontFamily = 'system-ui, sans-serif';
    this.deathReason.style.fontSize = '14px';
    this.deathReason.style.color = '#e6f4f1';
    this.deathReason.style.marginBottom = '16px';
    this.deathReason.textContent = 'Critical system failure.';

    this.respawnButton = document.createElement('button');
    this.respawnButton.type = 'button';
    this.respawnButton.textContent = 'Respawn';
    this.respawnButton.style.padding = '9px 16px';
    this.respawnButton.style.fontFamily = 'system-ui, sans-serif';
    this.respawnButton.style.fontSize = '14px';
    this.respawnButton.style.border = '1px solid rgba(130, 215, 255, 0.7)';
    this.respawnButton.style.background = 'rgba(40, 120, 180, 0.35)';
    this.respawnButton.style.color = '#dff7ff';
    this.respawnButton.style.cursor = 'pointer';

    this.deathPanel.appendChild(this.deathTitle);
    this.deathPanel.appendChild(this.deathReason);
    this.deathPanel.appendChild(this.respawnButton);
    this.deathOverlay.appendChild(this.deathPanel);
    document.body.appendChild(this.deathOverlay);

    this.levelClearOverlay = document.createElement('div');
    this.levelClearOverlay.style.position = 'fixed';
    this.levelClearOverlay.style.inset = '0';
    this.levelClearOverlay.style.display = 'none';
    this.levelClearOverlay.style.pointerEvents = 'none';
    this.levelClearOverlay.style.background = 'rgba(4, 10, 16, 0.42)';
    this.levelClearOverlay.style.zIndex = '15';

    this.levelClearText = document.createElement('div');
    this.levelClearText.style.position = 'fixed';
    this.levelClearText.style.left = '50%';
    this.levelClearText.style.top = '50%';
    this.levelClearText.style.transform = 'translate(-50%, -50%)';
    this.levelClearText.style.padding = '14px 18px';
    this.levelClearText.style.border = '1px solid rgba(163, 223, 255, 0.55)';
    this.levelClearText.style.background = 'rgba(6, 18, 26, 0.86)';
    this.levelClearText.style.color = '#e5f5ff';
    this.levelClearText.style.fontFamily = 'system-ui, sans-serif';
    this.levelClearText.style.fontSize = '34px';
    this.levelClearText.style.fontWeight = '700';
    this.levelClearText.style.letterSpacing = '0.04em';
    this.levelClearText.textContent = 'LEVEL CLEARED';

    this.levelClearOverlay.appendChild(this.levelClearText);
    document.body.appendChild(this.levelClearOverlay);
  }

  onStartClick(handler) {
    this.lockHint.addEventListener('click', handler);
  }

  onRespawnClick(handler) {
    this.respawnButton.addEventListener('click', handler);
  }

  setLockState(isLocked) {
    this.lockHint.style.display = isLocked ? 'none' : 'grid';
    this.message.style.display = isLocked ? 'none' : 'block';
  }

  showPointerLockError() {
    this.lockHint.innerHTML = 'Pointer lock was blocked.<br/>Click again on the game view.';
  }

  setHealth(current, max) {
    const percent = (current / max) * 100;
    this.healthFill.style.width = `${Math.max(0, percent)}%`;
    this.healthLabel.textContent = `Health: ${Math.ceil(current)}`;
  }

  setObjective(text) {
    this.objectiveUi.textContent = `Objective: ${text}`;
  }

  setLevelStatus(currentLevel, totalLevels) {
    this.levelUi.textContent = `Level: ${currentLevel}/${totalLevels}`;
  }

  setLevelProgress(ratio, text = null) {
    const clamped = THREE.MathUtils.clamp(ratio, 0, 1);
    this.levelProgressFill.style.width = `${Math.round(clamped * 100)}%`;
    this.levelProgressLabel.textContent = text ?? `Enemies Killed: ${Math.round(clamped * 100)}%`;
  }

  setRigFailure(remainingSeconds, ratio) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    const stabilityPercent = Math.round(Math.max(0, ratio) * 100);
    this.rigRiskLabel.textContent = `Drill Durability: ${stabilityPercent}% | ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this.rigRiskFill.style.width = `${stabilityPercent}%`;
  }

  setRepairProgress(visible, ratio, text) {
    this.repairUi.style.display = visible ? 'block' : 'none';
    this.repairLabel.textContent = text;
    this.repairFill.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
  }

  triggerDamageFlash(normalizedAmount) {
    this.damageFlashStrength = Math.min(1, this.damageFlashStrength + normalizedAmount);
  }

  updateDamageFlash(delta) {
    this.damageFlashStrength = Math.max(0, this.damageFlashStrength - delta * 2.2);
    this.damageFlash.style.background = `rgba(255, 46, 46, ${this.damageFlashStrength * 0.42})`;
  }

  triggerHitBorder(normalizedAmount) {
    this.hitBorderStrength = Math.min(1, this.hitBorderStrength + normalizedAmount);
  }

  updateHitBorder(delta) {
    this.hitBorderStrength = Math.max(0, this.hitBorderStrength - delta * 2.6);
    const alpha = this.hitBorderStrength * 0.58;
    const width = 7 + this.hitBorderStrength * 14;
    this.hitBorder.style.border = `${width}px solid rgba(220, 30, 30, ${alpha})`;
  }

  updateFps(delta) {
    this.fpsFrames += 1;
    this.fpsAccumulator += delta;

    if (this.fpsAccumulator >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsAccumulator);
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.fpsFrames = 0;
      this.fpsAccumulator = 0;
    }
  }

  setInputDebug(pressedKeysText, aliveEnemies) {
    this.inputDebug.textContent = `Keys: ${pressedKeysText} | Enemies: ${aliveEnemies}`;
  }

  setWeaponCooldown(cooldownRatio) {
    const ratio = THREE.MathUtils.clamp(cooldownRatio, 0, 1);
    this.weaponCooldownFill.style.width = `${Math.round(ratio * 100)}%`;
    this.weaponCooldownLabel.textContent = ratio > 0.02 ? 'Laser: COOLING' : 'Laser: READY';
  }

  updateDrillMarker(drillPosition, camera, cameraPosition) {
    this.clipSpaceVector.copy(drillPosition).project(camera);
    const distance = cameraPosition.distanceTo(drillPosition);
    const visible = this.clipSpaceVector.z >= -1 && this.clipSpaceVector.z <= 1;

    if (visible) {
      const x = (this.clipSpaceVector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-this.clipSpaceVector.y * 0.5 + 0.5) * window.innerHeight;
      this.drillMarker.style.left = `${THREE.MathUtils.clamp(x, 40, window.innerWidth - 40)}px`;
      this.drillMarker.style.top = `${THREE.MathUtils.clamp(y - 30, 30, window.innerHeight - 30)}px`;
      this.drillMarker.textContent = `⬤ DRILL SHAFT ${Math.round(distance)}m`;
    } else {
      this.drillMarker.style.left = '50%';
      this.drillMarker.style.top = '16%';
      this.drillMarker.textContent = `▲ DRILL SHAFT ${Math.round(distance)}m`;
    }
  }

  setDrillMarkerVisible(visible) {
    this.drillMarker.style.display = visible ? 'block' : 'none';
  }

  showMessage(text) {
    this.message.style.display = 'block';
    this.message.textContent = text;
  }

  showDeathScreen(reasonText = 'Operator incapacitated.') {
    this.deathReason.textContent = reasonText;
    this.deathOverlay.style.display = 'block';
    this.deathOverlay.style.pointerEvents = 'auto';
  }

  hideDeathScreen() {
    this.deathOverlay.style.display = 'none';
    this.deathOverlay.style.pointerEvents = 'none';
  }

  setDeathDim(amount) {
    const alpha = THREE.MathUtils.clamp(amount, 0, 0.85);
    this.deathOverlay.style.background = `rgba(5, 8, 12, ${alpha})`;
  }

  showLevelClearScreen(text = 'LEVEL CLEARED') {
    this.levelClearText.textContent = text;
    this.levelClearOverlay.style.display = 'block';
  }

  hideLevelClearScreen() {
    this.levelClearOverlay.style.display = 'none';
  }
}
