import { Stream, StreamSink } from "@common/frp/Stream";
import { Dict, NetworkMessage, NetworkObject, Value } from "@common/game/network";
import { Cell } from "@common/frp/Cell";

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
    const initialValue = networkObject.initialState!;

    const values = readStream(networkObject);

    return values.hold(initialValue).map((v) => v as unknown as A);
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

export function readObject(
    networkObject: NetworkObject,
    keys: ReadonlyArray<string>,
): { [key: string]: NetworkObject } {
    return Object.fromEntries(keys.map((key) => [
        key,
        readObjectProperty(networkObject, key),
    ]));
}

export function spyNetworkObject(netObj: NetworkObject): void {
    console.log(`netObj.sUpdates: ${netObj.sUpdates}`)
    netObj.sUpdates?.listen((msg) => {
        console.log(`Network object update`, msg);
    });
}
