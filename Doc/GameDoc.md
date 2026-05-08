# BattleSnake: Real-Time Canvas Arena

Inspired by curvefever.com, this module is a local multiplayer arena game built with React, TypeScript, and the HTML5 Canvas API. It modernizes classic Snake by emphasizing survival, area denial, and gridless continuous movement (think Tron light cycles). The architecture centers on a custom `useGameEngine` hook that drives the animation loop, with modular entity classes and a single UI component that manages configuration and game flow.

Resources used:

- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- https://developer.mozilla.org/en-US/docs/Games

### Project Structure

| File                   | Responsibility                                                                                                 |
| :--------------------- | :------------------------------------------------------------------------------------------------------------- |
| **`Play.tsx`**         | The main React component handling the menu, options, UI, and game state (menu, playing, gameover).             |
| **`Snake.ts`**         | A class managing individual snake logic, including movement, drawing, input handling, and collision detection. |
| **`Board.ts`**         | Handles the drawing of borders and the generation of obstacles.                                                |
| **`useGameEngine.ts`** | The core logic hook that initializes the Canvas, manages the game loop, and determines the winner.             |

### Core Gameplay Mechanics

- **Survival Focus:** Unlike traditional Snake, the goal here is to be the last survivor. Players leave a permanent trail behind them that acts as a solid wall.
- **Collision System:** A player dies if they collide with the board's borders, obstacles, their own trail, or an opponent's trail.
- **Vanish Ability:** Players have a "Vanish Fuel" mechanic (measured in seconds). When activated, the snake becomes invisible and stops leaving a trail, allowing it to "jump" over obstacles safely.
- **Speed Boost:** Players can trigger a boosted speed (3x the normal speed) to outmaneuver opponents or escape tight spots.
- **Teleportation:** The game features "border crossing," where snakes exiting one side of the canvas reappear on the opposite side.

### Technical Features

- **Local Multiplayer:** Supports 1 to 4 players on the same keyboard using different control schemes (e.g., Arrow Keys, WASD, IJKL, TFGH).
- **Dynamic Map Generation:** The game includes several map types, including "Empty," "Random" (procedural obstacles), and "Segfaults" (long vertical and horizontal lines).
- **Customizable Settings:** Before starting, players can configure board dimensions, background colors, initial speed, and vanish duration.
- **Game Engine:** Uses a custom `useGameEngine` hook that manages the game loop via `requestAnimationFrame` at a target rate of 60 updates per second ($16.67$ms per update).
- **Countdown System:** Includes a 3-second visual countdown before the game starts, showing arrows to indicate each player's starting direction.



# Modules

### Major: Implement a complete web-based game where users can play against each other.

- The game can be real-time multiplayer (e.g., Pong, Chess, Tic-Tac-Toe, Card games, etc.).
- Players must be able to play live matches.
- The game must have clear rules and win/loss conditions.
- The game can be 2D or 3D.

### Major: Multiplayer game (more than two players).

- Support for three or more players simultaneously.
- Fair gameplay mechanics for all participants.
- Proper synchronization across all clients.

### Minor: Game customization options.

- Power-ups, attacks, or special abilities
- Different maps or themes.
- Customizable game settings.
- Default options must be available.



# Technical Appendix

This section does not document the code; it provides the background theory that informs the engine's design choices.

## CPU and GPU

To understand why browsers render graphics the way they do, it helps to understand the difference between the two main processors in a computer.

### Key Difference

- CPU → “I do a few things, but very intelligently” - logic, system tasks, general-purpose programs
- GPU → “I do a huge number of simple things, all at once” - intensive parallel computation (graphics, AI, simulations)

### Central Processing Unit (CPU)

The CPU is the general-purpose "brain" of the computer. It is designed to handle a wide variety of tasks, from running your operating system to executing the JavaScript logic in your React app.

- **Architecture:** CPUs typically have a small number of very fast, complex cores (e.g., 4 to 16 cores).
- **Strengths:** They excel at serial, sequential processing—executing complex logic, branching statements (`if/else`), and rapidly switching between different types of tasks.

