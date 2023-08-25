// types.ts

type BlockPosition = { x: number; y: number };

class Tetromino {
  constructor(public blocks: BlockPosition[], public color: string) {}
}

type State = {
  board: (string | null)[][],
  currentTetromino: Tetromino,
  tetrominoPosX: number,
  tetrominoPosY: number,
  gameEnd: boolean
};

interface Action {
  updateState(s: State): State;
}

export { BlockPosition, Tetromino, State, Action };
