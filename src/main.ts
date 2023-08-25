/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */


// =======================
//  constants & Imports
// =======================
import "./style.css";

import { fromEvent, interval, merge, takeUntil } from "rxjs";
import { map, filter, scan } from "rxjs/operators";
import { BehaviorSubject } from 'rxjs';
import { Subject } from 'rxjs';




/** Constants */

const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
  PREVIEW_WIDTH: 160,
  PREVIEW_HEIGHT: 80,
} as const;

const Constants = {
  TICK_RATE_MS: 500,
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
} as const;

const Block = {
  WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
  HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
};

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State) => s;

/** Rendering (side effects) */

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
  elem.setAttribute("visibility", "visible");
  elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
  elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
  namespace: string | null,
  name: string,
  props: Record<string, string> = {}
) => {
  const elem = document.createElementNS(namespace, name) as SVGElement;
  Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
  return elem;
};

type BlockShape = ReadonlyArray<ReadonlyArray<number>>;

const SHAPES: Record<string, BlockShape[]> = {
  I: [[[1, 1, 1, 1]], [[1], [1], [1], [1]]],
  O: [[[1, 1], [1, 1]]],
  T: [[[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[1, 1, 1], [0, 1, 0]], [[0, 1], [1, 1], [0, 1]]],
  S: [[[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]]],
  Z: [[[1, 1, 0], [0, 1, 1]], [[0, 1], [1, 1], [1, 0]]],
  J: [[[1, 0, 0], [1, 1, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 1, 1], [0, 0, 1]], [[0, 1], [0, 1], [1, 1]]],
  L: [[[0, 0, 1], [1, 1, 1]], [[1, 0], [1, 0], [1, 1]], [[1, 1, 1], [1, 0, 0]], [[1, 1], [0, 1], [0, 1]]],
};

const TETROMINO_COLORS = {
  I: 'cyan',
  O: 'yellow',
  T: 'purple',
  S: 'green',
  Z: 'red',
  J: 'blue',
  L: 'orange'
};

const currentTetromino: Tetromino = {
  shape: SHAPES.I[0], // Starting with the I shape as an example
  position: { x: Math.floor(Constants.GRID_WIDTH / 2) - 1, y: 0 }, // Start at the top center of the board
  color: 'cyan',
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const initialBoard: number[][] = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
const board$ = new BehaviorSubject<number[][]>(initialBoard);

const gameEnd$ = new Subject<void>();

// =======================
//  Types
// =======================

type Tetromino = {
  shape: BlockShape,
  position: { x: number, y: number },
  color: string,
};

type Key = "KeyS" | "KeyA" | "KeyD";

type Event = "keydown" | "keyup" | "keypress";

type State = Readonly<{
  gameEnd: boolean;
}>;

const initialState: State = {
  gameEnd: false,
} as const;

// =======================
//  Movements
// =======================


// Updating y position when we want move down movement to be done 
const moveDown = (tetromino: Tetromino): Tetromino => {
  return {
    ...tetromino,
    position: {
      ...tetromino.position,
      y: tetromino.position.y + 1,
    },
  };
};

// Smae logic update the block's x position for both move left and right 
const moveLeft = (tetromino: Tetromino): Tetromino => {
  return {
    ...tetromino,
    position: {
      ...tetromino.position,
      x: tetromino.position.x - 1,
    },
  };
};

const moveRight = (tetromino: Tetromino): Tetromino => {
  return {
    ...tetromino,
    position: {
      ...tetromino.position,
      x: tetromino.position.x + 1,
    },
  };
};


// =======================
//  Functions 
// =======================

const isValidMove = (tetromino: Tetromino, board: number[][]): boolean => {
  return !tetromino.shape.some((row, y) => 
    row.some((cell, x) => {
      const boardX = tetromino.position.x + x;
      const boardY = tetromino.position.y + y;

      // Check if the cell is outside the game board
      const isOutside = 
        boardX < 0 || 
        boardX >= Constants.GRID_WIDTH || 
        boardY >= Constants.GRID_HEIGHT;

      // Check if the cell overlaps with another block
      const isOverlap = board[boardY] && board[boardY][boardX] && cell;

      return isOutside || isOverlap;
    })
  );
};

const handleUserInput = (keyCode: string, tetromino: Tetromino): Tetromino => {
  switch (keyCode) {
    case "KeyA": // Move Left
      const leftTetromino = moveLeft(tetromino);
      return isValidMove(leftTetromino, board$.value) ? leftTetromino : tetromino;

    case "KeyD": // Move Right
      const rightTetromino = moveRight(tetromino);
      return isValidMove(rightTetromino, board$.value) ? rightTetromino : tetromino;

    case "KeyS": // Move Down
      const downTetromino = moveDown(tetromino);
      return isValidMove(downTetromino, board$.value) ? downTetromino : tetromino;

    case "KeyW": // Rotate
      const rotatedTetromino = rotateTetromino(tetromino);
      return isValidMove(rotatedTetromino, board$.value) ? rotatedTetromino : tetromino;

    default:
      return tetromino;
  }
};


const addTetrominoToBoard = (tetromino: Tetromino, board: number[][]): number[][] => {
  const newBoard = board.map(row => row.slice()); // Create a copy of the board
  tetromino.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        newBoard[tetromino.position.y + y][tetromino.position.x + x] = 1;
      }
    });
  });
  return newBoard;
};

