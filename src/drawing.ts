import * as tm from "transformation-matrix";
import { createFullscreenCanvas } from "./fullscreen_canvas";
import { mapHexCoordToWorldPoint, mapWorldPointToHexCoord } from "./hex";
import { Vec2 } from "./geometry";
import { MutableCell } from "./frp/Cell";
import { MyColors } from "./colors";
import { BuildingKind, Game, HexCoord } from "./game";
import { Key } from "ts-key-enum";

const buildMatrix = (canvas: HTMLCanvasElement) =>
    tm.compose(
        tm.translate(canvas.width / 2, canvas.height / 2),
        tm.scale(64, 64),
        tm.scale(1, 3 / 4),
    );

function drawHex(
    ctx: CanvasRenderingContext2D,
    matrix: tm.Matrix,
    hexCoord: HexCoord,
): void {
    const a = 1;
    const h = (a * Math.sqrt(3)) / 2;

    const { x, y } = mapHexCoordToWorldPoint(hexCoord);

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


function drawGround(args: {
    readonly ctx: CanvasRenderingContext2D,
}) {
    const { ctx } = args;
    const canvas = ctx.canvas;

    ctx.fillStyle = MyColors.ground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawHexGrid(args: {
    readonly ctx: CanvasRenderingContext2D,
    readonly game: Game,
    readonly matrix: tm.Matrix,
}) {
    const { ctx, game, matrix } = args;

    const n = 4;
    for (let i = -n; i <= n; ++i) {
        for (let j = -n; j <= n; ++j) {
            const hexCoord = { i, j };

            drawHex(ctx, matrix, hexCoord);

            const building = game.getBuildingAt(hexCoord);

            if (building !== undefined) {
                drawBuilding({
                    ctx,
                    buildingKind: building.kind,
                    matrix,
                    hexCoord: hexCoord,
                });
            }
        }
    }
}

function drawBuilding(args: {
    readonly ctx: CanvasRenderingContext2D,
    readonly buildingKind: BuildingKind,
    readonly matrix: tm.Matrix,
    readonly hexCoord: HexCoord,
}) {
    const { ctx, buildingKind, matrix, hexCoord } = args;

    ctx.fillStyle = "#545454";
    ctx.textBaseline = 'middle';
    ctx.textAlign = "center";
    ctx.font = "24pt sans-serif"

    const vw = mapHexCoordToWorldPoint(hexCoord);
    const vs = tm.applyToPoint(matrix, vw);
    const text = buildingKind.slice(-1);

    ctx.fillText(text, vs.x, vs.y);
}

function drawGame(args: {
    readonly ctx: CanvasRenderingContext2D,
    readonly game: Game,
    readonly selectedHexCoord: MutableCell<HexCoord>,
}): void {
    const { ctx, game, selectedHexCoord } = args;

    const canvas = ctx.canvas;
    const matrix = buildMatrix(canvas);

    ctx.lineWidth = 2;

    drawGround({ ctx });

    ctx.strokeStyle = MyColors.hexBorder;

    drawHexGrid({ ctx, game, matrix });

    ctx.strokeStyle = MyColors.selectedHexBorder;

    drawHex(ctx, matrix, selectedHexCoord.value);
}

export function createHexGridCanvas(args: {
    readonly game: Game,
    readonly selectedHexCoord: MutableCell<HexCoord>,
}) {
    const { game, selectedHexCoord } = args;

    const redraw = (ctx: CanvasRenderingContext2D) => {
        drawGame({ ctx, game, selectedHexCoord, });
    }

    const canvas = createFullscreenCanvas(
        selectedHexCoord.mapTo(redraw),
    );

    canvas.addEventListener('click', (e) => {
        const inversedMatrix = tm.inverse(buildMatrix(canvas));
        const pw = tm.applyToPoint(inversedMatrix, e);
        selectedHexCoord.value = mapWorldPointToHexCoord(pw);
    });

    document.body.addEventListener('keydown', (e) => {
        if (e.key === Key.Enter) {
            game.buildBuilding(selectedHexCoord.value, BuildingKind.buildingA);
        }
    });

    return canvas;
}
