/**
 * Polyfill toBlob for Edge
 */
const IS_BROWSER = (() => typeof window !== 'undefined' && typeof window.document !== 'undefined')();
if (IS_BROWSER) {
    if (!HTMLCanvasElement.prototype.toBlob) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
            value: function (callback, type, quality) {
                var dataURL = this.toDataURL(type, quality).split(',')[1];
                setTimeout(function() {
                    var binStr = atob(dataURL);
                    var len = binStr.length;
                    var arr = new Uint8Array(len);
                    for (var i=0; i<len; i++) {
                        arr[i] = binStr.charCodeAt(i);
                    }
                    callback(new Blob([arr], {type: type || 'image/png'}));
                });
            }
        });
    }
}

export const canvasToBlob = (canvas, options, beforeCreateBlob = null) =>
    new Promise((resolve) => {
        const promisedImage = beforeCreateBlob ? beforeCreateBlob(canvas) : canvas;
        Promise.resolve(promisedImage).then(canvas => {
            canvas.toBlob(resolve, options.type, options.quality);
        });
    });
