import { createFullscreenCanvas } from "./fullscreen_canvas";
import * as tm from 'transformation-matrix';
import { MutableCell } from "./frp/Cell";

class MyColors {
    static readonly ground = "#c87137";
    static readonly hexBorder = "black";
    static readonly selectedHexBorder = "yellow";
}

interface Vec2 {
    readonly x: number;
    readonly y: number;
}

const h = Math.sqrt(3) / 2;

function sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
}

function dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
}

function len(a: Vec2): number {
    return Math.sqrt(a.x * a.x + a.y * a.y);
}

function scalarProj(a: Vec2, b: Vec2): number {
    return dot(a, b) / len(b);
}

function mapHexCoordToWorldPoint(c: Vec2): Vec2 {
    const x = c.x * (3 / 2);
    const yDelta = c.x % 2 == 0 ? 0 : h;
    const y = c.y * (h * 2) + yDelta;
    return { x, y };
}

function mapWorldPointToHexCoord(p: Vec2): Vec2 {
    // Search for the reference hex, using simple algebra
    const hx0 = Math.round(p.x * (2 / 3));
    const yDelta = hx0 % 2 === 0 ? 0 : h;
    const hy0 = Math.round((p.y - yDelta) / (2 * h));
    const h0: Vec2 = { x: hx0, y: hy0 };

    // The central section of the hex.
    const b0 = hx0 * (3 / 2) - 0.5;
    const b1 = b0 + 1;

    if (p.x >= b0 && p.x <= b1) {
        // The point is in the central part! Easy.
        return h0;
    }

    const hw = mapHexCoordToWorldPoint(h0);

    // The relative position vector: [reference hex center -> P]
    const d = sub(p, hw);
    const qx = d.x < 0 ? -1 : 1;
    const qy = d.y < 0 ? -1 : 1;

    // A vector proportional to the height (h = sqrt(3)/2) dropped from the hex center
    // to the appropriate edge
    const hv = { x: qx * h, y: qy * 0.5 };

    // A scalar projection of `d` to `hv`
    const ds = scalarProj(d, hv);

    if (ds <= h) {
        // If the scalar projection is smaller than h, it means the point is still
        // within the reference hex. It's the second most typical case.
        return h0;
    } else {
        // The point is in the reference hex's neighbour. It's a corner case.
        const hx = qx < 0 ? hx0 - 1 : hx0 + 1;

        if (qy < 0) {
            return { x: hx, y: hy0 + ((hx0 % 2 == 0) ? -1 : 0) };
        } else {
            return { x: hx, y: hy0 + ((hx0 % 2 == 0) ? 0 : 1) };
        }
    }

}

function drawHex(
    ctx: CanvasRenderingContext2D,
    matrix: tm.Matrix,
    i: number, j: number,
): void {
    const a = 1;
    const h = (a * Math.sqrt(3)) / 2;

    const { x, y } = mapHexCoordToWorldPoint({ x: j, y: i });

    const points: ReadonlyArray<Vec2> = [
        { x: x + a / 2, y: y + h },
        { x: x + a, y: y },
        { x: x + a / 2, y: y - h },
        { x: x - a / 2, y: y - h },
        { x: x - a, y: y },
        { x: x - a / 2, y: y + h },
    ].map((p) => tm.applyToPoint(matrix, p));

    ctx.beginPath();

    const p0 = points[points.length - 1];
    ctx.moveTo(p0.x, p0.y);

    points.forEach((p) => {
        ctx.lineTo(p.x, p.y);
    });

    ctx.stroke();

    ctx.closePath();
}

const selectedHexCoord = new MutableCell<Vec2>({ x: 0, y: 0 });

function createHexGridCanvas() {
    const a = 64;

    const buildMatrix = (canvas: HTMLCanvasElement) =>
        tm.compose(
            tm.translate(canvas.width / 2, canvas.height / 2),
            tm.scale(a, a * (3 / 4)),
        );

    const redraw = (ctx: CanvasRenderingContext2D) => {
        const canvas = ctx.canvas;
        const matrix = buildMatrix(canvas);

        ctx.fillStyle = MyColors.ground;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 2;


        ctx.strokeStyle = MyColors.hexBorder;

        const n = 4;
        for (let i = -n; i <= n; ++i) {
            for (let j = -n; j <= n; ++j) {
                drawHex(ctx, matrix, i, j);
            }
        }

        ctx.strokeStyle = MyColors.selectedHexBorder;

        const c = selectedHexCoord.value;
        drawHex(ctx, matrix, c.y, c.x);
    };

    const canvas = createFullscreenCanvas(
        redraw,
        selectedHexCoord.values().map(() => null),
    );

    canvas.addEventListener('click', (e) => {
        const inversedMatrix = tm.inverse(buildMatrix(canvas));
        const pw = tm.applyToPoint(inversedMatrix, e);
        selectedHexCoord.value = mapWorldPointToHexCoord(pw);
    });

    return canvas;
}

const canvas = createHexGridCanvas();

document.body.appendChild(canvas);
