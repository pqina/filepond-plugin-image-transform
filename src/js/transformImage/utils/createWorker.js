import { getUniqueId } from './getUniqueId';

export const createWorker = fn => {
    
    const workerBlob = new Blob(['(', fn.toString(), ')()'], { type: 'application/javascript' });
    const workerURL = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerURL);

    const trips = [];

    return {
        transfer: () => {}, // (message, cb) => {}
        post: (message, cb, transferList) => {
            
            const id = getUniqueId();
            trips[id] = cb;

            worker.onmessage = e => {
                const cb = trips[e.data.id];
                if (!cb) return;
                cb(e.data.message);
                delete trips[e.data.id];
            };

            worker.postMessage(
                {
                    id,
                    message
                },
                transferList
            );

        },
        terminate: () => {
            worker.terminate();
            URL.revokeObjectURL(workerURL);
        }
    };
};
