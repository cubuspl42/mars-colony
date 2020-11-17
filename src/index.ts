import { createFullscreenCanvas } from "./fullscreen_canvas";
import * as tm from 'transformation-matrix';

const x0 = 0;
const y0 = 0;

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

    const p0 = points[points.length - 1];
    ctx.moveTo(p0.x, p0.y);

    points.forEach((p) => {
        ctx.lineTo(p.x, p.y);
    });

    ctx.stroke();
}

const canvas = createFullscreenCanvas((ctx) => {
    const canvas = ctx.canvas;

    ctx.fillStyle = "#c87137";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const matrix: tm.Matrix = tm.compose(
        tm.translate(canvas.width / 2, canvas.height / 2),
        tm.scale(1, 3 / 4),
    );

    const n = 4;
    for (let i = -n; i <= n; ++i) {
        for (let j = -n; j <= n; ++j) {
            drawHex(ctx, matrix, i, j);
        }
    }
});

document.body.appendChild(canvas);
