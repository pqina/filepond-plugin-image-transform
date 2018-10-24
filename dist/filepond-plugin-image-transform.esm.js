/*
 * FilePondPluginImageTransform 3.0.2
 * Licensed under MIT, https://opensource.org/licenses/MIT
 * Please visit https://pqina.nl/filepond for details.
 */

/* eslint-disable */
// test if file is of type image
const isImage = file => /^image/.test(file.type);

const transforms = {
  1: () => [1, 0, 0, 1, 0, 0],
  2: width => [-1, 0, 0, 1, width, 0],
  3: (width, height) => [-1, 0, 0, -1, width, height],
  4: (width, height) => [1, 0, 0, -1, 0, height],
  5: () => [0, 1, 1, 0, 0, 0],
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

const createVector = (x, y) => ({ x, y });

const vectorDot = (a, b) => a.x * b.x + a.y * b.y;

const vectorSubtract = (a, b) => createVector(a.x - b.x, a.y - b.y);

const vectorDistanceSquared = (a, b) =>
  vectorDot(vectorSubtract(a, b), vectorSubtract(a, b));

const vectorDistance = (a, b) => Math.sqrt(vectorDistanceSquared(a, b));

const getOffsetPointOnEdge = (length, rotation) => {
  const a = length;

  const A = 1.5707963267948966;
  const B = rotation;
  const C = 1.5707963267948966 - rotation;

  const sinA = Math.sin(A);
  const sinB = Math.sin(B);
  const sinC = Math.sin(C);
  const cosC = Math.cos(C);
  const ratio = a / sinA;
  const b = ratio * sinB;
  const c = ratio * sinC;

  return createVector(cosC * b, cosC * c);
};

const getRotatedRectSize = (rect, rotation) => {
  const w = rect.width;
  const h = rect.height;

  const hor = getOffsetPointOnEdge(w, rotation);
  const ver = getOffsetPointOnEdge(h, rotation);

  const tl = createVector(rect.x + Math.abs(hor.x), rect.y - Math.abs(hor.y));

  const tr = createVector(
    rect.x + rect.width + Math.abs(ver.y),
    rect.y + Math.abs(ver.x)
  );

  const bl = createVector(
    rect.x - Math.abs(ver.y),
    rect.y + rect.height - Math.abs(ver.x)
  );

  return {
    width: vectorDistance(tl, tr),
    height: vectorDistance(tl, bl)
  };
};

const getImageRectZoomFactor = (
  imageRect,
  cropRect,
  rotation = 0,
  center = { x: 0.5, y: 0.5 }
) => {
  // calculate available space round image center position
  const cx = center.x > 0.5 ? 1 - center.x : center.x;
  const cy = center.y > 0.5 ? 1 - center.y : center.y;
  const imageWidth = cx * 2 * imageRect.width;
  const imageHeight = cy * 2 * imageRect.height;

  // calculate rotated crop rectangle size
  const rotatedCropSize = getRotatedRectSize(cropRect, rotation);

  // calculate scalar required to fit image
  return Math.max(
    rotatedCropSize.width / imageWidth,
    rotatedCropSize.height / imageHeight
  );
};

const getCenteredCropRect = (container, aspectRatio) => {
  let width = container.width;
  let height = width * aspectRatio;
  if (height > container.height) {
    height = container.height;
    width = height / aspectRatio;
  }
  const x = (container.width - width) * 0.5;
  const y = (container.height - height) * 0.5;

  return {
    x,
    y,
    width,
    height
  };
};

const calculateCanvasSize = (image, canvasAspectRatio, zoom = 1) => {
  const imageAspectRatio = image.height / image.width;

  // determine actual pixels on x and y axis
  let canvasWidth = 1;
  let canvasHeight = canvasAspectRatio;
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
  };
};

const isFlipped = flip => flip && (flip.horizontal || flip.vertical);

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
  if (orientation >= 5 && orientation <= 8) {
    canvas.width = height;
    canvas.height = width;
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  // draw the image but first fix orientation and set correct flip
  const ctx = canvas.getContext('2d');
  if (orientation) {
    ctx.save();
    fixImageOrientation(ctx, width, height, orientation);
    ctx.restore();
  }

  if (isFlipped(flip)) {
    ctx.translate(canvas.width * 0.5, canvas.height * 0.5);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-canvas.width * 0.5, -canvas.height * 0.5);
  }

  ctx.drawImage(image, 0, 0, width, height);

  return canvas;
};

