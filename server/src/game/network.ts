import { dumpBuildingPrototype, NetworkMessage, NetworkObject, Value } from "@common/game/network";
import { Stream } from "@common/frp/Stream";
import { Cell } from "@common/frp/Cell";
import * as _ from "lodash";
import { ReactiveSet } from "@common/frp/ReactiveSet";
import { Building, BuildingState, CompleteBuilding, IncompleteBuilding } from "@common/game/buildings";
import { Game } from "@common/game/game";

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
    return dumpObject({
        "type": dumpValue(dumpBuildingPrototype(building.prototype)),
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
        "xpCount": dumpCell(game.xpCount as Cell<Value>),
        "ironAmount": dumpCell(game.ironAmount as Cell<Value>),
    });
}

function foo(arr: ReadonlyArray<number | string>) {

}

function bar(arr: ReadonlyArray<number>) {
    foo(arr);
}

