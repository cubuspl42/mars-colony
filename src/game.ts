import { MutableReactiveMap, ReactiveMap } from "./frp/ReactiveMap";

export interface HexCoord {
    readonly i: number;
    readonly j: number;
}

export function hexCoordToKeyString(c: HexCoord) {
    return `${c.i},${c.j}`;
}

export enum BuildingKind {
    buildingA = "buildingA",
    buildingB = "buildingB",
}

export interface Building {
    readonly kind: BuildingKind;
}

export class Game {
    private readonly _buildings: MutableReactiveMap<HexCoord, Building>;

    get buildings(): ReactiveMap<HexCoord, Building> {
        return this._buildings;
    }

    buildBuilding(coord: HexCoord, buildingKind: BuildingKind): void {
        const existingBuilding = this.buildings.get(coord);
        if (existingBuilding === undefined) {
            console.log(`Building building ${buildingKind} on ${JSON.stringify(coord)}`);
            this._buildings.set(coord, {
                kind: buildingKind,
            });
        }
    }

    getBuildingAt(coord: HexCoord): Building | undefined {
        return this._buildings.get(coord);
    }

    constructor() {
        this._buildings = new MutableReactiveMap(hexCoordToKeyString);
    }
}
