export const TransformWorker = () => {
    
    // maps transform types to transform functions
    const transformMatrix = {
        resize
    };

    // applies all image transforms to the image data array
    const applyTransforms = (transforms, imageData) => {
        transforms.forEach(transform => {
            const fn = transformMatrix[transform.type];
            if (!fn) return;
            imageData = fn(
                imageData,
                transform.data
            );
        });
        return imageData;
    };

    // transform image hub
    const transform = (data, cb) => {
        // transform image data
        const imageData = applyTransforms(data.transforms, data.imageData);

        // done
        cb(imageData);
    };

    // route messages
    self.onmessage = e => {
        transform(e.data.message, response => {
            self.postMessage({ id: e.data.id, message: response }, [
                response.data.buffer
            ]);
        });
    };

    //
    // Transforms
    //
    function resize(imageData, data) {
        const { mode, upscale } = data;
        let { width, height } = data.size;

        if (width === null) {
            width = height;
        } else if (height === null) {
            height = width;
        }
        
        if (mode !== 'force') {

            let scalarWidth = width / imageData.width;
            let scalarHeight = height / imageData.height;
            let scalar = 1;
            if (mode === 'cover') {
                scalar = Math.max(scalarWidth, scalarHeight);
            } else if (mode === 'contain') {
                scalar = Math.min(scalarWidth, scalarHeight);
            }

            // if image is too small, exit here with original image
            if (scalar > 1 && upscale === false) {
                return imageData;
            }

            width = imageData.width * scalar;
            height = imageData.height * scalar;
        }

        const W = imageData.width;
        const H = imageData.height;
        const W2 = Math.round(width);
        const H2 = Math.round(height);
        var inputData = imageData.data;
        var outputData = new Uint8ClampedArray(W2 * H2 * 4);
        var ratio_w = W / W2;
        var ratio_h = H / H2;
        var ratio_w_half = Math.ceil(ratio_w / 2);
        var ratio_h_half = Math.ceil(ratio_h / 2);

        for (var j = 0; j < H2; j++) {
            for (var i = 0; i < W2; i++) {
                var x2 = (i + j * W2) * 4;
                var weight = 0;
                var weights = 0;
                var weights_alpha = 0;
                var gx_r = (gx_g = gx_b = gx_a = 0);
                var center_y = (j + 0.5) * ratio_h;
                for (
                    var yy = Math.floor(j * ratio_h);
                    yy < (j + 1) * ratio_h;
                    yy++
                ) {
                    var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
                    var center_x = (i + 0.5) * ratio_w;
                    var w0 = dy * dy; //pre-calc part of w
                    for (
                        var xx = Math.floor(i * ratio_w);
                        xx < (i + 1) * ratio_w;
                        xx++
                    ) {
                        var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
                        var w = Math.sqrt(w0 + dx * dx);
                        if (w >= -1 && w <= 1) {
                            //hermite filter
                            weight = 2 * w * w * w - 3 * w * w + 1;
                            if (weight > 0) {
                                dx = 4 * (xx + yy * W);
                                //alpha
                                gx_a += weight * inputData[dx + 3];
                                weights_alpha += weight;
                                //colors
                                if (inputData[dx + 3] < 255)
                                    weight = weight * inputData[dx + 3] / 250;
                                gx_r += weight * inputData[dx];
                                gx_g += weight * inputData[dx + 1];
                                gx_b += weight * inputData[dx + 2];
                                weights += weight;
                            }
                        }
                    }
                }
                outputData[x2] = gx_r / weights;
                outputData[x2 + 1] = gx_g / weights;
                outputData[x2 + 2] = gx_b / weights;
                outputData[x2 + 3] = gx_a / weights_alpha;
            }
        }

        return {
            data: outputData,
            width: W2,
            height: H2
        };
    }
};
