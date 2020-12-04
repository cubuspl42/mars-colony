import { MutableReactiveSet, ReactiveSet } from "@common/frp/ReactiveSet";
import { Cell } from "@common/frp/Cell";
import { Stream } from "@common/frp/Stream";
import { Building, BuildingPrototype, CompleteMineshaft } from "./buildings";

export interface HexCoord {
    readonly i: number;
    readonly j: number;
}

function hexCoordEquals(a: HexCoord, b: HexCoord) {
    return a.i === b.i && a.j === b.j;
}

export class Game {
    private readonly _buildings: MutableReactiveSet<Building>

    readonly xpCount: Cell<number>;

    readonly ironAmount: Cell<number>;

    get buildings(): ReactiveSet<Building> {
        return this._buildings;
    }

    placeBuilding(coord: HexCoord, buildingPrototype: BuildingPrototype): void {
        const existingBuilding = this.getBuildingAt(coord).value;

        if (existingBuilding === undefined) {
            this._buildings.add(Building.$create({
                coord,
                prototype: buildingPrototype,
            }));
        }
    }

    getBuildingAt(coord: HexCoord): Cell<Building | undefined> {
        return this._buildings.singleWhere(
            (b) => hexCoordEquals(b.coord, coord),
        );
    }

    constructor() {
        const buildings = new MutableReactiveSet<Building>();

        const xp = Stream.accumSum(buildings
            .mergeMap((b) => b.onConstructionFinished.mapTo(10)));

        const completeMineshafts = buildings.fuseMapNotUndefined(
            (b) => b.state.whereSubclass(CompleteMineshaft),
        );

        const onIronMined = completeMineshafts.mergeMap(
            (m) => m.onIronMined,
        );

        const ironAmount = Stream.accumSum(
            onIronMined.map((e) => e.minedIronAmount),
        );

        this._buildings = buildings;
        this.xpCount = xp;
        this.ironAmount = ironAmount;
    }
}
