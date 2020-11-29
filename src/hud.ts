import { Game } from "./game/game";
import { Cell } from "./frp/Cell";

function createTextNode(text: Cell<string>): Text {
    const node = document.createTextNode(text.value);

    text.listen((t) => {
        node.textContent = t;
    });

    return node;
}

export function createHudElement(args: {
    readonly game: Game,
}): HTMLElement {
    const { game } = args;

    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";

    const container = document.createElement("div");
    container.style.padding = "16px";
    wrapper.appendChild(container);

    const xpText = createTextNode(game.xpCount.map((x) => `XP: ${x}`));
    container.appendChild(xpText);

    return wrapper;
}
