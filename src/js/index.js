import { isImage } from './utils/isImage';
import { createSVGTransform } from './utils/createSVGTransform';
import { createBitmapTransform } from './utils/createBitmapTransform';

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

/**
 * Image Transform Plugin
 */
const plugin = ({ addFilter, utils }) => {
    
    const {
        Type,
        forin,
        loadImage,
        getFileFromBlob,
        getFilenameWithoutExtension,
        createWorker,
        createBlob,
        renameFile,
        isFile
    } = utils;

    /**
     * Helper functions
     */

    // valid transforms
    const TRANSFORM_LIST = ['crop', 'resize'];

    const createVariantCreator = (updateMetadata) => (transform, file, metadata) => transform(file, updateMetadata ? updateMetadata(metadata) : metadata);

    const orderTransforms = (transforms) => {
        transforms.sort((a, b) => {
            const indexOfA = TRANSFORM_LIST.indexOf(a.type);
            const indexOfB = TRANSFORM_LIST.indexOf(b.type);
            if (indexOfA < indexOfB) return -1;
            if (indexOfA > indexOfB) return 1;
            return 0;
        });
    }

    const transformBitmap = createBitmapTransform({
        loadImage,
        createWorker,
        getFileFromBlob,
        getFilenameWithoutExtension
    });

    const transformSVG = createSVGTransform({ createBlob, renameFile });

    /**
     * Filters
     */
    addFilter('SHOULD_PREPARE_OUTPUT', (shouldPrepareOutput, { query, item }) =>
        new Promise(resolve => {
            // If is not async should prepare now
            resolve(!query('IS_ASYNC'));
        })
    );

    // subscribe to file transformations
    addFilter(
        'PREPARE_OUTPUT',
        (file, { query, item }) =>
            new Promise(resolve => {

                // if the file is not an image we do not have any business transforming it
                if (!isFile(file) || !isImage(file) || !query('GET_ALLOW_IMAGE_TRANSFORM') || item.archived) {
                    return resolve(file);
                }

                // get variants
                const variants = [];

                // add original file
                if (query('GET_IMAGE_TRANSFORM_VARIANTS_INCLUDE_ORIGINAL')) {
                    variants.push(() => new Promise(resolve => {
                        resolve({name:query('GET_IMAGE_TRANSFORM_VARIANTS_ORIGINAL_NAME'), file});
                    }));
                }

                // add default output version if output default set to true or if no variants defined
                if (query('GET_IMAGE_TRANSFORM_VARIANTS_INCLUDE_DEFAULT')) {
                    variants.push((transform, file, metadata) => new Promise(resolve => {
                        transform(file, metadata).then(file => resolve({name:query('GET_IMAGE_TRANSFORM_VARIANTS_DEFAULT_NAME'), file}));
                    }));
                }

                // get other variants
                const variantsDefinition = query('GET_IMAGE_TRANSFORM_VARIANTS') || {};
                forin(variantsDefinition, (key, fn) => {
                    const createVariant = createVariantCreator(fn);
                    variants.push((transform, file, metadata) => new Promise(resolve => {
                        createVariant(transform, file, metadata).then(file => resolve({name:key, file}));
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
                    quality,
                    type,
                    client: clientTransforms
                }, true);
                
                // the function that is used to apply the file transformations
                const transform = (file, metadata) =>  new Promise((resolve, reject) => {

                    // The list of transforms to apply
                    const transforms = [];

                    // Move transforms from metadata to transform list
                    forin(metadata, (key, value) => {
                        if (!clientTransforms.includes(key)) return;
                        transforms.push({
                            type: key,
                            data: value
                        });
                    });

                    // Sort list based on transform order
                    orderTransforms(transforms);

                    // Get output info so we can check if any output transforms should be applied
                    const { type, quality } = metadata.output || {};

                    // no transforms defined, or quality change not required, we done!
                    if (
                        // no transforms to apply
                        transforms.length === 0 &&

                        // no quality requirements, or quality should only be taken into account when other mutations are set, 
                        // plus no type changes
                        (quality === null || (quality !== null && qualityMode === 'optional')) && 
                        (type === null || (type === file.type))
                    ) return resolve(file);

                    // if this is an svg and we want it to stay an svg
                    if (/svg/.test(file.type) && type === null) {
                        return transformSVG(item, file, transforms).then(resolve);
                    }

                    transformBitmap(
                        item, file, transforms, 
                        {
                            type: type || file.type,
                            quality,
                            stripImageHead: query('GET_IMAGE_TRANSFORM_OUTPUT_STRIP_IMAGE_HEAD')
                        }).then(resolve);
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

            })
    );

    // Expose plugin options
    return {
        options: {
            allowImageTransform: [true, Type.BOOLEAN],

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
            imageTransformVariantsOriginalName: ['original_', Type.STRING]

        }
    };
};

// fire pluginloaded event if running in browser, this allows registering the plugin when using async script tags
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
if (isBrowser) {
    document.dispatchEvent(new CustomEvent('FilePond:pluginloaded', { detail: plugin }));
}

export default plugin;