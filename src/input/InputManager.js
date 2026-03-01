export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;
    this.activeKeys = new Set();
    this.pointerLockCallbacks = [];

    this.gameplayCodes = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyR',
      'ShiftLeft',
      'Space',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ]);

    document.addEventListener('keydown', (event) => this.onKeyDown(event), {
      capture: true,
      passive: false,
    });
    document.addEventListener('keyup', (event) => this.onKeyUp(event), {
      capture: true,
      passive: false,
    });

    window.addEventListener('keydown', (event) => this.onKeyDown(event), {
      passive: false,
    });
    window.addEventListener('keyup', (event) => this.onKeyUp(event), {
      passive: false,
    });
    window.addEventListener('blur', () => this.resetInputState());

    document.addEventListener('pointerlockchange', () => {
      const isLocked = this.isPointerLocked();
      for (const callback of this.pointerLockCallbacks) {
        callback(isLocked);
      }
    });
  }

  requestPointerLock() {
    this.domElement.focus();
    this.domElement.requestPointerLock();
  }

  isPointerLocked() {
    return document.pointerLockElement === this.domElement;
  }

  onPointerLockStateChange(callback) {
    this.pointerLockCallbacks.push(callback);
  }

  isPressed(code) {
    return this.activeKeys.has(code);
  }

  isLogicalPressed(codes) {
    return codes.some((code) => this.isPressed(code));
  }

  getPressedKeysText() {
    return Array.from(this.activeKeys.values()).join(', ') || 'none';
  }

  resetInputState() {
    this.activeKeys.clear();
  }

  preventGameplayKeyScroll(event) {
    if (this.gameplayCodes.has(event.code)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  mapKeyToCode(event) {
    if (this.gameplayCodes.has(event.code)) {
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
    if (key === 'r') {
      return 'KeyR';
    }
    if (key === ' ') {
      return 'Space';
    }

    return null;
  }

  onKeyDown(event) {
    this.preventGameplayKeyScroll(event);
    const mappedCode = this.mapKeyToCode(event);
    if (mappedCode) {
      this.activeKeys.add(mappedCode);
    }
  }

  onKeyUp(event) {
    this.preventGameplayKeyScroll(event);
    const mappedCode = this.mapKeyToCode(event);
    if (mappedCode) {
      this.activeKeys.delete(mappedCode);
    }
  }
}
