/*
 * FilePondPluginImageTransform 1.1.1
 * Licensed under MIT, https://opensource.org/licenses/MIT
 * Please visit https://pqina.nl/filepond for details.
 */
// test if file is of type image
const isImage = file => /^image/.test(file.type);

const transforms = {
  1: () => [1, 0, 0, 1, 0, 0],
  2: width => [-1, 0, 0, 1, width, 0],
  3: (width, height) => [-1, 0, 0, -1, width, height],
  4: (width, height) => [1, 0, 0, -1, 0, height],
  5: [0, 1, 1, 0, 0, 0],
  6: (width, height) => [0, 1, -1, 0, height, 0],
  7: (width, height) => [0, -1, -1, 0, height, width],
  8: width => [0, -1, 1, 0, 0, width]
};

const fixImageOrientation = (ctx, width, height, orientation) => {
  // no orientation supplied
  if (orientation === -1) {
    return;
  }

  ctx.transform(...transforms[orientation](width, height));
};

const imageToImageData = (image, rect, orientation) => {
  if (!rect) {
    rect = {
      x: 0,
      y: 0,
      width: 1,
      height: 1
    };
  }

  const canvas = document.createElement('canvas');
  const width = image.naturalWidth;
  const height = image.naturalHeight;

  // if is rotated incorrectly swap width and height
  if (orientation >= 5 && orientation <= 8) {
    canvas.width = height;
    canvas.height = width;
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  // draw the image
  const ctx = canvas.getContext('2d');
  ctx.save();
  fixImageOrientation(ctx, width, height, orientation);
  ctx.drawImage(image, 0, 0, width, height);
  ctx.restore();

  // apply crop to get correct slice of data
  const data = ctx.getImageData(
    Math.round(rect.x * canvas.width),
    Math.round(rect.y * canvas.height),
    Math.round(rect.width * canvas.width),
    Math.round(rect.height * canvas.height)
  );

  // done!
  return data;
};

const imageDataToBlob = (imageData, options) =>
  new Promise((resolve, reject) => {
    const image = document.createElement('canvas');
    image.width = imageData.width;
    image.height = imageData.height;
    const ctx = image.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    image.toBlob(resolve, options.type, options.quality);
  });

const objectToImageData = obj => {
  let imageData;
  try {
    imageData = new ImageData(obj.width, obj.height);
  } catch (e) {
    // IE + Old EDGE (tested on 12)
    const canvas = document.createElement('canvas');
    imageData = canvas.getContext('2d').createImageData(obj.width, obj.height);
  }
  imageData.data.set(obj.data);
  return imageData;
};

const TransformWorker = () => {
  // maps transform types to transform functions
  const transformMatrix = {
    resize
  };

  // applies all image transforms to the image data array
  const applyTransforms = (transforms, imageData) => {
    transforms.forEach(transform => {
      imageData = transformMatrix[transform.type](imageData, transform.data);
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
        for (var yy = Math.floor(j * ratio_h); yy < (j + 1) * ratio_h; yy++) {
          var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
          var center_x = (i + 0.5) * ratio_w;
          var w0 = dy * dy; //pre-calc part of w
          for (var xx = Math.floor(i * ratio_w); xx < (i + 1) * ratio_w; xx++) {
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

/**
 * Polyfill Edge and IE
 */
if (!HTMLCanvasElement.prototype.toBlob) {
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    value: function(cb, type, quality) {
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

/**
 * Image Transform Plugin
 */
var plugin$1 = _ => {
  const { addFilter, utils } = _;
  const {
    Type,
    forin,
    loadImage,
    getFileFromBlob,
    getFilenameWithoutExtension,
    createWorker,
    isFile
  } = utils;

  // renames the output file to match the format
  const renameFileToMatchMimeType = (filename, format) => {
    const name = getFilenameWithoutExtension(filename);
    const extension = format === 'image/jpeg' ? 'jpg' : format.split('/')[1];
    return `${name}.${extension}`;
  };

  // returns all the valid output formats we can encode towards
  const getOutputMimeType = type => {
    // allowed formats
    if (type === 'image/jpeg' || type === 'image/png') {
      return type;
    }
    // fallback, will also fix image/jpg
    return 'image/jpeg';
  };

  // valid transforms
  const transformOrder = ['resize'];

  // subscribe to file transformations
  addFilter(
    'PREPARE_OUTPUT',
    (file, { query, item }) =>
      new Promise((resolve, reject) => {
        // if the file is not an image we do not have any business transforming it
        if (
          !isFile(file) ||
          !isImage(file) ||
          !query('GET_ALLOW_IMAGE_TRANSFORM')
        ) {
          return resolve(file);
        }

        // compression quality 0 => 100
        const qualityAsPercentage = query('GET_IMAGE_TRANSFORM_OUTPUT_QUALITY');
        const quality =
          qualityAsPercentage === null ? null : qualityAsPercentage / 100;

        // output format
        const type = query('GET_IMAGE_TRANSFORM_OUTPUT_MIME_TYPE');

        // get crop
        const { crop } = item.getMetadata();

        // get transforms
        const transforms = [];
        forin(item.getMetadata(), (key, value) => {
          if (!transformOrder.includes(key)) {
            return;
          }
          transforms.push({
            type: key,
            data: value
          });
        });

        // no transforms defined, we done!
        if (quality === null && type === null && !crop && !transforms.length) {
          return resolve(file);
        }

        // done
        const toBlob = (imageData, options) => {
          imageDataToBlob(imageData, options)
            .then(blob => {
              // transform to file
              const transformedFile = getFileFromBlob(
                blob,
                renameFileToMatchMimeType(
                  file.name,
                  getOutputMimeType(blob.type)
                )
              );

              // we done!
              resolve(transformedFile);
            })
            .catch(error => {
              console.error(error);
            });
        };

        // get file url
        const url = URL.createObjectURL(file);

        // turn the file into an image
        loadImage(url).then(image => {
          // url is no longer needed
          URL.revokeObjectURL(url);

          // get exif orientation
          const orientation =
            (item.getMetadata('exif') || {}).orientation || -1;

          // draw to canvas and start transform chain
          const imageData = imageToImageData(
            image,
            crop ? crop.rect : null,
            orientation
          );

          // no further transforms, we done!
          if (!transforms.length) {
            toBlob(imageData, {
              quality,
              type: type || file.type
            });
            return;
          }

          // send to the transform worker
          const worker = createWorker(TransformWorker);
          worker.post(
            {
              transforms,
              imageData
            },
            response => {
              // finish up
              toBlob(objectToImageData(response), {
                quality,
                type: type || file.type
              });

              // stop worker
              worker.terminate();
            },
            [imageData.data.buffer]
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
      imageTransformOutputQuality: [null, Type.INT]
    }
  };
};

if (typeof navigator !== 'undefined' && document) {
  // plugin has loaded
  document.dispatchEvent(
    new CustomEvent('FilePond:pluginloaded', { detail: plugin$1 })
  );
}

export default plugin$1;
