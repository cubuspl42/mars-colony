import { Cell } from "@common/frp/Cell";

export type DrawFn = (context: CanvasRenderingContext2D) => void;

export function createFullscreenCanvas(
    drawFn: Cell<DrawFn>,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    const redraw = (draw: DrawFn) => {
        draw(context);
    }

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        redraw(drawFn.value);
    }

    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);

    drawFn.map(redraw).listen(() => {
    });

    return canvas;
}
