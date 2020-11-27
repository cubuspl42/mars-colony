import { MutableReactiveSet, ReactiveSet } from "./frp/ReactiveSet";
import { Cell } from "./frp/Cell";
import { Stream, StreamSink } from "./frp/Stream";

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

export class BuildingState {

}

export class InProgressBuilding extends BuildingState {
    private static readonly _buildDuration = 5000; // milliseconds

    private readonly _startTime: number;

    private readonly _onFinished = new StreamSink<null>();

    readonly onFinished = this._onFinished as Stream<null>;

    getProgress(): number {
        return (Date.now() - this._startTime) / InProgressBuilding._buildDuration;
    }

    constructor() {
        super();

        this._startTime = Date.now();

        setTimeout(
            () => {
                this._onFinished.send(null);
            },
            InProgressBuilding._buildDuration,
        );
    }
}

export class FinishedBuilding extends BuildingState {

}

export class Building {
    readonly coord: HexCoord;
    readonly kind: BuildingKind;
    readonly state: Cell<BuildingState>;


    get onFinished(): Stream<null> {
        return Cell.switchMapNuS(
            this.state.whereSubclass(InProgressBuilding),
            (st) => st.onFinished,
        );
    }

    constructor(args: {
        readonly coord: HexCoord,
        readonly kind: BuildingKind,
    }) {
        const initialState = new InProgressBuilding();
        const state = initialState.onFinished
            .mapTo<BuildingState>(new FinishedBuilding())
            .hold(initialState);

        this.coord = args.coord;
        this.kind = args.kind;
        this.state = state;
    }
}

export class Game {
    private readonly _buildings: MutableReactiveSet<Building>

    readonly xp: Cell<number>;

    get buildings(): ReactiveSet<Building> {
        return this._buildings;
    }

    buildBuilding(coord: HexCoord, buildingKind: BuildingKind): void {
        const existingBuilding = this.getBuildingAt(coord).value;

        if (existingBuilding === undefined) {
            console.log(`Building building ${buildingKind} on ${JSON.stringify(coord)}`);

            this._buildings.add(new Building({
                coord,
                kind: buildingKind,
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
            .mergeMap((b) => b.onFinished.mapTo(10))
        );

        xp.listen((xp) => {
            console.log(`XP: ${xp}`);
        });

        this._buildings = buildings;
        this.xp = xp;
    }
}
