import { LazyGetter } from "lazy-get-decorator";
import { HexCoord } from "./game";
import { Stream, StreamSink } from "../frp/Stream";
import { Cell } from "../frp/Cell";
import { periodic } from "../utils";


export class BuildingState {
    readonly _BuildingState: null = null;
}

export class IncompleteBuilding extends BuildingState {
    private readonly _constructionDurationMillis: number;

    readonly startTime: number;

    readonly onConstructionFinished: Stream<null>;

    getConstructionProgress(): number {
        return (Date.now() - this.startTime) / this._constructionDurationMillis;
    }

    constructor(args: {
        readonly startTime: number,
        readonly constructionDurationSec: number,
        readonly onConstructionFinished?: Stream<null>,
    }) {
        super();

        this.startTime = args.startTime;
        this.onConstructionFinished = args.onConstructionFinished ?? Stream.never();
        this._constructionDurationMillis = args.constructionDurationSec * 1000;
    }

    static $create(args: {
        readonly prototype: BuildingPrototype,
    }) {
        const constructionDurationSec = args.prototype.constructionDurationSec;

        const constructionDurationMillis = constructionDurationSec * 1000;

        const startTime = Date.now();

        const onConstructionFinished = new StreamSink<null>();

        setTimeout(
            () => {
                onConstructionFinished.send(null);
            },
            constructionDurationMillis,
        );

        return new IncompleteBuilding({
            startTime,
            constructionDurationSec,
            onConstructionFinished,
        });
    }
}

export abstract class CompleteBuilding extends BuildingState {
    readonly _CompleteBuilding: null = null;
}

export class CompleteHabitat extends CompleteBuilding {
    readonly inhabitantCount = 10;
}

export class CompleteMineshaft extends CompleteBuilding {
    private static readonly miningPeriodSec = 5;

    @LazyGetter()
    get onIronMined(): Stream<{
        readonly minedIronAmount: number;
    }> {
        return periodic(CompleteMineshaft.miningPeriodSec * 1000)
            .mapTo({ minedIronAmount: 10 });
    }
}

export abstract class BuildingPrototype {
    abstract readonly constructionDurationSec: number;

    abstract createCompleteState(): CompleteBuilding;

    @LazyGetter()
    static get habitat() {
        return new HabitatPrototype();
    }

    @LazyGetter()
    static get mineshaft() {
        return new MineshaftPrototype();
    }
}

export class HabitatPrototype extends BuildingPrototype {
    readonly constructionDurationSec = 15;

    createCompleteState(): CompleteBuilding {
        return new CompleteHabitat();
    }
}

export class MineshaftPrototype extends BuildingPrototype {
    readonly constructionDurationSec = 10;

    createCompleteState(): CompleteBuilding {
        return new CompleteMineshaft();
    }
}

export class Building {
    readonly prototype: BuildingPrototype;
    readonly coord: HexCoord;
    readonly state: Cell<BuildingState>;

    get onConstructionFinished(): Stream<null> {
        return Cell.switchMapNotUndefinedS(
            this.state.whereSubclass(IncompleteBuilding),
            (st) => st.onConstructionFinished,
        );
    }

    constructor(args: {
        readonly prototype: BuildingPrototype,
        readonly coord: HexCoord,
        readonly state: Cell<BuildingState>,
    }) {
        this.prototype = args.prototype;
        this.coord = args.coord;
        this.state = args.state;
    }

    static $create(args: {
        readonly coord: HexCoord,
        readonly prototype: BuildingPrototype,
    }) {
        const { coord, prototype } = args;

        const initialState = IncompleteBuilding.$create({ prototype });

        const state = initialState.onConstructionFinished
            .map<BuildingState>(() => prototype.createCompleteState())
            .hold(initialState);

        return new Building({
            prototype,
            coord,
            state,
        });
    }
}
