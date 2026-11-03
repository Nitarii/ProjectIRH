# N.I.M — Nitari's Industrial Madness

Procedural 3D industrial economy and resource game.

**Creator, author and original rights holder:** **Nitarii**.

**Copyright © 2026 Nitarii. All rights reserved.**

## Play

**https://nitarii.github.io/ProjectIRH/**

Explore procedurally generated resource biomes, collect raw materials,
develop processing chains and logistics, hire employees, and expand a
frontier business through upgrades.

## Controls

The game uses physical keyboard positions so movement behaves correctly
on AZERTY, QWERTY and other layouts. Labels display the actual keyboard
layout when the browser supports the Keyboard Layout API. Controls can
also be customized in Settings.

- Move: standard movement cluster / arrow keys
- Interact / harvest / use physical stockpile: F
- Automatic harvesting: R (upgradeable: −20%, −10%, 0%, +10%, +20%)
- Drop carried large item: X
- Market: C
- Construction: B
- Progression: T
- Explored world map: M / , on AZERTY (drag to pan, wheel to zoom)
- Open facility storage: A/Q deposits, E withdraws, F closes
- Bicycle mount/dismount: V (after buying a bicycle)
- Rotate a construction preview: A/Q / E (physical Q / E) or mouse wheel
- Pause: Escape or Tab

## Local personal save

Progress is kept **locally inside the browser** as an encrypted save.
Each browser receives a unique local identity. Recovery codes can be
exported/imported from the Settings screen. Recovery codes contain the
secret necessary to read the encrypted save: keep them private and
back them up before clearing browser data or resetting your game.

This is not a server account and does not automatically synchronize
progress across browsers or devices. Local browser storage can be cleared
by browser settings and private browsing sessions.

## Copyright and third-party components

The original game content is proprietary and not licensed for redistribution.
See [LICENSE](LICENSE). This claim concerns original material only; external
dependencies retain their own licenses and rights. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Published builds and source can be viewed publicly; that fact alone
does not grant permission to reuse the original game materials.

## Auto progression

Auto mode starts at −20% harvest and movement speed. Upgrade in Progression for 20,000, 50,000, 100,000 and 250,000 gold respectively to reach −10%, 0%, +10% and +20%. Each biome's tool tiers, matching worksite types, factory types and expertise ranks have equal prices.

## World map and clearing

The map shows only explored terrain and persists discovery in the encrypted local save. Construction clears interfering resource nodes and nearby decoration within a small safety margin; generated chunks respect existing buildings. World save and browser data remain in the existing IRH format for compatibility.

## Mobile controls (portrait & landscape)

The on-screen virtual joystick handles movement. Drag on the world to rotate the camera, pinch to zoom, and use the action buttons for interaction/harvesting, jumping, sprinting, automatic mode, bicycle and dropping logs. The top mobile navigation opens the market, construction, progression, explored world map and settings. Building placement exposes rotate-left, rotate-right and cancel controls. The map supports touch panning and zoom buttons.

## Desktop mouse and HUD

Right mouse button toggles pointer lock/free cursor. The bottom-left keyboard shortcut chips are clickable buttons for action, market, construction, progression, world map, auto mode and settings. Only progression contains the endurance upgrade.

## N.I.M HUD, storage and live maps

- Storage screens show the keyboard shortcut **A/Q** next to Deposit and **E** next to Withdraw. A successful transaction closes the window automatically; **F** closes without transferring anything. Unavailable transactions leave the window open and explain the failure.
- The explored atlas is **live**: time, employees, automation and resource production continue when the map is open. The atlas captures manual keyboard input to avoid accidental walking behind it.
- Both the camera-rotating minimap and world atlas display **gold building dots** and **cyan worker/AI dots**. The world atlas respects exploration fog of war and updates markers while open.
- Settings include independent **Minimap size (72–260 px)** and **In-game HUD scale (70–140%)** controls. Both persist in the existing local settings and update immediately. Mobile portrait/landscape placement remains responsive.
- While automatic mode is enabled, the player's eyes display a lightweight animated chromatic wave shader. They revert to dark eyes when automation is disabled.
- Storage, focused building management and sound settings use simpler labels to avoid repeating the same instructions in headings, buttons and footers.