### Graphics Processing Unit (GPU)

The GPU is a specialized processor designed primarily for rendering images, video, and 2D/3D graphics.

- **Architecture:** GPUs consist of thousands of smaller, simpler, and slower cores.
- **Strengths:** They excel at parallel processing. If you need to calculate the color of 2 million pixels on a screen at the exact same time, a GPU can assign one core to each pixel and do the math simultaneously, whereas a CPU would have to calculate them one after the other.

## The HTML5 `<canvas>` Element

The \`\<canvas\>` element is an HTML tag that provides a blank, programmable drawing board.

- **Immediate Mode Rendering:** Unlike the HTML DOM or SVG—where every `<div>` or `<rect>` is an object the browser remembers and tracks—the canvas operates in "immediate mode." Once you draw a rectangle on a canvas, the browser immediately forgets the concept of that "rectangle." It only knows that certain pixels changed color.
- **The Context:** To draw on the canvas, JavaScript requests a rendering context (in our case, `ctx = canvas.getContext("2d")`). This context acts as the API toolset used to issue drawing commands (like `fillRect` or `moveTo`) to the browser, which often passes those commands down to the GPU for hardware-accelerated rendering.

### What happens during `ctx.fillRect()`?

When you call `ctx.fillRect()` to draw a rectangle, the following sequence occurs:

1. **State Check:** The engine checks the current `fillStyle` and transformation matrix.
2. **Path Calculation:** It calculates the coordinates of the rectangle relative to the canvas dimensions.
3. **Command Buffering:** In most modern browsers, the command isn't immediately drawn to the screen. It is added to a **render queue** or command buffer.
4. **Rasterization:** The browser’s rendering engine converts these vector instructions into a bitmap (pixels).
5. **GPU Transfer:** The bitmap data is sent to the GPU's frame buffer.
6. **Display:** Once the `render` function finishes and the browser reaches the next VSYNC signal, the entire frame buffer is flipped onto the physical screen.

### `window.requestAnimationFrame(gameLoop)`

`window.requestAnimationFrame` is a browser API that tells the browser you want to perform an animation. It requests that the browser call a specific function (your game loop) to update an animation exactly before the next screen repaint. The browser synchronizes `requestAnimationFrame` with the **display's refresh rate** of the user. If a monitor is 60Hz, the browser aims for 60 callbacks per second (~16.67ms per frame). If the user has a 144Hz gaming monitor, the browser will attempt to run your `gameLoop` function 144 times per second (~6.94ms per frame).

For a standard 60Hz monitor, the browser aims to paint a new frame every **16.67ms**.

1. **The Trigger:** The browser reaches a refresh interval (e.g., at 16.67ms).
2. **Execution:** It executes your `gameLoop` function immediately.
3. **The "Work" Phase:** Your code inside `gameLoop` (updating positions, drawing to the canvas) runs. If this takes **5ms**, the browser now has **11.67ms** of "idle" time left before the next frame must be drawn.
4. **The Scheduling:** When you call `window.requestAnimationFrame(gameLoop)`, you aren't starting a timer; you are simply renewing a subscription for the _next_ available paint invitation.
5. **The Idle Period:** During that remaining 11.67ms, the browser is free to handle other things, like keyboard events or garbage collection.

### Performance Factors

Beyond code quality (algorithmic complexity), execution time depends on:

- **CPU/GPU Hardware:** A faster processor executes instructions in fewer clock cycles.
- **System Load:** If other tabs or background applications are hogging the CPU, the browser has fewer resources to give your JavaScript thread.
- **Canvas State:** Large canvases or complex operations (like `shadowBlur`, transparency, or drawing thousands of objects) increase the workload for the GPU.
- **Garbage Collection:** If your code creates many temporary objects, JavaScript may pause execution to clear memory, causing "spikes" in frame time.
- **Browser Engine:** Different engines (V8 in Chrome, SpiderMonkey in Firefox) have different optimization efficiencies for specific patterns.

