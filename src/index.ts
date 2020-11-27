import { MutableCell } from "./frp/Cell";
import { createHexGridCanvas } from "./drawing";
import { Game, HexCoord } from "./game";
import { createBuildingGroup } from "./buildings_group";
import { createHudElement } from "./hud";

const game = new Game();

const selectedHexCoord = new MutableCell<HexCoord>({ i: 0, j: 0 });

const root = document.createElement("div");

root.style.position = "relative";
root.style.width = "100vw";
root.style.height = "100vh";

document.body.appendChild(root);

const canvas = createHexGridCanvas({
    selectedHexCoord: selectedHexCoord,
    game: game,
});

canvas.style.position = "absolute";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.left = "0";
canvas.style.right = "0";

root.appendChild(canvas);

const buildingsGroup = createBuildingGroup({ game });

root.appendChild(buildingsGroup);

const hud = createHudElement({ game });

root.appendChild(hud);
