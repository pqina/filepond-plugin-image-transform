export const imageDataToCanvas = (imageData) => {
    const image = document.createElement('canvas');
    image.width = imageData.width;
    image.height = imageData.height;
    const ctx = image.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return image;
};