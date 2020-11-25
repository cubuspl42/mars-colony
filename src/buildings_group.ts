import { Game } from "./game";
import { mapHexCoordToWorldPoint } from "./hex";
import * as tm from "transformation-matrix";
import { hexGridScaleMatrix } from "./drawing";
import { ReactiveSet } from "./frp/ReactiveSet";

function clearChildren(element: HTMLElement) {
    while (element.firstChild) {
        element.removeChild(element.lastChild!);
    }
}

function link(elements: ReactiveSet<HTMLElement>, parent: HTMLElement) {
    elements.asCell().listen((elements) => {
        clearChildren(parent);
        elements.forEach((element) => parent.appendChild(element));
    });
}

export function createBuildingGroup(args: {
    readonly game: Game,
}): HTMLElement {
    const { game } = args;

    const buildingsGroup = document.createElement("div");
    buildingsGroup.style.position = "absolute";
    buildingsGroup.style.left = "50%";
    buildingsGroup.style.top = "50%";

    const elements = game.buildings.map((b) => {
        const pw = mapHexCoordToWorldPoint(b.coord);
        const ps = tm.applyToPoint(hexGridScaleMatrix, pw);

        const img = document.createElement("img");

        img.width = 128;
        img.src = "assets/building-a.png";
        img.style.position = "absolute";
        img.style.left = `${ps.x}px`;
        img.style.top = `${ps.y}px`;
        img.style.transform = "translate(-50%, -50%)";
        img.style.pointerEvents = "none";

        return img;
    });

    link(elements, buildingsGroup);

    return buildingsGroup;
}
