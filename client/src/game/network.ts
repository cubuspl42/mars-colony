import { Stream, StreamSink } from "@common/frp/Stream";
import {
    Credentials,
    Dict,
    dumpBuildingPrototype,
    NetworkMessage,
    NetworkObject,
    readBuildingPrototype,
    readHexCoord,
    Value
} from "@common/game/network";
import { Cell } from "@common/frp/Cell";
import { Building, BuildingPrototype, BuildingState, IncompleteBuilding } from "@common/game/buildings";
import { HexCoord } from "@common/game/game";
import { ReactiveSet } from "@common/frp/ReactiveSet";
import { StatusCodes as HttpStatus, } from 'http-status-codes';

export enum SignInError {
    INCORRECT_CREDENTIALS,
    UNKNOWN_ERROR
}

export class BackendClient {
    static readonly hostname = "//localhost:8080";

    async signIn(credentials: Credentials): Promise<SignInError | GameClient> {
        console.log("signIn.");
        const response = await fetch(`${BackendClient.hostname}/verify-credentials`, {
            method: "POST",
            body: JSON.stringify(credentials),
        });
        if (response.status === HttpStatus.OK) {
            return new GameClient(credentials);
        } else if (response.status === HttpStatus.FORBIDDEN) {
            return SignInError.INCORRECT_CREDENTIALS;
        } else {
            return SignInError.UNKNOWN_ERROR;
        }
    }
}

export class GameClient {

    constructor(
        private readonly credentials: Credentials,
    ) {
    }

    getWorld(): Promise<NetworkObject> {
        return readRootNetworkObject(`${BackendClient.hostname}/world`);
    }

    putBuilding(args: {
        readonly coord: HexCoord,
        readonly prototype: BuildingPrototype,
    }): void {
        fetch(`${BackendClient.hostname}/world/buildings`, {
            method: "POST",
            body: JSON.stringify({
                type: dumpBuildingPrototype(args.prototype),
                coord: args.coord,
            }),
        }).then();
    }
}

interface MyEvent {
    readonly data: any;
}

function createEventSourceStream(url: string): Stream<MessageEvent> {
    const streamSink = new StreamSink<any>();

    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
        streamSink.send(e);
    };

    eventSource.onerror = (err) => {
    };

    return streamSink;
}

export async function readRootNetworkObject(url: string): Promise<NetworkObject> {
    const eventStream = createEventSourceStream(url).map<MyEvent>((me) => ({
        data: JSON.parse(me.data),
    })).map((e) => {
        // console.log("Received event (data):", e.data);
        return e;
    });

    const firstEvent = await eventStream.next();

    return {
        initialState: firstEvent.data,
        sUpdates: eventStream.map((e) => e.data as NetworkMessage),
    }
}

export function readValue(networkObject: NetworkObject): Value {
    return networkObject.initialState!;
}

export function readStream(networkObject: NetworkObject): Stream<Value> {
    const stream = networkObject.sUpdates?.map((msg) => {
        if (msg.path.length !== 0) {
            throw new Error("Cell update message has non-empty path!");
        }
        return msg.data;
    }) ?? Stream.never();

    return stream;
}

export function readCell<A>(networkObject: NetworkObject): Cell<A> {
    const initialValue = readValue(networkObject);

    const values = readStream(networkObject);

    return values.hold(initialValue).map((v) => v as unknown as A);
}

export function readNetworkObjectCell<A>(networkObject: NetworkObject): Cell<NetworkObject> {
    const initialValue = readValue(networkObject);

    const values = networkObject.sUpdates
        ?.where((msg) => msg.path.length === 0)
        ?.map((msg) => msg.data) ?? Stream.never();

    const sInnerUpdates = networkObject.sUpdates
        ?.where((msg) => msg.path.length !== 0);

    return values.hold(initialValue).map((value) => <NetworkObject>{
        initialState: value,
        sUpdates: sInnerUpdates,
    });
}

export function readObjectProperty(
    networkObject: NetworkObject,
    key: string,
): NetworkObject {
    const initialDict = networkObject.initialState as Dict;
    return {
        initialState: initialDict[key],
        sUpdates: networkObject.sUpdates
            ?.where((msg) => msg.path[0] === key)
            ?.map((msg) => (<NetworkMessage>{
                path: msg.path.slice(1),
                data: msg.data,
            }))?.map((msg) => {
                // console.log(`Network object update for key ${key}`);
                return msg;
            }),
    };
}

export function readObjectCellProperty<V extends Value>(
    networkObject: NetworkObject,
    key: string,
): Cell<V> {
    return readCell(readObjectProperty(networkObject, key));
}

export function readObject(
    networkObject: NetworkObject,
): { [key: string]: NetworkObject } {
    const initialDict = networkObject.initialState as Dict;
    const keys = Object.keys(initialDict);
    return Object.fromEntries(keys.map((key) => [
        key,
        readObjectProperty(networkObject, key),
    ]));
}

export function readNetworkObjectSet(
    netObj: NetworkObject,
): ReadonlySet<NetworkObject> {
    return new Set([...Object.values(readObject(netObj))]);
}

export function readNetworkObjectReactiveSet(
    netObj: NetworkObject,
): ReactiveSet<NetworkObject> {
    return ReactiveSet.fromC(readNetworkObjectCell(netObj).map(readNetworkObjectSet));
}

export function spyNetworkObject(netObj: NetworkObject): void {
    console.log(`netObj.sUpdates: ${netObj.sUpdates}`)
    netObj.sUpdates?.listen((msg) => {
        console.log(`Network object update`, msg);
    });
}

function readBuildingState(
    prototype: BuildingPrototype,
    stateNetObj: NetworkObject,
): BuildingState {
    const initialDict = stateNetObj.initialState as Dict;
    const state = initialDict["state"];

    switch (state) {
        case "complete": {
            return prototype.createCompleteState();
        }
        case "incomplete": {
            return new IncompleteBuilding({
                constructionDurationSec: prototype.constructionDurationSec,
                startTime: initialDict["startTime"] as number,
            });
        }
        default:
            throw new Error(`Unrecognized building state: ${state}`);
    }
}

export function readBuilding(
    buildingNetObj: NetworkObject,
): Building {
    const initialDict = buildingNetObj.initialState as Dict;
    const prototype = readBuildingPrototype(initialDict["type"] as string);
    const coord = readHexCoord(initialDict["coord"]);
    const stateProp = readObjectProperty(buildingNetObj, "state");
    const state = readNetworkObjectCell(stateProp).map((netObj) =>
        readBuildingState(prototype, netObj),
    );

    return new Building({
        prototype,
        coord,
        state,
    });
}
