import { Stream, StreamSink } from "../frp/Stream";
import { LazyGetter } from "lazy-get-decorator";
import { Cell, Const } from "../frp/Cell";
import { HexCoord } from "./game";

function periodic(periodMillis: number): Stream<null> {
    const out = new StreamSink<null>();

    const register = () => setTimeout(() => {
        out.send(null);
        register();
    }, periodMillis);

    register();

    return out;
}

export class BuildingState {
    readonly _BuildingState = null;
}

export class IncompleteBuilding extends BuildingState {
    private readonly _constructionDurationMillis: number;

    private readonly _startTime: number;

    private readonly _onFinished = new StreamSink<null>();

    readonly onConstructionFinished = this._onFinished as Stream<null>;

    getConstructionProgress(): number {
        return (Date.now() - this._startTime) / this._constructionDurationMillis;
    }

    constructor(args: {
        readonly constructionDurationSec: number,
    }) {
        super();

        const { constructionDurationSec } = args;

        const constructionDurationMillis = constructionDurationSec * 1000;

        this._startTime = Date.now();

        setTimeout(
            () => {
                this._onFinished.send(null);
            },
            constructionDurationMillis,
        );

        this._constructionDurationMillis = constructionDurationMillis;
    }
}

export abstract class CompleteBuilding extends BuildingState {
    readonly _CompleteBuilding = null;
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
    readonly constructionDurationSec = 5;

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
        readonly initialState: BuildingState,
    }) {
        const { initialState, prototype } = args;

        const state = initialState instanceof IncompleteBuilding ?
            initialState.onConstructionFinished
                .map<BuildingState>(() => prototype.createCompleteState())
                .hold(initialState) :
            new Const(initialState);

        this.prototype = prototype;
        this.coord = args.coord;
        this.state = state;
    }

    static $create(args: {
        readonly coord: HexCoord,
        readonly prototype: BuildingPrototype,
    }) {
        return new Building({
            prototype: args.prototype,
            coord: args.coord,
            initialState: new IncompleteBuilding({
                constructionDurationSec: args.prototype.constructionDurationSec,
            }),
        });
    }
}