const imageToImageData = (imageElement, orientation, crop = {}) => {
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
    x: canvas.width * 0.5,
    y: canvas.height * 0.5
  };

  const imageOffset = {
    x: canvasCenter.x - imageSize.width * (crop.center ? crop.center.x : 0.5),
    y: canvasCenter.y - imageSize.height * (crop.center ? crop.center.y : 0.5)
  };

  const stage = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    center: canvasCenter
  };

  const stageZoomFactor = getImageRectZoomFactor(
    imageSize,
    getCenteredCropRect(stage, aspectRatio),
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

const cropSVG = (file, crop) =>
  new Promise((resolve, reject) => {
    // load file contents and wrap in crop svg
    const fr = new FileReader();
    fr.onloadend = () => {
      // get svg text
      const text = fr.result;

      // create element with svg and get size
      const original = document.createElement('div');
      original.style.cssText = `position:absolute;pointer-events:none;width:0;height:0;visibility:hidden;`;
      original.innerHTML = text;
      const originalNode = original.querySelector('svg');
      document.body.appendChild(original);

      // request bounding box dimensions
      const bBox = originalNode.getBBox();
      original.parentNode.removeChild(original);

      // get title
      const titleNode = original.querySelector('title');

      // calculate new heights and widths
      const viewBoxAttribute = originalNode.getAttribute('viewBox') || '';
      const widthAttribute = originalNode.getAttribute('width') || '';
      const heightAttribute = originalNode.getAttribute('height') || '';
      let width = parseFloat(widthAttribute) || null;
      let height = parseFloat(heightAttribute) || null;
      const widthUnits = (widthAttribute.match(/[a-z]+/) || [])[0] || '';
      const heightUnits = (heightAttribute.match(/[a-z]+/) || [])[0] || '';

      // create new size
      const viewBoxList = viewBoxAttribute.split(' ').map(parseFloat);
      const viewBox = viewBoxList.length
        ? {
            x: viewBoxList[0],
            y: viewBoxList[1],
            width: viewBoxList[2],
            height: viewBoxList[3]
          }
        : bBox;

      let imageWidth = width != null ? width : viewBox.width;
      let imageHeight = height != null ? height : viewBox.height;

      originalNode.style.overflow = 'visible';
      originalNode.setAttribute('width', imageWidth);
      originalNode.setAttribute('height', imageHeight);

      const aspectRatio = crop.aspectRatio || imageHeight / imageWidth;

      const canvasWidth = imageWidth;
      const canvasHeight = canvasWidth * aspectRatio;

      const canvasZoomFactor = getImageRectZoomFactor(
        {
          width: imageWidth,
          height: imageHeight
        },
        getCenteredCropRect(
          {
            width: canvasWidth,
            height: canvasHeight
          },
          aspectRatio
        ),
        crop.rotation,
        crop.center
      );

      const scale = crop.zoom * canvasZoomFactor;

      const rotation = crop.rotation * (180 / Math.PI);

      const canvasCenter = {
        x: canvasWidth * 0.5,
        y: canvasHeight * 0.5
      };

      const imageOffset = {
        x: canvasCenter.x - imageWidth * crop.center.x,
        y: canvasCenter.y - imageHeight * crop.center.y
      };

      const cropTransforms = [
        // rotate
        `rotate(${rotation} ${canvasCenter.x} ${canvasCenter.y})`,

        // scale
        `translate(${canvasCenter.x} ${canvasCenter.y})`,
        `scale(${scale})`,
        `translate(${-canvasCenter.x} ${-canvasCenter.y})`,

        // offset
        `translate(${imageOffset.x} ${imageOffset.y})`
      ];

      const flipTransforms = [
        `scale(${crop.flip.horizontal ? -1 : 1} ${
          crop.flip.vertical ? -1 : 1
        })`,
        `translate(${crop.flip.horizontal ? -imageWidth : 0} ${
          crop.flip.vertical ? -imageHeight : 0
        })`
      ];

      // crop
      const transformed = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasWidth}${widthUnits}" height="${canvasHeight}${heightUnits}" 
viewBox="0 0 ${canvasWidth} ${canvasHeight}" 
preserveAspectRatio="xMinYMin"
xmlns="http://www.w3.org/2000/svg">
<!-- Generator: FilePond Image Transform Plugin - https://pqina.nl/filepond -->
<title>${titleNode ? titleNode.textContent : file.name}</title>
<desc>Cropped with FilePond.</desc>
<g transform="${cropTransforms.join(' ')}">
<g transform="${flipTransforms.join(' ')}">
${originalNode.outerHTML}
</g>
</g>
</svg>`;

      // create new svg file
      resolve(transformed);
    };

    fr.readAsText(file);
  });

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
    createBlob,
    renameFile,
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
          !query('GET_ALLOW_IMAGE_TRANSFORM') ||
          item.archived
        ) {
          return resolve(file);
        }

        // compression quality 0 => 100
        const qualityAsPercentage = query('GET_IMAGE_TRANSFORM_OUTPUT_QUALITY');
        const quality =
          qualityAsPercentage === null ? null : qualityAsPercentage / 100;
        const qualityMode = query('GET_IMAGE_TRANSFORM_OUTPUT_QUALITY_MODE');

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

        // no transforms defined, or quality change not required, we done!
        if (
          (quality === null ||
            (quality !== null && qualityMode === 'optional')) &&
          type === null &&
          !crop &&
          !transforms.length
        ) {
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

        // if this is an svg and we want it to stay an svg
        if (/svg/.test(file.type) && type === null) {
          // no cropping? Done (as the SVG is vector data we're not resizing it)
          if (!crop) {
            return resolve(file);
          }

          cropSVG(file, crop).then(text => {
            resolve(renameFile(createBlob(text, 'image/svg+xml'), file.name));
          });

          return;
        }

        // turn the file into an image
        loadImage(url).then(image => {
          // url is no longer needed
          URL.revokeObjectURL(url);

          // exit if was archived in the mean time
          if (item.archived) {
            return resolve(file);
          }

          // get exif orientation
          const orientation =
            (item.getMetadata('exif') || {}).orientation || -1;

          // draw to canvas and start transform chain
          const imageData = imageToImageData(image, orientation, crop);

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
              // exit if was archived in the mean time
              if (item.archived) {
                return resolve(file);
              }

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
      imageTransformOutputQuality: [null, Type.INT],

      // only apply output quality when a transform is required
      imageTransformOutputQualityMode: ['always', Type.STRING]

      // 'always'
      // 'optional'
      // 'mismatch' (future feature, only applied if quality differs from input)
    }
  };
};

const isBrowser =
  typeof window !== 'undefined' && typeof window.document !== 'undefined';

if (isBrowser && document) {
  document.dispatchEvent(
    new CustomEvent('FilePond:pluginloaded', { detail: plugin$1 })
  );
}

export default plugin$1;
