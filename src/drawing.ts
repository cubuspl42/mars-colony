import * as tm from "transformation-matrix";
import { createFullscreenCanvas, DrawFn } from "./fullscreen_canvas";
import { mapHexCoordToWorldPoint, mapWorldPointToHexCoord } from "./hex";
import { Vec2 } from "./geometry";
import { Cell, MutableCell } from "./frp/Cell";
import { MyColors } from "./colors";
import { BuildingKind, Game, HexCoord } from "./game";

export const hexGridScaleMatrix = tm.compose(
    tm.scale(64, 64),
    tm.scale(1, 0.55),
);

const buildMatrix = (canvas: HTMLCanvasElement) =>
    tm.compose(
        tm.translate(canvas.width / 2, canvas.height / 2),
        hexGridScaleMatrix,
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

function buildHexGridDrawFn(args: {
    readonly game: Game,
}): Cell<DrawFn> {
    const { game } = args;

    const buildHexDrawFn = (coord: HexCoord) => {
        return game.getBuildingAt(coord).map((building) => {
            return (ctx: CanvasRenderingContext2D) => {
                const matrix = buildMatrix(ctx.canvas);

                drawHex(ctx, matrix, coord);

                if (building !== undefined) {
                    // drawBuilding({
                    //     ctx,
                    //     buildingKind: building.kind,
                    //     matrix,
                    //     hexCoord: coord,
                    // });
                }
            }
        });
    }

    const hexDrawFns = new Array<Cell<DrawFn>>();

    const n = 4;
    for (let i = -n; i <= n; ++i) {
        for (let j = -n; j <= n; ++j) {
            hexDrawFns.push(buildHexDrawFn({ i, j }));
        }
    }

    return Cell.fuseArray(hexDrawFns).map((drawFns) => {
        return (ctx) => {
            drawFns.forEach((drawHex) => {
                drawHex(ctx);
            });
        }
    });
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

function buildGameDrawFn(args: {
    readonly game: Game,
    readonly selectedHexCoord: MutableCell<HexCoord>,
}): Cell<DrawFn> {
    const { game, selectedHexCoord } = args;

    return Cell.map2(
        buildHexGridDrawFn({ game }),
        selectedHexCoord,
        (
            drawHexGrid,
            selHexCoord,
        ) => {
            return (ctx: CanvasRenderingContext2D) => {
                const matrix = buildMatrix(ctx.canvas);

                ctx.lineWidth = 2;

                drawGround({ ctx });

                ctx.strokeStyle = MyColors.hexBorder;

                drawHexGrid(ctx);

                ctx.strokeStyle = MyColors.selectedHexBorder;

                drawHex(ctx, matrix, selHexCoord);
            };
        },
    );
}

export function createHexGridCanvas(args: {
    readonly game: Game,
    readonly selectedHexCoord: MutableCell<HexCoord>,
}) {
    const { game, selectedHexCoord } = args;

    const canvas = createFullscreenCanvas(
        buildGameDrawFn({ game, selectedHexCoord }),
    );

    canvas.addEventListener('click', (e) => {
        const inversedMatrix = tm.inverse(buildMatrix(canvas));
        const pw = tm.applyToPoint(inversedMatrix, e);
        selectedHexCoord.value = mapWorldPointToHexCoord(pw);
    });

    document.body.addEventListener('keydown', (e) => {
        const coord = selectedHexCoord.value;
        if (e.key === "a") {
            game.buildBuilding(coord, BuildingKind.buildingA);
        } else if (e.key === "b") {
            game.buildBuilding(coord, BuildingKind.buildingB);
        }
    });

    return canvas;
}
