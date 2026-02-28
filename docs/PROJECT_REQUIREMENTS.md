# Sustainability FPS (Three.js) — Project Requirements

## 1) Vision and Core Loop

### Theme
- The game theme is **sustainability**.
- The setting is an offshore oil rig on the verge of catastrophic failure.
- The player’s objective is to contain the crisis, survive hostile "Oil zombies," and repair the drill shaft to prevent environmental disaster.

### Core Gameplay Loop
1. Spawn/drop into the oil rig.
2. Navigate rig sectors in first-person.
3. Engage and survive waves/patrols of Oil zombies.
4. Progress toward drill shaft via traversal and combat pressure.
5. Complete repair interaction at the drill shaft while under threat.
6. Trigger success state (rig stabilized) or fail state (player death / rig failure timer).

## 2) Game Pillars
- **Immersive first-person control**: responsive mouse look + keyboard movement.
- **Tense combat**: immediate left-click shooting against approaching enemies.
- **Environmental urgency**: visible/telegraphed rig failure pressure.
- **Sustainability narrative**: consequences of failure are ecological and explicit.

## 3) Target Platform and Technical Baseline
- Runtime: Modern desktop browsers.
- Engine stack: `three.js` (rendering/game world), standard web APIs.
- Module format: ES Modules.
- Input model: Mouse + keyboard.
- Camera: First-person perspective (Pointer Lock style controls).

## 4) Functional Requirements

### FR-1: Game Start and Intro Drop
- On start, player enters via a short “drop-in” sequence onto the oil rig map.
- Player control is granted immediately after drop sequence ends.
- Camera starts at a safe spawn point with view oriented toward mission-critical area.

### FR-2: Oil Rig Map
- At least one complete playable map representing an offshore oil rig.
- Required zones:
  - Spawn/drop zone
  - Combat corridors/platforms
  - Drill shaft chamber (mission objective location)
  - Optional shortcuts/chokepoints for tactical movement
- Map must include collision geometry and nav boundaries preventing out-of-bounds fall-through.

### FR-3: Enemy Type — Oil Zombies
- Oil zombies are the primary enemy class.
- Behavior requirements:
  - Detect player within configured aggro range or line-of-sight trigger.
  - Path toward player using simple navigation logic.
  - Attack player in close range with cooldown.
  - React to being shot (hit feedback, damage handling, death).
- Spawn behavior:
  - Initial seeded enemies at map start.
  - Additional enemies can spawn as player nears objective or over time.

### FR-4: Player First-Person Controls
- Mouse movement controls camera look (yaw + pitch with clamped vertical angle).
- Keyboard controls movement (`W/A/S/D`).
- Optional but recommended: sprint (`Shift`), jump (`Space`) if compatible with level design.
- Left mouse click fires current weapon.
- Control lock/unlock state is explicit (e.g., click-to-lock pointer, ESC to pause/unlock).

### FR-5: Weapon and Shooting
- Baseline weapon: single firearm with instant-hit raycast shooting.
- Shooting requirements:
  - Left-click triggers shot event.
  - Hit detection against enemy colliders.
  - Damage application and enemy death when health <= 0.
  - Fire-rate control (cooldown).
  - Basic audiovisual feedback (muzzle flash/sound/hit marker optional in MVP).

### FR-6: Player Health and Damage
- Player has finite health.
- Enemy attacks reduce health by configured amount.
- On health reaching 0: trigger loss state and restart/respawn flow.

### FR-7: Rig Failure Pressure
- Rig has a global “failure risk” model represented by timer and/or instability meter.
- Risk escalates over time and can escalate faster under defined conditions (e.g., prolonged delay).
- If risk reaches critical threshold before repair, mission fails.
- UI must communicate urgency clearly.

### FR-8: Objective — Reach and Fix Drill Shaft
- Player must physically reach drill shaft objective zone.
- Repair interaction requires explicit player action (e.g., hold `E` for N seconds).
- Interaction can be interrupted by movement/damage based on design tuning.
- On successful repair completion: win condition triggers and combat ends.

