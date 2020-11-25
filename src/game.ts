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

    constructor(args: {
        readonly coord: HexCoord,
        readonly kind: BuildingKind,
    }) {
        this.coord = args.coord;
        this.kind = args.kind;

        const initialState = new InProgressBuilding();
        this.state = initialState.onFinished
            .mapTo(new FinishedBuilding())
            .hold(initialState);
    }
}

export class Game {
    private readonly _buildings: MutableReactiveSet<Building>;

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
        this._buildings = new MutableReactiveSet();
    }
}
