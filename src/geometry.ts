export interface Vec2 {
    readonly x: number;
    readonly y: number;
}

export function sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
}

export function dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
}

export function len(a: Vec2): number {
    return Math.sqrt(a.x * a.x + a.y * a.y);
}

export function scalarProj(a: Vec2, b: Vec2): number {
    return dot(a, b) / len(b);
}
