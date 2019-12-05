import { isImage } from './utils/isImage';
import { renameFileToMatchMimeType } from './utils/renameFileToMatchMimeType';
import { getValidOutputMimeType } from './utils/getValidOutputMimeType';
import { transformImage } from './transformImage/index';
import { prepareMarkup } from './utils/prepareMarkup';

/**
 * Polyfill Edge and IE when in Browser
 */
if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    if (!HTMLCanvasElement.prototype.toBlob) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
            value: function (cb, type, quality) {
                const canvas = this;
                setTimeout(() => {
                    const dataURL = canvas.toDataURL(type, quality).split(',')[1];
                    const binStr = atob(dataURL);
                    let index = binStr.length;
                    const data = new Uint8Array(index);
                    while (index--) {
                        data[index] = binStr.charCodeAt(index);
                    }
                    cb(new Blob([data], { type: type || 'image/png' }));
                });
            }
        });
    }
}

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isIOS = isBrowser && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

/**
 * Image Transform Plugin
 */
const plugin = ({ addFilter, utils }) => {
    
    const {
        Type,
        forin,
        getFileFromBlob,
        isFile
    } = utils;

    /**
     * Helper functions
     */

    // valid transforms (in correct order)
    const TRANSFORM_LIST = ['crop', 'resize', 'filter', 'markup' , 'output'];

    const createVariantCreator = (updateMetadata) => (transform, file, metadata) => transform(file, updateMetadata ? updateMetadata(metadata) : metadata);

    const isDefaultCrop = crop => 
        crop.aspectRatio === null && 
        crop.rotation === 0 &&
        crop.zoom === 1 &&
        crop.center && crop.center.x === .5 && crop.center.y === .5 &&
        crop.flip && crop.flip.horizontal === false && crop.flip.vertical === false;
    

    /**
     * Filters
     */
    addFilter('SHOULD_PREPARE_OUTPUT', (shouldPrepareOutput, { query }) =>
        new Promise(resolve => {
            // If is not async should prepare now
            resolve(!query('IS_ASYNC'));
        })
    );

    const shouldTransformFile = (query, file, item) => new Promise(resolve => {

        if (!isFile(file) || !isImage(file) || !query('GET_ALLOW_IMAGE_TRANSFORM') || item.archived) {
            return resolve(false);
        }

        const fn = query('GET_IMAGE_TRANSFORM_IMAGE_FILTER');
        if (fn) {
            const filterResult = fn(file);
            if (filterResult == null) { // undefined or null
                return handleRevert(true);
            }
            if (typeof filterResult === 'boolean') {
                return resolve(filterResult);
            }
            if (typeof filterResult.then === 'function') {
                return filterResult.then(resolve);
            }
        }

        return resolve(true);
    });

    // subscribe to file transformations
    addFilter(
        'PREPARE_OUTPUT',
        (file, { query, item }) =>
            new Promise(resolve => {

                shouldTransformFile(query, file, item)
                .then(shouldTransform => {

                    // no need to transform, exit
                    if (!shouldTransform) return resolve(file);

                    // get variants
                    const variants = [];

                    // add original file
                    if (query('GET_IMAGE_TRANSFORM_VARIANTS_INCLUDE_ORIGINAL')) {
                        variants.push(() => new Promise(resolve => {
                            resolve({ name:query('GET_IMAGE_TRANSFORM_VARIANTS_ORIGINAL_NAME'), file });
                        }));
                    }

                    // add default output version if output default set to true or if no variants defined
                    if (query('GET_IMAGE_TRANSFORM_VARIANTS_INCLUDE_DEFAULT')) {
                        variants.push((transform, file, metadata) => new Promise(resolve => {
                            transform(file, metadata).then(file => resolve({ name:query('GET_IMAGE_TRANSFORM_VARIANTS_DEFAULT_NAME'), file }));
                        }));
                    }

                    // get other variants
                    const variantsDefinition = query('GET_IMAGE_TRANSFORM_VARIANTS') || {};
                    forin(variantsDefinition, (key, fn) => {
                        const createVariant = createVariantCreator(fn);
                        variants.push((transform, file, metadata) => new Promise(resolve => {
                            createVariant(transform, file, metadata).then(file => resolve({ name:key, file }));
                        }));
                    });
                    
                    // output format (quality 0 => 100)
                    const qualityAsPercentage = query('GET_IMAGE_TRANSFORM_OUTPUT_QUALITY');
                    const qualityMode = query('GET_IMAGE_TRANSFORM_OUTPUT_QUALITY_MODE');
                    const quality = qualityAsPercentage === null ? null : qualityAsPercentage / 100;
                    const type = query('GET_IMAGE_TRANSFORM_OUTPUT_MIME_TYPE');
                    const clientTransforms = query('GET_IMAGE_TRANSFORM_CLIENT_TRANSFORMS') || TRANSFORM_LIST;

                    // update transform metadata object
                    item.setMetadata('output', {
                        type,
                        quality,
                        client: clientTransforms
                    }, true);
                    
                    // the function that is used to apply the file transformations
                    const transform = (file, metadata) =>  new Promise((resolve, reject) => {

                        const filteredMetadata = {...metadata};

                        Object.keys(filteredMetadata)
                            .filter(instruction => instruction !== 'exif')
                            .forEach(instruction => {
                                // if not in list, remove from object, the instruction will be handled by the server
                                if (clientTransforms.indexOf(instruction) === -1) {
                                    delete filteredMetadata[instruction];
                                }
                            });

                        const { resize, exif, output, crop, filter, markup } = filteredMetadata;

                        const instructions = {
                            image: {
                                orientation: exif ? exif.orientation : null
                            },
                            output: (output && (output.type || typeof output.quality === 'number' || output.background)) ? {
                                type: output.type,
                                quality: typeof output.quality === 'number' ? output.quality * 100 : null,
                                background: output.background || query('GET_IMAGE_TRANSFORM_CANVAS_BACKGROUND_COLOR') || null
                            } : undefined,
                            size: (resize && (resize.size.width || resize.size.height)) ? {
                                mode: resize.mode,
                                upscale: resize.upscale,
                                ...resize.size
                            } : undefined,
                            crop: crop && !isDefaultCrop(crop) ? {
                                ...crop
                            } : undefined,
                            markup: markup && markup.length ? markup.map(prepareMarkup) : [],
                            filter
                        };

                        if (instructions.output) {

                            // determine if file type will change
                            const willChangeType = output.type 
                                // type set
                                ? output.type !== file.type
                                // type not set
                                : false;

                            const canChangeQuality = /\/jpe?g$/.test(file.type);
                            const willChangeQuality = output.quality !== null 
                                // quality set
                                ? canChangeQuality && qualityMode === 'always'
                                // quality not set
                                : false;
                            
                            // determine if file data will be modified
                            const willModifyImageData = !!(
                                instructions.size || 
                                instructions.crop || 
                                instructions.filter || 
                                willChangeType ||
                                willChangeQuality
                            );
                            
                            // if we're not modifying the image data then we don't have to modify the output
                            if (!willModifyImageData) return resolve(file);
                        }

                        const options = {
                            beforeCreateBlob: query('GET_IMAGE_TRANSFORM_BEFORE_CREATE_BLOB'),
                            afterCreateBlob: query('GET_IMAGE_TRANSFORM_AFTER_CREATE_BLOB'),
                            canvasMemoryLimit: query('GET_IMAGE_TRANSFORM_CANVAS_MEMORY_LIMIT'),
                            stripImageHead: query('GET_IMAGE_TRANSFORM_OUTPUT_STRIP_IMAGE_HEAD')
                        };

                        transformImage(file, instructions, options).then(blob => {
                        
                            // set file object
                            const out = getFileFromBlob(
                                blob,
                                // rename the original filename to match the mime type of the output image
                                renameFileToMatchMimeType(file.name, getValidOutputMimeType(blob.type))
                            );

                            resolve(out);

                        }).catch(reject);
                    });
                    
                    // start creating variants
                    const variantPromises = variants.map(create => create(transform, file, item.getMetadata()));

                    // wait for results
                    Promise.all(variantPromises).then(files => {

                        // if single file object in array, return the single file object else, return array of 
                        resolve(
                            files.length === 1 && files[0].name === null ? 

                            // return the File object
                            files[0].file : 

                            // return an array of files { name:'name', file:File }
                            files
                        );

                    });



                });

            })
    );

    // Expose plugin options
    return {
        options: {
            allowImageTransform: [true, Type.BOOLEAN],

            // filter images to transform
            imageTransformImageFilter: [null, Type.FUNCTION],

            // null, 'image/jpeg', 'image/png'
            imageTransformOutputMimeType: [null, Type.STRING],

            // null, 0 - 100
            imageTransformOutputQuality: [null, Type.INT],

            // set to false to copy image exif data to output
            imageTransformOutputStripImageHead: [true, Type.BOOLEAN],

            // only apply transforms in this list
            imageTransformClientTransforms: [null, Type.ARRAY],

            // only apply output quality when a transform is required
            imageTransformOutputQualityMode: ['always', Type.STRING],
            // 'always'
            // 'optional'
            // 'mismatch' (future feature, only applied if quality differs from input)
            
            // get image transform variants
            imageTransformVariants: [null, Type.OBJECT],

            // should we post the default transformed file
            imageTransformVariantsIncludeDefault: [true, Type.BOOLEAN],

            // which name to prefix the default transformed file with
            imageTransformVariantsDefaultName: [null, Type.STRING],

            // should we post the original file
            imageTransformVariantsIncludeOriginal: [false, Type.BOOLEAN],

            // which name to prefix the original file with
            imageTransformVariantsOriginalName: ['original_', Type.STRING],

            // called before creating the blob, receives canvas, expects promise resolve with canvas
            imageTransformBeforeCreateBlob: [null, Type.FUNCTION],

            // expects promise resolved with blob
            imageTransformAfterCreateBlob: [null, Type.FUNCTION],

            // canvas memory limit
            imageTransformCanvasMemoryLimit: [isBrowser && isIOS ? 4096 * 4096 : null, Type.INT],

            // background image of the output canvas
            imageTransformCanvasBackgroundColor: [null, Type.STRING]
        }
    };
};

// fire pluginloaded event if running in browser, this allows registering the plugin when using async script tags
if (isBrowser) {
    document.dispatchEvent(new CustomEvent('FilePond:pluginloaded', { detail: plugin }));
}

export default plugin;