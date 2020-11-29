import { Building, BuildingPrototype, IncompleteBuilding } from "./game/buildings";
import { ReactiveSet } from "./frp/ReactiveSet";
import { Cell, MutableCell } from "./frp/Cell";
import { mapHexCoordToWorldPoint } from "./hex";
import * as tm from "transformation-matrix";
import { hexGridScaleMatrix } from "./drawing";
import { Game } from "./game/game";

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

function animationCell(): Cell<number> {
    const out = new MutableCell(performance.now());

    const handle = (t: number) => {
        out.value = t;
        requestAnimationFrame(handle);
    };

    requestAnimationFrame(handle);

    return out;
}

function createProgressBarElement(progress: Cell<number>): HTMLElement {
    const outer = document.createElement("div");

    outer.style.position = "absolute";
    outer.style.height = "8px";
    outer.style.width = "96px";
    outer.style.backgroundColor = "grey";
    outer.style.transform = "translate(-50%, -50%)";

    const inner = document.createElement("div");

    inner.style.position = "absolute";
    inner.style.height = "100%";
    inner.style.backgroundColor = "orange";

    progress.listen((p) => {
        inner.style.width = `${p * 100}%`;
    });

    outer.appendChild(inner);

    return outer;
}

function createBuildingElement(args: {
    readonly building: Building,
}): Cell<HTMLElement> {
    const { building } = args;

    return building.state.map((state) => {
        const pw = mapHexCoordToWorldPoint(building.coord);
        const ps = tm.applyToPoint(hexGridScaleMatrix, pw);

        const group = document.createElement("div");

        group.style.position = "absolute";
        group.style.left = `${ps.x}px`;
        group.style.top = `${ps.y}px`;

        const img = document.createElement("img");

        img.style.position = "absolute";

        if (building.prototype === BuildingPrototype.mineshaft) {
            img.width = 110;
            img.src = "assets/mineshaft.png";
            img.style.transform = "translate(-50%, -45%)";
        } else {
            img.width = 128;
            img.src = "assets/building-a.png";
            img.style.transform = "translate(-50%, -50%)";
        }

        img.src = building.prototype === BuildingPrototype.mineshaft ?
            "assets/mineshaft.png" :
            "assets/building-a.png";
        img.style.pointerEvents = "none";
        img.style.opacity = `${state instanceof IncompleteBuilding ? 0.5 : 1}`;

        group.appendChild(img);

        if (state instanceof IncompleteBuilding) {
            const progress = animationCell().map(() => state.getConstructionProgress());
            const progressBar = createProgressBarElement(progress);

            group.appendChild(progressBar);
        }

        return group;
    })


}

export function createBuildingGroup(args: {
    readonly game: Game,
}): HTMLElement {
    const { game } = args;

    const buildingsGroup = document.createElement("div");
    buildingsGroup.style.position = "absolute";
    buildingsGroup.style.left = "50%";
    buildingsGroup.style.top = "50%";

    const elements = game.buildings.fuseMap((b) => {
        return createBuildingElement({ building: b });
    });

    link(elements, buildingsGroup);

    return buildingsGroup;
}
