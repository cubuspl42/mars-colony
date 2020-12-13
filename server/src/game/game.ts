import { MutableReactiveSet, ReactiveSet, Sets } from "@common/frp/ReactiveSet";
import { Cell } from "@common/frp/Cell";
import { Stream } from "@common/frp/Stream";
import {
    Building,
    BuildingPrototype,
    BuildingState,
    CompleteBuilding,
    CompleteMineshaft,
    IncompleteBuilding
} from "@common/game/buildings";
import { Game, HexCoord } from "@common/game/game";
import { periodic, sleep } from "@common/utils";
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
            path: <ReadonlyArray<string>>[],
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

function dumpNetworkObjectCell<A>(cell: Cell<NetworkObject>): NetworkObject {
    const sOuterUpdates = cell.values().map((netObj) => <NetworkMessage>{
        path: [],
        data: netObj.initialState,
    });

    const sInnerUpdates = cell.switchMapS((netObj) =>
        netObj.sUpdates ?? Stream.never<NetworkMessage>(),
    );

    return {
        initialState: cell.value.initialState,
        sUpdates: sOuterUpdates.mergeWith(sInnerUpdates),
    }
}

function dumpObject(
    obj: { [key: string]: NetworkObject }
): NetworkObject {
    const sUpdatesArr = Object.entries(obj)
        .map(([key, netObj]) =>
            netObj.sUpdates?.map<NetworkMessage>((msg) => ({
                path: [key, ...msg.path],
                data: msg.data,
            })) ?? Stream.never<NetworkMessage>(),
        );
    return {
        initialState: _.mapValues(obj, (netObj) => netObj.initialState!),
        sUpdates: Stream.mergeSet(new Set(sUpdatesArr)),
    }
}

interface NetworkObjectEntry {
    readonly id: string;
    readonly element: NetworkObject;
}

function dumpNetworkObjectSet<A>(rs: ReadonlySet<NetworkObjectEntry>): NetworkObject {
    return dumpObject(Object.fromEntries([...rs].map(
        (e) => [e.id, e.element]),
    ));
}

export function dumpNetworkObjectReactiveSet<A>(rs: ReactiveSet<NetworkObjectEntry>): NetworkObject {
    return dumpNetworkObjectCell(rs.asCell().map(dumpNetworkObjectSet));
}

export function dumpBuildingState(buildingState: BuildingState): NetworkObject {
    const dumpCompleteBuilding = () => ({
        "state": dumpValue("complete"),
    });

    const dumpIncompleteBuilding = (incompleteBuilding: IncompleteBuilding) => ({
        "state": dumpValue("incomplete"),
        "startTime": dumpValue(incompleteBuilding.startTime),
    });

    const dump = () => {
        if (buildingState instanceof CompleteBuilding) {
            return dumpCompleteBuilding();
        } else if (buildingState instanceof IncompleteBuilding) {
            return dumpIncompleteBuilding(buildingState);
        } else {
            throw new Error(`Unrecognized building state: ${buildingState}`);
        }
    }

    return dumpObject(dump());
}

export function dumpBuilding(building: Building): NetworkObject {
    const dumpType = () => {
        if (building.prototype === BuildingPrototype.habitat) {
            return "Habitat";
        } else if (building.prototype === BuildingPrototype.mineshaft) {
            return "Mineshaft";
        } else {
            throw new Error(`Unrecognized building prototype`);
        }
    }

    return dumpObject({
        "type": dumpValue(dumpType()),
        "coord": dumpValue({
            "i": building.coord.i,
            "j": building.coord.j,
        }),
        "state": dumpNetworkObjectCell(building.state.map(dumpBuildingState)),
    });
}

export function dumpGame(game: Game): NetworkObject {
    return dumpObject({
        "counter": dumpCell(game.counter as Cell<Value>),
        "buildings": dumpNetworkObjectReactiveSet(game.buildings.map((b) => {
            const coord = b.coord;
            return <NetworkObjectEntry>{
                id: `${coord.i}:${coord.j}`,
                element: dumpBuilding(b),
            };
        })),
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

        const start = async () => {
            await sleep(3000);

            this.placeBuilding({ i: 1, j: 2 }, BuildingPrototype.mineshaft);

            await sleep(2000);

            this.placeBuilding({ i: -2, j: -2 }, BuildingPrototype.habitat);

            await sleep(2000);

            this.placeBuilding({ i: -2, j: 4 }, BuildingPrototype.mineshaft);
        };

        start().then(_ => {
        });
    }
}
