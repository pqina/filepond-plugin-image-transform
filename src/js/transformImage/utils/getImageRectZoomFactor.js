const createVector = (x,y) => ({x,y});

const vectorDot = (a, b) => a.x * b.x + a.y * b.y;

const vectorSubtract = (a, b) => createVector(a.x - b.x, a.y - b.y);

const vectorDistanceSquared = (a, b) => vectorDot(vectorSubtract(a, b), vectorSubtract(a, b));

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
}

export const getRotatedRectSize = (rect, rotation) => {

    const w = rect.width;
    const h = rect.height;

    const hor = getOffsetPointOnEdge(w, rotation);
    const ver = getOffsetPointOnEdge(h, rotation);

    const tl = createVector(
        rect.x + Math.abs(hor.x),
        rect.y - Math.abs(hor.y)
    )

    const tr = createVector(
        rect.x + rect.width + Math.abs(ver.y),
        rect.y + Math.abs(ver.x)
    )

    const bl = createVector(
        rect.x - Math.abs(ver.y),
        (rect.y + rect.height) - Math.abs(ver.x)
    )
    
    return {
        width: vectorDistance(tl, tr),
        height: vectorDistance(tl, bl)
    }

};


export const getImageRectZoomFactor = (imageRect, cropRect, rotation = 0, center = { x:.5, y:.5 }) => {

    // calculate available space round image center position
    const cx = center.x > .5 ? 1 - center.x : center.x;
    const cy = center.y > .5 ? 1 - center.y : center.y;
    const imageWidth = cx * 2 * imageRect.width;
    const imageHeight = cy * 2 * imageRect.height;

    // calculate rotated crop rectangle size
    const rotatedCropSize = getRotatedRectSize(cropRect, rotation);

    return Math.max(
        rotatedCropSize.width / imageWidth, 
        rotatedCropSize.height / imageHeight
    );
};