### FR-9: Game States
- Required states:
  - Main menu/start prompt
  - In-game active
  - Paused
  - Mission success
  - Mission failure
- State transitions are deterministic and centrally managed.

### FR-10: HUD and UI
- Minimum HUD elements:
  - Player health
  - Ammo or weapon readiness indicator
  - Rig failure timer/meter
  - Objective text/marker (“Reach drill shaft”, “Repair in progress”)
- UI must remain readable during high-motion combat.

## 5) Non-Functional Requirements

### NFR-1: Performance
- Smooth play target: 60 FPS on typical modern laptop/desktop browser.
- Render/update loops should avoid unnecessary allocations in hot paths.
- Enemy update logic should scale to planned max concurrent enemy count.

### NFR-2: Code Quality and Modularity
- Game architecture must separate:
  - Rendering
  - Input
  - Physics/collision (lightweight custom or library-backed)
  - AI
  - Combat
  - Objective/state progression
  - UI/HUD
- New enemies, maps, and weapons should be addable via isolated modules without touching core engine files.

### NFR-3: Readability and Team Collaboration
- Clear folder boundaries and naming conventions.
- Single responsibility for key systems.
- Avoid monolithic scripts.
- Include concise documentation for structure and feature extension patterns.

### NFR-4: Accessibility/Usability (MVP level)
- Adjustable mouse sensitivity.
- Keybind map documented and easy to change in config.
- Pause/unlock controls obvious to the player.

## 6) Content Requirements
- Visual style communicates industrial hazard + oil contamination.
- Oil zombies have recognizable silhouette/material treatment (dark, slick, contaminated aesthetic).
- Environmental storytelling should reinforce sustainability stakes (alarms, leaks, warning signage, emissions cues).

## 7) Balancing and Difficulty Requirements
- Early encounter teaches controls (low-pressure combat).
- Mid-section introduces grouped enemy pressure.
- End objective includes highest tension (repair under attack).
- Time-to-complete target (first clear): approximately 8–15 minutes.

## 8) Audio Requirements (MVP)
- Ambient rig audio loop (machinery, alarms, ocean/wind).
- Zombie SFX for aggro/attack/death states.
- Weapon fire and hit feedback audio.
- Distinct success/failure stingers.

## 9) Telemetry/Debug Requirements (Development)
- Debug overlays/toggles for:
  - FPS
  - Enemy count
  - Player position
  - Objective state
  - Rig failure value
- Console logging should be scoped by system tags and disableable.

## 10) Acceptance Criteria (MVP Definition of Done)
A build is MVP-complete when all criteria below pass:
1. Player can start game and drop into oil rig map.
2. First-person movement/look/shoot controls work with mouse + keyboard.
3. Oil zombies spawn, chase, attack, take damage, and die.
4. Player can die and see fail flow.
5. Rig failure pressure exists and can cause mission fail if unresolved.
6. Drill shaft can be reached and repaired through explicit interaction.
7. Successful repair triggers mission win flow.
8. HUD shows health + objective + rig risk info.
9. Codebase follows modular structure documented in project tree.

## 11) Out-of-Scope for MVP (Future Extensions)
- Multiplayer/co-op.
- Advanced weapon inventory.
- Full quest system.
- Procedural map generation.
- Save/load progression.

## 12) Risks and Mitigations
- **Risk**: FPS drops with many enemies.
  - **Mitigation**: pooled entities, simplified colliders, capped concurrent AI updates.
- **Risk**: first-person controls feel floaty.
  - **Mitigation**: tune acceleration/friction/camera sensitivity in config.
- **Risk**: objective unclear during combat.
  - **Mitigation**: persistent HUD objective + world marker + audio cueing.
- **Risk**: feature coupling slows iteration.
  - **Mitigation**: strict module boundaries and event-driven system communication.
