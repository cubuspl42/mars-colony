import * as http from "http";

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello, World!\n');
});

server.listen(8080);
