# Project Structure (Modular Three.js FPS)

This structure is optimized for readability and easy feature extension.

## Folder Tree

```text
HACK26repo/
├─ docs/
│  ├─ PROJECT_REQUIREMENTS.md
│  └─ PROJECT_STRUCTURE.md
├─ public/
│  ├─ index.html
│  └─ assets/
│     ├─ audio/
│     ├─ models/
│     ├─ textures/
│     └─ ui/
├─ src/
│  ├─ main.js
│  ├─ config/
│  │  ├─ gameConfig.js
│  │  ├─ inputConfig.js
│  │  └─ balanceConfig.js
│  ├─ core/
│  │  ├─ Game.js
│  │  ├─ GameLoop.js
│  │  ├─ GameStateMachine.js
│  │  ├─ EventBus.js
│  │  └─ AssetLoader.js
│  ├─ scene/
│  │  ├─ SceneManager.js
│  │  ├─ lighting/
│  │  │  └─ rigLighting.js
│  │  └─ maps/
│  │     └─ OilRigMap.js
│  ├─ player/
│  │  ├─ PlayerController.js
│  │  ├─ PlayerEntity.js
│  │  ├─ PlayerHealth.js
│  │  └─ FirstPersonCamera.js
│  ├─ input/
│  │  ├─ InputManager.js
│  │  ├─ KeyboardInput.js
│  │  ├─ MouseLookInput.js
│  │  └─ PointerLockController.js
│  ├─ combat/
│  │  ├─ weapons/
│  │  │  ├─ WeaponBase.js
│  │  │  └─ RifleWeapon.js
│  │  ├─ ShootingSystem.js
│  │  ├─ DamageSystem.js
│  │  └─ ProjectileOrHitscan.js
│  ├─ enemies/
│  │  ├─ EnemyManager.js
│  │  ├─ oilZombie/
│  │  │  ├─ OilZombieEntity.js
│  │  │  ├─ OilZombieAI.js
│  │  │  └─ OilZombieSpawner.js
│  │  └─ shared/
│  │     ├─ EnemyHealth.js
│  │     └─ EnemyNavigation.js
│  ├─ objective/
│  │  ├─ RigFailureSystem.js
│  │  ├─ DrillShaftObjective.js
│  │  └─ RepairInteraction.js
│  ├─ ui/
│  │  ├─ HUDManager.js
│  │  ├─ overlays/
│  │  │  ├─StartOverlay.js
│  │  │  ├─ PauseOverlay.js
│  │  │  ├─ SuccessOverlay.js
│  │  │  └─ FailureOverlay.js
│  │  └─ widgets/
│  │     ├─ HealthBar.js
│  │     ├─ ObjectiveTracker.js
│  │     └─ RigRiskMeter.js
│  ├─ audio/
│  │  ├─ AudioManager.js
│  │  └─ cues/
│  │     ├─ ambience.js
│  │     ├─ combat.js
│  │     └─ objective.js
│  ├─ utils/
│  │  ├─ math.js
│  │  ├─ time.js
│  │  ├─ logger.js
│  │  └─ constants.js
│  └─ debug/
│     ├─ DebugOverlay.js
│     └─ DebugFlags.js
├─ tests/
│  ├─ unit/
│  └─ integration/
└─ README.md
```

## Module Responsibilities

- `core/`: game bootstrap, loop, and global state transitions.
- `scene/`: map composition, scene lifecycle, and lighting setup.
- `player/`: local player entity, health, movement, and camera behavior.
- `input/`: all keyboard/mouse capture and pointer-lock mechanics.
- `combat/`: weapon behavior, hit detection, and damage flow.
- `enemies/`: enemy lifecycle and AI, with per-enemy-type subfolders.
- `objective/`: mission logic (rig risk + drill shaft repair objective).
- `ui/`: HUD and overlays independent from gameplay internals.
- `audio/`: centralized SFX/music logic and cue grouping.
- `debug/`: development-only overlays and debug toggles.

## Extension Rules

1. New enemy type:
   - Add a new folder under `src/enemies/`.
   - Reuse shared enemy interfaces/contracts from `src/enemies/shared/`.
   - Register spawner in `EnemyManager`.
2. New weapon:
   - Implement from `WeaponBase` in `src/combat/weapons/`.
   - Register in player loadout config.
3. New objective step:
   - Add a dedicated module in `src/objective/`.
   - Trigger transitions through `GameStateMachine` and `EventBus`.
4. New map:
   - Add map module under `src/scene/maps/`.
   - Keep reusable prop builders separate from map scripts.

## Naming Conventions

- Files exporting classes use `PascalCase.js`.
- Utility/config files use `camelCase.js`.
- One primary class/object per file.
- Avoid cross-module imports that bypass top-level managers unless justified.

## Dependency Direction (Recommended)

- Lower-level modules (`utils`, `config`) should not depend on gameplay modules.
- Feature modules communicate via `EventBus` where possible.
- UI reads state via dedicated adapters/selectors rather than mutating gameplay state directly.
