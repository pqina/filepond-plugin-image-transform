import { getImageOrientationMatrix } from './getImageOrientationMatrix';
import { getImageRectZoomFactor } from './getImageRectZoomFactor';
import { getCenteredCropRect } from './getCenteredCropRect';
import { calculateCanvasSize } from './calculateCanvasSize';
import { canvasRelease } from './canvasRelease';

const isFlipped = (flip) => flip && (flip.horizontal || flip.vertical)

const getBitmap = (image, orientation, flip) => {

    if (orientation <= 1 && !isFlipped(flip)) {
        image.width = image.naturalWidth;
        image.height = image.naturalHeight;
        return image;
    }
    
    const canvas = document.createElement('canvas');
    const width = image.naturalWidth;
    const height = image.naturalHeight;
  
    // if is rotated incorrectly swap width and height
    const swapped = orientation >= 5 && orientation <= 8;
    if (swapped) {
      canvas.width = height;
      canvas.height = width;
    }
    else {
      canvas.width = width;
      canvas.height = height;
    }

    // draw the image but first fix orientation and set correct flip
    const ctx = canvas.getContext('2d');

    // get base transformation matrix
    if (orientation) {
        ctx.transform.apply(ctx, getImageOrientationMatrix(width, height, orientation));
    }

    if (isFlipped(flip)) {

        // flip horizontal
        // [-1, 0, 0, 1, width, 0]
        const matrix = [1, 0, 0, 1, 0, 0];
        if ((!swapped && flip.horizontal) || (swapped & flip.vertical)) {
            matrix[0] = -1;
            matrix[4] = width;
        }

        // flip vertical
        // [1, 0, 0, -1, 0, height]
        if ((!swapped && flip.vertical) || (swapped && flip.horizontal)) {
            matrix[3] = -1;
            matrix[5] = height;
        }

        ctx.transform(...matrix);
    }

    ctx.drawImage(image, 0, 0, width, height);
    
    return canvas;
  
};

export const imageToImageData = (imageElement, orientation, crop = {}, options = {}) => {
    
    const { canvasMemoryLimit, background = null } = options;

    const zoom = crop.zoom || 1;

    // fixes possible image orientation problems by drawing the image on the correct canvas
    const bitmap = getBitmap(imageElement, orientation, crop.flip);
    const imageSize = {
        width: bitmap.width,
        height: bitmap.height
    };

    
    const aspectRatio = crop.aspectRatio || imageSize.height / imageSize.width;

    let canvasSize = calculateCanvasSize(imageSize, aspectRatio, zoom);
    
    if (canvasMemoryLimit) {
        const requiredMemory = canvasSize.width * canvasSize.height;
        if (requiredMemory > canvasMemoryLimit) {
            const scalar = Math.sqrt(canvasMemoryLimit) / Math.sqrt(requiredMemory);
            imageSize.width = Math.floor(imageSize.width * scalar);
            imageSize.height = Math.floor(imageSize.height * scalar);
            canvasSize = calculateCanvasSize(imageSize, aspectRatio, zoom);
        }
    }

    const canvas = document.createElement('canvas');
    
    const canvasCenter = {
        x: canvasSize.width * .5,
        y: canvasSize.height * .5
    };

    const stage = {
        x: 0,
        y: 0,
        width: canvasSize.width,
        height: canvasSize.height,
        center: canvasCenter
    }

    const shouldLimit = typeof crop.scaleToFit === 'undefined' || crop.scaleToFit;

    const scale = zoom * getImageRectZoomFactor(
        imageSize,
        getCenteredCropRect(stage, aspectRatio),
        crop.rotation,
        shouldLimit ? crop.center : { x:.5, y:.5 }
    );

    // start drawing
    canvas.width = Math.round(canvasSize.width / scale);
    canvas.height = Math.round(canvasSize.height / scale);

    canvasCenter.x /= scale;
    canvasCenter.y /= scale;

    const imageOffset = {
        x: canvasCenter.x - (imageSize.width * (crop.center ? crop.center.x : .5)),
        y: canvasCenter.y - (imageSize.height * (crop.center ? crop.center.y : .5))
    };
    
    const ctx = canvas.getContext('2d');
    if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // move to draw offset
    ctx.translate(canvasCenter.x, canvasCenter.y);
    ctx.rotate(crop.rotation || 0);

    // draw the image
    ctx.drawImage(
        bitmap, 
        imageOffset.x - canvasCenter.x, 
        imageOffset.y - canvasCenter.y, 
        imageSize.width, 
        imageSize.height
    );

    // get data from canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // release canvas
    canvasRelease(canvas);

    // return data
    return imageData;
};
