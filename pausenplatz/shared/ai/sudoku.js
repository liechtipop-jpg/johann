// Computer im Sudoku: Welches Feld und wie schnell, entscheidet das Spielmodul. Es zieht nur Felder,
// die man gerade logisch herausfinden kann, und hält das Tempo der gewählten Stärke. Die KI löst den Zug nur aus.
export default {
  choose: (view, legal) => legal.find((a) => a.type === 'bot') ?? null,
};
