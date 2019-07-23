
import { getImageRectZoomFactor } from './getImageRectZoomFactor';
import { getCenteredCropRect } from './getCenteredCropRect';

export const cropSVG = (blob, crop = { center: {x:.5, y:.5}, zoom:1, rotation:0, flip: {horizontal:false, vertical: false, aspectRatio:null }}) => new Promise(resolve => {

    // load blob contents and wrap in crop svg
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
        const viewBox = viewBoxList.length ? {
            x: viewBoxList[0],
            y: viewBoxList[1],
            width: viewBoxList[2],
            height: viewBoxList[3]
        } : bBox;

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
            x: canvasWidth * .5,
            y: canvasHeight * .5
        };

        const imageOffset = {
            x: canvasCenter.x - (imageWidth * crop.center.x),
            y: canvasCenter.y - (imageHeight * crop.center.y)
        };

        const cropTransforms = [

            // rotate
            `rotate(${rotation} ${canvasCenter.x} ${canvasCenter.y})`,
            
            // scale
            `translate(${canvasCenter.x} ${canvasCenter.y})`,
            `scale(${scale})`,
            `translate(${-canvasCenter.x} ${-canvasCenter.y})`,
           
            // offset
            `translate(${imageOffset.x} ${imageOffset.y})`,
             
        ];

        const flipTransforms = [
            `scale(${crop.flip.horizontal ? -1 : 1} ${crop.flip.vertical ? -1 : 1})`,
            `translate(${crop.flip.horizontal ? -imageWidth : 0} ${crop.flip.vertical ? -imageHeight : 0})`
        ];
        
        // crop
        const transformed = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasWidth}${widthUnits}" height="${canvasHeight}${heightUnits}" 
viewBox="0 0 ${canvasWidth} ${canvasHeight}" 
preserveAspectRatio="xMinYMin"
xmlns="http://www.w3.org/2000/svg">
<!-- Generator: PQINA - https://pqina.nl/ -->
<title>${ titleNode ? titleNode.textContent : '' }</title>
<desc>Cropped with FilePond.</desc>
<g transform="${cropTransforms.join(' ')}">
<g transform="${flipTransforms.join(' ')}">
${originalNode.outerHTML}
</g>
</g>
</svg>`;

        // create new svg file
        resolve(transformed);
    }

    fr.readAsText(blob);
});