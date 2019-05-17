// returns all the valid output formats we can encode towards
export const getValidOutputMimeType = type => /jpeg|png|svg\+xml/.test(type) ? type : 'image/jpeg';