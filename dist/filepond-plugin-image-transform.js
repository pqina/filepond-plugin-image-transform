/*!
 * FilePondPluginImageTransform 3.4.0
 * Licensed under MIT, https://opensource.org/licenses/MIT/
 * Please visit https://pqina.nl/filepond/ for details.
 */

/* eslint-disable */

(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? (module.exports = factory())
    : typeof define === 'function' && define.amd
    ? define(factory)
    : ((global = global || self),
      (global.FilePondPluginImageTransform = factory()));
})(this, function() {
  'use strict';

  // test if file is of type image
  var isImage = function isImage(file) {
    return /^image/.test(file.type);
  };

  var getFilenameWithoutExtension = function getFilenameWithoutExtension(name) {
    return name.substr(0, name.lastIndexOf('.')) || name;
  };

  // only handles image/jpg, image/jpeg, image/png, and image/svg+xml for now
  var ExtensionMap = {
    jpeg: 'jpg',
    'svg+xml': 'svg'
  };

  var renameFileToMatchMimeType = function renameFileToMatchMimeType(
    filename,
    mimeType
  ) {
    var name = getFilenameWithoutExtension(filename);
    var type = mimeType.split('/')[1];
    var extension = ExtensionMap[type] || type;
    return ''.concat(name, '.').concat(extension);
  };

  // returns all the valid output formats we can encode towards
  var getValidOutputMimeType = function getValidOutputMimeType(type) {
    return /jpeg|png|svg\+xml/.test(type) ? type : 'image/jpeg';
  };

  // test if file is of type image
  var isImage$1 = function isImage(file) {
    return /^image/.test(file.type);
  };

  var MATRICES = {
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
    5: function _() {
      return [0, 1, 1, 0, 0, 0];
    },
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

  var getImageOrientationMatrix = function getImageOrientationMatrix(
    width,
    height,
    orientation
  ) {
    if (orientation === -1) {
      orientation = 1;
    }
    return MATRICES[orientation](width, height);
  };

  var createVector = function createVector(x, y) {
    return { x: x, y: y };
  };

  var vectorDot = function vectorDot(a, b) {
    return a.x * b.x + a.y * b.y;
  };

  var vectorSubtract = function vectorSubtract(a, b) {
    return createVector(a.x - b.x, a.y - b.y);
  };

  var vectorDistanceSquared = function vectorDistanceSquared(a, b) {
    return vectorDot(vectorSubtract(a, b), vectorSubtract(a, b));
  };

  var vectorDistance = function vectorDistance(a, b) {
    return Math.sqrt(vectorDistanceSquared(a, b));
  };

  var getOffsetPointOnEdge = function getOffsetPointOnEdge(length, rotation) {
    var a = length;

    var A = 1.5707963267948966;
    var B = rotation;
    var C = 1.5707963267948966 - rotation;

    var sinA = Math.sin(A);
    var sinB = Math.sin(B);
    var sinC = Math.sin(C);
    var cosC = Math.cos(C);
    var ratio = a / sinA;
    var b = ratio * sinB;
    var c = ratio * sinC;

    return createVector(cosC * b, cosC * c);
  };

  var getRotatedRectSize = function getRotatedRectSize(rect, rotation) {
    var w = rect.width;
    var h = rect.height;

    var hor = getOffsetPointOnEdge(w, rotation);
    var ver = getOffsetPointOnEdge(h, rotation);

    var tl = createVector(rect.x + Math.abs(hor.x), rect.y - Math.abs(hor.y));

    var tr = createVector(
      rect.x + rect.width + Math.abs(ver.y),
      rect.y + Math.abs(ver.x)
    );

    var bl = createVector(
      rect.x - Math.abs(ver.y),
      rect.y + rect.height - Math.abs(ver.x)
    );

    return {
      width: vectorDistance(tl, tr),
      height: vectorDistance(tl, bl)
    };
  };

  var getImageRectZoomFactor = function getImageRectZoomFactor(
    imageRect,
    cropRect
  ) {
    var rotation =
      arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var center =
      arguments.length > 3 && arguments[3] !== undefined
        ? arguments[3]
        : { x: 0.5, y: 0.5 };

    // calculate available space round image center position
    var cx = center.x > 0.5 ? 1 - center.x : center.x;
    var cy = center.y > 0.5 ? 1 - center.y : center.y;
    var imageWidth = cx * 2 * imageRect.width;
    var imageHeight = cy * 2 * imageRect.height;

    // calculate rotated crop rectangle size
    var rotatedCropSize = getRotatedRectSize(cropRect, rotation);

    // calculate scalar required to fit image
    return Math.max(
      rotatedCropSize.width / imageWidth,
      rotatedCropSize.height / imageHeight
    );
  };

  var getCenteredCropRect = function getCenteredCropRect(
    container,
    aspectRatio
  ) {
    var width = container.width;
    var height = width * aspectRatio;
    if (height > container.height) {
      height = container.height;
      width = height / aspectRatio;
    }
    var x = (container.width - width) * 0.5;
    var y = (container.height - height) * 0.5;

    return {
      x: x,
      y: y,
      width: width,
      height: height
    };
  };

  var calculateCanvasSize = function calculateCanvasSize(
    image,
    canvasAspectRatio
  ) {
    var zoom =
      arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

    var imageAspectRatio = image.height / image.width;

    // determine actual pixels on x and y axis
    var canvasWidth = 1;
    var canvasHeight = canvasAspectRatio;
    var imgWidth = 1;
    var imgHeight = imageAspectRatio;
    if (imgHeight > canvasHeight) {
      imgHeight = canvasHeight;
      imgWidth = imgHeight / imageAspectRatio;
    }

    var scalar = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
    var width = image.width / (zoom * scalar * imgWidth);
    var height = width * canvasAspectRatio;

    return {
      width: width,
      height: height
    };
  };

  var isFlipped = function isFlipped(flip) {
    return flip && (flip.horizontal || flip.vertical);
  };

  var getBitmap = function getBitmap(image, orientation, flip) {
    if (orientation <= 1 && !isFlipped(flip)) {
      image.width = image.naturalWidth;
      image.height = image.naturalHeight;
      return image;
    }

    var canvas = document.createElement('canvas');
    var width = image.naturalWidth;
    var height = image.naturalHeight;

    // if is rotated incorrectly swap width and height
    var swapped = orientation >= 5 && orientation <= 8;
    if (swapped) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    // draw the image but first fix orientation and set correct flip
    var ctx = canvas.getContext('2d');

    // get base transformation matrix
    if (orientation) {
      ctx.transform.apply(
        ctx,
        getImageOrientationMatrix(width, height, orientation)
      );
    }

    if (isFlipped(flip)) {
      // flip horizontal
      // [-1, 0, 0, 1, width, 0]
      var matrix = [1, 0, 0, 1, 0, 0];
      if ((!swapped && flip.horizontal) || swapped & flip.vertical) {
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

  var imageToImageData = function imageToImageData(imageElement, orientation) {
    var crop =
      arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var options =
      arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    var canvasMemoryLimit = options.canvasMemoryLimit;

    var zoom = crop.zoom || 1;

    // fixes possible image orientation problems by drawing the image on the correct canvas
    var bitmap = getBitmap(imageElement, orientation, crop.flip);
    var imageSize = {
      width: bitmap.width,
      height: bitmap.height
    };

    var aspectRatio = crop.aspectRatio || imageSize.height / imageSize.width;

    var canvasSize = calculateCanvasSize(imageSize, aspectRatio, zoom);

    if (canvasMemoryLimit) {
      var requiredMemory = canvasSize.width * canvasSize.height;
      if (requiredMemory > canvasMemoryLimit) {
        var scalar = Math.sqrt(canvasMemoryLimit) / Math.sqrt(requiredMemory);
        imageSize.width = Math.floor(imageSize.width * scalar);
        imageSize.height = Math.floor(imageSize.height * scalar);
        canvasSize = calculateCanvasSize(imageSize, aspectRatio, zoom);
      }
    }

    var canvas = document.createElement('canvas');

    var canvasCenter = {
      x: canvasSize.width * 0.5,
      y: canvasSize.height * 0.5
    };

    var stage = {
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
      center: canvasCenter
    };

    var stageZoomFactor = getImageRectZoomFactor(
      imageSize,
      getCenteredCropRect(stage, aspectRatio),
      crop.rotation,
      crop.center
    );

    var scale = zoom * stageZoomFactor;

    // start drawing
    canvas.width = Math.round(canvasSize.width / scale);
    canvas.height = Math.round(canvasSize.height / scale);

    canvasCenter.x /= scale;
    canvasCenter.y /= scale;

    var imageOffset = {
      x: canvasCenter.x - imageSize.width * (crop.center ? crop.center.x : 0.5),
      y: canvasCenter.y - imageSize.height * (crop.center ? crop.center.y : 0.5)
    };

    var ctx = canvas.getContext('2d');

    // move to draw offset
    ctx.translate(canvasCenter.x, canvasCenter.y);
    ctx.rotate(crop.rotation || 0);

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

  /**
   * Polyfill toBlob for Edge
   */
  var IS_BROWSER = (function() {
    return (
      typeof window !== 'undefined' && typeof window.document !== 'undefined'
    );
  })();
  if (IS_BROWSER) {
    if (!HTMLCanvasElement.prototype.toBlob) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        value: function value(callback, type, quality) {
          var dataURL = this.toDataURL(type, quality).split(',')[1];
          setTimeout(function() {
            var binStr = atob(dataURL);
            var len = binStr.length;
            var arr = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              arr[i] = binStr.charCodeAt(i);
            }
            callback(new Blob([arr], { type: type || 'image/png' }));
          });
        }
      });
    }
  }

  var canvasToBlob = function canvasToBlob(canvas, options) {
    var beforeCreateBlob =
      arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    return new Promise(function(resolve) {
      var promisedImage = beforeCreateBlob ? beforeCreateBlob(canvas) : canvas;
      Promise.resolve(promisedImage).then(function(canvas) {
        canvas.toBlob(resolve, options.type, options.quality);
      });
    });
  };

  var getMarkupValue = function getMarkupValue(value, size) {
    var scalar =
      arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    var axis = arguments.length > 3 ? arguments[3] : undefined;
    if (typeof value === 'string') {
      return parseFloat(value) * scalar;
    }
    if (typeof value === 'number') {
      return value * (axis ? size[axis] : Math.min(size.width, size.height));
    }
    return;
  };

  var isDefined = function isDefined(value) {
    return value != null;
  };

  var getMarkupRect = function getMarkupRect(rect, size) {
    var scalar =
      arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

    var left =
      getMarkupValue(rect.x, size, scalar, 'width') ||
      getMarkupValue(rect.left, size, scalar, 'width');
    var top =
      getMarkupValue(rect.y, size, scalar, 'height') ||
      getMarkupValue(rect.top, size, scalar, 'height');
    var width = getMarkupValue(rect.width, size, scalar, 'width');
    var height = getMarkupValue(rect.height, size, scalar, 'height');
    var right = getMarkupValue(rect.right, size, scalar, 'width');
    var bottom = getMarkupValue(rect.bottom, size, scalar, 'height');

    if (!isDefined(top)) {
      if (isDefined(height) && isDefined(bottom)) {
        top = size.height - height - bottom;
      } else {
        top = bottom;
      }
    }

    if (!isDefined(left)) {
      if (isDefined(width) && isDefined(right)) {
        left = size.width - width - right;
      } else {
        left = right;
      }
    }

    if (!isDefined(width)) {
      if (isDefined(left) && isDefined(right)) {
        width = size.width - left - right;
      } else {
        width = 0;
      }
    }

    if (!isDefined(height)) {
      if (isDefined(top) && isDefined(bottom)) {
        height = size.height - top - bottom;
      } else {
        height = 0;
      }
    }

    return {
      x: left || 0,
      y: top || 0,
      width: width || 0,
      height: height || 0
    };
  };

  var vectorMultiply = function vectorMultiply(v, amount) {
    return createVector$1(v.x * amount, v.y * amount);
  };

  var vectorAdd = function vectorAdd(a, b) {
    return createVector$1(a.x + b.x, a.y + b.y);
  };

  var vectorNormalize = function vectorNormalize(v) {
    var l = Math.sqrt(v.x * v.x + v.y * v.y);
    if (l === 0) {
      return {
        x: 0,
        y: 0
      };
    }
    return createVector$1(v.x / l, v.y / l);
  };

  var vectorRotate = function vectorRotate(v, radians, origin) {
    var cos = Math.cos(radians);
    var sin = Math.sin(radians);
    var t = createVector$1(v.x - origin.x, v.y - origin.y);
    return createVector$1(
      origin.x + cos * t.x - sin * t.y,
      origin.y + sin * t.x + cos * t.y
    );
  };

  var createVector$1 = function createVector() {
    var x =
      arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var y =
      arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    return { x: x, y: y };
  };

  var getMarkupStyles = function getMarkupStyles(markup, size, scale) {
    var lineStyle = markup.borderStyle || markup.lineStyle || 'solid';
    var fill = markup.backgroundColor || markup.fontColor || 'transparent';
    var stroke = markup.borderColor || markup.lineColor || 'transparent';
    var strokeWidth = getMarkupValue(
      markup.borderWidth || markup.lineWidth,
      size,
      scale
    );
    var lineCap = markup.lineCap || 'round';
    var lineJoin = markup.lineJoin || 'round';
    var dashes =
      typeof lineStyle === 'string'
        ? ''
        : lineStyle
            .map(function(v) {
              return getMarkupValue(v, size, scale);
            })
            .join(',');
    var opacity = markup.opacity || 1;
    return {
      'stroke-linecap': lineCap,
      'stroke-linejoin': lineJoin,
      'stroke-width': strokeWidth || 0,
      'stroke-dasharray': dashes,
      stroke: stroke,
      fill: fill,
      opacity: opacity
    };
  };

  var setAttributes = function setAttributes(element, attr) {
    return Object.keys(attr).forEach(function(key) {
      return element.setAttribute(key, attr[key]);
    });
  };

  var ns = 'http://www.w3.org/2000/svg';
  var svg = function svg(tag, attr) {
    var element = document.createElementNS(ns, tag);
    if (attr) {
      setAttributes(element, attr);
    }
    return element;
  };

  var updateRect = function updateRect(element) {
    return setAttributes(
      element,
      Object.assign({}, element.rect, element.styles)
    );
  };

  var updateEllipse = function updateEllipse(element) {
    var cx = element.rect.x + element.rect.width * 0.5;
    var cy = element.rect.y + element.rect.height * 0.5;
    var rx = element.rect.width * 0.5;
    var ry = element.rect.height * 0.5;
    return setAttributes(
      element,
      Object.assign(
        {
          cx: cx,
          cy: cy,
          rx: rx,
          ry: ry
        },
        element.styles
      )
    );
  };

  var IMAGE_FIT_STYLE = {
    contain: 'xMidYMid meet',
    cover: 'xMidYMid slice'
  };

  var updateImage = function updateImage(element, markup) {
    setAttributes(
      element,
      Object.assign({}, element.rect, element.styles, {
        preserveAspectRatio: IMAGE_FIT_STYLE[markup.fit] || 'none'
      })
    );
  };

  var TEXT_ANCHOR = {
    left: 'start',
    center: 'middle',
    right: 'end'
  };

  var updateText = function updateText(element, markup, size, scale) {
    var fontSize = getMarkupValue(markup.fontSize, size, scale);
    var fontFamily = markup.fontFamily || 'sans-serif';
    var fontWeight = markup.fontWeight || 'normal';
    var textAlign = TEXT_ANCHOR[markup.textAlign] || 'start';

    setAttributes(
      element,
      Object.assign({}, element.rect, element.styles, {
        'stroke-width': 0,
        'font-weight': fontWeight,
        'font-size': fontSize,
        'font-family': fontFamily,
        'text-anchor': textAlign
      })
    );

    // update text
    if (element.text !== markup.text) {
      element.text = markup.text;
      element.textContent = markup.text.length ? markup.text : ' ';
    }
  };

  var updateLine = function updateLine(element, markup, size, scale) {
    setAttributes(
      element,
      Object.assign({}, element.rect, element.styles, {
        fill: 'none'
      })
    );

    var line = element.childNodes[0];
    var begin = element.childNodes[1];
    var end = element.childNodes[2];

    var origin = element.rect;

    var target = {
      x: element.rect.x + element.rect.width,
      y: element.rect.y + element.rect.height
    };

    setAttributes(line, {
      x1: origin.x,
      y1: origin.y,
      x2: target.x,
      y2: target.y
    });

    if (!markup.lineDecoration) return;

    begin.style.display = 'none';
    end.style.display = 'none';

    var v = vectorNormalize({
      x: target.x - origin.x,
      y: target.y - origin.y
    });

    var l = getMarkupValue(0.05, size, scale);

    if (markup.lineDecoration.indexOf('arrow-begin') !== -1) {
      var arrowBeginRotationPoint = vectorMultiply(v, l);
      var arrowBeginCenter = vectorAdd(origin, arrowBeginRotationPoint);
      var arrowBeginA = vectorRotate(origin, 2, arrowBeginCenter);
      var arrowBeginB = vectorRotate(origin, -2, arrowBeginCenter);

      setAttributes(begin, {
        style: 'display:block;',
        d: 'M'
          .concat(arrowBeginA.x, ',')
          .concat(arrowBeginA.y, ' L')
          .concat(origin.x, ',')
          .concat(origin.y, ' L')
          .concat(arrowBeginB.x, ',')
          .concat(arrowBeginB.y)
      });
    }

    if (markup.lineDecoration.indexOf('arrow-end') !== -1) {
      var arrowEndRotationPoint = vectorMultiply(v, -l);
      var arrowEndCenter = vectorAdd(target, arrowEndRotationPoint);
      var arrowEndA = vectorRotate(target, 2, arrowEndCenter);
      var arrowEndB = vectorRotate(target, -2, arrowEndCenter);

      setAttributes(end, {
        style: 'display:block;',
        d: 'M'
          .concat(arrowEndA.x, ',')
          .concat(arrowEndA.y, ' L')
          .concat(target.x, ',')
          .concat(target.y, ' L')
          .concat(arrowEndB.x, ',')
          .concat(arrowEndB.y)
      });
    }
  };

  var createShape = function createShape(node) {
    return function(markup) {
      return svg(node, { id: markup.id });
    };
  };

  var createImage = function createImage(markup) {
    var shape = svg('image', {
      id: markup.id,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: '0'
    });

    shape.onload = function() {
      shape.setAttribute('opacity', markup.opacity || 1);
    };
    shape.setAttributeNS(
      'http://www.w3.org/1999/xlink',
      'xlink:href',
      markup.src
    );
    return shape;
  };

  var createLine = function createLine(markup) {
    var shape = svg('g', {
      id: markup.id,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    });

    var line = svg('line');
    shape.appendChild(line);

    var begin = svg('path');
    shape.appendChild(begin);

    var end = svg('path');
    shape.appendChild(end);

    return shape;
  };

  var CREATE_TYPE_ROUTES = {
    image: createImage,
    rect: createShape('rect'),
    ellipse: createShape('ellipse'),
    text: createShape('text'),
    line: createLine
  };

  var UPDATE_TYPE_ROUTES = {
    rect: updateRect,
    ellipse: updateEllipse,
    image: updateImage,
    text: updateText,
    line: updateLine
  };

  var createMarkupByType = function createMarkupByType(type, markup) {
    return CREATE_TYPE_ROUTES[type](markup);
  };

  var updateMarkupByType = function updateMarkupByType(
    element,
    type,
    markup,
    size,
    scale
  ) {
    element.rect = getMarkupRect(markup, size, scale);
    element.styles = getMarkupStyles(markup, size, scale);
    UPDATE_TYPE_ROUTES[type](element, markup, size, scale);
  };

  var cropSVG = function cropSVG(blob, crop, markup) {
    return new Promise(function(resolve) {
      // load blob contents and wrap in crop svg
      var fr = new FileReader();
      fr.onloadend = function() {
        // get svg text
        var text = fr.result;

        // create element with svg and get size
        var original = document.createElement('div');
        original.style.cssText =
          'position:absolute;pointer-events:none;width:0;height:0;visibility:hidden;';
        original.innerHTML = text;
        var originalNode = original.querySelector('svg');
        document.body.appendChild(original);

        // request bounding box dimensions
        var bBox = originalNode.getBBox();
        original.parentNode.removeChild(original);

        // get title
        var titleNode = original.querySelector('title');

        // calculate new heights and widths
        var viewBoxAttribute = originalNode.getAttribute('viewBox') || '';
        var widthAttribute = originalNode.getAttribute('width') || '';
        var heightAttribute = originalNode.getAttribute('height') || '';
        var width = parseFloat(widthAttribute) || null;
        var height = parseFloat(heightAttribute) || null;
        var widthUnits = (widthAttribute.match(/[a-z]+/) || [])[0] || '';
        var heightUnits = (heightAttribute.match(/[a-z]+/) || [])[0] || '';

        // create new size
        var viewBoxList = viewBoxAttribute.split(' ').map(parseFloat);
        var viewBox = viewBoxList.length
          ? {
              x: viewBoxList[0],
              y: viewBoxList[1],
              width: viewBoxList[2],
              height: viewBoxList[3]
            }
          : bBox;

        var imageWidth = width != null ? width : viewBox.width;
        var imageHeight = height != null ? height : viewBox.height;

        originalNode.style.overflow = 'visible';
        originalNode.setAttribute('width', imageWidth);
        originalNode.setAttribute('height', imageHeight);

        // markup
        var markupSVG = '';
        if (markup.length) {
          var size = {
            width: imageWidth,
            height: imageHeight
          };

          markupSVG = markup.reduce(function(prev, shape) {
            var el = createMarkupByType(shape[0], shape[1]);
            updateMarkupByType(el, shape[0], shape[1], size);
            el.removeAttribute('id');
            if (el.getAttribute('opacity') === 1) {
              el.removeAttribute('opacity');
            }
            return prev + '\n' + el.outerHTML + '\n';
          }, '');
          markupSVG = '\n\n<g>'.concat(
            markupSVG.replace(/&nbsp;/g, ' '),
            '</g>\n\n'
          );
        }

        var aspectRatio = crop.aspectRatio || imageHeight / imageWidth;

        var canvasWidth = imageWidth;
        var canvasHeight = canvasWidth * aspectRatio;

        var canvasZoomFactor = getImageRectZoomFactor(
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

        var scale = crop.zoom * canvasZoomFactor;

        var rotation = crop.rotation * (180 / Math.PI);

        var canvasCenter = {
          x: canvasWidth * 0.5,
          y: canvasHeight * 0.5
        };

        var imageOffset = {
          x: canvasCenter.x - imageWidth * crop.center.x,
          y: canvasCenter.y - imageHeight * crop.center.y
        };

        var cropTransforms = [
          // rotate
          'rotate('
            .concat(rotation, ' ')
            .concat(canvasCenter.x, ' ')
            .concat(canvasCenter.y, ')'),

          // scale
          'translate('.concat(canvasCenter.x, ' ').concat(canvasCenter.y, ')'),
          'scale('.concat(scale, ')'),
          'translate('
            .concat(-canvasCenter.x, ' ')
            .concat(-canvasCenter.y, ')'),

          // offset
          'translate('.concat(imageOffset.x, ' ').concat(imageOffset.y, ')')
        ];

        var flipTransforms = [
          'scale('
            .concat(crop.flip.horizontal ? -1 : 1, ' ')
            .concat(crop.flip.vertical ? -1 : 1, ')'),
          'translate('
            .concat(crop.flip.horizontal ? -imageWidth : 0, ' ')
            .concat(crop.flip.vertical ? -imageHeight : 0, ')')
        ];

        // crop
        var transformed = '<?xml version="1.0" encoding="UTF-8"?>\n<svg width="'
          .concat(canvasWidth)
          .concat(widthUnits, '" height="')
          .concat(canvasHeight)
          .concat(heightUnits, '" \nviewBox="0 0 ')
          .concat(canvasWidth, ' ')
          .concat(
            canvasHeight,
            '" \npreserveAspectRatio="xMinYMin"\nxmlns:xlink="http://www.w3.org/1999/xlink"\nxmlns="http://www.w3.org/2000/svg">\n<!-- Generated by PQINA - https://pqina.nl/ -->\n<title>'
          )
          .concat(
            titleNode ? titleNode.textContent : '',
            '</title>\n<g transform="'
          )
          .concat(cropTransforms.join(' '), '">\n<g transform="')
          .concat(flipTransforms.join(' '), '">\n')
          .concat(originalNode.outerHTML)
          .concat(markupSVG, '\n</g>\n</g>\n</svg>');

        // create new svg file
        resolve(transformed);
      };

      fr.readAsText(blob);
    });
  };

  var objectToImageData = function objectToImageData(obj) {
    var imageData;
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

  /* javascript-obfuscator:disable */
  var TransformWorker = function TransformWorker() {
    // maps transform types to transform functions
    var TRANSFORMS = { resize: resize, filter: filter };

    // applies all image transforms to the image data array
    var applyTransforms = function applyTransforms(transforms, imageData) {
      transforms.forEach(function(transform) {
        imageData = TRANSFORMS[transform.type](imageData, transform.data);
      });
      return imageData;
    };

    // transform image hub
    var transform = function transform(data, cb) {
      var transforms = data.transforms;

      // if has filter and has resize, move filter to resize operation
      var filterTransform = null;
      transforms.forEach(function(transform) {
        if (transform.type === 'filter') {
          filterTransform = transform;
        }
      });
      if (filterTransform) {
        // find resize
        var resizeTransform = null;
        transforms.forEach(function(transform) {
          if (transform.type === 'resize') {
            resizeTransform = transform;
          }
        });

        if (resizeTransform) {
          // update resize operation
          resizeTransform.data.matrix = filterTransform.data;

          // remove filter
          transforms = transforms.filter(function(transform) {
            return transform.type !== 'filter';
          });
        }
      }

      cb(applyTransforms(transforms, data.imageData));
    };

    // eslint-disable-next-line no-restricted-globals
    self.onmessage = function(e) {
      transform(e.data.message, function(response) {
        // eslint-disable-next-line no-restricted-globals
        self.postMessage({ id: e.data.id, message: response }, [
          response.data.buffer
        ]);
      });
    };

    function applyFilterMatrix(index, data, matrix) {
      var i = 0,
        row = 0,
        c = 0.0,
        r = data[index] / 255,
        g = data[index + 1] / 255,
        b = data[index + 2] / 255,
        a = data[index + 3] / 255;
      for (; i < 4; i++) {
        row = 5 * i;
        c =
          (r * matrix[row] +
            g * matrix[row + 1] +
            b * matrix[row + 2] +
            a * matrix[row + 3] +
            matrix[row + 4]) *
          255;
        data[index + i] = Math.max(0, Math.min(c, 255));
      }
    }

    var identityMatrix = self.JSON.stringify([
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0
    ]);
    function isIdentityMatrix(filter) {
      return self.JSON.stringify(filter || []) === identityMatrix;
    }

    function filter(imageData, matrix) {
      if (!matrix || isIdentityMatrix(matrix)) return imageData;

      var data = imageData.data;
      var l = data.length;

      var m11 = matrix[0];
      var m12 = matrix[1];
      var m13 = matrix[2];
      var m14 = matrix[3];
      var m15 = matrix[4];

      var m21 = matrix[5];
      var m22 = matrix[6];
      var m23 = matrix[7];
      var m24 = matrix[8];
      var m25 = matrix[9];

      var m31 = matrix[10];
      var m32 = matrix[11];
      var m33 = matrix[12];
      var m34 = matrix[13];
      var m35 = matrix[14];

      var m41 = matrix[15];
      var m42 = matrix[16];
      var m43 = matrix[17];
      var m44 = matrix[18];
      var m45 = matrix[19];

      var index = 0,
        r = 0.0,
        g = 0.0,
        b = 0.0,
        a = 0.0;

      for (; index < l; index += 4) {
        r = data[index] / 255;
        g = data[index + 1] / 255;
        b = data[index + 2] / 255;
        a = data[index + 3] / 255;
        data[index] = Math.max(
          0,
          Math.min((r * m11 + g * m12 + b * m13 + a * m14 + m15) * 255, 255)
        );
        data[index + 1] = Math.max(
          0,
          Math.min((r * m21 + g * m22 + b * m23 + a * m24 + m25) * 255, 255)
        );
        data[index + 2] = Math.max(
          0,
          Math.min((r * m31 + g * m32 + b * m33 + a * m34 + m35) * 255, 255)
        );
        data[index + 3] = Math.max(
          0,
          Math.min((r * m41 + g * m42 + b * m43 + a * m44 + m45) * 255, 255)
        );
      }

      return imageData;
    }

    function resize(imageData, data) {
      var _data$mode = data.mode,
        mode = _data$mode === void 0 ? 'contain' : _data$mode,
        _data$upscale = data.upscale,
        upscale = _data$upscale === void 0 ? false : _data$upscale,
        width = data.width,
        height = data.height,
        matrix = data.matrix;

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

        // if image is too small, exit here with original image
        if (scalar > 1 && upscale === false) {
          return filter(imageData, matrix);
        }

        width = imageData.width * scalar;
        height = imageData.height * scalar;
      }

      var originWidth = imageData.width;
      var originHeight = imageData.height;
      var targetWidth = Math.round(width);
      var targetHeight = Math.round(height);
      var inputData = imageData.data;
      var outputData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
      var ratioWidth = originWidth / targetWidth;
      var ratioHeight = originHeight / targetHeight;
      var ratioWidthHalf = Math.ceil(ratioWidth * 0.5);
      var ratioHeightHalf = Math.ceil(ratioHeight * 0.5);

      for (var j = 0; j < targetHeight; j++) {
        for (var i = 0; i < targetWidth; i++) {
          var x2 = (i + j * targetWidth) * 4;
          var weight = 0;
          var weights = 0;
          var weightsAlpha = 0;
          var r = 0;
          var g = 0;
          var b = 0;
          var a = 0;
          var centerY = (j + 0.5) * ratioHeight;

          for (
            var yy = Math.floor(j * ratioHeight);
            yy < (j + 1) * ratioHeight;
            yy++
          ) {
            var dy = Math.abs(centerY - (yy + 0.5)) / ratioHeightHalf;
            var centerX = (i + 0.5) * ratioWidth;
            var w0 = dy * dy;

            for (
              var xx = Math.floor(i * ratioWidth);
              xx < (i + 1) * ratioWidth;
              xx++
            ) {
              var dx = Math.abs(centerX - (xx + 0.5)) / ratioWidthHalf;
              var w = Math.sqrt(w0 + dx * dx);

              if (w >= -1 && w <= 1) {
                weight = 2 * w * w * w - 3 * w * w + 1;

                if (weight > 0) {
                  dx = 4 * (xx + yy * originWidth);

                  var ref = inputData[dx + 3];
                  a += weight * ref;
                  weightsAlpha += weight;

                  if (ref < 255) {
                    weight = (weight * ref) / 250;
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
      };
    }
  };
  /* javascript-obfuscator:enable */

  var correctOrientation = function correctOrientation(view, offset, length) {
    // Missing 0x45786966 Marker? No Exif Header, stop here
    if (view.getUint32(offset + 4, false) !== 0x45786966) return;

    // next byte!
    offset += 4;

    // First 2bytes defines byte align of TIFF data.
    // If it is 0x4949="I I", it means "Intel" type byte align
    var intelByteAligned = view.getUint16((offset += 6), false) === 0x4949;
    offset += view.getUint32(offset + 4, intelByteAligned);

    var tags = view.getUint16(offset, intelByteAligned);
    offset += 2;

    // find Orientation tag
    for (var i = 0; i < tags; i++) {
      if (view.getUint16(offset + i * 12, intelByteAligned) === 0x0112) {
        view.setUint16(offset + i * 12 + 8, 1, intelByteAligned);
        return true;
      }
    }
    return false;
  };

  var readData = function readData(data) {
    var view = new DataView(data);

    // Every JPEG file starts from binary value '0xFFD8'
    // If it's not present, exit here
    if (view.getUint16(0) !== 0xffd8) return null;

    var offset = 2; // Start at 2 as we skipped two bytes (FFD8)
    var marker;
    var markerLength;
    var orientationCorrected = false;

    while (offset < view.byteLength) {
      marker = view.getUint16(offset, false);
      markerLength = view.getUint16(offset + 2, false) + 2;

      // Test if is APP and COM markers
      var isData = (marker >= 0xffe0 && marker <= 0xffef) || marker === 0xfffe;
      if (!isData) {
        break;
      }

      if (!orientationCorrected) {
        orientationCorrected = correctOrientation(view, offset, markerLength);
      }

      if (offset + markerLength > view.byteLength) {
        break;
      }

      offset += markerLength;
    }
    return data.slice(0, offset);
  };

  var getImageHead = function getImageHead(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        return resolve(readData(reader.result) || null);
      };
      reader.readAsArrayBuffer(file.slice(0, 256 * 1024));
    });
  };

  var getBlobBuilder = function getBlobBuilder() {
    return (window.BlobBuilder =
      window.BlobBuilder ||
      window.WebKitBlobBuilder ||
      window.MozBlobBuilder ||
      window.MSBlobBuilder);
  };

  var createBlob = function createBlob(arrayBuffer, mimeType) {
    var BB = getBlobBuilder();

    if (BB) {
      var bb = new BB();
      bb.append(arrayBuffer);
      return bb.getBlob(mimeType);
    }

    return new Blob([arrayBuffer], {
      type: mimeType
    });
  };

  var getUniqueId = function getUniqueId() {
    return Math.random()
      .toString(36)
      .substr(2, 9);
  };

  var createWorker = function createWorker(fn) {
    var workerBlob = new Blob(['(', fn.toString(), ')()'], {
      type: 'application/javascript'
    });

    var workerURL = URL.createObjectURL(workerBlob);
    var worker = new Worker(workerURL);

    return {
      transfer: function transfer(message, cb) {},
      post: function post(message, cb, transferList) {
        var id = getUniqueId();

        worker.onmessage = function(e) {
          if (e.data.id === id) {
            cb(e.data.message);
          }
        };

        worker.postMessage(
          {
            id: id,
            message: message
          },

          transferList
        );
      },
      terminate: function terminate() {
        worker.terminate();
        URL.revokeObjectURL(workerURL);
      }
    };
  };

  var loadImage = function loadImage(url) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.onload = function() {
        resolve(img);
      };
      img.onerror = function(e) {
        reject(e);
      };
      img.src = url;
    });
  };

  var chain = function chain(funcs) {
    return funcs.reduce(function(promise, func) {
      return promise.then(function(result) {
        return func().then(Array.prototype.concat.bind(result));
      });
    }, Promise.resolve([]));
  };

  var canvasApplyMarkup = function canvasApplyMarkup(canvas, markup) {
    return new Promise(function(resolve) {
      var size = {
        width: canvas.width,
        height: canvas.height
      };

      var ctx = canvas.getContext('2d');

      var drawers = markup.map(function(item) {
        return function() {
          return new Promise(function(resolve) {
            var result = TYPE_DRAW_ROUTES[item[0]](ctx, size, item[1], resolve);
            if (result) resolve();
          });
        };
      });

      chain(drawers).then(function() {
        return resolve(canvas);
      });
    });
  };

  var applyMarkupStyles = function applyMarkupStyles(ctx, styles) {
    ctx.beginPath();
    ctx.lineCap = styles['stroke-linecap'];
    ctx.lineJoin = styles['stroke-linejoin'];
    ctx.lineWidth = styles['stroke-width'];
    if (styles['stroke-dasharray'].length) {
      ctx.setLineDash(styles['stroke-dasharray'].split(','));
    }
    ctx.fillStyle = styles['fill'];
    ctx.strokeStyle = styles['stroke'];
    ctx.globalAlpha = styles.opacity || 1;
  };

  var drawMarkupStyles = function drawMarkupStyles(ctx) {
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  var drawRect = function drawRect(ctx, size, markup) {
    var rect = getMarkupRect(markup, size);
    var styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    drawMarkupStyles(ctx, styles);
    return true;
  };

  var drawEllipse = function drawEllipse(ctx, size, markup) {
    var rect = getMarkupRect(markup, size);
    var styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);

    var x = rect.x,
      y = rect.y,
      w = rect.width,
      h = rect.height,
      kappa = 0.5522848,
      ox = (w / 2) * kappa,
      oy = (h / 2) * kappa,
      xe = x + w,
      ye = y + h,
      xm = x + w / 2,
      ym = y + h / 2;

    ctx.moveTo(x, ym);
    ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
    ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
    ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
    ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);

    drawMarkupStyles(ctx, styles);
    return true;
  };

  var drawImage = function drawImage(ctx, size, markup, done) {
    var rect = getMarkupRect(markup, size);
    var styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);

    var image = new Image();
    image.onload = function() {
      if (markup.fit === 'cover') {
        var ar = rect.width / rect.height;
        var width = ar > 1 ? image.width : image.height * ar;
        var height = ar > 1 ? image.width / ar : image.height;
        var x = image.width * 0.5 - width * 0.5;
        var y = image.height * 0.5 - height * 0.5;
        ctx.drawImage(
          image,
          x,
          y,
          width,
          height,
          rect.x,
          rect.y,
          rect.width,
          rect.height
        );
      } else if (markup.fit === 'contain') {
        var scalar = Math.min(
          rect.width / image.width,
          rect.height / image.height
        );
        var _width = scalar * image.width;
        var _height = scalar * image.height;
        var _x = rect.x + rect.width * 0.5 - _width * 0.5;
        var _y = rect.y + rect.height * 0.5 - _height * 0.5;
        ctx.drawImage(
          image,
          0,
          0,
          image.width,
          image.height,
          _x,
          _y,
          _width,
          _height
        );
      } else {
        ctx.drawImage(
          image,
          0,
          0,
          image.width,
          image.height,
          rect.x,
          rect.y,
          rect.width,
          rect.height
        );
      }

      drawMarkupStyles(ctx, styles);
      done();
    };
    image.src = markup.src;
  };

  var drawText = function drawText(ctx, size, markup) {
    var rect = getMarkupRect(markup, size);
    var styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);

    var fontSize = getMarkupValue(markup.fontSize, size);
    var fontFamily = markup.fontFamily || 'sans-serif';
    var fontWeight = markup.fontWeight || 'normal';
    var textAlign = markup.textAlign || 'left';

    ctx.font = ''
      .concat(fontWeight, ' ')
      .concat(fontSize, 'px ')
      .concat(fontFamily);
    ctx.textAlign = textAlign;
    ctx.fillText(markup.text, rect.x, rect.y);

    drawMarkupStyles(ctx, styles);
    return true;
  };

  var drawLine = function drawLine(ctx, size, markup) {
    var rect = getMarkupRect(markup, size);
    var styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);

    ctx.beginPath();

    var origin = {
      x: rect.x,
      y: rect.y
    };

    var target = {
      x: rect.x + rect.width,
      y: rect.y + rect.height
    };

    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(target.x, target.y);

    var v = vectorNormalize({
      x: target.x - origin.x,
      y: target.y - origin.y
    });

    var l = 0.04 * Math.min(size.width, size.height);

    if (markup.lineDecoration.indexOf('arrow-begin') !== -1) {
      var arrowBeginRotationPoint = vectorMultiply(v, l);
      var arrowBeginCenter = vectorAdd(origin, arrowBeginRotationPoint);
      var arrowBeginA = vectorRotate(origin, 2, arrowBeginCenter);
      var arrowBeginB = vectorRotate(origin, -2, arrowBeginCenter);

      ctx.moveTo(arrowBeginA.x, arrowBeginA.y);
      ctx.lineTo(origin.x, origin.y);
      ctx.lineTo(arrowBeginB.x, arrowBeginB.y);
    }
    if (markup.lineDecoration.indexOf('arrow-end') !== -1) {
      var arrowEndRotationPoint = vectorMultiply(v, -l);
      var arrowEndCenter = vectorAdd(target, arrowEndRotationPoint);
      var arrowEndA = vectorRotate(target, 2, arrowEndCenter);
      var arrowEndB = vectorRotate(target, -2, arrowEndCenter);

      ctx.moveTo(arrowEndA.x, arrowEndA.y);
      ctx.lineTo(target.x, target.y);
      ctx.lineTo(arrowEndB.x, arrowEndB.y);
    }

    // ctx.stroke();
    // ctx.globalAlpha = 1;

    drawMarkupStyles(ctx, styles);
    return true;
  };

  var TYPE_DRAW_ROUTES = {
    rect: drawRect,
    ellipse: drawEllipse,
    image: drawImage,
    text: drawText,
    line: drawLine
  };

  var imageDataToCanvas = function imageDataToCanvas(imageData) {
    var image = document.createElement('canvas');
    image.width = imageData.width;
    image.height = imageData.height;
    var ctx = image.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return image;
  };

  var transformImage = function transformImage(file, instructions) {
    var options =
      arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    return new Promise(function(resolve, reject) {
      // if the file is not an image we do not have any business transforming it
      if (!file || !isImage$1(file)) return reject();

      // get separate options for easier use
      var stripImageHead = options.stripImageHead,
        beforeCreateBlob = options.beforeCreateBlob,
        afterCreateBlob = options.afterCreateBlob,
        canvasMemoryLimit = options.canvasMemoryLimit;

      // get crop
      var crop = instructions.crop,
        size = instructions.size,
        filter = instructions.filter,
        markup = instructions.markup,
        output = instructions.output;

      // get exif orientation
      var orientation =
        instructions.image && instructions.image.orientation
          ? Math.max(1, Math.min(8, instructions.image.orientation))
          : null;

      // compression quality 0 => 100
      var qualityAsPercentage = output && output.quality;
      var quality =
        qualityAsPercentage === null ? null : qualityAsPercentage / 100;

      // output format
      var type = (output && output.type) || null;

      // get transforms
      var transforms = [];

      // add resize transforms if set
      if (
        size &&
        (typeof size.width === 'number' || typeof size.height === 'number')
      ) {
        transforms.push({ type: 'resize', data: size });
      }

      // add filters
      if (filter && filter.length === 20) {
        transforms.push({ type: 'filter', data: filter });
      }

      // resolves with supplied blob
      var resolveWithBlob = function resolveWithBlob(blob) {
        var promisedBlob = afterCreateBlob ? afterCreateBlob(blob) : blob;
        Promise.resolve(promisedBlob).then(resolve);
      };

      // done
      var toBlob = function toBlob(imageData, options) {
        var canvas = imageDataToCanvas(imageData);
        var promisedCanvas = markup.length
          ? canvasApplyMarkup(canvas, markup)
          : canvas;
        Promise.resolve(promisedCanvas).then(function(canvas) {
          canvasToBlob(canvas, options, beforeCreateBlob)
            .then(function(blob) {
              // remove image head (default)
              if (stripImageHead) return resolveWithBlob(blob);

              // try to copy image head
              getImageHead(blob).then(function(imageHead) {
                // re-inject image head EXIF info in case of JPEG, as the image head is removed by canvas export
                if (imageHead !== null) {
                  blob = new Blob([imageHead, blob.slice(20)], {
                    type: blob.type
                  });
                }

                // done!
                resolveWithBlob(blob);
              });
            })
            .catch(reject);
        });
      };

      // if this is an svg and we want it to stay an svg
      if (/svg/.test(file.type) && type === null) {
        return cropSVG(file, crop, markup).then(function(text) {
          resolve(createBlob(text, 'image/svg+xml'));
        });
      }

      // get file url
      var url = URL.createObjectURL(file);

      // turn the file into an image
      loadImage(url).then(function(image) {
        // url is no longer needed
        URL.revokeObjectURL(url);

        // draw to canvas and start transform chain
        var imageData = imageToImageData(image, orientation, crop, {
          canvasMemoryLimit: canvasMemoryLimit
        });

        // determine the format of the blob that we will output
        var outputFormat = {
          quality: quality,
          type: type || file.type
        };

        // no transforms necessary, we done!
        if (!transforms.length) {
          return toBlob(imageData, outputFormat);
        }

        // send to the transform worker to transform the blob on a separate thread
        var worker = createWorker(TransformWorker);
        worker.post(
          {
            transforms: transforms,
            imageData: imageData
          },

          function(response) {
            // finish up
            toBlob(objectToImageData(response), outputFormat);

            // stop worker
            worker.terminate();
          },
          [imageData.data.buffer]
        );
      });
    });
  };

  /**
   * Polyfill Edge and IE when in Browser
   */
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
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
  }

  var isBrowser =
    typeof window !== 'undefined' && typeof window.document !== 'undefined';
  var isIOS =
    isBrowser &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream;

  /**
   * Image Transform Plugin
   */
  var plugin = function plugin(_ref) {
    var addFilter = _ref.addFilter,
      utils = _ref.utils;
    var Type = utils.Type,
      forin = utils.forin,
      getFileFromBlob = utils.getFileFromBlob,
      isFile = utils.isFile;

    /**
     * Helper functions
     */

    // valid transforms (in correct order)
    var TRANSFORM_LIST = ['crop', 'resize', 'filter', 'markup', 'output'];

    var createVariantCreator = function createVariantCreator(updateMetadata) {
      return function(transform, file, metadata) {
        return transform(
          file,
          updateMetadata ? updateMetadata(metadata) : metadata
        );
      };
    };

    var isDefaultCrop = function isDefaultCrop(crop) {
      return (
        crop.aspectRatio === null &&
        crop.rotation === 0 &&
        crop.zoom === 1 &&
        crop.center &&
        crop.center.x === 0.5 &&
        crop.center.y === 0.5 &&
        crop.flip &&
        crop.flip.horizontal === false &&
        crop.flip.vertical === false
      );
    };

    /**
     * Filters
     */
    addFilter('SHOULD_PREPARE_OUTPUT', function(shouldPrepareOutput, _ref2) {
      var query = _ref2.query;
      return new Promise(function(resolve) {
        // If is not async should prepare now
        resolve(!query('IS_ASYNC'));
      });
    });

    // subscribe to file transformations
    addFilter('PREPARE_OUTPUT', function(file, _ref3) {
      var query = _ref3.query,
        item = _ref3.item;
      return new Promise(function(resolve) {
        // if the file is not an image we do not have any business transforming it
        if (
          !isFile(file) ||
          !isImage(file) ||
          !query('GET_ALLOW_IMAGE_TRANSFORM') ||
          item.archived
        ) {
          return resolve(file);
        }

        // get variants
        var variants = [];

        // add original file
        if (query('GET_IMAGE_TRANSFORM_VARIANTS_INCLUDE_ORIGINAL')) {
          variants.push(function() {
            return new Promise(function(resolve) {
              resolve({
                name: query('GET_IMAGE_TRANSFORM_VARIANTS_ORIGINAL_NAME'),
                file: file
              });
            });
          });
        }

        // add default output version if output default set to true or if no variants defined
        if (query('GET_IMAGE_TRANSFORM_VARIANTS_INCLUDE_DEFAULT')) {
          variants.push(function(transform, file, metadata) {
            return new Promise(function(resolve) {
              transform(file, metadata).then(function(file) {
                return resolve({
                  name: query('GET_IMAGE_TRANSFORM_VARIANTS_DEFAULT_NAME'),
                  file: file
                });
              });
            });
          });
        }

        // get other variants
        var variantsDefinition = query('GET_IMAGE_TRANSFORM_VARIANTS') || {};
        forin(variantsDefinition, function(key, fn) {
          var createVariant = createVariantCreator(fn);
          variants.push(function(transform, file, metadata) {
            return new Promise(function(resolve) {
              createVariant(transform, file, metadata).then(function(file) {
                return resolve({ name: key, file: file });
              });
            });
          });
        });

        // output format (quality 0 => 100)
        var qualityAsPercentage = query('GET_IMAGE_TRANSFORM_OUTPUT_QUALITY');
        var qualityMode = query('GET_IMAGE_TRANSFORM_OUTPUT_QUALITY_MODE');
        var quality =
          qualityAsPercentage === null ? null : qualityAsPercentage / 100;
        var type = query('GET_IMAGE_TRANSFORM_OUTPUT_MIME_TYPE');
        var clientTransforms =
          query('GET_IMAGE_TRANSFORM_CLIENT_TRANSFORMS') || TRANSFORM_LIST;

        // update transform metadata object
        item.setMetadata(
          'output',
          {
            type: type,
            quality: quality,
            client: clientTransforms
          },
          true
        );

        // the function that is used to apply the file transformations
        var transform = function transform(file, metadata) {
          return new Promise(function(resolve, reject) {
            var filteredMetadata = Object.assign({}, metadata);

            Object.keys(filteredMetadata)
              .filter(function(instruction) {
                return instruction !== 'exif';
              })
              .forEach(function(instruction) {
                // if not in list, remove from object, the instruction will be handled by the server
                if (clientTransforms.indexOf(instruction) === -1) {
                  delete filteredMetadata[instruction];
                }
              });
            var resize = filteredMetadata.resize,
              exif = filteredMetadata.exif,
              output = filteredMetadata.output,
              crop = filteredMetadata.crop,
              filter = filteredMetadata.filter,
              markup = filteredMetadata.markup;

            var instructions = {
              image: {
                orientation: exif ? exif.orientation : null
              },

              output: output
                ? {
                    type: output.type,
                    quality: output.quality ? output.quality * 100 : null
                  }
                : undefined,
              size:
                resize && (resize.size.width || resize.size.height)
                  ? Object.assign(
                      {
                        mode: resize.mode,
                        upscale: resize.upscale
                      },
                      resize.size
                    )
                  : undefined,
              crop:
                crop && !isDefaultCrop(crop)
                  ? Object.assign({}, crop)
                  : undefined,
              markup: markup || [],
              filter: filter
            };

            if (instructions.output) {
              // determine if file type will change
              var willChangeType = output.type && output.type !== file.type;

              // determine if file data will be modified
              var willModifyImageData = !!(
                instructions.size ||
                instructions.crop ||
                instructions.filter ||
                willChangeType
              );

              // if quality has been set, and quality is optional, and we're not modifying the image data then we don't have to modify the output
              if (
                output.quality &&
                qualityMode === 'optional' &&
                !willModifyImageData
              ) {
                return resolve(file);
              }
            }

            var options = {
              beforeCreateBlob: query('GET_IMAGE_TRANSFORM_BEFORE_CREATE_BLOB'),
              afterCreateBlob: query('GET_IMAGE_TRANSFORM_AFTER_CREATE_BLOB'),
              canvasMemoryLimit: query(
                'GET_IMAGE_TRANSFORM_CANVAS_MEMORY_LIMIT'
              ),
              stripImageHead: query(
                'GET_IMAGE_TRANSFORM_OUTPUT_STRIP_IMAGE_HEAD'
              )
            };

            transformImage(file, instructions, options)
              .then(function(blob) {
                // set file object
                var out = getFileFromBlob(
                  blob,
                  // rename the original filename to match the mime type of the output image
                  renameFileToMatchMimeType(
                    file.name,
                    getValidOutputMimeType(blob.type)
                  )
                );

                resolve(out);
              })
              .catch(reject);
          });
        };

        // start creating variants
        var variantPromises = variants.map(function(create) {
          return create(transform, file, item.getMetadata());
        });

        // wait for results
        Promise.all(variantPromises).then(function(files) {
          // if single file object in array, return the single file object else, return array of
          resolve(
            files.length === 1 && files[0].name === null
              ? // return the File object
                files[0].file
              : // return an array of files { name:'name', file:File }
                files
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
        imageTransformCanvasMemoryLimit: [
          isBrowser && isIOS ? 4096 * 4096 : null,
          Type.INT
        ]
      }
    };
  };

  // fire pluginloaded event if running in browser, this allows registering the plugin when using async script tags
  if (isBrowser) {
    document.dispatchEvent(
      new CustomEvent('FilePond:pluginloaded', { detail: plugin })
    );
  }

  return plugin;
});
