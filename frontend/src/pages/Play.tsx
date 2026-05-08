import { useState } from "react";
import Canvas from "../BattleSnake/Canvas";

const SNAKE_COLORS = ["blue", "green", "red", "purple"];
const CONTROLLER_SETS = [
  { Left: "ArrowLeft", Right: "ArrowRight", Up: "ArrowUp", Down: "ArrowDown" },
  { Left: "a", Right: "d", Up: "w", Down: "s" },
  { Left: "j", Right: "l", Up: "i", Down: "k" },
  { Left: "f", Right: "h", Up: "t", Down: "g" },
];

// Game Options
const DIMENSIONS = [
  { size: "Small", w: 600, h: 400 },
  { size: "Medium", w: 800, h: 600 },
  { size: "Large", w: 1000, h: 700 },
];
const BOARD_COLORS = ["Black", "Gray", "Pink"];
const MAPS = ["Empty", "Segfaults", "Random", "Random with colors"];
const NB_PLAYERS = [1, 2, 3, 4]; // NO MORE PLAYERS (by value) THAN 'SNAKE_COLORS' OR 'CONTROLLER_SETS'.
const SPEEDS = [
  { label: "Low", s: 1 },
  { label: "Medium", s: 2 },
  { label: "High", s: 3 },
];
const VANISH_TIMES = [0, 1, 2, 3];

