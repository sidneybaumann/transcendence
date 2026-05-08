import type { Rectangle, Dir } from "./useGameEngine";

const ARROW_OFFSET = 5;

class Snake {
  id: number;
  head: Rectangle;
  direction: Dir;
  leftKey: string;
  rightKey: string;
  upKey: string;
  downKey: string;
  readonly color: string;
  speed: number; // snake advances 'speed' pixels per update. more like steps.
  normalSpeed: number;
  boostedSpeed: number;
  vanishTime: number; // In milliseconds
  isVanished: boolean;
  isAlive: boolean;
  isAI: boolean;
  isBoosting: boolean;
  readonly size: number; // In pixels
  currentTrail: Rectangle;
  previousTrail: Rectangle;

  constructor(
    id: number,
    x: number,
    y: number,
    direction: Dir,
    leftKey: string,
    rightKey: string,
    upKey: string,
    downKey: string,
    color: string,
    speed: number,
    vanishTime: number,
    size: number,
    isAI: boolean,
  ) {
    this.id = id;
    if (direction === "left" || direction === "right") {
      this.head = { x: x, y: y, w: speed, h: size };
      this.currentTrail = { x: x, y: y, w: 0, h: size };
    } else {
      this.head = { x: x, y: y, w: size, h: speed };
      this.currentTrail = { x: x, y: y, w: size, h: 0 };
    }
    this.previousTrail = this.currentTrail;
    this.direction = direction;
    this.leftKey = leftKey;
    this.rightKey = rightKey;
    this.upKey = upKey;
    this.downKey = downKey;
    this.color = color;
    this.speed = speed;
    this.normalSpeed = speed;
    this.boostedSpeed = speed * 3;
    this.size = size;
    this.vanishTime = vanishTime;
    this.isVanished = false;
    this.isAlive = true;
    this.isAI = isAI;
    this.isBoosting = false;
  }

  advance(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    if (this.direction == "right") {
      /*  1. Update position of the snake
          2. Update position and size of the growing trail */
      this.head.x += this.speed;
      this.currentTrail.w += this.speed; // Grow width
    } else if (this.direction == "up") {
      this.head.y -= this.speed;
      this.currentTrail.y -= this.speed; // Same as snake position
      this.currentTrail.h += this.speed; // Grow height
    } else if (this.direction == "left") {
      this.head.x -= this.speed;
      this.currentTrail.x -= this.speed;
      this.currentTrail.w += this.speed;
    } else if (this.direction == "down") {
      this.head.y += this.speed;
      this.currentTrail.h += this.speed;
    }

    // 3. Handle border crossing (teleportation)
    if (this.head.x >= canvasWidth)
      this.head.x -= canvasWidth;
    else if (this.head.x < 0)
      this.head.x += canvasWidth;
    if (this.head.y >= canvasHeight)
      this.head.y -= canvasHeight;
    else if (this.head.y < 0)
      this.head.y += canvasHeight;

    // 4. Draw
    ctx.fillStyle = this.color;
    if (!this.isVanished) {
      ctx.fillRect(this.head.x, this.head.y, this.head.w, this.head.h);
    }
  }

  checkCollision(walls: Rectangle[]): boolean {
    const headRight = this.head.x + this.head.w;
    const headBottom = this.head.y + this.head.h;

    for (let i = 0; i < walls.length; i++) {
      const seg = walls[i];

      if (seg === this.currentTrail || seg === this.previousTrail) {
        continue;
      }

      const segRight = seg.x + seg.w;
      const segBottom = seg.y + seg.h;

      if (
        this.head.x < segRight &&
        this.head.y < segBottom &&
        headRight > seg.x &&
        headBottom > seg.y
      ) {
        this.isAlive = false;
        //console.log(`Player ${this.id} died`, seg, this.head);
        return true;
      }
    }
    return false;
  }

  checkVanishing(interval: number, walls: Rectangle[]) {
    if (this.isVanished) {
      this.vanishTime -= interval;
    }
    if (this.isVanished && this.vanishTime <= 0) {
      this.isVanished = false;

      /*1. this.previousTrail = this.currentTrail; makes both variables point to the same Rectangle object (objectA).
        2. this.currentTrail = { ... } creates a new Rectangle object (objectB) and reassigns currentTrail to it, while previousTrail still points to objectA.
        3. walls.push(this.currentTrail); pushes a reference to objectB into walls.
      */
      // Keep a reference of the last trail
      this.previousTrail = this.currentTrail;
      // Assign new trail to 'currentTrail'
      if (this.direction == "right" || this.direction == "left")
        this.currentTrail = { x: this.head.x, y: this.head.y, w: 0, h: this.size }; 
      else
        this.currentTrail = { x: this.head.x, y: this.head.y, w: this.size, h: 0 };

      // Push a reference of the new trail. It will grow in 'advance'
      walls.push(this.currentTrail);
    }
  }

  turnRight(walls: Rectangle[]) {
    if (this.direction == "right") {
      // Change direction
      this.direction = "down";
      // Shift the head
      this.head.x -= this.size - this.speed;
      this.head.y += this.size - this.speed;
      this.head.w = this.size;
      this.head.h = this.speed;
    } else if (this.direction == "down") {
      this.direction = "left";
      this.head.y -= this.size - this.speed;
      this.head.w = this.speed;
      this.head.h = this.size;
    } else if (this.direction == "left") {
      this.direction = "up";
      this.head.w = this.size;
      this.head.h = this.speed;
    } else if (this.direction == "up") {
      this.direction = "right";
      this.head.x += this.size - this.speed;
      this.head.w = this.speed;
      this.head.h = this.size;
    }

    if (!this.isVanished) {
      this.previousTrail = this.currentTrail;
      if (this.direction == "right" || this.direction == "left")
        this.currentTrail = { x: this.head.x, y: this.head.y, w: 0, h: this.size };
      else
        this.currentTrail = { x: this.head.x, y: this.head.y, w: this.size, h: 0 };

      walls.push(this.currentTrail);
    }
  }

