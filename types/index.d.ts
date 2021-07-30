// @ts-ignore
import { FilePondOptions, FilePondFile } from 'filepond';

declare module 'filepond' {
    export interface FilePondFile {
        requestPrepare: () => Promise<Blob>;
    }

    export interface FilePondOptions {
        allowImageTransform?: boolean;

        /** filter images to transform */
        imageTransformImageFilter?: Function | null;

        /** 'image/jpeg', 'image/png', etc. */
        imageTransformOutputMimeType?: string | null;

        /** 0 - 100 */
        imageTransformOutputQuality?: number | null;

        /** set to false to copy image exif data to output */
        imageTransformOutputStripImageHead?: boolean;

        /** only apply transforms in this list */
        imageTransformClientTransforms?: any[] | null;

        /** only apply output quality when a transform is required */
        imageTransformOutputQualityMode?: 'always' | 'optional';

        /** get image transform variants */
        imageTransformVariants?: any | null;

        /** should we post the default transformed file */
        imageTransformVariantsIncludeDefault?: boolean;

        /** which name to prefix the default transformed file with */
        imageTransformVariantsDefaultName?: string | null;

        /** should we post the original file */
        imageTransformVariantsIncludeOriginal?: boolean;

        /** which name to prefix the original file with */
        imageTransformVariantsOriginalName?: string;

        /** called before creating the blob, receives canvas, expects promise resolve with canvas */
        imageTransformBeforeCreateBlob?: Function | null;

        /** expects promise resolved with blob */
        imageTransformAfterCreateBlob?: Function | null;

        /** canvas memory limit */
        imageTransformCanvasMemoryLimit?: number | null;

        /** background image of the output canvas */
        imageTransformCanvasBackgroundColor?: string | null;
    }
}