## UI regression checks

Run `node tests/ui-regressions.mjs` in a local checkout to verify persistent slider bounds, AZERTY labels, resource transfers, map unpause, chromatic auto-mode wiring and visible worker/building dots. These smoke tests do not replace in-browser or real-device checks.

## N.I.M — logistics, roads and 2026-11 changes

- A normal left click anywhere on the gameplay surface restores the hidden mouse cursor and camera control after right-click free-cursor mode. Menus, inputs and buttons retain their own clicks.
- All unprocessed material units (wood, stone, ore, sand and wheat) have the same baseline sale value: **12 gold each**, before expertise bonuses. Refined products retain their processing premium.
- Freight depots now cost **4,800** gold (previously 10,500); trade houses cost **5,500** gold (previously 13,500).
- **Harvesters** continue to gather until the building's raw stock reaches its 100-unit capacity, then physically take goods to the central sale area, even if no freight depot exists.
- **Transporters** move raw goods from harvest buildings to refineries, or surplus raw goods and processed products to the closest useful trade house. They reserve capacity for goods already in transit to avoid overbooking a warehouse.
- **Sellers** do not take goods directly from production buildings. They wait for deliveries to their own warehouse (120 units total across resource types), then carry stored goods to the central sale area and return for another batch. Warehouses display goods actually stocked.
- **Atelier de voirie / Roadworks depot** costs **6,200** gold. Its employees lay a persistent network between facilities and the market, one segment at a time, then upgrade frequently travelled completed paths. Initial paths increase movement speed by **20%**, paved roads by **50%**. When the building network changes, obsolete segments are dismantled progressively.
- AI pathfinding evaluates *travel time*, not just geometric distance, and preserves a detour along roads when that detour is faster. Long trips use bounded navigation legs. Both player movement and autopilot receive the same surface bonus.
- Road surfaces reuse existing terrain vertex colors and dirty-chunk repainting, avoiding new road meshes/draw calls. Network re-planning only occurs when facilities change; upgrade eligibility checks are throttled.
- Saves remain in the established encrypted local format. Old saves load without road or seller inventory fields; new road and warehouse data persist in subsequent saves.

## Regression suites

Run locally with Node:
```bash
node tests/ui-regressions.mjs
node tests/industry-logistics-roads.mjs
```
The industry suite simulates harvesting, refinery deliveries, vendor sales, full-stock fallback, simultaneous delivery reservations and construction/demolition/upgrade of roads. These automated tests do not replace real browser or hardware performance QA.

## Persistent ecology, navigation and atmospheric lighting

- **Resources never respawn after reaching zero HP.** Depletion is recorded under the existing encrypted `exhausted` save field by stable world coordinates. Previously saved positive respawn timestamps are now treated as permanent depletion. Damaged-but-not-exhausted nodes can still regain HP. The world remains procedurally explorable; exhausted nodes cannot be farmed repeatedly.
- **NPC workers are non-solid relative to other workers**, so employees may overlap/pass through one another without crowd collision probes or per-worker avoidance routes. Paths instead require extra clearance around actual solid buildings, scenery and resource obstacles; detours use geometry-only A* and emergency wall-safe recovery.
- **View-distance fog** is linear and starts at 71% of the configured viewing distance, becoming opaque at 96%, before terrain-chunk draw distance. Fog hue changes smoothly with the time of day and covers geometry streaming transitions.
- **Fauna:** 15 terrestrial species (three for each forest, mountain, excavation, desert and field biome) and five biome-specific bird species. Population and range are bounded by the view distance and graphics setting; candidates are deterministically anchored to world cells and the persisted world clock. Gaits, pauses, nocturnal activity, flight, gliding and temporary roosting vary by species. Small distant details use hysteretic LOD.
- **Atmosphere:** a shader sky with sunrise/sunset glow, moon, stars and world-anchored subtle zenith detail; six-sample bounded procedural cloud-volume impostors with wind drift, spatial variation and horizon fade; continuously interpolated hemisphere/directional lighting and dusk-colored fog. Background ambient particles share four instanced render batches instead of dozens of unique meshes.
- **Soft terrain microshading** keeps original vertex colors and shadow/fog support, adding stationary world-space detail directly within the standard Lambert material (no extra fullscreen render pass).
- The optimized world keeps the existing graphics-quality options and mobile controls. This is a lightweight stylized atmospheric implementation, not a claim of true cinematic path tracing or high-end volumetric simulation on every phone.

