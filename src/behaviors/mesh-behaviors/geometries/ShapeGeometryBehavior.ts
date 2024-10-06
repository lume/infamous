import {attribute, booleanAttribute, numberAttribute, stringAttribute} from '@lume/element'
import 'element-behaviors'
import {ExtrudeGeometry} from 'three/src/geometries/ExtrudeGeometry.js'
import {Shape} from 'three/src/extras/core/Shape.js'
import {ShapeGeometry} from 'three/src/geometries/ShapeGeometry.js'
import {behavior} from '../../Behavior.js'
import {receiver} from '../../PropReceiver.js'
import {GeometryBehavior} from './GeometryBehavior.js'
import {stringToNumberArray} from '../../../meshes/utils.js'
import {handleInvertedGeometry} from './utils/handleInvertedGeometry.js'
import {parseSvgPathDAttribute} from './utils/svg.js'

// Heart shape.
const defaultShape = new Shape()

defaultShape.moveTo(5, 5)
defaultShape.bezierCurveTo(5, 5, 4, 0, 0, 0)
defaultShape.bezierCurveTo(-6, 0, -6, 7, -6, 7)
defaultShape.bezierCurveTo(-6, 11, -3, 15.4, 5, 19)
defaultShape.bezierCurveTo(12, 15.4, 16, 11, 16, 7)
defaultShape.bezierCurveTo(16, 7, 16, 0, 10, 0)
defaultShape.bezierCurveTo(7, 0, 5, 5, 5, 5)

const emptyShape = new Shape()

const isPathStringRe = /^[mlhvcsqtaz][^a-z]/i

export type ShapeGeometryBehaviorAttributes =
	| 'shape'
	| 'curveSegments'
	| 'bevel'
	| 'bevelSegments'
	| 'bevelThickness'
	| 'centerGeometry'
	| 'fitment'

/**
 * @class ShapeGeometryBehavior -
 *
 * Provides a 2D extrudable shape geometry for mesh
 * elements. The [`<lume-shape>`](../../../meshes/Shape.md) element has this behavior
 * on it by default.
 *
 * The shape defined by the [`shape`](#shape) attribute property will be centered within the
 * size space defined by the host element's `size` and `sizeMode` attribute
 * properties.
 *
 * To extrude the shape, set the host element's Z size to the amount of desired
 * extrusion. If the host element Z size is zero, the shape will be flat and 2D
 * only.
 *
 * <live-code id="example"></live-code>
 * <script>
 *   example.content = shapesExample
 * </script>
 *
 * @extends GeometryBehavior
 */
export
@behavior
class ShapeGeometryBehavior extends GeometryBehavior {
	#shape = new Shape().copy(defaultShape)

	/**
	 * @property {string | number[] | THREE.Shape | null} shape - Defines the 2D shape to render.
	 *
	 * Reading the property always returns an underlying
	 * [THREE.Shape](https://threejs.org/docs/index.html?q=shape#api/en/extras/core/Shape)
	 * object.
	 *
	 * Setting the property accepts `string`, `number[]`, `null`, or
	 * `THREE.Shape` values. All values are mapped to a single `THREE.Shape`
	 * property (the one returned by the getter).
	 *
	 * While setting the property triggers reactivity, modifying the
	 * `THREE.Shape` returned by the getter does not. In such a case, we can
	 * execute `el.shape = el.shape` to trigger reactivity.
	 * <!-- TODO investigate using Solid createMutable to make the THREE.Shape reactive. -->
	 *
	 * A string value should be a list of numbers separated by any amount of space
	 * (commas are optional, for organizational use), every two numbers forming
	 * one point in the 2D shape. Similar to the rest of LUME's coordinate
	 * system, +X goes rightward, and +Y goes downward.
	 *
	 * A number array value is similar to the string value: every two numbers
	 * form a point in the shape.
	 * <!-- TODO investigate reacting to reactive arrays -->
	 *
	 * If the string or number array have no points, the default shape is rendered.
	 *
	 * A `THREE.Shape` value will have its data copied to the underlying
	 * `THREE.Shape` returned by the getter, and does not replace the underlying
	 * `THREE.Shape` object.
	 * <!-- TODO perhaps the getter should always return the value the user set, and not expose the internal `THREE.Shape` -->
	 *
	 * A value of `null` (or when the attribute is removed) causes the
	 * default shape to be rendered.
	 */
	@attribute @receiver get shape(): Shape {
		return this.#shape
	}
	@attribute set shape(shape: string | number[] | Shape | null) {
		if (!shape) {
			this.#shape.copy(defaultShape)
		} else if (
			typeof shape === 'string' &&
			(shape = shape.trim()) && // skip empty string here
			shape.match(isPathStringRe)
		) {
			const shapePath = parseSvgPathDAttribute(shape)

			// TODO This supports only one solid shape for now.
			this.#shape.copy(shapePath.toShapes(true)[0] ?? defaultShape)
		} else if (typeof shape === 'string' && !shape.match(/^-?[0-9]/)) {
			// TODO query selector for <path> element from which to get a `d` attribute.
			console.error('Unsupported shape path: ', shape)
			this.#shape.copy(defaultShape)
		} else if (typeof shape === 'string' || Array.isArray(shape)) {
			const points: number[] = typeof shape === 'string' ? stringToNumberArray(shape, 'shape') : shape

			if (!points.length) {
				this.#shape.copy(defaultShape)
			} else {
				if (points.length % 2 !== 0)
					throw new Error('shape path must have an even number of numbers, each pair of numbers being a point.')

				this.#shape.copy(emptyShape)
				this.#shape.moveTo(points[0]!, points[1]!)

				if (points.length > 2) for (let i = 2; i < points.length; i += 2) this.#shape.lineTo(points[i]!, points[i + 1]!)
			}
		} else {
			// Three.js bug: Copying a shape from itself breaks, causing
			// its `curves` array to be empty. Without this, `<lume-shape>` will
			// not draw anything on screen initially until its `shape` is
			// modified.
			if (this.#shape !== shape) {
				this.#shape.copy(shape)
			}
		}

		this.#shape.updateArcLengths()
	}

