import { isImage } from './utils/isImage';
import { imageToImageData } from './utils/imageToImageData';
import { canvasToBlob } from './utils/canvasToBlob';
import { cropSVG } from './utils/cropSVG';
import { objectToImageData } from './utils/objectToImageData';
import { TransformWorker } from './utils/TransformWorker';
import { getImageHead } from './utils/getImageHead';
import { createBlob } from './utils/createBlob';
import { createWorker } from './utils/createWorker';
import { loadImage } from './utils/loadImage';
import { canvasApplyMarkup } from './utils/canvasApplyMarkup';
import { imageDataToCanvas } from './utils/imageDataToCanvas';
import { canvasRelease} from './utils/canvasRelease';

export const transformImage = (file, instructions, options = {}) => new Promise((resolve, reject) => {

    // if the file is not an image we do not have any business transforming it
    if (!file || !isImage(file)) return reject({ status: 'not an image file', file });

    // get separate options for easier use
    const { stripImageHead, beforeCreateBlob, afterCreateBlob, canvasMemoryLimit } = options;

    // get crop
    const { crop, size, filter, markup, output } = instructions;

    // get exif orientation
    const orientation = instructions.image && instructions.image.orientation ? Math.max(1, Math.min(8, instructions.image.orientation)) : null;

    // compression quality 0 => 100
    const qualityAsPercentage = output && output.quality;
    const quality = qualityAsPercentage === null ? null : qualityAsPercentage / 100;

    // output format
    const type = output && output.type || null;

    // background color
    const background = output && output.background || null;

    // get transforms
    const transforms = [];

    // add resize transforms if set
    if (size && (typeof size.width === 'number' || typeof size.height === 'number')) {
        transforms.push({ type: 'resize', data: size });
    }

    // add filters
    if (filter && filter.length === 20) {
        transforms.push({ type: 'filter', data: filter });
    }

    // resolves with supplied blob
    const resolveWithBlob = blob => {
        const promisedBlob = afterCreateBlob ? afterCreateBlob(blob) : blob;
        Promise.resolve(promisedBlob).then(resolve);
    }

    // done
    const toBlob = (imageData, options) => {
        const canvas = imageDataToCanvas(imageData);
        const promisedCanvas = markup.length ? canvasApplyMarkup(canvas, markup) : canvas;
        Promise.resolve(promisedCanvas).then(canvas => {
            canvasToBlob(canvas, options, beforeCreateBlob)
            .then(blob => {

                // force release of canvas memory
                canvasRelease(canvas);
        
                // remove image head (default)
                if (stripImageHead) return resolveWithBlob(blob);

                // try to copy image head from original file to generated blob
                getImageHead(file).then(imageHead => {

                    // re-inject image head in case of JPEG, as the image head is removed by canvas export
                    if (imageHead !== null) {
                        blob = new Blob([imageHead, blob.slice(20)], { type: blob.type });
                    }
                    
                    // done!
                    resolveWithBlob(blob);
                });
            })
            .catch(reject);
        })
    }

    // if this is an svg and we want it to stay an svg
    if (/svg/.test(file.type) && type === null) {
        return cropSVG(file, crop, markup, { background }).then(text => {
            resolve(
                createBlob(text, 'image/svg+xml')
            );
        });
    }

    // get file url
    const url = URL.createObjectURL(file);

    // turn the file into an image
    loadImage(url)
        .then(image => {

            // url is no longer needed
            URL.revokeObjectURL(url);

            // draw to canvas and start transform chain
            const imageData = imageToImageData(image, orientation, crop, { canvasMemoryLimit, background });

            // determine the format of the blob that we will output
            const outputFormat = {
                quality,
                type: type || file.type
            };

            // no transforms necessary, we done!
            if (!transforms.length) {
                return toBlob(imageData, outputFormat);
            }

            // send to the transform worker to transform the blob on a separate thread
            const worker = createWorker(TransformWorker);
            worker.post(
                {
                    transforms,
                    imageData
                },
                response => {

                    // finish up
                    toBlob(objectToImageData(response), outputFormat);

                    // stop worker
                    worker.terminate();
                },
                [imageData.data.buffer]
            );
        })
        .catch(reject);
})