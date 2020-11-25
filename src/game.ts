import { MutableReactiveSet } from "./frp/ReactiveSet";
import { Cell } from "./frp/Cell";

export interface HexCoord {
    readonly i: number;
    readonly j: number;
}

function hexCoordEquals(a: HexCoord, b: HexCoord) {
    return a.i === b.i && a.j === b.j;
}

export function hexCoordToKeyString(c: HexCoord) {
    return `${c.i},${c.j}`;
}

export enum BuildingKind {
    buildingA = "buildingA",
    buildingB = "buildingB",
}

export interface Building {
    readonly coord: HexCoord;
    readonly kind: BuildingKind;
}

export class Game {
    private readonly _buildingsS: MutableReactiveSet<HexCoord, Building>;

    buildBuilding(coord: HexCoord, buildingKind: BuildingKind): void {
        const existingBuilding = this.getBuildingAt(coord).value;

        if (existingBuilding === undefined) {
            console.log(`Building building ${buildingKind} on ${JSON.stringify(coord)}`);

            this._buildingsS.add({
                coord,
                kind: buildingKind,
            });
        }
    }

    getBuildingAt(coord: HexCoord): Cell<Building | undefined> {
        return this._buildingsS.singleWhere(
            (b) => hexCoordEquals(b.coord, coord),
        );
    }

    constructor() {
        this._buildingsS = new MutableReactiveSet();
    }
}
