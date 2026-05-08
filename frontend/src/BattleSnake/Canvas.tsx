import { useGameEngine } from "./useGameEngine";
import type { GameProps } from "./useGameEngine";

const Canvas = (props: GameProps) => {
  const canvasRef = useGameEngine(props);

  return (
    <canvas
      ref={canvasRef}
      width={props.width}
      height={props.height}
      className="block w-full h-auto"
    />
  );
};

export default Canvas;
