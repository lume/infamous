import { Element3D, type Element3DAttributes } from '../core/Element3D.js';
import type { LoadEvent } from './LoadEvent.js';
export type ModelAttributes = Element3DAttributes | 'onload';
/**
 * @class Model - Base class for model elements that load 3D models from
 * various types of asset files (f.e. gltf, fbx, obj, etc).
 *
 * @extends Element3D
 */
export declare class Model extends Element3D {
    /**
     * @property {object | null} threeModel - The loaded model, or null if not loaded or while loading.
     *
     * `signal`
     */
    threeModel: object | null;
    addEventListener: <Key extends keyof ModelEvents>(type: Key, listener: (this: this, event: ModelEvents[Key]) => void, options?: boolean | AddEventListenerOptions) => void;
    removeEventListener: <Key extends keyof ModelEvents>(type: Key, listener: (this: this, event: ModelEvents[Key]) => void, options?: boolean | AddEventListenerOptions) => void;
    /** Needed for JSX types */
    onload: ((event: Event) => void) | null;
}
export interface ModelEvents extends HTMLElementEventMap {
    load: LoadEvent;
}
//# sourceMappingURL=Model.d.ts.map