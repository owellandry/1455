import type { MutableRefObject, ReactElement } from "react";
import { useEffect, useEffectEvent, useRef } from "react";

type SnakeDirection = "up" | "down" | "left" | "right";

type SnakePoint = {
  x: number;
  y: number;
};

const SNAKE_MIN_AXIS = 12;
const SNAKE_DEFAULT_CELL_SIZE = 18;
const SNAKE_TICK_MS = 120;

const SNAKE_DELTAS: Record<SnakeDirection, SnakePoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const SNAKE_OPPOSITES: Record<SnakeDirection, SnakeDirection> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function SnakeGame({
  onExit,
  audioContextRef,
}: {
  onExit: () => void;
  audioContextRef: MutableRefObject<AudioContext | null>;
}): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loopRef = useRef<number | null>(null);
  const snakeRef = useRef<Array<SnakePoint>>([]);
  const foodRef = useRef<SnakePoint>({ x: 0, y: 0 });
  const directionRef = useRef<SnakeDirection>("right");
  const nextDirectionRef = useRef<SnakeDirection>("right");
  const boardMetricsRef = useRef({
    columns: SNAKE_MIN_AXIS,
    rows: SNAKE_MIN_AXIS,
    cellSize: SNAKE_DEFAULT_CELL_SIZE,
    width: SNAKE_MIN_AXIS * SNAKE_DEFAULT_CELL_SIZE,
    height: SNAKE_MIN_AXIS * SNAKE_DEFAULT_CELL_SIZE,
  });
  const colorsRef = useRef<{ snake: string; food: string } | null>(null);
  const onExitEvent = useEffectEvent(onExit);
  const playTone = useEffectEvent(
    (frequency: number, durationMs: number, type: OscillatorType): void => {
      if (audioContextRef.current == null) {
        return;
      }
      if (audioContextRef.current!.state === "suspended") {
        void audioContextRef.current!.resume();
      }
      const durationSeconds = durationMs / 1000;
      const oscillator = audioContextRef.current!.createOscillator();
      const gain = audioContextRef.current!.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, audioContextRef.current!.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.18,
        audioContextRef.current!.currentTime + 0.01,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContextRef.current!.currentTime + durationSeconds,
      );
      oscillator.connect(gain);
      gain.connect(audioContextRef.current!.destination);
      oscillator.start();
      oscillator.stop(audioContextRef.current!.currentTime + durationSeconds);
      oscillator.onended = (): void => {
        oscillator.disconnect();
        gain.disconnect();
      };
    },
  );

  const stopLoop = (): void => {
    if (loopRef.current == null) {
      return;
    }
    window.clearInterval(loopRef.current);
    loopRef.current = null;
  };

  const resolveColors = (): { snake: string; food: string } => {
    if (colorsRef.current) {
      return colorsRef.current;
    }
    const canvas = canvasRef.current;
    if (canvas == null) {
      return { snake: "#ffffff", food: "#f97316" };
    }
    const snakeColor = getComputedStyle(canvas).color || "#ffffff";
    const rootStyle = getComputedStyle(document.documentElement);
    const foodColor =
      rootStyle.getPropertyValue("--vscode-charts-red").trim() ||
      rootStyle.getPropertyValue("--vscode-charts-orange").trim() ||
      "#f97316";
    const resolved = { snake: snakeColor, food: foodColor };
    colorsRef.current = resolved;
    return resolved;
  };

  const layoutCanvas = (): CanvasRenderingContext2D | null => {
    if (canvasRef.current == null) {
      return null;
    }
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvasRef.current.width = Math.max(
      1,
      Math.floor(boardMetricsRef.current.width * dpr),
    );
    canvasRef.current.height = Math.max(
      1,
      Math.floor(boardMetricsRef.current.height * dpr),
    );
    canvasRef.current.style.width = `${boardMetricsRef.current.width}px`;
    canvasRef.current.style.height = `${boardMetricsRef.current.height}px`;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx == null) {
      return null;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    return ctx;
  };

  const placeFood = (snake: Array<SnakePoint>): SnakePoint => {
    let nextFood = {
      x: Math.floor(Math.random() * boardMetricsRef.current.columns),
      y: Math.floor(Math.random() * boardMetricsRef.current.rows),
    };
    while (
      snake.some(
        (segment) => segment.x === nextFood.x && segment.y === nextFood.y,
      )
    ) {
      nextFood = {
        x: Math.floor(Math.random() * boardMetricsRef.current.columns),
        y: Math.floor(Math.random() * boardMetricsRef.current.rows),
      };
    }
    return nextFood;
  };

  const draw = useEffectEvent((): void => {
    const ctx = layoutCanvas();
    if (ctx == null) {
      return;
    }
    const colors = resolveColors();
    ctx.clearRect(
      0,
      0,
      boardMetricsRef.current.width,
      boardMetricsRef.current.height,
    );

    ctx.fillStyle = colors.snake;
    for (const segment of snakeRef.current) {
      ctx.fillRect(
        segment.x * boardMetricsRef.current.cellSize,
        segment.y * boardMetricsRef.current.cellSize,
        boardMetricsRef.current.cellSize,
        boardMetricsRef.current.cellSize,
      );
    }

    ctx.fillStyle = colors.food;
    ctx.fillRect(
      foodRef.current.x * boardMetricsRef.current.cellSize,
      foodRef.current.y * boardMetricsRef.current.cellSize,
      boardMetricsRef.current.cellSize,
      boardMetricsRef.current.cellSize,
    );
  });

  const resetGame = useEffectEvent((): void => {
    const startX = Math.floor(boardMetricsRef.current.columns / 2);
    const startY = Math.floor(boardMetricsRef.current.rows / 2);
    snakeRef.current = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    directionRef.current = "right";
    nextDirectionRef.current = "right";
    foodRef.current = placeFood(snakeRef.current);
    draw();
  });

  const updateBoardMetrics = useEffectEvent((): void => {
    if (containerRef.current == null) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const columns = Math.max(
      SNAKE_MIN_AXIS,
      Math.floor(width / SNAKE_DEFAULT_CELL_SIZE),
    );
    const cellSize = width / columns;
    const rows = Math.max(SNAKE_MIN_AXIS, Math.floor(height / cellSize));
    boardMetricsRef.current = {
      columns,
      rows,
      cellSize,
      width,
      height,
    };
    resetGame();
  });

  useEffect(() => {
    updateBoardMetrics();
    const handleKeyDown = (event: KeyboardEvent): void => {
      let nextDirection: SnakeDirection | null = null;
      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        nextDirection = "up";
      } else if (
        event.key === "ArrowDown" ||
        event.key === "s" ||
        event.key === "S"
      ) {
        nextDirection = "down";
      } else if (
        event.key === "ArrowLeft" ||
        event.key === "a" ||
        event.key === "A"
      ) {
        nextDirection = "left";
      } else if (
        event.key === "ArrowRight" ||
        event.key === "d" ||
        event.key === "D"
      ) {
        nextDirection = "right";
      }
      if (nextDirection == null) {
        return;
      }
      event.preventDefault();
      if (SNAKE_OPPOSITES[directionRef.current] === nextDirection) {
        return;
      }
      nextDirectionRef.current = nextDirection;
    };
    const advance = (): void => {
      const snake = snakeRef.current;
      const head = snake[0];
      const direction = nextDirectionRef.current;
      const delta = SNAKE_DELTAS[direction];
      const nextHead = { x: head.x + delta.x, y: head.y + delta.y };

      if (
        nextHead.x < 0 ||
        nextHead.y < 0 ||
        nextHead.x >= boardMetricsRef.current.columns ||
        nextHead.y >= boardMetricsRef.current.rows
      ) {
        stopLoop();
        playTone(140, 220, "sawtooth");
        onExitEvent();
        return;
      }

      const isEating =
        nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;
      const bodyToCheck = isEating ? snake : snake.slice(0, -1);
      const hitSelf = bodyToCheck.some(
        (segment) => segment.x === nextHead.x && segment.y === nextHead.y,
      );
      if (hitSelf) {
        stopLoop();
        playTone(160, 220, "sawtooth");
        onExitEvent();
        return;
      }

      const nextSnake = isEating
        ? [nextHead, ...snake]
        : [nextHead, ...snake.slice(0, -1)];
      snakeRef.current = nextSnake;
      directionRef.current = direction;

      if (isEating) {
        foodRef.current = placeFood(nextSnake);
        playTone(660, 120, "square");
      }

      draw();
    };

    window.addEventListener("keydown", handleKeyDown);
    loopRef.current = window.setInterval(advance, SNAKE_TICK_MS);

    return (): void => {
      stopLoop();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="h-full w-full" ref={containerRef}>
      <canvas className="h-full w-full text-token-foreground" ref={canvasRef} />
    </div>
  );
}