# `useGameEngine.ts`

It defines a React hook `useGameEngine` that sets up and runs a canvas-based multiplayer Snake game loop. The hook creates the board and snakes, handles a 3‑second countdown with direction arrows, then starts a fixed‑timestep update loop (~60 updates/sec) that advances snakes, checks collisions and vanishing, and triggers `onGameOver` when the win condition is met. It also registers keyboard handlers for player controls, and cleans up event listeners and the animation frame when the component unmounts or the game ends.

### How Frames Are Handled

Our code uses a robust pattern called a **Fixed Timestep Loop**. Here is how it breaks down:

- **Time Tracking:** The engine records `performance.now()` to find out exactly how many milliseconds have passed since the last frame (`elapsed = currentTime - lastTime`).
- **The Accumulator (`lag`):** Instead of updating the game physics based on unpredictable frame times, it adds the elapsed time to a `lag` variable.
- **Fixed Updates:** It runs a `while (lag >= MS_PER_UPDATE)` loop. `MS_PER_UPDATE` is set to 16.67 (which is 1000ms / 60 frames). The engine will update the snake's position, check collisions, and handle vanishing _only_ in strict 16.67ms chunks.
- **Why this matters:** If the browser stutters or the user has a 144Hz monitor, the game won't suddenly run twice as fast. The logical updates remain strictly tied to 60 steps per second, ensuring consistent gameplay.

## Checking for Collisions

My original idea for detecting collisions was simple: after a snake's position updates, just check the color of the pixels at the new position. If it is another color than the background, it means that the snake literally moved into a wall.

However, getting the color of a pixel using `ctx.getImageData` is incredibly expensive. To see just how expensive, I measured the execution time of the game loop calling `getImageData` two times. For one instance of a snake, it took 2 to 3 ms. For four snakes, it would take between 7 and 12 ms. Since the entire game loop needs to finish in about 16.67 ms to maintain a smooth 60 frames per second, this visual check would eat up almost the entire time budget.

The `getImageData` method is historically slow because it forces a "synchronization" between the GPU (where the drawing happens) and the CPU (where your TypeScript logic lives).

- **Bus Latency:** To read a pixel, the CPU must stop the GPU, ask for the data of the entire canvas (or a section), and wait for that data to travel back across the system bus.
- **Memory Allocation:** Every time you call `ctx.getImageData(x, y, 1, 1)`, the browser creates a new `Uint8ClampedArray` to hold those four numbers ($R, G, B, A$). Doing this 60 times a second for one snake is fine; doing it for 4 snakes can cause "Garbage Collection" stutters as the browser tries to delete thousands of tiny arrays.

### Math-Based Collision: The AABB Algorithm

Because `getImageData` forces an expensive synchronization between the CPU and GPU, most professional 2D games abandon pixel-color reading entirely. Instead, they rely on **Mathematical Hitboxes**.

In this engine, we handle collisions by tracking geometry directly in the CPU's fast memory. We use an array called `walls` to store all the physical boundaries on the board.

- **The `walls` Array:** This array acts as our master list of solid objects. It contains the padded borders of the canvas, the randomly generated map rectangles, and the `currentTrail` segments generated by the snakes as they turn and move.
- **The Geometry:** Every solid object in the game, including the snake's head, is defined as a `Rectangle` containing four simple properties: `x`, `y`, `w` (width), and `h` (height).

To detect a crash, we use the **AABB (Axis-Aligned Bounding Box)** algorithm. AABB is the industry standard for calculating overlap between two non-rotated rectangles because it requires very little processing power.

Whenever a snake advances, the `checkCollision` method loops through the `walls` array and runs the AABB math:

