import { MutableReactiveSet, ReactiveSet } from "../frp/ReactiveSet";
import { Cell } from "../frp/Cell";
import { Stream } from "../frp/Stream";
import { Building, BuildingPrototype } from "./buildings";

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

    get buildings(): ReactiveSet<Building> {
        return this._buildings;
    }

    placeBuilding(coord: HexCoord, buildingPrototype: BuildingPrototype): void {
        const existingBuilding = this.getBuildingAt(coord).value;

        if (existingBuilding === undefined) {
            console.log(`Building building ${buildingPrototype} on ${JSON.stringify(coord)}`);

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
            .mergeMap((b) => b.onConstructionFinished.mapTo(10))
        );

        xp.listen((xp) => {
            console.log(`XP: ${xp}`);
        });

        this._buildings = buildings;
        this.xpCount = xp;
    }
}
