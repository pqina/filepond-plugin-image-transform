export const objectToImageData = obj => {
    let imageData;
    try {
        imageData = new ImageData(obj.width, obj.height);
    } catch (e) {
        // IE + Old EDGE (tested on 12)
        const canvas = document.createElement('canvas');
        imageData = canvas
            .getContext('2d')
            .createImageData(obj.width, obj.height);
    }
    imageData.data.set(obj.data);
    return imageData;
};
