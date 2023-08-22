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

import "./style.css";

import { fromEvent, interval, merge } from "rxjs";
import { map, filter, scan } from "rxjs/operators";

/** Constants */


// Constants as required 10 x 20 
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 21;


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

// All shapes of Tetrominos 
const I_TETROMINO = [
  [1, 1, 1, 1] 
]; 

const O_TETROMINO = [
  [1, 1],
  [1, 1]
];

const T_TETROMINO = [ 
  [1, 1, 1], 
  [0, 1, 0]
]

const S_TETROMINO = [
  [0, 1, 1],
  [1, 1, 0]
];

const Z_TETROMINO = [
  [1, 1, 0],
  [0, 1, 1]
];

const J_TETROMINO = [
  [1, 0, 0],
  [1, 1, 1]
];

const L_TETROMINO = [
  [0, 0, 1],
  [1, 1, 1]
];

const TETROMINOES = [I_TETROMINO, O_TETROMINO, T_TETROMINO, S_TETROMINO, Z_TETROMINO, J_TETROMINO, L_TETROMINO];

const randomTetromino = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];


/** User input */

type Key = "KeyS" | "KeyA" | "KeyD";

type Event = "keydown" | "keyup" | "keypress";

/** Utility functions */

/** State processing */
type Tetromino = {
  shape: number[][];
  posX: number;
  posY: number;
};

type State = Readonly<{
  gameEnd: boolean;
  board: number[][];
  currentTetromino: Tetromino;
}>;

const initialState: State = {
  gameEnd: false,
  board: Array(BOARD_HEIGHT).fill(Array(BOARD_WIDTH).fill(0)),

  // This is how we let the Tetrominos appear on the screen 
  currentTetromino: {
    shape: TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)],
    posX: Math.floor(BOARD_WIDTH / 2) - 1, // Center the tetromino
    posY: 0,
  }
} as const;

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State) => {
  let newY = s.currentTetromino.posY + 1;
  if (canMoveTo(s.currentTetromino.shape, s.board, s.currentTetromino.posX, newY)) {
      return {
          ...s,
          currentTetromino: {
              ...s.currentTetromino,
              posY: newY
          }
      };
  } else {
      // The tetromino has landed. You can merge it with the board and spawn a new tetromino here.
      return s;
  }
};

function canMoveTo(tetromino: number[][], board: number[][], posX: number, posY: number): boolean {
  for (let y = 0; y < tetromino.length; y++) {
      for (let x = 0; x < tetromino[y].length; x++) {
          if (tetromino[y][x] === 1) {
              if (
                  // Check if out of board boundaries
                  posY + y > BOARD_HEIGHT - 1||
                  posX + x >= BOARD_WIDTH ||
                  posX + x < 0 ||
                  // Check if overlaps with another block
                  board[posY + y][posX + x] !== 0
              ) {
                  return false;
              }
          }
      }
  }
  return true;
}


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

  // Helper functions

  function canMove(shape: number[][], board: number[][], posX: number, posY: number): boolean {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (
                shape[y][x] && // Part of the Tetromino
                (
                    // Check if out of board bounds
                    y + posY >= BOARD_HEIGHT ||
                    x + posX >= BOARD_WIDTH ||
                    x + posX < 0 ||
                    // or collides with another block
                    board[y + posY][x + posX] !== 0
                )
            ) {
                return false;
            }
        }
    }
    return true;
}
  
  /** Determines the rate of time steps */
  const tick$ = interval(Constants.TICK_RATE_MS);

  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * @param s Current state
   */
  const render = (s: State) => {
   
    if (s.currentTetromino) {
      renderTetromino(s.currentTetromino.shape, s.currentTetromino.posX, s.currentTetromino.posY, "orange", svg);
    }

    // Add blocks to the main grid canvas
    const cube = createSvgElement(svg.namespaceURI, "rect", {
      height: `${Block.HEIGHT}`,
      width: `${Block.WIDTH}`,
      x: "0",
      y: "0",
      style: "fill: green",
    });
    svg.appendChild(cube);
    const cube2 = createSvgElement(svg.namespaceURI, "rect", {
      height: `${Block.HEIGHT}`,
      width: `${Block.WIDTH}`,
      x: `${Block.WIDTH * (3 - 1)}`,
      y: `${Block.HEIGHT * (20 - 1)}`,
      style: "fill: red",
    });
    svg.appendChild(cube2);
    const cube3 = createSvgElement(svg.namespaceURI, "rect", {
      height: `${Block.HEIGHT}`,
      width: `${Block.WIDTH}`,
      x: `${Block.WIDTH * (4 - 1)}`,
      y: `${Block.HEIGHT * (20 - 1)}`,
      style: "fill: red",
    });
    svg.appendChild(cube3);

    // Add a block to the preview canvas
    const cubePreview = createSvgElement(preview.namespaceURI, "rect", {
      height: `${Block.HEIGHT}`,
      width: `${Block.WIDTH}`,
      x: `${Block.WIDTH * 2}`,
      y: `${Block.HEIGHT}`,
      style: "fill: green",
    });
    preview.appendChild(cubePreview);
  } 

  function renderBlock(x: number, y: number, color: string, svg: SVGGraphicsElement) {
    const rect = createSvgElement(svg.namespaceURI, "rect", {
      x: `${x * Block.WIDTH}`,
      y: `${y * Block.HEIGHT}`,
      width: `${Block.WIDTH}`,
      height: `${Block.HEIGHT}`,
      style: `fill:${color}`
    });
    svg.appendChild(rect);
  }
  

  function renderTetromino(tetromino: number[][], posX: number, posY: number, color: string, svg: SVGGraphicsElement) {
    const tetrominoHeight = tetromino.length;
    const adjustedPosY = posY - (tetrominoHeight - 1);
    for (let y = 0; y < tetrominoHeight; y++) {
        for (let x = 0; x < tetromino[y].length; x++) {
            if (tetromino[y][x] === 1) {
                renderBlock(posX + x, adjustedPosY + y, color, svg);
            }
        }
    }
}

  

  // return true of false if there is any blocks reach the 21 space cloumn end the game (true) else false;    
  // fnction checkEnd() { 

  // }; 
  
  const source$ = merge(tick$)
  .pipe(
    scan((acc: State) => {
      if (!acc.currentTetromino) return acc;

      const newY = acc.currentTetromino.posY + 1;

      // Check if the Tetromino can move down
      if (canMove(acc.currentTetromino.shape, acc.board, acc.currentTetromino.posX, newY)) {
        // Move the Tetromino down
        return {
          ...acc,
          currentTetromino: {
            ...acc.currentTetromino,
            posY: newY,
          },
        };
      } else {
        // Lock the Tetromino in place and spawn a new one
        const newBoard = [...acc.board];
        for (let y = 0; y < acc.currentTetromino.shape.length; y++) {
          for (let x = 0; x < acc.currentTetromino.shape[y].length; x++) {
            if (acc.currentTetromino.shape[y][x]) {
              newBoard[y + acc.currentTetromino.posY][x + acc.currentTetromino.posX] = 1;
            }
          }
        }
        return {
          ...acc,
          board: newBoard,
          currentTetromino: {
            shape: TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)],
            posX: Math.floor(BOARD_WIDTH / 2) - 1,
            posY: 0,
          },
        };
      }
    }, initialState)
  )
  .subscribe((s: State) => {
    render(s);

    if (s.gameEnd) {
      show(gameover);
    } else {
      hide(gameover);
    }
  });
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
