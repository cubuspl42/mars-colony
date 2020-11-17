import { createFullscreenCanvas } from "./fullscreen_canvas";

const x0 = 1024;
const y0 = 512;

function drawHex(ctx: CanvasRenderingContext2D, i: number, j: number): void {
    const a = 64;
    const h = (a * Math.sqrt(3)) / 2;

    const x = x0 + j * (3 * a / 2);
    const yDelta = j % 2 == 0 ? 0 : h;
    const y = y0 + i * (h * 2) + yDelta;

    ctx.moveTo(x + a / 2, y + h);
    ctx.lineTo(x + a, y);
    ctx.lineTo(x + a / 2, y - h);
    ctx.lineTo(x - a / 2, y - h);
    ctx.lineTo(x - a, y);
    ctx.lineTo(x - a / 2, y + h);
    ctx.lineTo(x + a / 2, y + h);
    ctx.stroke();
}

const canvas = createFullscreenCanvas((ctx) => {
    ctx.scale(1, 3 / 4);

    const n = 4;
    for (let i = -n; i < n; ++i) {
        for (let j = -n; j < n; ++j) {
            drawHex(ctx, i, j);
        }
    }
});

document.body.appendChild(canvas);
