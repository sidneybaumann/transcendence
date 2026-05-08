import type Snake from "./Snake";
import type { Rectangle } from "./useGameEngine";
type Direction = "right" | "left" | "up" | "down";

const SHORT = 20;
const MEDIUM = 40;
const LONG = 80;
const TURN_COOLDOWN_MS = 120;
let lastTurnAt = 0;
const PANIC = 5;

export type AIAction =
  | "none"
  | "turnLeft"
  | "turnRight"
  | "startBoost"
  | "stopBoost"
  | "startVanish"
  | "stopVanish";

export function resetAIState() {
  lastTurnAt = 0;
}

function getProbeFromHead(
  head: Rectangle,
  direction: Direction,
  lookAhead: number,
): Rectangle {
  if (direction === "right") {
    return {
      x: head.x + head.w,
      y: head.y,
      w: lookAhead,
      h: head.h,
    };
  } else if (direction === "left") {
    return {
      x: head.x - lookAhead,
      y: head.y,
      w: lookAhead,
      h: head.h,
    };
  } else if (direction === "down") {
    return {
      x: head.x,
      y: head.y + head.h,
      w: head.w,
      h: lookAhead,
    };
  } else {
    return {
      x: head.x,
      y: head.y - lookAhead,
      w: head.w,
      h: lookAhead,
    };
  }
}

function getHeadAfterTurn(
  snake: Snake,
  turn: "left" | "right",
): { head: Rectangle; direction: Direction } {
  const head = { ...snake.head };
  let direction: Direction = snake.direction;

  if (turn === "right") {
    if (snake.direction === "right") {
      direction = "down";
      head.x -= snake.size - snake.speed;
      head.y += snake.size - snake.speed;
      head.w = snake.size;
      head.h = snake.speed;
    } else if (snake.direction === "down") {
      direction = "left";
      head.y -= snake.size - snake.speed;
      head.w = snake.speed;
      head.h = snake.size;
    } else if (snake.direction === "left") {
      direction = "up";
      head.w = snake.size;
      head.h = snake.speed;
    } else if (snake.direction === "up") {
      direction = "right";
      head.x += snake.size - snake.speed;
      head.w = snake.speed;
      head.h = snake.size;
    }
  } else {
    if (snake.direction === "right") {
      direction = "up";
      head.x -= snake.size - snake.speed;
      head.w = snake.size;
      head.h = snake.speed;
    } else if (snake.direction === "down") {
      direction = "right";
      head.x += snake.size - snake.speed;
      head.y -= snake.size - snake.speed;
      head.w = snake.speed;
      head.h = snake.size;
    } else if (snake.direction === "left") {
      direction = "down";
      head.y += snake.size - snake.speed;
      head.w = snake.size;
      head.h = snake.speed;
    } else if (snake.direction === "up") {
      direction = "left";
      head.w = snake.speed;
      head.h = snake.size;
    }
  }

  return { head, direction };
}

function isRectColliding(rect: Rectangle, walls: Rectangle[]): boolean {
  for (const wall of walls) {
    if (
      rect.x < wall.x + wall.w &&
      rect.x + rect.w > wall.x &&
      rect.y < wall.y + wall.h &&
      rect.y + rect.h > wall.y
    ) {
      return true;
    }
  }

  return false;
}

function isDangerAfterTurn(
  snake: Snake,
  walls: Rectangle[],
  turn: "left" | "right",
  lookAhead: number,
): boolean {
  const { head, direction } = getHeadAfterTurn(snake, turn);
  const probe = getProbeFromHead(head, direction, lookAhead);
  return isRectColliding(probe, walls);
}

function isDangerAhead(snake: Snake, walls: Rectangle[], lookAhead: number): boolean {
  const probe = getProbeFromHead(snake.head, snake.direction, lookAhead);
  return isRectColliding(probe, walls);
}

function isDangerBehind(snake: Snake, walls: Rectangle[], lookBehind: number): boolean {
  let probe: Rectangle;

  if (snake.direction === "right") {
    probe = {
      x: snake.head.x - lookBehind,
      y: snake.head.y,
      w: lookBehind,
      h: snake.head.h,
    };
  } else if (snake.direction === "left") {
    probe = {
      x: snake.head.x + snake.head.w,
      y: snake.head.y,
      w: lookBehind,
      h: snake.head.h,
    };
  } else if (snake.direction === "down") {
    probe = {
      x: snake.head.x,
      y: snake.head.y - lookBehind,
      w: snake.head.w,
      h: lookBehind,
    };
  } else {
    probe = {
      x: snake.head.x,
      y: snake.head.y + snake.head.h,
      w: snake.head.w,
      h: lookBehind,
    };
  }

  return isRectColliding(probe, walls);
}

