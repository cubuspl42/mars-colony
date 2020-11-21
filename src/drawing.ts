import * as tm from "transformation-matrix";
import { createFullscreenCanvas } from "./fullscreen_canvas";
import { mapHexCoordToWorldPoint, mapWorldPointToHexCoord } from "./hex";
import { Vec2 } from "./geometry";
import { MutableCell } from "./frp/Cell";
import { MyColors } from "./colors";

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

export function createHexGridCanvas(args: {
    readonly selectedHexCoord: MutableCell<Vec2>,
}) {
    const { selectedHexCoord } = args;

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
