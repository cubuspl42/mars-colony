import * as http from "http";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const server = http.createServer(async (req, res) => {
    console.log(`New connection: ${req.url}`);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': '*',
        // 'Access-Control-Allow-Methods': 'GET,POST',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    for (let i = 0; i < 10; ++i) {
        res.write(
            'event: message\n' +
            `data: { "path": [], "data": { "counterValue": ${i} } }\n\n`
        );

        await sleep(1000);
    }

    res.end();
});

server.listen(8080);
