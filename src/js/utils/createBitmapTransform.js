import { imageToImageData } from './imageToImageData';
import { objectToImageData } from './objectToImageData';
import { TransformWorker } from './TransformWorker';
import { imageDataToBlob } from './imageDataToBlob';
import { getImageHead } from './getImageHead';

export const createBitmapTransform = ({ loadImage, createWorker, getFilenameWithoutExtension, getFileFromBlob }) => {

    // Renames the output file to match the format
    const renameFileToMatchMimeType = (filename, format) => {
        const name = getFilenameWithoutExtension(filename);
        const extension =
            format === 'image/jpeg' ? 'jpg' : format.split('/')[1];
        return `${name}.${extension}`;
    };

    // Returns all the valid output formats we can encode towards
    const getOutputMimeType = type => {
        // allowed formats
        if (type === 'image/jpeg' || type === 'image/png') {
            return type;
        }
        // fallback, will also fix image/jpg
        return 'image/jpeg';
    };

    // creates a blob from the passed image data
    const toBlob = (originalFile, imageData, options) => new Promise((resolve, reject) => {

        const blobToFile = blob => {

            // transform to file
            const transformedFile = getFileFromBlob(
                blob,
                renameFileToMatchMimeType(
                    originalFile.name,
                    getOutputMimeType(blob.type)
                )
            );

            // we done!
            resolve(transformedFile);
        }

        imageDataToBlob(imageData, options)
            .then(blob => {
                if (!options.stripImageHead) {
                    getImageHead(originalFile).then(imageHead => {
                        // re-inject image head EXIF info in case of JPEG, as the image head is removed by canvas export
                        if (imageHead !== null) {
                            blob = new Blob([imageHead, blob.slice(20)], { type: blob.type });
                        }
                        blobToFile(blob);
                    });
                }
                else {
                    blobToFile(blob);
                }
            })
            .catch(error => {
                console.error(error);
            });

    });


    return (item, file, transforms, output) => new Promise((resolve, reject) => {

        // handle <img> object
        const handleImage = (image) => {

            // exit if was archived in the mean time
            if (item.archived) return resolve(file);

            // get crop info if set
            const crop = (transforms.find(t => t.type === 'crop') || {}).data;
            
            // draw to canvas and start transform chain
            const imageData = imageToImageData(image, (item.getMetadata('exif') || {}).orientation || -1,  crop);

            // no transforms to apply, only output quality changes
            if (!transforms.length) return toBlob(file, imageData, output).then(resolve);

            // send to the transform worker
            const worker = createWorker(TransformWorker);
            worker.post(
                {
                    transforms,
                    imageData
                },
                response => {

                    // exit if was archived in the mean time
                    if (item.archived) return resolve(file);
                    
                    // finish up
                    toBlob(file, objectToImageData(response), output).then(resolve);

                    // stop worker
                    worker.terminate();
                },
                [imageData.data.buffer]
            );
        };

        // get file url and load the image so it's an image object and we can access the image data
        const url = URL.createObjectURL(file);
        loadImage(url).then(image => {
            URL.revokeObjectURL(url);
            handleImage(image);
        });
    
    });
}