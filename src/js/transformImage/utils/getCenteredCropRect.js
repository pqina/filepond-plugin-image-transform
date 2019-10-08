export const getCenteredCropRect = (container, aspectRatio) => {

    let width = container.width;
    let height = width * aspectRatio;
    if (height > container.height) {
        height = container.height;
        width = height / aspectRatio;
    }
    const x = ((container.width - width) * .5);
    const y = ((container.height - height) * .5);

    return {
        x, y, width, height
    }
}