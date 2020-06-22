declare module "filepond-plugin-image-transform" {
    const FilePondPluginImageTransform: FilePondPluginImageTransformProps;
    export interface FilePondPluginImageTransformProps {
        /** Enable or disable client-side image transforms */
        allowImageTransform?: boolean;

        /** The file type of the output image. Can be either 'image/jpeg' or 'image/png' as those are the formats the HTML5 Canvas element can output to.
         * If not defined, will default to the input file type, and fallback to 'image/jpeg'. */
         imageTransformOutputMimeType?: 'image/jpeg'|'image/png';

         /** The quality of the output image supplied as a value between 0 and 100. Where 100 is best quality and 0 is worst.
          * When not supplied it will use the browser default quality which averages around 94 */
         imageTransformOutputQuality?: number;

         /** Should output quality be enforced, set the 'optional' to only apply when a transform is required due to other requirements (e.g. resize or crop). */
         imageTransformOutputQualityMode?: 'always'|'optional';

         /** Should JPEG EXIF data be stripped from the output image, defaults to true (as that is what the browser does), 
          * set to false to copy over the EXIF data from the original image to the output image.
          * This will automatically remove the EXIF orientation tag to prevent orientation problems. */
         imageTransformOutputStripImageHead?: boolean;

         /** An array of transforms to apply on the client, useful if we, for instance, want to do resizing on the client but cropping on the server.
          * null means apply all transforms ('resize', 'crop'). */
         imageTransformClientTransforms?: 'resize'|'crop'|null;

         /** An object that can be used to output multiple different files based on different transfom instructions. */
         imageTransformVariants?: any;

         /** Should the transform plugin output the default transformed file. */
         imageTransformVariantsIncludeDefault?: boolean;

         /** The name to use in front of the file name. */
         imageTransformVariantsDefaultName?: string;

         /** Should the transform plugin output the original file. */
         imageTransformVariantsIncludeOriginal?: boolean;

         /** The name to use in front of the original file name. */
         imageTransformVariantsOriginalName?: string;

         /** A hook to make changes to the canvas before the file is created. */
         imageTransformBeforeCreateBlob?: any;

         /** A hook to make changes to the file after the file has been created. */
         imageTransformAfterCreateBlob?: any;

         /** A memory limit to make sure the canvas can be used correctly when rendering the image. By default this is only active on iOS. */
         imageTransformCanvasMemoryLimit?: number;
    }
    export default FilePondPluginImageTransform;
}