1.  **Define the Head:** First, we calculate the right edge (`headRight = head.x + head.w`) and bottom edge (`headBottom = head.y + head.h`) of the snake's head.
2.  **Loop and Box:** As we iterate through the `walls` array, we calculate the right and bottom edges of each individual segment. (We explicitly skip checking the snake's own actively growing `currentTrail`).
3.  **The Overlap Check:** We evaluate if the head overlaps with the segment by checking four boundary conditions: `this.head.x < segRight`, `this.head.y < segBottom`, `headRight > seg.x`, and `headBottom > seg.y`.

If all four of these conditions are true simultaneously, it means the rectangles are intersecting. The collision is confirmed, and the snake is marked as dead (`this.isAlive = false`).

**Why this is better:**
While the pixel-based approach initially feels more intuitive—asking "is the pixel in front of me green?"—managing an array of coordinates is infinitely faster. The CPU can rip through hundreds of simple AABB number comparisons in a fraction of a millisecond, leaving almost all of your 16.67 ms frame budget safely intact for rendering and game logic.

# Possible improvements

This section lists flaws in the game and possible fixes. They are not implemented. ~~because I'm lazy~~ The module requirements are met. This is a student project, it does not need to be perfect. We have other things to do.

### checkCollision

The `checkCollision` method uses a **"Brute Force"** approach. Every time the game updates, the snake's head looks at every single rectangle stored in the `walls` array. It performs a mathematical overlap check for each one. If a game has been running for a while and the snakes each leave behind 1,000 trail segments, the code performs 4,000 checks per player, 60 times per second.

#### Spatial Partitioning

One typical technique is Spatial Partitioning. It optimizes this by dividing the game board into a grid or regions. Instead of checking every wall on the entire map, the snake only checks the walls located in its immediate "neighborhood."

- **The Grid:** The map is divided into a series of buckets (like a 10x10 grid).
- **The Logic:** Each wall segment is assigned to the bucket(s) it occupies.
- **The Result:** When the snake's head is in Grid Square A1, it only asks for a list of walls inside A1. It ignores the thousands of segments in B5 or D10 entirely, drastically reducing the number of calculations per frame.

Why I didn't do it: even with around 1,000 trail segments (from constant left-right turns), a full game loop stays under 100 microseconds in Chrome DevTools, so the game remains smooth.

Still, learning spatial partitioning matters for larger projects (open-world games, simulations, robotics) where you may have tens of thousands of objects.

### Separate data generation and drawing

`advance()` currently both updates state _and_ draws (`ctx.fillRect`). Separating **data generation (game logic)** from **drawing (rendering)** would make the engine cleaner and more maintainable.

- **Decoupling responsibilities**: your game state (positions, collisions, trails) evolves independently of how it’s displayed. This avoids mixing logic with UI concerns.
- **Easier debugging**: you can verify correctness of the simulation without involving rendering artifacts.
- **Flexibility**: you can change rendering (Canvas, WebGL, headless tests, replay system) without touching the core logic.
- **Determinism & testing**: pure logic functions can be unit-tested; drawing code cannot.
- **Performance control**: you can update logic at a fixed timestep and render at a different rate (important for smooth gameplay).

### Jittering when refresh rate is higher than 60Hz (144Hz monitor)

The jittering occurs because the game loop uses a **fixed timestep** for logic, but a **variable refresh rate** for rendering.

The code targets 60 updates per second by setting `MS_PER_UPDATE` to 16.67ms. However, `requestAnimationFrame` (rAF) fires at your monitor's specific refresh rate.

On a high-refresh monitor (e.g., 144Hz), rAF triggers roughly every 6.9ms. Here is what happens in the current loop:

- **Frame 1 (6.9ms):** `lag` is less than 16.67ms. The `while` loop is skipped. The snake does not move, and nothing new is drawn.
- **Frame 2 (13.8ms):** `lag` is still less than 16.67ms. Still no movement.
- **Frame 3 (20.7ms):** `lag` is now greater than 16.67ms. The `while` loop runs once. The snake advances and is drawn at its new position.

Because the monitor is "ready" to show movement every 6.9ms but only receives a new position every 2 or 3 frames, the snake appears to stand still and then "teleport" forward, creating a stuttering or jittery effect.

The solution: linear interpolation. I didn't do it because most people use 60Hz (42 monitors have a refresh rate of only 60Hz), and the jittering at 165Hz is very small and does not affect gameplay.

### Straddling

The game allows a snake to cross the canvas borders and teleport. When a snake straddles a border (like crossing a portal), it is split in half. Drawing this is not difficult. Straddling would require the `head` and `currentTrail` properties to become arrays of `Rectangle`, and a rectangle would need to be split in two (or four if it is going through a corner) when the snake is straddling.
Another option is creating ghost rectangles by pushing four offset copies of each segment, so a snake also checks collisions against these ghosts.  
The easy fix: pad the borders with walls.

### Minor bugs

If a player turns and releases the speed boost key at the same time, the head sometimes advances one extra step, snaps back, then turns. It happens very rarely and is hard to reproduce.

In a few cases a snake died without an obvious collision. I did not have full logging at the time and could not recreate it, so it may have been fixed by later changes.



# Future ?

Transitioning from a local student project to a real-world online multiplayer game like _Curve Fever_ requires moving away from local state and toward a **Server-Authoritative Architecture**.

In your current code, the "Game Engine" lives in the player's browser. In a real-world version, the engine lives on a server, and the players only send "input signals" (e.g., "turned left").

Here are the modern (2026-standard) technologies to make this happen:

### 1. The Networking Layer (The "Pipe")

To achieve that smooth, continuous movement, you need extremely low latency.

- **WebSockets (via Socket.io or Fastify):** Great for starting out. It's reliable and works in all browsers.
- **WebTransport / WebRTC:** The "pro" choice for 2026. Unlike WebSockets (which use TCP), these can use UDP-like protocols, reducing "lag spikes" caused by lost packets. This is critical for high-speed games where every millisecond counts.

### 2. Dedicated Multiplayer Frameworks

Instead of building everything from scratch, these frameworks handle "rooms," "matchmaking," and "state synchronization":

- **Colyseus (Node.js/TypeScript):** The best fit for your current stack. It’s an authoritative server-side framework that syncs the state of your `Snake` and `Board` classes automatically to all clients.
- **Nakama:** A more heavy-duty, open-source server (written in Go) used for games that need to scale to thousands of players. It handles social features, leaderboards, and real-time sync.

### 3. Server-Side Logic (The "Brain")

In your current project, `useGameEngine.ts` runs on the client. In a real-world game:

- **Node.js / Bun:** Since you are already using TypeScript, you can move your `Snake.ts` and `Board.ts` logic directly to a Node.js server. Bun is a modern alternative to Node that is significantly faster for the high-frequency calculations a game loop requires.
- **Authoritative Logic:** The server runs the loop at 60fps, calculates collisions, and tells the clients where they are. If a client tries to "cheat" by modifying their local code, the server simply ignores them because it has the "True State."

### 4. Client-Side Smoothing (The "Magic")

Because the internet has delay (latency), simply waiting for the server makes the game feel "heavy." You’ll need two specific techniques:

- **Client-Side Prediction:** The player’s snake moves instantly on their screen when they press a key, without waiting for the server to say "okay."
- **Interpolation:** When you see _other_ players, your browser smoothly "animates" them between the last two positions received from the server, preventing them from "teleporting" or flickering.

### Summary Tech Stack for "Curve Fever" 2.0:

| Layer           | Recommended Tech                                             |
| :-------------- | :----------------------------------------------------------- |
| **Frontend**    | React + Three.js (for 3D) or PixiJS (for fast 2D Canvas)     |
| **Backend**     | **Bun** (Runtime) + **TypeScript**                           |
| **Multiplayer** | **Colyseus** (State Management)                              |
| **Database**    | **Redis** (for fast, in-memory session data)                 |
| **Deployment**  | **Agones** (on Kubernetes) for scaling game server instances |