  turnLeft(walls: Rectangle[]) {
    if (this.direction == "right") {
      this.direction = "up";
      this.head.x -= this.size - this.speed;
      this.head.w = this.size;
      this.head.h = this.speed;
    } else if (this.direction == "down") {
      this.direction = "right";
      this.head.x += this.size - this.speed;
      this.head.y -= this.size - this.speed;
      this.head.w = this.speed;
      this.head.h = this.size;
    } else if (this.direction == "left") {
      this.direction = "down";
      this.head.y += this.size - this.speed;
      this.head.w = this.size;
      this.head.h = this.speed;
    } else if (this.direction == "up") {
      this.direction = "left";
      this.head.w = this.speed;
      this.head.h = this.size;
    }

    if (!this.isVanished) {
      this.previousTrail = this.currentTrail;
      if (this.direction == "right" || this.direction == "left")
        this.currentTrail = { x: this.head.x, y: this.head.y, w: 0, h: this.size };
      else
        this.currentTrail = { x: this.head.x, y: this.head.y, w: this.size, h: 0 };

      walls.push(this.currentTrail);
    }
  }

  startVanish() {
    this.isVanished = true;
    this.previousTrail = this.currentTrail;
    this.currentTrail = { x: 0, y: 0, w: 0, h: 0 };
  }

  stopVanish(walls: Rectangle[]) {
    this.isVanished = false;

    this.previousTrail = this.currentTrail;
    if (this.direction == "right" || this.direction == "left") {
      this.currentTrail = { x: this.head.x, y: this.head.y, w: 0, h: this.size };
    } else {
      this.currentTrail = { x: this.head.x, y: this.head.y, w: this.size, h: 0 };
    }

    walls.push(this.currentTrail);
  }

  startBoost(ctx: CanvasRenderingContext2D) {
    this.speed = this.boostedSpeed;
    this.isBoosting = true;
    if (this.direction === "right" || this.direction === "left") {
      this.head.w = this.speed;
      if (this.direction === "right") {
        // One frame before, a rectangle with a width of 2 pixels is drawn. When speed up, in the next frame, the snake advances by 4 pixels, creating a gap of 2 pixels in the trail. The line below fills that gap.
        ctx.fillStyle = this.color;
        ctx.fillRect(this.head.x, this.head.y, this.head.w, this.head.h);
      }
    } else {
      this.head.h = this.speed;
      if (this.direction === "down") {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.head.x, this.head.y, this.head.w, this.head.h);
      }
    }
  }

  stopBoost() {
    this.speed = this.normalSpeed;
    this.isBoosting = false;
    if (this.direction === "right" || this.direction === "left") {
      this.head.w = this.speed;
    } else {
      this.head.h = this.speed;
    }
  }

  handleInput(e: KeyboardEvent, walls: Rectangle[], ctx: CanvasRenderingContext2D) {
    if (this.isAI) return;
    if (e.key === this.rightKey) {
      this.turnRight(walls);
    }

    if (e.key === this.leftKey) {
      this.turnLeft(walls);
    }

    if (e.key === this.upKey && this.vanishTime > 0) {
      this.startVanish();
    }

    if (e.key === this.downKey) {
      this.startBoost(ctx);
    }
  }

  handleKeyRelease(e: KeyboardEvent, walls: Rectangle[]) {
    if (this.isAI) return;
    if (e.key === this.upKey && this.isVanished) {
      this.stopVanish(walls);
    }

    if (e.key === this.downKey) {
      this.stopBoost();
    }
  }

  // Called during countdown to show initial direction of snake
  drawArrow(ctx: CanvasRenderingContext2D) {
    const length = this.size;
    const halfWidth = this.size * 0.4;
    const midX = this.head.x + this.head.w / 2;
    const midY = this.head.y + this.head.h / 2;

    let tipX = midX;
    let tipY = midY;
    let base1X = midX;
    let base1Y = midY;
    let base2X = midX;
    let base2Y = midY;

    if (this.direction == "right") {
      tipX = this.head.x + this.head.w + ARROW_OFFSET;
      tipY = midY;
      base1X = tipX - length;
      base1Y = midY - halfWidth;
      base2X = tipX - length;
      base2Y = midY + halfWidth;
    } else if (this.direction == "up") {
      tipX = midX;
      tipY = this.head.y - ARROW_OFFSET;
      base1X = midX - halfWidth;
      base1Y = tipY + length;
      base2X = midX + halfWidth;
      base2Y = tipY + length;
    } else if (this.direction == "left") {
      tipX = this.head.x - ARROW_OFFSET;
      tipY = midY;
      base1X = tipX + length;
      base1Y = midY - halfWidth;
      base2X = tipX + length;
      base2Y = midY + halfWidth;
    } else if (this.direction == "down") {
      tipX = midX;
      tipY = this.head.y + this.head.h + ARROW_OFFSET;
      base1X = midX - halfWidth;
      base1Y = tipY - length;
      base2X = midX + halfWidth;
      base2Y = tipY - length;
    }

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(base1X, base1Y);
    ctx.lineTo(base2X, base2Y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export default Snake;
