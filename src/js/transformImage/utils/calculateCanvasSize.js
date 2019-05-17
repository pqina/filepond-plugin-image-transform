export const calculateCanvasSize = (image, canvasAspectRatio, zoom = 1) => {

    const imageAspectRatio = image.height / image.width;

    // determine actual pixels on x and y axis
    let canvasWidth = 1;
    let canvasHeight = canvasAspectRatio
    let imgWidth = 1;
    let imgHeight = imageAspectRatio;
    if (imgHeight > canvasHeight) {
        imgHeight = canvasHeight;
        imgWidth = imgHeight / imageAspectRatio;
    }

    const scalar = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const width = image.width / (zoom * scalar * imgWidth);
    const height = width * canvasAspectRatio;

    return {
        width: width,
        height: height
    }
}