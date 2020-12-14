import { Cell, Const } from "@common/frp/Cell";
import { Game, HexCoord } from "@common/game/game";
import { Building, BuildingPrototype } from "@common/game/buildings";
import { ReactiveSet } from "@common/frp/ReactiveSet";
import { NetworkObject } from "@common/game/network";
import {
    GameProtocolClient,
    readBuilding,
    readCell,
    readNetworkObjectReactiveSet,
    readObjectProperty,
} from "./network";


export class ClientGame extends Game {
    private readonly _client: GameProtocolClient;

    readonly buildings: ReactiveSet<Building>;

    readonly xpCount: Cell<number>;

    readonly ironAmount: Cell<number>;

    readonly counter: Cell<number>;

    placeBuilding(args: {
        readonly coord: HexCoord,
        readonly prototype: BuildingPrototype,
    }): void {
        this._client.putBuilding(args);
    }

    private constructor(args: {
        readonly client: GameProtocolClient,
        readonly worldNetworkObject: NetworkObject,
    }) {
        super();

        const { client, worldNetworkObject } = args;

        const counterNetObj = readObjectProperty(worldNetworkObject, "counter");

        const buildingsProp = readObjectProperty(worldNetworkObject, "buildings");

        const buildings = readNetworkObjectReactiveSet(buildingsProp).map(readBuilding);

        const counter = readCell<number>(counterNetObj);

        this._client = client;
        this.xpCount = new Const(0);
        this.ironAmount = new Const(0);
        this.counter = counter;
        this.buildings = buildings;
    }

    static async connect(): Promise<Game> {
        const client = new GameProtocolClient();

        const worldNetworkObject = await client.getWorld();

        return new ClientGame({
            client,
            worldNetworkObject,
        });
    }
}