const Play = () => {
  type GameState = "menu" | "playing" | "gameover";
  const [gameState, setGameState] = useState<GameState>("menu");
  const [gameKey, setGameKey] = useState(0);
  const [winner, setWinner] = useState<string | null>(null); // stores the color of the winner snake. (Replace color by id or Snake if needed).
  const [vsBot, setVsBot] = useState(false);

  // Init Options
  const [dimensionsSelected, setDimensions] = useState(DIMENSIONS[1]);
  const [colorSelected, setColor] = useState(BOARD_COLORS[1]);
  const [mapSelected, setMap] = useState(MAPS[0]);
  const [nbPlayersSelected, setNbPlayers] = useState(NB_PLAYERS[1]);
  const [speedSelected, setSpeed] = useState(SPEEDS[1]);
  const [vanishSelected, setVanish] = useState(VANISH_TIMES[2]);

  const handleSetDefaults = () => {
    setDimensions(DIMENSIONS[1]);
    setColor(BOARD_COLORS[1]);
    setMap(MAPS[0]);
    setNbPlayers(NB_PLAYERS[1]);
    setSpeed(SPEEDS[1]);
    setVanish(VANISH_TIMES[2]);
  };

  const handleGameOver = (winner: string | null) => {
    setWinner(winner);
    setGameState("gameover");
    // For eventual storage of game result: `await fetch("/api/stats", { userId: user.id, victorious: boolean }) whatever`
  };

  const getBtnClass = (isSelected: boolean) => {
    return `min-h-11 flex-1 px-4 py-2 outline-1 transition-colors ${isSelected ? "bg-gray-400" : "bg-gray-300"}`;
  };

  return (
    <div className="flex flex-col items-center gap-8 px-4 py-2 sm:gap-10 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold">Game Room</h1>
      </div>

      {gameState === "menu" && (
        <div className="flex w-full max-w-5xl flex-col items-center gap-8 sm:gap-10">
          {/* First Row: Default settings & Start Game */}
          <div className="flex w-full flex-col gap-3 pb-2 sm:pb-4 md:flex-row md:flex-wrap md:justify-center">
            <button
              className="w-full rounded bg-green-500 px-4 py-3 hover:bg-green-600 md:w-auto"
              onClick={handleSetDefaults}
            >
              Set Default Settings
            </button>
            <button
              className="w-full rounded bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 md:w-auto"
              onClick={() => {
                setVsBot(false);
                setGameState("playing");
              }}
            >
              Start Game
            </button>
            <button
              className={`w-full rounded px-4 py-3 font-bold text-white md:w-auto ${
                nbPlayersSelected === 1
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
              onClick={() => {
                setVsBot(true);
                setGameState("playing");
              }}
              disabled={nbPlayersSelected !== 1}
            >
              Start 1 vs Bot
            </button>
          </div>

          {/* Setting the Grid */}
          <div className="grid w-full max-w-4xl grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
            {/* First Row: Number of Players*/}
            <span className="font-semibold md:text-right">Number of Players</span>
            <div className="flex w-full flex-wrap overflow-hidden rounded-md border">
              {NB_PLAYERS.map((n, index) => {
                const isSelected = nbPlayersSelected === n;
                const isWithinRange = n <= nbPlayersSelected; // Determine if this button represents a player count within the selection

                return (
                  <button
                    key={n}
                    className={`min-h-11 flex-1 px-4 py-2 text-white font-bold outline-1 transition-colors ${
                      isSelected ? "border-2" : ""
                    }`}
                    style={{ backgroundColor: isWithinRange ? SNAKE_COLORS[index] : "gray" }}
                    onClick={() => setNbPlayers(n)}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            {/* Second row: Controllers (no button) */}
            <div className="font-semibold md:text-right">
              <div>Vanish</div>
              <div>Turn Left</div>
              <div>Turn Right</div>
              <div>Speed Boost</div>
            </div>
            <div className="grid grid-cols-2 rounded-md border-2 bg-amber-100 sm:grid-cols-3 lg:grid-cols-4">
              {CONTROLLER_SETS.slice(0, nbPlayersSelected).map((set, index) => {
                const textClass = `font-bold ${index !== 0 ? "uppercase" : ""}`;

                return (
                  <div key={index} className="border-b border-black/10 p-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                    <div className="text-center">
                      <div className={textClass}>{set.Up}</div>
                      <div className={textClass}>{set.Left}</div>
                      <div className={textClass}>{set.Right}</div>
                      <div className={textClass}>{set.Down}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <span className="font-semibold md:text-right">Board Size</span>
            <div className="flex w-full flex-wrap overflow-hidden rounded-md border">
              {DIMENSIONS.map((dim) => (
                <button
                  key={`${dim.w}x ${dim.h}`}
                  className={getBtnClass(
                    dimensionsSelected.w === dim.w && dimensionsSelected.h === dim.h,
                  )}
                  onClick={() => setDimensions(dim)}
                >
                  {dim.size}
                </button>
              ))}
            </div>

            <span className="font-semibold md:text-right">Board Color</span>
            <div className="flex w-full flex-wrap overflow-hidden rounded-md border">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  className={getBtnClass(colorSelected === c)}
                  onClick={() => setColor(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <span className="font-semibold md:text-right">Map</span>
            <div className="flex w-full flex-wrap overflow-hidden rounded-md border">
              {MAPS.map((m) => (
                <button
                  key={m}
                  className={getBtnClass(mapSelected === m)}
                  onClick={() => setMap(m)}
                >
                  {m}
                </button>
              ))}
            </div>

            <span className="font-semibold md:text-right">Speed</span>
            <div className="flex w-full flex-wrap overflow-hidden rounded-md border">
              {SPEEDS.map((s) => (
                <button
                  key={s.label}
                  className={getBtnClass(speedSelected === s)}
                  onClick={() => setSpeed(s)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <span className="font-semibold md:text-right">Vanish Fuel (in seconds)</span>
            <div className="flex w-full flex-wrap overflow-hidden rounded-md border">
              {VANISH_TIMES.map((t) => (
                <button
                  key={t}
                  className={getBtnClass(vanishSelected === t)}
                  onClick={() => setVanish(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(gameState === "playing" || gameState === "gameover") && (
        <div className="flex w-full max-w-6xl flex-col items-center gap-4">
          <button
            className="w-full max-w-xs rounded bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700"
            onClick={() => setGameState("menu")}
          >
            End Game
          </button>

          <div className="relative w-full overflow-x-auto">
            <div className="mx-auto w-fit min-w-full sm:min-w-0">
              <Canvas
                key={gameKey}
                width={dimensionsSelected.w}
                height={dimensionsSelected.h}
                bgColor={colorSelected}
                nbPlayers={nbPlayersSelected}
                map={mapSelected}
                speed={speedSelected.s}
                vanishTime={vanishSelected}
                controllerSets={CONTROLLER_SETS}
                snakeColors={SNAKE_COLORS}
                vsBot={vsBot}
                onGameOver={handleGameOver}
              />
            </div>

            {gameState === "gameover" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="mx-4 flex max-w-[calc(100%-2rem)] flex-col items-center gap-5 rounded bg-white/40 p-5 text-center text-white backdrop-blur">
                  <h2 className="text-2xl font-bold sm:text-3xl">
                    {winner ? <span>{winner} wins!</span> : "No winner"}
                  </h2>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <button
                      className="rounded bg-green-500 px-6 py-3 font-bold text-white hover:bg-green-600"
                      onClick={() => {
                        setGameKey((k) => k + 1);
                        setGameState("playing");
                      }}
                    >
                      Play Again
                    </button>
                    <button
                      className="rounded bg-gray-400 px-6 py-3 font-bold text-white hover:bg-gray-500"
                      onClick={() => setGameState("menu")}
                    >
                      Back to Menu
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Play;
