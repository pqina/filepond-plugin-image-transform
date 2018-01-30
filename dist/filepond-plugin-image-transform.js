/*
 * FilePondPluginImageTransform 1.0.0
 * Licensed under MIT, https://opensource.org/licenses/MIT
 * Please visit https://pqina.nl/filepond for details.
 */
(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? (module.exports = factory())
    : typeof define === 'function' && define.amd
      ? define(factory)
      : (global.FilePondPluginImageTransform = factory());
})(this, function() {
  'use strict';

  // test if file is of type image
  var isImage = function isImage(file) {
    return /^image/.test(file.type);
  };

  var asyncGenerator = (function() {
    function AwaitValue(value) {
      this.value = value;
    }

    function AsyncGenerator(gen) {
      var front, back;

      function send(key, arg) {
        return new Promise(function(resolve, reject) {
          var request = {
            key: key,
            arg: arg,
            resolve: resolve,
            reject: reject,
            next: null
          };

          if (back) {
            back = back.next = request;
          } else {
            front = back = request;
            resume(key, arg);
          }
        });
      }

      function resume(key, arg) {
        try {
          var result = gen[key](arg);
          var value = result.value;

          if (value instanceof AwaitValue) {
            Promise.resolve(value.value).then(
              function(arg) {
                resume('next', arg);
              },
              function(arg) {
                resume('throw', arg);
              }
            );
          } else {
            settle(result.done ? 'return' : 'normal', result.value);
          }
        } catch (err) {
          settle('throw', err);
        }
      }

      function settle(type, value) {
        switch (type) {
          case 'return':
            front.resolve({
              value: value,
              done: true
            });
            break;

          case 'throw':
            front.reject(value);
            break;

          default:
            front.resolve({
              value: value,
              done: false
            });
            break;
        }

        front = front.next;

        if (front) {
          resume(front.key, front.arg);
        } else {
          back = null;
        }
      }

      this._invoke = send;

      if (typeof gen.return !== 'function') {
        this.return = undefined;
      }
    }

    if (typeof Symbol === 'function' && Symbol.asyncIterator) {
      AsyncGenerator.prototype[Symbol.asyncIterator] = function() {
        return this;
      };
    }

    AsyncGenerator.prototype.next = function(arg) {
      return this._invoke('next', arg);
    };

    AsyncGenerator.prototype.throw = function(arg) {
      return this._invoke('throw', arg);
    };

    AsyncGenerator.prototype.return = function(arg) {
      return this._invoke('return', arg);
    };

    return {
      wrap: function(fn) {
        return function() {
          return new AsyncGenerator(fn.apply(this, arguments));
        };
      },
      await: function(value) {
        return new AwaitValue(value);
      }
    };
  })();

  var toConsumableArray = function(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++)
        arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  var transforms = {
    1: function _() {
      return [1, 0, 0, 1, 0, 0];
    },
    2: function _(width) {
      return [-1, 0, 0, 1, width, 0];
    },
    3: function _(width, height) {
      return [-1, 0, 0, -1, width, height];
    },
    4: function _(width, height) {
      return [1, 0, 0, -1, 0, height];
    },
    5: [0, 1, 1, 0, 0, 0],
    6: function _(width, height) {
      return [0, 1, -1, 0, height, 0];
    },
    7: function _(width, height) {
      return [0, -1, -1, 0, height, width];
    },
    8: function _(width) {
      return [0, -1, 1, 0, 0, width];
    }
  };

  var fixImageOrientation = function fixImageOrientation(
    ctx,
    width,
    height,
    orientation
  ) {
    // no orientation supplied
    if (orientation === -1) {
      return;
    }

    ctx.transform.apply(
      ctx,
      toConsumableArray(transforms[orientation](width, height))
    );
  };

  var imageToImageData = function imageToImageData(image, rect, orientation) {
    if (!rect) {
      rect = {
        x: 0,
        y: 0,
        width: 1,
        height: 1
      };
    }

    var canvas = document.createElement('canvas');
    var width = image.naturalWidth;
    var height = image.naturalHeight;

    // if is rotated incorrectly swap width and height
    if (orientation >= 5 && orientation <= 8) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    // draw the image
    var ctx = canvas.getContext('2d');
    ctx.save();
    fixImageOrientation(ctx, width, height, orientation);
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();

    // apply crop to get correct slice of data
    var data = ctx.getImageData(
      Math.round(rect.x * canvas.width),
      Math.round(rect.y * canvas.height),
      Math.round(rect.width * canvas.width),
      Math.round(rect.height * canvas.height)
    );

    // done!
    return data;
  };

  var imageDataToBlob = function imageDataToBlob(imageData, options) {
    return new Promise(function(resolve, reject) {
      var image = document.createElement('canvas');
      image.width = imageData.width;
      image.height = imageData.height;
      var ctx = image.getContext('2d');
      ctx.putImageData(imageData, 0, 0);
      image.toBlob(resolve, options.type, options.quality);
    });
  };

  var objectToImageData = function objectToImageData(obj) {
    var imageData = void 0;
    try {
      imageData = new ImageData(obj.width, obj.height);
    } catch (e) {
      // IE + Old EDGE (tested on 12)
      var canvas = document.createElement('canvas');
      imageData = canvas
        .getContext('2d')
        .createImageData(obj.width, obj.height);
    }
    imageData.data.set(obj.data);
    return imageData;
  };

  var TransformWorker = function TransformWorker() {
    // maps transform types to transform functions
    var transformMatrix = {
      resize: resize
    };

    // applies all image transforms to the image data array
    var applyTransforms = function applyTransforms(transforms, imageData) {
      transforms.forEach(function(transform) {
        imageData = transformMatrix[transform.type](imageData, transform.data);
      });
      return imageData;
    };

    // transform image hub
    var transform = function transform(data, cb) {
      // transform image data
      var imageData = applyTransforms(data.transforms, data.imageData);

      // done
      cb(imageData);
    };

    // route messages
    self.onmessage = function(e) {
      transform(e.data.message, function(response) {
        self.postMessage({ id: e.data.id, message: response }, [
          response.data.buffer
        ]);
      });
    };

    //
    // Transforms
    //
    function resize(imageData, data) {
      var mode = data.mode;
      var _data$size = data.size,
        width = _data$size.width,
        height = _data$size.height;

      if (width === null) {
        width = height;
      } else if (height === null) {
        height = width;
      }
      if (mode !== 'force') {
        var scalarWidth = width / imageData.width;
        var scalarHeight = height / imageData.height;
        var scalar = 1;
        if (mode === 'cover') {
          scalar = Math.max(scalarWidth, scalarHeight);
        } else if (mode === 'contain') {
          scalar = Math.min(scalarWidth, scalarHeight);
        }
        width = imageData.width * scalar;
        height = imageData.height * scalar;
      }

      var W = imageData.width;
      var H = imageData.height;
      var W2 = Math.round(width);
      var H2 = Math.round(height);
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

  /**
   * Polyfill Edge and IE
   */
  if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      value: function value(cb, type, quality) {
        var canvas = this;
        setTimeout(function() {
          var dataURL = canvas.toDataURL(type, quality).split(',')[1];
          var binStr = atob(dataURL);
          var index = binStr.length;
          var data = new Uint8Array(index);
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
  var plugin$1 = function(_) {
    var addFilter = _.addFilter,
      utils = _.utils;
    var Type = utils.Type,
      forin = utils.forin,
      loadImage = utils.loadImage,
      getFileFromBlob = utils.getFileFromBlob,
      getFilenameWithoutExtension = utils.getFilenameWithoutExtension,
      createWorker = utils.createWorker;

    // renames the output file to match the format

    var renameFileToMatchMimeType = function renameFileToMatchMimeType(
      filename,
      format
    ) {
      var name = getFilenameWithoutExtension(filename);
      var extension = format === 'image/jpeg' ? 'jpg' : format.split('/')[1];
      return name + '.' + extension;
    };

    // returns all the valid output formats we can encode towards
    var getOutputMimeType = function getOutputMimeType(type) {
      // allowed formats
      if (type === 'image/jpeg' || type === 'image/png') {
        return type;
      }
      // fallback, will also fix image/jpg
      return 'image/jpeg';
    };

    // valid transforms
    var transformOrder = ['resize'];

    // subscribe to file transformations
    addFilter('PREPARE_OUTPUT', function(file, _ref) {
      var query = _ref.query,
        item = _ref.item;
      return new Promise(function(resolve, reject) {
        // if the file is not an image we do not have any business transforming it
        if (!isImage(file) || !query('GET_ALLOW_IMAGE_TRANSFORM')) {
          return resolve(file);
        }

        // compression quality 0 => 100
        var quality = query('GET_IMAGE_TRANSFORM_OUTPUT_QUALITY');

        // output format
        var type = query('GET_IMAGE_TRANSFORM_OUTPUT_MIME_TYPE');

        // get crop

        var _item$getMetadata = item.getMetadata(),
          crop = _item$getMetadata.crop;

        // get transforms

        var transforms = [];
        forin(item.getMetadata(), function(key, value) {
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
        var toBlob = function toBlob(imageData, options) {
          imageDataToBlob(imageData, options)
            .then(function(blob) {
              // transform to file
              var transformedFile = getFileFromBlob(
                blob,
                renameFileToMatchMimeType(
                  file.name,
                  getOutputMimeType(blob.type)
                )
              );

              // we done!
              resolve(transformedFile);
            })
            .catch(function(error) {
              console.error(error);
            });
        };

        // get file url
        var url = URL.createObjectURL(file);

        // turn the file into an image
        loadImage(url).then(function(image) {
          // url is no longer needed
          URL.revokeObjectURL(url);

          // get exif orientation
          var orientation = (item.getMetadata('exif') || {}).orientation || -1;

          // draw to canvas and start transform chain
          var imageData = imageToImageData(
            image,
            crop ? crop.rect : null,
            orientation
          );

          // no further transforms, we done!
          if (!transforms.length) {
            toBlob(imageData, {
              quality: quality,
              type: type || file.type
            });
            return;
          }

          // send to the transform worker
          var worker = createWorker(TransformWorker);
          worker.post(
            {
              transforms: transforms,
              imageData: imageData
            },
            function(response) {
              // finish up
              toBlob(objectToImageData(response), {
                quality: quality,
                type: type || file.type
              });

              // stop worker
              worker.terminate();
            },
            [imageData.data.buffer]
          );
        });
      });
    });

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

  if (document) {
    // plugin has loaded
    document.dispatchEvent(
      new CustomEvent('FilePond:pluginloaded', { detail: plugin$1 })
    );
  }

  return plugin$1;
});
