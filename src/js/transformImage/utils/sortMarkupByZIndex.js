export const sortMarkupByZIndex = (a, b) => {
    if (a[1].zIndex > b[1].zIndex) {
        return 1;
    }
    if (a[1].zIndex < b[1].zIndex) {
        return -1;
    }
    return 0;
}