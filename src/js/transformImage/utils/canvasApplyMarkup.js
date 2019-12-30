import { vectorRotate, vectorNormalize, vectorAdd, vectorMultiply } from './vector';

import { getMarkupValue } from './getMarkupValue';
import { getMarkupRect } from './getMarkupRect';
import { getMarkupStyles } from './getMarkupStyles';
import { sortMarkupByZIndex } from './sortMarkupByZIndex';

const chain = funcs =>
  funcs.reduce((promise, func) =>
    promise.then(result =>
      func().then(Array.prototype.concat.bind(result))),
      Promise.resolve([]))

export const canvasApplyMarkup = (canvas, markup) => new Promise((resolve) => {

    const size = {
        width: canvas.width,
        height: canvas.height
    };

    const ctx = canvas.getContext('2d');

    const drawers = markup.sort(sortMarkupByZIndex).map(item => () => 
        new Promise(resolve => {
            const result = TYPE_DRAW_ROUTES[item[0]](ctx, size, item[1], resolve)
            if (result) resolve();
        })
    );

    chain(drawers).then(() => resolve(canvas))
});

const applyMarkupStyles = (ctx, styles) => {
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
}

const drawMarkupStyles = (ctx) => {
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
}

const drawRect = (ctx, size, markup) => {
    const rect = getMarkupRect(markup, size);
    const styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    drawMarkupStyles(ctx, styles);
    return true;
}

const drawEllipse = (ctx, size, markup) => {
    const rect = getMarkupRect(markup, size);
    const styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);
    
    const x = rect.x, 
    y = rect.y, 
    w = rect.width, 
    h = rect.height, 
    kappa = .5522848,
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
}

const drawImage = (ctx, size, markup, done) => {

    const rect = getMarkupRect(markup, size);
    const styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);

    const image = new Image();
    image.onload = () => {
        if (markup.fit === 'cover') {
            const ar = rect.width / rect.height;
            const width = ar > 1 ? image.width : image.height * ar;
            const height = ar > 1 ? image.width / ar : image.height;
            const x = (image.width * .5) - (width * .5);
            const y = (image.height * .5) - (height * .5);
            ctx.drawImage(image, 
                x, y, width, height,
                rect.x, rect.y, rect.width, rect.height);
        }
        else if (markup.fit === 'contain') {
            const scalar = Math.min(rect.width / image.width, rect.height / image.height);
            const width = scalar * image.width;
            const height = scalar * image.height;
            const x = rect.x + (rect.width * .5) - (width * .5);
            const y = rect.y + (rect.height * .5) - (height * .5);
            ctx.drawImage(image, 
                0, 0, image.width, image.height,
                x, y, width, height);
        }
        else {
            ctx.drawImage(image, 
                0, 0, image.width, image.height,
                rect.x, rect.y, rect.width, rect.height);
        }

        drawMarkupStyles(ctx, styles);
        done();
    };
    image.src = markup.src;
}
    
const drawText = (ctx, size, markup) => {

    const rect = getMarkupRect(markup, size);
    const styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);
    
    const fontSize = getMarkupValue(markup.fontSize, size);
    const fontFamily = markup.fontFamily || 'sans-serif';
    const fontWeight = markup.fontWeight || 'normal';
    const textAlign = markup.textAlign || 'left';

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = textAlign;
    ctx.fillText(markup.text, rect.x, rect.y);

    drawMarkupStyles(ctx, styles);
    return true;
};

const drawPath = (ctx, size, markup) => {

    const styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);
    ctx.beginPath();

    const points = markup.points.map(point => ({
        x: getMarkupValue(point.x, size, 1, 'width'),
        y: getMarkupValue(point.y, size, 1, 'height')
    }));
    
    ctx.moveTo(points[0].x, points[0].y);
    const l = points.length;
    for (let i=1;i<l;i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    drawMarkupStyles(ctx, styles);
    return true;
}

const drawLine = (ctx, size, markup) => {

    const rect = getMarkupRect(markup, size);
    const styles = getMarkupStyles(markup, size);
    applyMarkupStyles(ctx, styles);
    
    ctx.beginPath();

    const origin = {
        x: rect.x,
        y: rect.y
    }

    const target = {
        x: rect.x + rect.width,
        y: rect.y + rect.height
    }

    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(target.x, target.y);
    
    const v = vectorNormalize({
        x: target.x - origin.x,
        y: target.y - origin.y
    });

    const l = .04 * Math.min(size.width, size.height);

    if (markup.lineDecoration.indexOf('arrow-begin') !== -1) {

        const arrowBeginRotationPoint = vectorMultiply(v, l);
        const arrowBeginCenter = vectorAdd(origin, arrowBeginRotationPoint);
        const arrowBeginA = vectorRotate(origin, 2, arrowBeginCenter);
        const arrowBeginB = vectorRotate(origin,-2, arrowBeginCenter);
        
        ctx.moveTo(arrowBeginA.x, arrowBeginA.y);
        ctx.lineTo(origin.x, origin.y);
        ctx.lineTo(arrowBeginB.x, arrowBeginB.y);
    }
    if (markup.lineDecoration.indexOf('arrow-end') !== -1) {
            
        const arrowEndRotationPoint = vectorMultiply(v, -l);
        const arrowEndCenter = vectorAdd(target, arrowEndRotationPoint);
        const arrowEndA = vectorRotate(target, 2, arrowEndCenter);
        const arrowEndB = vectorRotate(target,-2, arrowEndCenter);
    
        ctx.moveTo(arrowEndA.x, arrowEndA.y);
        ctx.lineTo(target.x, target.y);
        ctx.lineTo(arrowEndB.x, arrowEndB.y);
    }

    drawMarkupStyles(ctx, styles);
    return true;
}

const TYPE_DRAW_ROUTES = {
    rect: drawRect,
    ellipse: drawEllipse,
    image: drawImage,
    text: drawText,
    line: drawLine,
    path: drawPath
};