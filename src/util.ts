// util.ts

import { Tetromino } from './types';

const TETROMINOES: Tetromino[] = [/* ... */];

function randomTetromino(): Tetromino {
  return TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
}

export { randomTetromino };
