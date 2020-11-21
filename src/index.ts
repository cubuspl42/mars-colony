import { MutableCell } from "./frp/Cell";
import { Vec2 } from "./geometry";
import { createHexGridCanvas } from "./drawing";
import { Game, HexCoord } from "./game";

const game = new Game();

const selectedHexCoord = new MutableCell<HexCoord>({ i: 0, j: 0 });

const canvas = createHexGridCanvas({
    selectedHexCoord: selectedHexCoord,
    game: game,
});

document.body.appendChild(canvas);
