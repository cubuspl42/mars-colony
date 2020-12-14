import { MutableReactiveSet, ReactiveSet } from "@common/frp/ReactiveSet";
import { Cell } from "@common/frp/Cell";
import { Stream } from "@common/frp/Stream";
import { Building, BuildingPrototype, CompleteMineshaft } from "@common/game/buildings";
import { Game, HexCoord } from "@common/game/game";
import { periodic, sleep } from "@common/utils";


export class ServerGame extends Game {
    private readonly _buildings: MutableReactiveSet<Building>

    readonly xpCount: Cell<number>;

    readonly ironAmount: Cell<number>;

    readonly counter: Cell<number>;

    get buildings(): ReactiveSet<Building> {
        return this._buildings;
    }

    placeBuilding(args: {
        readonly coord: HexCoord,
        readonly prototype: BuildingPrototype,
    }): void {
        const existingBuilding = this.getBuildingAt(args.coord).value;

        if (existingBuilding === undefined) {
            this._buildings.add(Building.$create(args));
        }
    }

    constructor() {
        super();

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

        const counter = periodic(1000).accum(0, (acc) => acc + 1);

        this._buildings = buildings;
        this.xpCount = xp;
        this.ironAmount = ironAmount;
        this.counter = counter;

        const start = async () => {
            await sleep(3000);

            this.placeBuilding({ coord: { i: 1, j: 2 }, prototype: BuildingPrototype.mineshaft });

            await sleep(2000);

            this.placeBuilding({ coord: { i: -2, j: -2 }, prototype: BuildingPrototype.habitat });

            await sleep(2000);

            this.placeBuilding({ coord: { i: -2, j: 4 }, prototype: BuildingPrototype.mineshaft });
        };

        start().then(_ => {
        });
    }
}
