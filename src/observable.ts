// observable.ts

import { fromEvent, map } from "rxjs";
import { NewTetrominoAction } from './state';

const keyPress$ = fromEvent<KeyboardEvent>(document, 'keypress').pipe(
  map(e => new NewTetrominoAction())
);

export { keyPress$ };
