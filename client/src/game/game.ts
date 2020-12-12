import { Cell, Const } from "@common/frp/Cell";
import { Game, HexCoord } from "@common/game/game";
import { Building, BuildingPrototype } from "@common/game/buildings";
import { MutableReactiveSet, ReactiveSet } from "@common/frp/ReactiveSet";
import { NetworkObject } from "@common/game/network";
import { readBuilding, readCell, readObjectProperty, readRootNetworkObject, } from "./network";


export class ClientGame extends Game {
    readonly buildings: ReactiveSet<Building>;

    readonly xpCount: Cell<number>;

    readonly ironAmount: Cell<number>;

    readonly counter: Cell<number>;


    placeBuilding(coord: HexCoord, buildingPrototype: BuildingPrototype): void {

    }

    private constructor(args: {
        readonly rootNetworkObject: NetworkObject,
    }) {
        super();

        const { rootNetworkObject } = args;

        const counterNetObj = readObjectProperty(rootNetworkObject, "counter");

        const buildingNetObj = readObjectProperty(rootNetworkObject, "building");

        const building = readBuilding(buildingNetObj);

        const counter = readCell<number>(counterNetObj);

        this.xpCount = new Const(0);
        this.ironAmount = new Const(0);
        this.counter = counter;
        this.buildings = new MutableReactiveSet(new Set([
            building,
        ]));
    }

    static async connect(): Promise<Game> {
        const rootNetObj = await readRootNetworkObject("//localhost:8080/world");

        return new ClientGame({
            rootNetworkObject: rootNetObj,
        });
    }
}