const getRandomTetromino = (): Tetromino => {
  const tetrominoKeys = Object.keys(SHAPES);
  //By using as keyof typeof TETROMINO_COLORS, 
  // we're telling TypeScript that randomKey is specifically one of the keys of the TETROMINO_COLORS object, which should resolve the error.
  const randomKey = tetrominoKeys[Math.floor(Math.random() * tetrominoKeys.length)] as keyof typeof TETROMINO_COLORS;
  const randomRotation = SHAPES[randomKey][Math.floor(Math.random() * SHAPES[randomKey].length)];

  return {
    shape: randomRotation,
    position: { x: Math.floor(Constants.GRID_WIDTH / 2) - 1, y: 0 },
    color: TETROMINO_COLORS[randomKey],
  };
};


const rotateTetromino = (tetromino: Tetromino): Tetromino => {
  const newShape = tetromino.shape[0].map((_, index) =>
    tetromino.shape.map(row => row[index])
  ).reverse();

  return {
    ...tetromino,
    shape: newShape
  };
};

const tetromino$ = new BehaviorSubject<Tetromino>(getRandomTetromino());

// =======================
// Rendering Functions
// =======================

/**
 * Renders the tetromino on the game board.
 * @param tetromino The current tetromino to render.
 */
const renderTetromino = (tetromino: Tetromino, svg: SVGGraphicsElement & HTMLElement) => {
  // Clear previous tetromino rendering
  svg.innerHTML = '';

  // Render the tetromino on the board
  tetromino.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        const cube = createSvgElement(svg.namespaceURI, "rect", {
          height: `${Block.HEIGHT}`,
          width: `${Block.WIDTH}`,
          x: `${(tetromino.position.x + x) * Block.WIDTH}`,
          y: `${(tetromino.position.y + y) * Block.HEIGHT}`,
          style: `fill: ${tetromino.color}`,
        });
        svg.appendChild(cube);
      }
    });
  });
};

// =======================
// Game Loop 
// =======================

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
export function main() {
  // Canvas elements
  const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
    HTMLElement;
  const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
    HTMLElement;
  const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
    HTMLElement;
  const container = document.querySelector("#main") as HTMLElement;

  svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
  svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
  preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
  preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);

  // Text fields
  const levelText = document.querySelector("#levelText") as HTMLElement;
  const scoreText = document.querySelector("#scoreText") as HTMLElement;
  const highScoreText = document.querySelector("#highScoreText") as HTMLElement;

  /** User input */

  const key$ = fromEvent<KeyboardEvent>(document, "keypress");

  const fromKey = (keyCode: Key) =>
    key$.pipe(filter(({ code }) => code === keyCode));

  const left$ = fromKey("KeyA");
  const right$ = fromKey("KeyD");
  const down$ = fromKey("KeyS");

  /** Observables */

  /** Determines the rate of time steps */
  const tick$ = interval(Constants.TICK_RATE_MS);

  const newBoard = addTetrominoToBoard(currentTetromino, board$.value);
  board$.next(newBoard);

  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * @param s Current state
   */
  const render = (s: State) => {
    renderTetromino(tetromino$.value, svg);

    if (s.gameEnd) {
      show(gameover);
    } else {
      hide(gameover);
    }
  };

  tick$.pipe(
    takeUntil(gameEnd$)
  ).subscribe(() => {
    const currentTetromino = tetromino$.value;
    const movedTetromino = moveDown(currentTetromino);
  
    if (isValidMove(movedTetromino, board$.value)) {
      tetromino$.next(movedTetromino);
    } else {
      // Add the current tetromino to the board
      const updatedBoard = addTetrominoToBoard(currentTetromino, board$.value);
      board$.next(updatedBoard);
  
      // Generate a new tetromino
      const newTetromino = getRandomTetromino();
  
      // Check for game over
      if (!isValidMove(newTetromino, board$.value)) {
        gameEnd$.next();
      } else {
        tetromino$.next(newTetromino);
      }
    }
  
    render({ gameEnd: false });
  });
  
  
  key$.subscribe(event => {
    const currentTetromino = tetromino$.value;
    const newTetromino = handleUserInput(event.code, currentTetromino);
    tetromino$.next(newTetromino);
    render({ gameEnd: false });
  });
  
  const source$ = merge(tick$)
    .pipe(scan((s: State) => ({ gameEnd: true }), initialState))
    .subscribe((s: State) => {
      render(s);
    });
  }

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
