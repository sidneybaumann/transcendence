
import type { Rectangle } from "./useGameEngine";
import { myFillRect, getRandomInt, almostSameColor } from "./utils";
import Snake from "./Snake";

// Borders
const GAP = 2;
const BORDER_SIZE = 5;

// Random rectangles
const MAX_SIZE = 100;
const MAX_RECTANGLES = 40;

class Board {
  bgColor: string;
  width: number;
  height: number;
  walls: Rectangle[]; // Will contain every segments including snakes trails

  constructor(width: number, height: number, bgColor: string) {
    this.bgColor = bgColor;
    this.width = width;
    this.height = height;
    this.walls = [];
  }

  initBorders(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // Pad borders
    const leftBorder: Rectangle = { x: GAP, y: GAP, w: BORDER_SIZE, h: this.height - GAP * 2 };
    const topBorder: Rectangle = { x: GAP, y: GAP, w: this.width - GAP * 2, h: BORDER_SIZE };
    const rightBorder: Rectangle = {
      x: this.width - GAP - BORDER_SIZE,
      y: GAP,
      w: BORDER_SIZE,
      h: this.height - GAP * 2,
    };
    const bottomBorder: Rectangle = {
      x: GAP,
      y: this.height - GAP - BORDER_SIZE,
      w: this.width - GAP * 2,
      h: BORDER_SIZE,
    };

    myFillRect(ctx, leftBorder, "white");
    myFillRect(ctx, topBorder, "white");
    myFillRect(ctx, rightBorder, "white");
    myFillRect(ctx, bottomBorder, "white");

    this.walls.push(leftBorder);
    this.walls.push(topBorder);
    this.walls.push(rightBorder);
    this.walls.push(bottomBorder);
  }

  buildMap(ctx: CanvasRenderingContext2D, map: string, players: Snake[]) {

    if (map === "Random") {
      this.generateRandomMap(ctx, players);
    } else if (map === "Random with colors") {
      this.generateRandomColorfulMap(ctx, players);
    } else if (map === "Segfaults") {
      this.generateSegfaults(ctx, players);
    }
  }

  almostColliding(snakePos: Rectangle, r: Rectangle) {
    const safeDist = 50;

    if ((
      // Snake collision
      snakePos.x - safeDist < r.x + r.w &&
      snakePos.y - safeDist < r.y + r.h &&
      snakePos.x + snakePos.w + safeDist > r.x &&
      snakePos.y + snakePos.h + safeDist > r.y
      ) || (
        // Center collision. Prevents putting a rectangle in the middle of the canvas (because we clear the middle to clear the text of the countdown)
        this.width / 2 - safeDist < r.x + r.w &&
        this.height / 2 - safeDist < r.y + r.h &&
        this.width / 2 + safeDist > r.x &&
        this.height / 2 + safeDist > r.y
      )
    ) {
      return true;
    }
    return false;
  }

  randomRectangle(maxWidth: number = MAX_SIZE, maxHeight: number = MAX_SIZE): Rectangle {
    const w = getRandomInt(3, maxWidth);
    const h = getRandomInt(3, maxHeight);

    return {
      x: getRandomInt(0, this.width - w),
      y: getRandomInt(0, this.height - h),
      w: w,
      h: h,
    };
  }

  generateRandomMap(ctx: CanvasRenderingContext2D, players: Snake[]) {
    for (let i = 0; i < MAX_RECTANGLES; i++) {
      const rect = this.randomRectangle();
      let oneCollides = false;

      for (let k = 0; k < players.length; k++) {
        if (this.almostColliding(players[k].head, rect)) {
          oneCollides = true;
          break;
        }
      }

      if (!oneCollides) {
        myFillRect(ctx, rect, "white");
        this.walls.push(rect);
      }
    }
  }

  generateRandomColorfulMap(ctx: CanvasRenderingContext2D, players: Snake[]) {
    const [rBg, gBg, bBg] = ctx.getImageData(0, 0, 1, 1).data;

    for (let i = 0; i < MAX_RECTANGLES; i++) {
      const rect = this.randomRectangle();
      let oneCollides = false;

      const r = getRandomInt(0, 255);
      const g = getRandomInt(0, 255);
      const b = getRandomInt(0, 255);

      for (let k = 0; k < players.length; k++) {
        if (this.almostColliding(players[k].head, rect)) {
          oneCollides = true;
          break;
        }
      }

      if (!oneCollides && !almostSameColor({ r, g, b }, { r: rBg, g: gBg, b: bBg })) {
        const randomColor = `rgb(${r}, ${g}, ${b})`;
        myFillRect(ctx, rect, randomColor);
        this.walls.push(rect);
      }
    }
  }

  generateSegfaults(ctx: CanvasRenderingContext2D, players: Snake[]) {
    for (let i = 0; i < MAX_RECTANGLES; i++) {
      const rect = this.randomRectangle(3, 300);
      let oneCollides = false;

      for (let k = 0; k < players.length; k++) {
        if (this.almostColliding(players[k].head, rect)) {
          oneCollides = true;
          break;
        }
      }

      if (!oneCollides) {
        myFillRect(ctx, rect, "white");
        this.walls.push(rect);
      }
    }

    for (let i = 0; i < MAX_RECTANGLES; i++) {
      const rect = this.randomRectangle(300, 3);
      let oneCollides = false;

      for (let k = 0; k < players.length; k++) {
        if (this.almostColliding(players[k].head, rect)) {
          oneCollides = true;
          break;
        }
      }

      if (!oneCollides) {
        myFillRect(ctx, rect, "white");
        this.walls.push(rect);
      }
    }
  }
}

export default Board;
