import { Cell, Const } from "@common/frp/Cell";
import { Game, HexCoord } from "@common/game/game";
import { Building, BuildingPrototype } from "@common/game/buildings";
import { ReactiveSet } from "@common/frp/ReactiveSet";
import { NetworkObject } from "@common/game/network";
import {
    GameClient,
    readBuilding,
    readCell,
    readNetworkObjectReactiveSet,
    readObjectProperty,
} from "./network";


export class ClientGame extends Game {
    private readonly _client: GameClient;

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
        readonly client: GameClient,
        readonly worldNetworkObject: NetworkObject,
    }) {
        super();

        const { client, worldNetworkObject } = args;


        const buildingsProp = readObjectProperty(worldNetworkObject, "buildings");

        const buildings = readNetworkObjectReactiveSet(buildingsProp).map(readBuilding);

        const counterProp = readObjectProperty(worldNetworkObject, "counter");

        const counter = readCell<number>(counterProp);

        const xpCountProp = readObjectProperty(worldNetworkObject, "xpCount");

        const xpCount = readCell<number>(xpCountProp);

        const ironAmountProp = readObjectProperty(worldNetworkObject, "ironAmount");

        const ironAmount = readCell<number>(ironAmountProp);

        this._client = client;
        this.xpCount = xpCount;
        this.ironAmount = ironAmount;
        this.counter = counter;
        this.buildings = buildings;
    }

    static async connect(gameClient: GameClient): Promise<Game> {
        const worldNetworkObject = await gameClient.getWorld();

        return new ClientGame({
            client: gameClient,
            worldNetworkObject,
        });
    }
}
