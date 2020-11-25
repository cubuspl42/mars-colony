import { Cell } from "./frp/Cell";

export type DrawFn = (context: CanvasRenderingContext2D) => void;

export function createFullscreenCanvas(
    drawFn: Cell<DrawFn>,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    const redraw = () => {
        const draw = drawFn.value;
        draw(context);
    }

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        redraw();
    }

    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);

    drawFn.listen(redraw);

    return canvas;
}