function getVanishStopDistance(): number {
  return 10 + Math.floor(Math.random() * 6);
}

function withDecisionError(
  action: AIAction,
  errorRate: number,
): AIAction {
  if (Math.random() >= errorRate) return action;

  if (action === "turnLeft") {
    return Math.random() < 0.7 ? "none" : "turnRight";
  }

  if (action === "turnRight") {
    return Math.random() < 0.7 ? "none" : "turnLeft";
  }

  if (action === "startBoost") {
    return "none";
  }

  if (action === "stopBoost") {
    return "none";
  }

  if (action === "stopVanish") {
    return "none";
  }

  return action;
}

function canTurnNow(): boolean {
  return performance.now() - lastTurnAt >= TURN_COOLDOWN_MS;
}

function registerTurn() {
  lastTurnAt = performance.now();
}

export function decideAIAction(snake: Snake, walls: Rectangle[]): AIAction {
  const canTurn = canTurnNow();
  if (snake.isVanished) {
    const stopDistance = getVanishStopDistance();
    if (!isDangerBehind(snake, walls, stopDistance)) {
      return "stopVanish";
    }
    return "none";
  }
  if (isDangerAhead(snake, walls, SHORT)) {
    const dangerLeft = isDangerAfterTurn(snake, walls, "left", SHORT);
    const dangerRight = isDangerAfterTurn(snake, walls, "right", SHORT);

    if (dangerLeft && dangerRight) {
      if (
        !snake.isVanished &&
        snake.vanishTime > 0 &&
        isDangerAhead(snake, walls, PANIC)
      ) {
        return "startVanish";
      }
      return "none";
    }

    if (!canTurn) return "none";
    if (dangerLeft && !dangerRight) return withDecisionError("turnRight", 0.03);
    if (dangerRight && !dangerLeft) return withDecisionError("turnLeft", 0.03);
    if (!dangerLeft && !dangerRight) {
      const action = Math.random() < 0.5 ? "turnLeft" : "turnRight";
      return withDecisionError(action, 0.12);
    }
    return "none";
  }

  if (isDangerAhead(snake, walls, MEDIUM)) {
    const dangerLeft = isDangerAfterTurn(snake, walls, "left", SHORT);
    const dangerRight = isDangerAfterTurn(snake, walls, "right", SHORT);
    const rand = Math.random();

    if (snake.isBoosting) return withDecisionError("stopBoost", 0.12);
    if (canTurn && dangerLeft && !dangerRight && rand < 0.05)
      return withDecisionError("turnRight", 0.15);
    if (canTurn && dangerRight && !dangerLeft && rand < 0.05)
      return withDecisionError("turnLeft", 0.15);
    if (canTurn && !dangerLeft && !dangerRight && rand < 0.05) {
      const action = rand < 0.025 ? "turnLeft" : "turnRight";
      return withDecisionError(action, 0.22);
    }
    return "none";
  }

  if (isDangerAhead(snake, walls, LONG)) {
    const dangerLeft = isDangerAfterTurn(snake, walls, "left", SHORT);
    const dangerRight = isDangerAfterTurn(snake, walls, "right", SHORT);
    const rand = Math.random();

    if (snake.isBoosting) return withDecisionError("stopBoost", 0.2);
    if (canTurn && dangerLeft && !dangerRight && rand < 0.01)
      return withDecisionError("turnRight", 0.22);
    if (canTurn && dangerRight && !dangerLeft && rand < 0.01)
      return withDecisionError("turnLeft", 0.22);
    if (canTurn && !dangerLeft && !dangerRight && rand < 0.01) {
      const action = rand < 0.005 ? "turnLeft" : "turnRight";
      return withDecisionError(action, 0.3);
    }
    return "none";
  }

  if (!snake.isBoosting) {
    if (Math.random() < 0.01) {
      return withDecisionError("startBoost", 0.25);
    }
    return "none";
  }

  return "none";
}

export function applyAIAction(
  action: AIAction,
  snake: Snake,
  walls: Rectangle[],
  ctx: CanvasRenderingContext2D,
) {
  switch (action) {
    case "turnLeft":
      snake.turnLeft(walls);
      registerTurn();
      break;
    case "turnRight":
      snake.turnRight(walls);
      registerTurn();
      break;
    case "startBoost":
      snake.startBoost(ctx);
      break;
    case "stopBoost":
      snake.stopBoost();
      break;
    case "startVanish":
      snake.startVanish();
      break;
    case "stopVanish":
      snake.stopVanish(walls);
      break;
    case "none":
    default:
      break;
  }
}
