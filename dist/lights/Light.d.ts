import { Element3D } from '../core/Element3D.js';
import type { TColor } from '../utils/three/material.js';
import type { Element3DAttributes } from '../core/Element3D.js';
export type LightAttributes = Element3DAttributes | 'color' | 'intensity';
/**
 * @abstract
 * @class Light -
 *
 * `abstract`
 *
 * An abstract base class for light elements. This class has properties common
 * to all types of light.
 *
 * @extends Element3D
 */
export declare abstract class Light extends Element3D {
    /**
     * @property {string | number | THREE.Color} color -
     *
     * `attribute`
     *
     * Default: `"white"`
     *
     * The color of light that is emitted.
     *
     * A string value can be any valid CSS color string, f.e. `"#ff6600"` or
     * `"rgb(10,20,30)"`.
     *
     * A number value represents a hex color value, f.e.
     * `0xff6600`.
     *
     * A `THREE.Color` instance can be assigned, and it will be copied to the
     * element's internal color value upon assignment. Mutating the assigned
     * `THREE.Color` after assignment will have no effect; instead you can
     * assign it again each time you wish to update the color.
     */
    color: TColor;
    /**
     * @property {number} intensity -
     *
     * `abstract`
     *
     * Default: `1`
     *
     * The intensity of the light.
     *
     * When [physically correct lighting](../core/Scene#physicallycorrectlights)
     * is enabled, the units of intensity depend on the type of light (f.e.
     * [`PointLight`](./PointLight) or [`SpotLight`](./SpotLight)).
     */
    intensity: number;
    makeThreeObject3d(): any;
    connectedCallback(): void;
}
//# sourceMappingURL=Light.d.ts.map