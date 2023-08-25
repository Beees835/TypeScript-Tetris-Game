// util.ts

import { Tetromino } from './main';

const TETROMINOES: Tetromino[] = [/* ... */];

function getRandomTetromino(): Tetromino {
  const randomIndex = Math.floor(Math.random() * TETROMINOES.length);
  return TETROMINOES[randomIndex];
}





export { getRandomTetromino };