	/**
	 * @property {number} curveSegments - The number of lines per curve withing
	 * the shape. The higher the number, the smoother the shape at the cost of
	 * render time.
	 * @default 8
	 */
	@numberAttribute @receiver curveSegments = 8
	/**
	 * @property {boolean} bevel - When the shape is extruded, enables rounding
	 * of the shape edges.
	 * @default false
	 */
	@booleanAttribute @receiver bevel = false
	/**
	 * @property {number} bevelSegments - When the shape is extruded, determines
	 * the number of sections for the bevel. A higher number makes the model
	 * look smoother, but cost more time to render.
	 * @default 4
	 */
	@numberAttribute @receiver bevelSegments = 4
	/**
	 * @property {number} bevelThickness - When the shape is extruded,
	 * determines the thickness of the bevel. Roughly like the amount of
	 * radius for the rounded edges.
	 * @default 4
	 */
	@numberAttribute @receiver bevelThickness = 4
	/**
	 * @property {boolean} centerGeometry - When true, centers the shape geometry
	 * within the host element's size space.
	 * @default true
	 */
	@booleanAttribute @receiver centerGeometry = true

	/**
	 * @property {string} fitment - Determines how to fit a shape within the
	 * size area on X and Y. The Z size dictates the shape extrusion separately.
	 * This takes the same values as the object-fit CSS property, except global
	 * values. See https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit#values
	 * for details.
	 */
	@stringAttribute @receiver fitment: 'none' | 'contain' | 'cover' | 'fill' | 'scale-down' = 'none'

	// TODO attribute to apply smoothing to the geometry (calculate normals)?

	override _createComponent() {
		let geometry: ExtrudeGeometry | ShapeGeometry

		if (this.element.calculatedSize.z === 0) {
			geometry = new ShapeGeometry(this.shape, this.curveSegments)
		} else {
			geometry = new ExtrudeGeometry(this.shape, {
				curveSegments: this.curveSegments,
				bevelSegments: this.bevelSegments,
				bevelThickness: this.bevelThickness,
				bevelEnabled: this.bevel,
				depth: this.element.calculatedSize.z,
			})
		}

		if (this.centerGeometry) geometry.center()

		// Make a Shape's Y coordinates go downward to match with LUME's coordinate system.
		// Negative scale throws a lot of things off, causing lighting not to work due to normals going the wrong direction.
		geometry.scale(1, -1, 1)
		// So we have to do the following to reverse the effects:
		handleInvertedGeometry(geometry)

		if (this.fitment === 'none') return geometry

		let minX = Number.MAX_VALUE
		let maxX = -Number.MAX_VALUE
		let minY = Number.MAX_VALUE
		let maxY = -Number.MAX_VALUE

		const verts = geometry.attributes.position!.array
		const stride = 3

		for (let i = 0, l = verts.length / stride; i < l; i++) {
			const x = verts[i * stride + 0]!
			const y = verts[i * stride + 1]!
			if (x < minX) minX = x
			if (x > maxX) maxX = x
			if (y < minY) minY = y
			if (y > maxY) maxY = y
		}

		const shapeSizeX = maxX - minX
		const shapeSizeY = maxY - minY

		const scaleX = shapeSizeX / this.element.calculatedSize.x
		const scaleY = shapeSizeY / this.element.calculatedSize.y

		if (this.fitment === 'fill') return geometry.scale(1 / scaleX, 1 / scaleY, 1)

		const shapeAspect = shapeSizeX / shapeSizeY
		const sizeAspect = this.element.calculatedSize.x / this.element.calculatedSize.y

		if (this.fitment === 'contain') {
			// tall
			if (shapeAspect < sizeAspect) geometry.scale(1 / scaleY, 1 / scaleY, 1)
			// wide (or equal)
			else geometry.scale(1 / scaleX, 1 / scaleX, 1)
		} else if (this.fitment === 'cover') {
			// tall
			if (shapeAspect < sizeAspect) geometry.scale(1 / scaleX, 1 / scaleX, 1)
			// wide (or equal)
			else geometry.scale(1 / scaleY, 1 / scaleY, 1)
		} else if (this.fitment === 'scale-down') {
			if (!(shapeSizeX <= this.element.calculatedSize.x && shapeSizeY <= this.element.calculatedSize.y)) {
				// tall
				if (shapeAspect < sizeAspect) geometry.scale(1 / scaleY, 1 / scaleY, 1)
				// wide (or equal)
				else geometry.scale(1 / scaleX, 1 / scaleX, 1)
			}
		}

		return geometry
	}
}

if (globalThis.window?.document && !elementBehaviors.has('shape-geometry'))
	elementBehaviors.define('shape-geometry', ShapeGeometryBehavior)
