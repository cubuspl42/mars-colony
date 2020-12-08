import { Stream, StreamSink } from "@common/frp/Stream";

type Dict = { [key: string]: Value }

type Value = boolean | number | string | Dict;

export class NetworkObject {
    constructor(
        readonly path: ReadonlyArray<string>,
        readonly data: Dict,
        private readonly onNetworkObjectReceived: Stream<NetworkObject>,
    ) {
    }
}

function createEventSourceStream(url: string): Stream<any> {
    const onNetworkObjectReceived = new StreamSink<any>();

    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
        // console.log("EventSource message:", e);
        const json = JSON.parse(e.data);
        onNetworkObjectReceived.send(json);
    };

    eventSource.onerror = (err) => {
        // console.error("EventSource error:", err);
    };

    return onNetworkObjectReceived;
}

export function createNetworkObjectStream(): Stream<NetworkObject> {
    return Stream.looped((self) =>
        createEventSourceStream("//localhost:8080/listen").map((eventData) =>
            new NetworkObject(
                eventData.path as ReadonlyArray<string>,
                eventData.data as Dict,
                self,
            )
        ),
    );
}