Run `node tests/nature-rendering.mjs` and `node tests/ai-clearance.mjs` alongside the existing UI and industry tests. These are regression/simulation checks, **not real GPU performance benchmarks**.

## Automatic harvesting priorities

The automatic mode now selects resource nodes based first on the strongest **owned tool** for that biome (tier 0–4). When tool tiers are equal, nearer reachable nodes are favored. Without purchased tools, distance remains the primary criterion. Fully depleted resources and logs are excluded; temporarily inaccessible nodes are skipped and the navigator falls back to the next viable candidate within its bounded pathfinding budget. Tool upgrades take effect on the next harvest plan.

Run `node tests/auto-harvest-priority.mjs` to verify selection and fallback behavior.

## NPC cargo recovery, refinery clearances and world-space ambience

- The stuck-path recovery handler now **preserves all carried inventory, material type, current destination, delivery phase and active factory route** when safely relocating a worker. Only navigation coordinates and failed waypoints are reset; cargo is not automatically refunded into possibly-full warehouses.
- Factory staff use a stable **left-side inbound corridor, front operator aisle, and right-side outbound corridor** for all five refiners and all quarter-turn rotations. Distinct workstations remain, but the route avoids machines, stockpiles, saws, kilns and mills. The visible machine hull in front of workshops also has an appropriately sized collision envelope.
- Atmospheric particles are sampled from **deterministic world grid cells**. The camera/player only determine which cells are rendered; walking or turning cannot drag individual particles. Wind is driven by world animation time.
- Cloud transforms have **fixed world orientations** rather than copying the camera quaternion. World-anchored cloud drift remains. Animal and bird silhouettes keep constant physical scale instead of resizing with observer distance.
- New regression suite: `node tests/ai-cargo-factory-paths.mjs` checks cargo retention, 100 refinery/rotation/employee cases, 800 ground-level movement segments and 20 real route solutions. Updated nature tests check that camera motion does not change cloud placement and that moving the player does not shift fixed ambient particles.

These simulation tests cannot replace testing all on-screen WebGL collision silhouettes and animations on actual devices.

## Default camera after closing any interface

On desktop, exiting a menu (button, Escape/Tab, same-menu shortcut), completing a storage transaction, starting building placement, leaving the avatar editor or closing the explored-world map now **requests camera pointer lock automatically** and clears the free-cursor state. The explicit right-click cursor toggle remains available during gameplay. A delayed pointer-lock release event is prevented from undoing this transition. Mobile touch controls never request mouse lock.

Run `node tests/camera-lock-after-menus.mjs` to check overlay closing, map controls and simulated browser event races. Some browsers restrict pointer lock immediately after Escape; when permission is denied, a left click on the game resumes camera capture.

## Night lights, abandoned roads and auto-sale reliability (2026-11-03)

