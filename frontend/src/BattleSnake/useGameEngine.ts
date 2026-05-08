import { useEffect, useRef } from "react";
import { decideAIAction, applyAIAction, resetAIState } from "./AIController";
import Snake from "./Snake";
import Board from "./Board";

export type GameProps = {
  width: number;
  height: number;
  bgColor: string;
  nbPlayers: number;
  map: string;
  speed: number;
  vanishTime: number;
  controllerSets: {
    Left: string;
    Right: string;
    Up: string;
    Down: string;
  }[];
  snakeColors: string[];
  vsBot: boolean;
  onGameOver: (winner: string | null) => void;
};

export type Rectangle = {
  x: number
  y: number
  w: number
  h: number
}

export type Dir = "right" | "up" | "left" | "down";

// Game Config
const MS_PER_UPDATE = 16.67 // Target 60 updates per second
const headSize = 10;

export const useGameEngine = ({ width, height, bgColor, nbPlayers, map, speed, vanishTime, controllerSets, snakeColors, vsBot, onGameOver }: GameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Init Canvas, times
    const canvas = canvasRef.current;
    if (!canvas) return ;
    const ctx = canvas.getContext("2d");
    if (!ctx) return ;

    resetAIState();

    let animationFrameId: number;
    let lastTime = performance.now(); // high-resolution timestamp representing the number of milliseconds elapsed since the page's time origin.
    let lag = 0;
    let countDown = 3;

    // Style for countdown text
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Init board and players
    const board = new Board(width, height, bgColor);
    board.initBorders(ctx);

    const actualNbPlayers = vsBot ? 2 : nbPlayers;
    
    let alivePlayers: number = actualNbPlayers;
    const players: Snake[] = [];

    for (let i = 0; i < actualNbPlayers; i++) {
      let startX = width / 4;
      let startY = height / 4;
      let direction: Dir = "right";

      if (i === 1) {
        startX += width / 2;
        startY += height / 2;
        direction = "left";
      } else if (i === 2) {
        startX += width / 2;
        direction = "down";
      } else if (i === 3) {
        startY += height / 2;
        direction = "up";
      }

      const player = new Snake(
        i + 1,
        startX,
        startY,
        direction,
        controllerSets[i].Left,
        controllerSets[i].Right,
        controllerSets[i].Up,
        controllerSets[i].Down,
        snakeColors[i],
        speed,
        vanishTime * 1000,
        headSize,
        vsBot && (i === 1),
      );

      board.walls.push(player.currentTrail);
      players.push(player);
    }

    board.buildMap(ctx, map, players); // Generate map after players initialization so obstacles do not spawn around and on players

    const drawCount = () => {
      const clearingSize = 50; // It clears random drawn rectangles too ! In 'mapGenerator' of Board.ts, do not store rectangle in the middle (where the countdown is drawn)

      // Clear previous number
      ctx.fillStyle = bgColor;
      ctx.fillRect(width / 2 - clearingSize / 2, height / 2 - clearingSize / 2, clearingSize, clearingSize);

      // Draw new number (do not draw 0)
      if (countDown > 0) {
        ctx.fillStyle = "white";
        ctx.fillText(countDown.toString(), width / 2, height / 2);
      }
    }

    // countdown loop
    const renderCountdown = (currentTime: number) => {
      lag += currentTime - lastTime;
      lastTime = currentTime;

      // Draw directions of players
      for (let i = 0; i < players.length; i++) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(players[i].head.x - 20, players[i].head.y - 20, 40, 40);
        players[i].drawArrow(ctx);
      }

      if (lag >= 1000) {
        countDown--;
        lag -= 1000;
        drawCount();
      }

      if (countDown > 0) {
        animationFrameId = window.requestAnimationFrame(renderCountdown);
      } else {
        // Clear the directions
        for (let i = 0; i < players.length; i++) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(players[i].head.x - 20, players[i].head.y - 20, 40, 40);
        }

        // Start the game
        lastTime = performance.now();
        lag = 0;
        render(lastTime);
      }
    };

    // GAME LOOP
    const render = (currentTime: number) => {
      animationFrameId = window.requestAnimationFrame(render); // Schedules itself to run again in (1 / (monitor's refresh rate)) [ms]. For example, a rate of 60Hz will ask the browser to run 'render' in 16.67ms. 'currentTime' is automatically provided/updated by rAF and is the timestamp of when rAF starts to execute the callback.

      const elapsed = currentTime - lastTime; // Time passed since last frame
      lastTime = currentTime;
      lag += elapsed;

      while (lag >= MS_PER_UPDATE) {

        for (let i = 0; i < players.length; i++) {
          if (players[i].isAlive)
          {
            if (players[i].isAI) {
              const action = decideAIAction(players[i], board.walls);
              applyAIAction(action, players[i], board.walls, ctx);
            }
            players[i].advance(ctx, width, height);
            if (!players[i].isVanished) {
              if (players[i].checkCollision(board.walls)) {
                alivePlayers--;
              }
            }
            players[i].checkVanishing(MS_PER_UPDATE, board.walls);
          }
        }

        // Game Over
        if ((alivePlayers === 1 && actualNbPlayers > 1) || (alivePlayers === 0))
        {
          const winner = players.find((p) => p.isAlive);
          if (winner) {
            onGameOver(winner.color);
          } else {
            onGameOver(null);
          }
          cleanUp();
          return ;
        }

        lag -= MS_PER_UPDATE;
        //console.log("Number of elements in walls: ", board.walls.length); // Check we are not pushing unnecessary segments
      }
    };

    // Keys handlers do not intervene during/inside a loop of 'render'. 
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      for (let i = 0; i < players.length; i++) {
        players[i].handleInput(e, board.walls, ctx);
      }
    }

    const handleKeyRelease = (e: KeyboardEvent) => {
      for (let i = 0; i < players.length; i++) {
        players[i].handleKeyRelease(e, board.walls);
      }
    }

    // Start everything
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyRelease);
    drawCount();
    animationFrameId = window.requestAnimationFrame(renderCountdown);

    // Called when Canvas component is removed from the DOM (When 'End Game' is clicked, isPlaying is set to false)
    const cleanUp = () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyRelease);
      window.cancelAnimationFrame(animationFrameId);
    };
    
    return cleanUp;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return canvasRef;
};