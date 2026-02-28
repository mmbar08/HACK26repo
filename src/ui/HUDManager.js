import * as THREE from 'three';

export class HUDManager {
  constructor() {
    this.fpsFrames = 0;
    this.fpsAccumulator = 0;
    this.damageFlashStrength = 0;
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
    this.healthUi.style.border = '1px solid rgba(255, 255, 255, 0.2)';
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
    healthTrack.style.border = '1px solid rgba(255, 255, 255, 0.25)';

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
    this.drillMarker.textContent = 'DRILL SHAFT';
    document.body.appendChild(this.drillMarker);

    this.damageFlash = document.createElement('div');
    this.damageFlash.style.position = 'fixed';
    this.damageFlash.style.inset = '0';
    this.damageFlash.style.pointerEvents = 'none';
    this.damageFlash.style.background = 'rgba(255, 50, 50, 0)';
    document.body.appendChild(this.damageFlash);

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
  }

  onStartClick(handler) {
    this.lockHint.addEventListener('click', handler);
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

  triggerDamageFlash(normalizedAmount) {
    this.damageFlashStrength = Math.min(1, this.damageFlashStrength + normalizedAmount);
  }

  updateDamageFlash(delta) {
    this.damageFlashStrength = Math.max(0, this.damageFlashStrength - delta * 2.2);
    this.damageFlash.style.background = `rgba(255, 50, 50, ${this.damageFlashStrength * 0.25})`;
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

  showMessage(text) {
    this.message.style.display = 'block';
    this.message.textContent = text;
  }
}
