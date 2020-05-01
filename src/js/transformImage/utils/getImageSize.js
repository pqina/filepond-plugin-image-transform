export const getImageSize = (file) => new Promise((resolve, reject) => {
        
    const imageElement = new Image()
    imageElement.src = URL.createObjectURL(file);

    // start testing size
    const measure = () => {
        const width = imageElement.naturalWidth;
        const height = imageElement.naturalHeight;
        const hasSize = width && height;
        if (!hasSize) return;

        URL.revokeObjectURL(imageElement.src);
        clearInterval(intervalId);
        resolve({ width, height });
    };

    imageElement.onerror = (err) => {
        URL.revokeObjectURL(imageElement.src);
        clearInterval(intervalId);
        reject(err);
    };

    const intervalId = setInterval(measure, 1);

    measure();
});
