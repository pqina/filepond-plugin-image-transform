import { getImageOrientationMatrix } from './getImageOrientationMatrix';
import { getImageRectZoomFactor } from './getImageRectZoomFactor';
import { getCenteredCropRect } from './getCenteredCropRect';

const calculateCanvasSize = (image, canvasAspectRatio, zoom = 1) => {

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

    const width = image.width / (zoom * imgWidth * scalar);
    const height = width * canvasAspectRatio;

    return {
        width: Math.round(width),
        height: Math.round(height)
    }
}

const isFlipped = (flip) => flip && (flip.horizontal || flip.vertical)

const getBitmap = (image, orientation, flip) => {

    if (!orientation && !isFlipped(flip)) {
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

        ctx.transform.apply(ctx, matrix);
    }

    ctx.drawImage(image, 0, 0, width, height);
    
    return canvas;
  
};

export const imageToImageData = (imageElement, orientation, crop) => {

    // set default value for crop
    if (!crop) {
        crop = {};
    }

    // fixes possible image orientation problems by drawing the image on the correct canvas
    const bitmap = getBitmap(imageElement, orientation, crop.flip);
    const imageSize = {
        width: bitmap.width,
        height: bitmap.height
    };

    const canvas = document.createElement('canvas');
    const aspectRatio = crop.aspectRatio || imageSize.height / imageSize.width;
    const canvasSize = calculateCanvasSize(imageSize, aspectRatio, crop.zoom);
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const canvasCenter = {
        x: canvas.width * .5,
        y: canvas.height * .5
    };

    const imageOffset = {
        x: canvasCenter.x - (imageSize.width * (crop.center ? crop.center.x : .5)),
        y: canvasCenter.y - (imageSize.height * (crop.center ? crop.center.y : .5))
    };

    const stage = {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
        center: canvasCenter
    }

    const stageZoomFactor = getImageRectZoomFactor(
        imageSize,
        getCenteredCropRect(
            stage, 
            aspectRatio
        ),
        crop.rotation,
        crop.center
    );

    const scale = (crop.zoom || 1) * stageZoomFactor;

    // start drawing
    const ctx = canvas.getContext('2d');

    // move to draw offset
    ctx.translate(canvasCenter.x, canvasCenter.y);
    ctx.rotate(crop.rotation || 0);
    ctx.scale(scale, scale);

    // draw the image
    ctx.drawImage(
        bitmap, 
        imageOffset.x - canvasCenter.x, 
        imageOffset.y - canvasCenter.y, 
        imageSize.width, 
        imageSize.height
    );

    // get data from canvas
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
};
