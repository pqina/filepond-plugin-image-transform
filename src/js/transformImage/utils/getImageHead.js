const correctOrientation = (view, offset) => {

    // Missing 0x45786966 Marker? No Exif Header, stop here
    if (view.getUint32(offset + 4, false) !== 0x45786966) return;

    // next byte!
    offset += 4;

    // First 2bytes defines byte align of TIFF data. 
    // If it is 0x4949="I I", it means "Intel" type byte align
    const intelByteAligned = view.getUint16(offset += 6, false) === 0x4949;
    offset += view.getUint32(offset + 4, intelByteAligned);

    const tags = view.getUint16(offset, intelByteAligned);
    offset += 2;

    // find Orientation tag
    for (let i=0; i<tags; i++) {
        if (view.getUint16(offset + (i * 12), intelByteAligned) === 0x0112) {
            view.setUint16(offset + (i * 12) + 8, 1, intelByteAligned);
            return true;
        }
    }
    return false;
}

const readData = (data) => {

    const view = new DataView(data);
    
    // Every JPEG file starts from binary value '0xFFD8'
    // If it's not present, exit here
    if (view.getUint16(0) !== 0xFFD8) return null;

    let offset = 2; // Start at 2 as we skipped two bytes (FFD8)
    let marker;
    let markerLength;
    let orientationCorrected = false;

    while (offset < view.byteLength) {
        marker = view.getUint16(offset, false);
        markerLength = view.getUint16(offset + 2, false) + 2;

        // Test if is APP and COM markers
        const isData = (marker >= 0xFFE0 && marker <= 0xFFEF) || marker === 0xFFFE;
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
}

export const getImageHead = (file) => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(readData(reader.result) || null);
    reader.readAsArrayBuffer(file.slice(0, 256 * 1024));
});