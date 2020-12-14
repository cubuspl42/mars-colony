import * as http from "http";
import { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from "http";
import { Game } from "@common/game/game";
import { ServerGame } from "./game/game";
import { NetworkObject, readBuildingPrototype, readHexCoord } from "@common/game/network";
import { dumpGame } from "./game/network";

function readData(req: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            resolve(body);
        });
    });
}

async function readJsonData(req: IncomingMessage): Promise<any> {
    const rawData = await readData(req);
    return JSON.parse(rawData);
}

function writeEvent(
    res: ServerResponse,
    eventData: any,
): void {
    res.write(
        `event: message\n` +
        `data: ${JSON.stringify(eventData)}\n\n`
    );
}

function writeRootNetworkObject(
    req: IncomingMessage,
    res: ServerResponse,
    rootNetworkObject: NetworkObject,
): void {
    writeEvent(res, rootNetworkObject.initialState ?? null);

    const sub = rootNetworkObject.sUpdates?.listen((netMsg) => {
        writeEvent(res, netMsg);
    });

    req.on("close", () => {
        sub?.cancel();
    });

    req.on("end", () => {
        sub?.cancel();
    });
}

function startGameServer(game: Game): void {
    const resHeaders = <OutgoingHttpHeaders>{
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT',
        'Cache-Control': 'no-cache',
    }

    const handleGetWorld = async (req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, {
            ...resHeaders,
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
        });

        writeRootNetworkObject(req, res, dumpGame(game));
    }

    const handlePutBuilding = async (req: IncomingMessage, res: ServerResponse) => {
        const data = await readJsonData(req);

        const coord = readHexCoord(data["coord"]);
        const prototype = readBuildingPrototype(data["type"]);

        game.placeBuilding({ coord, prototype });

        res.writeHead(200, resHeaders);
        res.end("");
    }

    const server = http.createServer(async (req, res) => {
        console.log(`New request: ${req.url} (${req.method})`);
        if (req.url === '/world' && req.method === "GET") {
            await handleGetWorld(req, res);
        } else if (req.url === '/world/buildings' && req.method === "POST") {
            await handlePutBuilding(req, res);
        }
    });

    server.listen(8080);
}

startGameServer(new ServerGame());
