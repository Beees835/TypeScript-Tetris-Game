// state.ts

import { State, Action } from './types';
import { NewTetrominoAction } from './observable'; // Assuming you'll define the action here
import { main } from './main';
type state = Readonly<{
    board: (string | null)[][],
    currentTetromino: Tetromino,
    tetrominoPosX: number,
    tetrominoPosY: number,
    gameEnd: boolean
  }>;

const initialState: State = {
    board: Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null)),
    currentTetromino: getRandomTetromino(),
    tetrominoPosX: BOARD_WIDTH / 2,
    tetrominoPosY: 0,
    gameEnd: false
  };
  
  

class NewTetrominoAction implements Action {
  updateState(s: State): State {
    return { ...s, currentTetromino: randomTetromino() };
  }
}

export { initialState, NewTetrominoAction };
