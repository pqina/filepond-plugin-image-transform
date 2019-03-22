export const imageDataToBlob = (imageData, options) =>
    new Promise((resolve, reject) => {
        const image = document.createElement('canvas');
        image.width = imageData.width;
        image.height = imageData.height;
        const ctx = image.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        image.toBlob(resolve, options.type, options.quality);
    });
