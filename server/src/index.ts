import * as http from "http";
import { IncomingMessage, ServerResponse } from "http";
import { Game } from "@common/game/game";
import { dumpGame, ServerGame } from "./game/game";
import { NetworkObject } from "@common/game/network";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

    const sub = rootNetworkObject.sUpdates.listen((netMsg) => {
        writeEvent(res, netMsg);
    });

    req.on("close", () => {
        sub.cancel();
    });

    req.on("end", () => {
        sub.cancel();
    });
}

function startGameServer(game: Game): void {
    const handleWorldReq = async (req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        writeRootNetworkObject(req, res, dumpGame(game));
    }

    const server = http.createServer(async (req, res) => {
        console.log(`New connection: ${req.url}`);
        if (req.url === '/world' && req.method === "GET") {
            await handleWorldReq(req, res);
        } else if (req.url === '/world/buildings' && req.method === "PUT") {

        }
    });

    server.listen(8080);
}

startGameServer(new ServerGame());
