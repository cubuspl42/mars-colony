import { MutableCell } from "./frp/Cell";
import { Vec2 } from "./geometry";
import { createHexGridCanvas } from "./drawing";

const selectedHexCoord = new MutableCell<Vec2>({ x: 0, y: 0 });

const canvas = createHexGridCanvas({
    selectedHexCoord: selectedHexCoord,
});

document.body.appendChild(canvas);
