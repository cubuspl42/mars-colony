import * as http from "http";
import { MutableCell } from "@common/frp/Cell";


const cell = new MutableCell(42);

console.log(`Hello world! ${cell.value}`);

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello, World!\n');
});

server.listen(8080);
