import { Stream } from "../frp/Stream";
import { BuildingPrototype } from "./buildings";
import { HexCoord } from "./game";

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

export interface Credentials {
    readonly username: string;
    readonly password: string;
}

export function dumpBuildingPrototype(prototype: BuildingPrototype): string {
    if (prototype === BuildingPrototype.habitat) {
        return "Habitat";
    } else if (prototype === BuildingPrototype.mineshaft) {
        return "Mineshaft";
    } else {
        throw new Error(`Unrecognized building prototype`);
    }
}

export function readHexCoord(coord: any): HexCoord {
    return coord as HexCoord;
}

export function readBuildingPrototype(
    type: string,
): BuildingPrototype {
    switch (type) {
        case "Habitat":
            return BuildingPrototype.habitat;
        case "Mineshaft":
            return BuildingPrototype.mineshaft;
        default:
            throw new Error(`Unrecognized building type: ${type}`);
    }
}
