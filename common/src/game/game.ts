import { ReactiveSet } from "../frp/ReactiveSet";
import { Cell } from "../frp/Cell";
import { Building, BuildingPrototype } from "./buildings";

export interface HexCoord {
    readonly i: number;
    readonly j: number;
}

function hexCoordEquals(a: HexCoord, b: HexCoord) {
    return a.i === b.i && a.j === b.j;
}

export abstract class Game {
    abstract readonly xpCount: Cell<number>;

    abstract readonly ironAmount: Cell<number>;

    abstract readonly counter: Cell<number>;

    abstract get buildings(): ReactiveSet<Building>;

    abstract placeBuilding(args: {
        readonly coord: HexCoord,
        readonly prototype: BuildingPrototype,
    }): void;

    getBuildingAt(coord: HexCoord): Cell<Building | undefined> {
        return this.buildings.singleWhere(
            (b) => hexCoordEquals(b.coord, coord),
        );
    }
}
