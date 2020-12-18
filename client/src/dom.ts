import { ReactiveSet } from "@common/frp/ReactiveSet";
import { Cell } from "@common/frp/Cell";

function clearChildren(element: HTMLElement) {
    while (element.firstChild) {
        element.removeChild(element.lastChild!);
    }
}

export function linkElement(cell: Cell<Node>, parent: HTMLElement) {
    const appendChild = (child: Node): void => {
        parent.appendChild(child);
    }

    appendChild(cell.value);

    cell.listen((children) => {
        clearChildren(parent);
        appendChild(children);
    });
}

export function linkElements(elements: ReactiveSet<HTMLElement>, parent: HTMLElement) {
    const cell = elements.asCell();

    const appendChildren = (children: ReadonlySet<HTMLElement>): void => {
        children.forEach((element) => parent.appendChild(element));
    }

    appendChildren(cell.value);

    cell.listen((children) => {
        clearChildren(parent);
        appendChildren(children);
    });
}
