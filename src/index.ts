import { createFullscreenCanvas } from "./fullscreen_canvas";
import * as tm from 'transformation-matrix';

const x0 = 0;
const y0 = 0;

class MyColors {
    static readonly ground = "#c87137";
    static readonly hexBorder = "black";
    static readonly selectedHexBorder = "yellow";
}

interface Vec2 {
    readonly x: number;
    readonly y: number;
}

function drawHex(
    ctx: CanvasRenderingContext2D,
    matrix: tm.Matrix,
    i: number, j: number,
): void {
    const a = 64;
    const h = (a * Math.sqrt(3)) / 2;

    const x = x0 + j * (3 * a / 2);
    const yDelta = j % 2 == 0 ? 0 : h;
    const y = y0 + i * (h * 2) + yDelta;

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

const canvas = createFullscreenCanvas((ctx) => {
    const canvas = ctx.canvas;

    ctx.fillStyle = MyColors.ground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;

    const matrix: tm.Matrix = tm.compose(
        tm.translate(canvas.width / 2, canvas.height / 2),
        tm.scale(1, 3 / 4),
    );

    ctx.strokeStyle = MyColors.hexBorder;

    const n = 4;
    for (let i = -n; i <= n; ++i) {
        for (let j = -n; j <= n; ++j) {
            drawHex(ctx, matrix, i, j);
        }
    }

    ctx.strokeStyle = MyColors.selectedHexBorder;

    drawHex(ctx, matrix, 0, 0);
});

document.body.appendChild(canvas);
