/** Retain a leaf's DOM until its logical owner changes. */
export function imperativeLeaf(node, descriptor) {
    let current = descriptor;
    let handle = current.mount(node, current.model);
    return {
        update(next) {
            if (next.key === current.key) {
                current = next;
                handle.update(next.model);
                return;
            }
            handle.dispose();
            handle = null;
            current = next;
            handle = next.mount(node, next.model);
        },
        destroy() {
            handle?.dispose();
            handle = null;
        },
    };
}
