import { Stream } from "../frp/Stream";

export type Dict = { [key: string]: Value }

export type Value = boolean | number | string | Dict;

export interface NetworkMessage {
    readonly path: ReadonlyArray<string>;
    readonly data: Value;
}

export interface NetworkObject {
    readonly initialState?: Value;
    readonly sUpdates?: Stream<NetworkMessage>;
}