- Constructed facilities, including the central market, now receive warm bronze wall lanterns with a softly glowing amber bulb and surrounding light halo. The current day/night cycle fades their illumination in and out naturally.
- Civil-engineering workers also install regularly spaced lanterns on the **sides of constructed paths and roads**. Roadlights are tied to the actual saved road tiles: when workers dismantle the last stage of a road, its fixture and associated glow disappear.
- Rather than one light for every lantern, scenery uses **shared instanced geometry**, one shared glass/glow material and a nearest-neighbor pool of at most **2 (low), 5 (balanced), or 8 (high) true point lights**, without new shadow-casting lights. Unneeded point lights are disabled during the day.
- All user and employee movement (including distant simulated employees) records actual road use. **Roads idle for 300 seconds of running game time** enter maintenance retirement; builders progressively reduce paved road → dirt path → cleared terrain. Road crew movements do not reset the inactivity clock. Routes used again before demolition remain in service.
- Abandoned routes are represented by persistent road tiles and no-rebuild tombstones: saves/reloads never silently recreate retired roads. Adding a newly planned connection can make a formerly abandoned route eligible for construction again.
- The automatic player no longer waits at a resource with a full bag: it cancels harvesting immediately, replaces the current harvest objective with the market trip, sells at the market and resumes normal selection. Long trips continue to use bounded route legs.
- Regression tests: `node tests/night-roads-autosell.mjs` exercises lights, day/night fading, 300-second retirement, progressive demolition, saved tombstones, and full-bag selling even around a physical obstacle.

Lighting and movement were tested in headless simulations. Actual WebGL appearance, smartphone GPU cost, and GitHub Pages deployment remain to be verified in a real browser.

## Road presentation, mobile immersion and simulation improvements (2026-11-03)

- **Road surfaces:** wide dirt paths and distinct paved roads now use five pooled instanced overlay batches with softly rounded edges, stone shoulders and subtle curb/center detailing. Old terrain-vertex paths remain underneath for blending; pathfinding and speeds are unchanged, with no extra tile collision calculations.
- **Road crews:** path construction requires **10.5 seconds**, road upgrading **18 seconds**, dismantling **7.5 seconds** per stage. Only **two roadworkers** may be hired per roadworks depot, including migration of older loaded saves.
- **Building upgrades:** each facility has a bordered section with an individual heading, compact stock information, recruiting control and its own cargo upgrade control (not shown for roadworks buildings). UI remains responsive on mobile portrait and landscape.
- **Mobile bicycle:** the touch bicycle control remains hidden until the bicycle has been purchased.
- **Day/night:** more visible sun and moon disks rise/set with the existing clock. Sun/moon direction now drives the actual directional shadow caster, and its tracking origin is snapped to world steps for steadier shadows.
- **Resource endurance:** biome resource nodes now have max HP **340 / 440 / 520 / 300 / 360**, respectively, instead of 40 / 50 / 60 / 30 / 30.
- **Tools:** player and miner pickaxes have sharp, properly directed heads. Animations turn the point toward the resource at impact.
- **Decor:** nearby instanced scenery batches cast directional shadows with distance-based caster control, avoiding per-object shadow maps and unnecessary distant shadow draw calls.
- **Fullscreen:** persistent accessible button on PC and mobile using standard Fullscreen API and browser fallback. On compatible mobile browsers, the Screen Wake Lock API is requested when gameplay begins, released while hidden, reacquired on return and handled gracefully when denied. Device and browser power policies still override the request.
- **Stutter reduction:** spread minimap biome raster updates over five rows per frame with offscreen buffering; schedule periodic encrypted autosaves during browser idle time and flush during backgrounding; throttle unbounded telemetry scans. The game now keeps the user's selected graphics settings instead of permanently disabling shadows and shortening draw distance after a single low FPS sample.
- **Tests:** `node tests/visual-mobile-performance.mjs` plus the existing regression suites. Simulated rendering is no substitute for real Android/iOS/desktop WebGL and GPU frame-time profiling.

The original author and ownership notices are unchanged.
