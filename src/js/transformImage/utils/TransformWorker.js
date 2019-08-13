/* javascript-obfuscator:disable */
export const TransformWorker = () => {

    // maps transform types to transform functions
    const TRANSFORMS = { resize, filter };

    // applies all image transforms to the image data array
    const applyTransforms = (transforms, imageData) => {
        transforms.forEach(transform => {
            imageData = TRANSFORMS[transform.type](imageData, transform.data);
        });
        return imageData;
    };

    // transform image hub
    const transform = (data, cb) => {

        let transforms = data.transforms;

        // if has filter and has resize, move filter to resize operation
        let filterTransform = null;
        transforms.forEach(transform => {
            if (transform.type === 'filter') {
                filterTransform = transform;
            }
        });
        if (filterTransform) {

            // find resize
            let resizeTransform = null;
            transforms.forEach(transform => {
                if (transform.type === 'resize') {
                    resizeTransform = transform;
                }
            });

            if (resizeTransform) {

                // update resize operation
                resizeTransform.data.matrix = filterTransform.data;

                // remove filter
                transforms = transforms.filter(transform => transform.type !== 'filter');
            }

        }

        cb(applyTransforms(transforms, data.imageData));
    };

    // eslint-disable-next-line no-restricted-globals
    self.onmessage = e => {
        transform(e.data.message, response => {
            // eslint-disable-next-line no-restricted-globals
            self.postMessage({ id: e.data.id, message: response }, [
                response.data.buffer
            ]);
        });
    };

    function applyFilterMatrix(index, data, matrix) {
        let i=0, row=0, c=0.0,
        r=data[index] / 255, 
        g=data[index + 1] / 255, 
        b=data[index + 2] / 255, 
        a=data[index + 3] / 255;
        for (; i<4; i++) {
            row = 5 * i;
            c = ((r * matrix[row]) + 
                (g * matrix[row + 1]) + 
                (b * matrix[row + 2]) + 
                (a * matrix[row + 3]) + 
                (matrix[row + 4])) * 255;
            data[index + i] = Math.max(0, Math.min(c, 255));
        }
    }

    const identityMatrix = self.JSON.stringify([1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]);
    function isIdentityMatrix(filter) {
        return self.JSON.stringify(filter || []) === identityMatrix;
    }

    function filter(imageData, matrix) {

        if (!matrix || isIdentityMatrix(matrix)) return imageData;

        const data = imageData.data;
        const l = data.length;

        const m11 = matrix[0];
        const m12 = matrix[1];
        const m13 = matrix[2];
        const m14 = matrix[3];
        const m15 = matrix[4];

        const m21 = matrix[5];
        const m22 = matrix[6];
        const m23 = matrix[7];
        const m24 = matrix[8];
        const m25 = matrix[9];
        
        const m31 = matrix[10];
        const m32 = matrix[11];
        const m33 = matrix[12];
        const m34 = matrix[13];
        const m35 = matrix[14];

        const m41 = matrix[15];
        const m42 = matrix[16];
        const m43 = matrix[17];
        const m44 = matrix[18];
        const m45 = matrix[19];

        let index=0, r=0.0, g=0.0, b=0.0, a=0.0;

        for (; index<l; index+=4) {
            r = data[index] / 255;
            g = data[index + 1] / 255;
            b = data[index + 2] / 255;
            a = data[index + 3] / 255;
            data[index] = Math.max(0, Math.min(((r * m11) + (g * m12) + (b * m13) + (a * m14) + (m15)) * 255, 255));
            data[index + 1] = Math.max(0, Math.min(((r * m21) + (g * m22) + (b * m23) + (a * m24) + (m25)) * 255, 255));
            data[index + 2] = Math.max(0, Math.min(((r * m31) + (g * m32) + (b * m33) + (a * m34) + (m35)) * 255, 255));
            data[index + 3] = Math.max(0, Math.min(((r * m41) + (g * m42) + (b * m43) + (a * m44) + (m45)) * 255, 255));
        }

        return imageData;
    }

    function resize(imageData, data) {

        let { mode = 'contain', upscale = false, width, height, matrix } = data;

        // test if is identity matrix
        matrix = !matrix || isIdentityMatrix(matrix) ? null : matrix;

        // need at least a width or a height
        // also 0 is not a valid width or height
        if (!width && !height) {
            return filter(imageData, matrix);
        }

        // make sure all bounds are set
        if (width === null) {
            width = height;
        }
        else if (height === null) {
            height = width;
        }
        
        if (mode !== 'force') {

            let scalarWidth = width / imageData.width;
            let scalarHeight = height / imageData.height;
            let scalar = 1;
            
            if (mode === 'cover') {
                scalar = Math.max(scalarWidth, scalarHeight);
            }
            else if (mode === 'contain') {
                scalar = Math.min(scalarWidth, scalarHeight);
            }
        
            // if image is too small, exit here with original image
            if (scalar > 1 && upscale === false) {
                return filter(imageData, matrix);
            }

            width = imageData.width * scalar;
            height = imageData.height * scalar;
        }

        const originWidth = imageData.width;
        const originHeight = imageData.height;
        const targetWidth = Math.round(width);
        const targetHeight = Math.round(height);
        const inputData = imageData.data;
        const outputData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
        const ratioWidth = originWidth / targetWidth;
        const ratioHeight = originHeight / targetHeight;
        const ratioWidthHalf = Math.ceil(ratioWidth * .5);
        const ratioHeightHalf = Math.ceil(ratioHeight * .5);

        for (let j=0; j<targetHeight; j++) {
            for (let i=0; i<targetWidth; i++) {
                
                let x2 = (i + j * targetWidth) * 4;
                let weight = 0;
                let weights = 0;
                let weightsAlpha = 0;
                let r = 0;
                let g = 0;
                let b = 0;
                let a = 0;
                let centerY = (j + .5) * ratioHeight;

                for (let yy = Math.floor(j * ratioHeight); yy < (j + 1) * ratioHeight; yy++) {

                    let dy = Math.abs(centerY - (yy + .5)) / ratioHeightHalf;
                    let centerX = (i + .5) * ratioWidth;
                    let w0 = dy * dy;
                    
                    for (let xx = Math.floor(i * ratioWidth); xx < (i + 1) * ratioWidth; xx++) {

                        let dx = Math.abs(centerX - (xx + .5)) / ratioWidthHalf;
                        let w = Math.sqrt(w0 + dx * dx);

                        if (w >= -1 && w <= 1) {
                            
                            weight = 2 * w * w * w - 3 * w * w + 1;

                            if (weight > 0) {
                                dx = 4 * (xx + yy * originWidth);
                                
                                let ref = inputData[dx + 3];
                                a += weight * ref;
                                weightsAlpha += weight;
                                
                                if (ref < 255) {
                                    weight = weight * ref / 250;
                                }
                                
                                r += weight * inputData[dx];
                                g += weight * inputData[dx + 1];
                                b += weight * inputData[dx + 2];
                                weights += weight;
                            }
                        }
                    }
                }

                outputData[x2] = r / weights;
                outputData[x2 + 1] = g / weights;
                outputData[x2 + 2] = b / weights;
                outputData[x2 + 3] = a / weightsAlpha;

                matrix && applyFilterMatrix(x2, outputData, matrix);
            }
        }

        return {
            data: outputData,
            width: targetWidth,
            height: targetHeight
        }
        
    }

};
/* javascript-obfuscator:enable */