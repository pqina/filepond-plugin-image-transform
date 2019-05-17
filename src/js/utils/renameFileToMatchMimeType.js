import { getFilenameWithoutExtension } from './getFilenameWithoutExtension';
// only handles image/jpg, image/jpeg, image/png, and image/svg+xml for now
const ExtensionMap = {
    'jpeg': 'jpg',
    'svg+xml': 'svg'
};

export const renameFileToMatchMimeType = (filename, mimeType) => {
    const name = getFilenameWithoutExtension(filename);
    const type = mimeType.split('/')[1];
    const extension = ExtensionMap[type] || type;
    return `${name}.${extension}`;
};