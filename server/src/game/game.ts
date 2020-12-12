import { MutableReactiveSet, ReactiveSet } from "@common/frp/ReactiveSet";
import { Cell } from "@common/frp/Cell";
import { Stream } from "@common/frp/Stream";
import { Building, BuildingPrototype, CompleteMineshaft } from "@common/game/buildings";
import { Game, HexCoord } from "@common/game/game";
import { periodic } from "@common/utils";
import { NetworkMessage, NetworkObject, Value } from "@common/game/network";
import * as _ from "lodash";

function dumpValue<A>(v: Value): NetworkObject {
    return {
        initialState: v,
    }
}

function dumpStream<A>(sa: Stream<Value>): NetworkObject {
    return {
        sUpdates: sa.map((a) => ({
            path: [],
            data: a,
        })),
    }
}

function dumpCell<A>(ca: Cell<Value>): NetworkObject {
    return {
        ...dumpValue(ca.value),
        ...dumpStream(ca.values()),
    }
}

function dumpObject(
    obj: { [key: string]: NetworkObject }
): NetworkObject {
    const sUpdatesArr = Object.entries(obj)
        .map(([key, netObj]) =>
            netObj.sUpdates.map<NetworkMessage>((msg) => ({
                path: [key, ...msg.path],
                data: msg.data,
            })),
        );
    return {
        initialState: _.mapValues(obj, (netObj) => netObj.initialState),
        sUpdates: Stream.mergeSet(new Set(sUpdatesArr)),
    }
}

export function dumpGame(game: Game): NetworkObject {
    return dumpObject({
        "counter": dumpCell(game.counter),
    });
}

export class ServerGame extends Game {
    private readonly _buildings: MutableReactiveSet<Building>

    readonly xpCount: Cell<number>;

    readonly ironAmount: Cell<number>;

    readonly counter: Cell<number>;

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
    }
}
