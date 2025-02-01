// TODO material arrays are not handled. Any LUME elements have one material. If
// a user makes a subclass or provides a custom three object with a material
// array, we set properties onto each material, assuming they're all the same
// type. Perhaps we need an HTML syntax for multiple materials on an element.

import {createMemo, onCleanup} from 'solid-js'
import {TextureLoader} from 'three/src/loaders/TextureLoader.js'
import {Color} from 'three/src/math/Color.js'
import {DoubleSide, FrontSide, BackSide, type Side, SRGBColorSpace} from 'three/src/constants.js'
import {Material} from 'three/src/materials/Material.js'
import {booleanAttribute, stringAttribute, numberAttribute} from '@lume/element'
import {behavior} from '../../Behavior.js'
import {receiver} from '../../PropReceiver.js'
import {GeometryOrMaterialBehavior} from '../GeometryOrMaterialBehavior.js'

import type {MeshComponentType} from '../MeshBehavior.js'
import type {Texture} from 'three'

export type MaterialBehaviorAttributes =
	| 'alphaTest'
	| 'colorWrite'
	| 'depthTest'
	| 'depthWrite'
	| 'dithering'
	| 'wireframe'
	| 'sidedness'
	| 'color'
	| 'materialOpacity'

/**
 * @class MaterialBehavior -
 *
 * Base class for material behaviors.
 *
 * @extends GeometryOrMaterialBehavior
 */
export
@behavior
class MaterialBehavior extends GeometryOrMaterialBehavior {
	type: MeshComponentType = 'material'

	/**
	 * @property {number} alphaTest -
	 *
	 * `attribute`
	 *
	 * Default: `0`
	 *
	 * Sets the alpha value to be used when running an alpha test. The material
	 * will not be rendered if the opacity is lower than this value.
	 */
	@numberAttribute @receiver alphaTest = 0

	// located in ClipPlanesBehavior instead
	// @booleanAttribute @receiver clipIntersection = false
	// @booleanAttribute @receiver clipShadows = true

	/**
	 * @property {boolean} colorWrite -
	 *
	 * `attribute`
	 *
	 * Default: `true`
	 *
	 * Whether to render the material's color. This can be used in conjunction
	 * with a mesh's renderOrder property to create invisible objects that
	 * occlude other objects.
	 */
	@booleanAttribute @receiver colorWrite = true

	// defines
	// depthFunc

	/**
	 * @property {boolean} depthTest -
	 *
	 * `attribute`
	 *
	 * Default: `true`
	 *
	 * Whether to have depth test enabled when rendering this material.
	 */
	@booleanAttribute @receiver depthTest = true

	/**
	 * @property {boolean} depthWrite -
	 *
	 * `attribute`
	 *
	 * Default: `true`
	 *
	 * Whether rendering this material has any effect on the depth buffer.
	 *
	 * When drawing 2D overlays it can be useful to disable the depth writing in
	 * order to layer several things together without creating z-index
	 * artifacts.
	 */
	@booleanAttribute @receiver depthWrite = true

	/**
	 * @property {boolean} dithering -
	 *
	 * `attribute`
	 *
	 * Default: `false`
	 *
	 * Whether to apply dithering to the color to remove the appearance of
	 * banding.
	 */
	@booleanAttribute @receiver dithering = false

	/**
	 * @property {boolean} fog -
	 *
	 * `attribute`
	 *
	 * Default: `true`
	 *
	 * Whether the material is affected by a [scene's fog](../../../core/Scene#fogMode).
	 */
	@booleanAttribute @receiver fog = true

	// TODO wireframe works with -geometry behaviors, but not with obj-model
	// because obj-model doesn't inherit from geometry. We should share common
	// props like wireframe...

	/**
	 * @property {boolean} wireframe -
	 *
	 * `attribute`
	 *
	 * Default: `false`
	 *
	 * Whether to render geometry as wireframe, i.e. outlines of polygons. The
	 * default of `false` renders geometries as smooth shaded.
	 */
	@booleanAttribute @receiver wireframe = false

	/**
	 * @property {'front' | 'back' | 'double'} sidedness -
	 *
	 * `attribute`
	 *
	 * Default: `"front"`
	 *
	 * Whether to render one side or the other, or both sides, of any polygons
	 * in the geometry. If the side that isn't rendered is facing towards the
	 * camera, the polygon will be invisible. Use "both" if you want the
	 * polygons to always be visible no matter which side faces the camera.
	 */
	@stringAttribute @receiver sidedness: 'front' | 'back' | 'double' = 'front'

	/**
	 * @property {number} materialOpacity -
	 *
	 * `attribute`
	 *
	 * Default: `1`
	 *
	 * Opacity of the material only.
	 *
	 * The value should be a number from 0 to 1, inclusive. 0 is fully transparent, and 1
	 * is fully opaque.
	 *
	 * This is in addition to an element's
	 * [`opacity`](../../../core/SharedAPI#opacity), both are multiplied
	 * together. As an example, if this material's element's `opacity` is `0.5`,
	 * and this material's `materialOpacity` is `0.5`, then the overall opacity
	 * of the material will be 0.25 when rendered.
	 *
	 * This modifies the material's opacity without affecting CSS rendering,
	 * whereas modifying an element's `opacity` affects CSS rendering including
	 * the element's children.
	 */
	@numberAttribute @receiver materialOpacity = 1

	#color: string | number = 'white'

	/**
	 * @property {string | number | Color} color -
	 *
	 * Default: `THREE.Color("white")`
	 *
	 * Color of the material.
	 *
	 * The property can be set with a CSS color value string (f.e. `"#ff6600"`
	 * or `rgb(20, 40, 50)`), a
	 * [`THREE.Color`](https://threejs.org/docs/index.html?q=material#api/en/math/Color),
	 * or a number representing the color in hex (f.e. `0xff6600`).
	 *
	 * The property always returns the color normalized to a
	 * [`THREE.Color`](https://threejs.org/docs/index.html?q=material#api/en/math/Color)
	 * object.
	 */
	@stringAttribute @receiver get color(): string | number {
		return this.#color
	}
	@stringAttribute set color(val: string | number | Color) {
		if (typeof val === 'object') this.#color = val.getStyle()
		else this.#color = val
	}

	// TODO use @memo (once implemented in classy-solid) on `get transparent` instead of making this extra prop with createMemo.
	#transparent = createMemo(() => (this.element.opacity < 1 || this.materialOpacity < 1 ? true : false))

	/**
	 * @property {} transparent -
	 *
	 * `reactive`
	 *
	 * Returns `true` when either the element's
	 * [`opacity`](../../../core/SharedAPI#opacity) or this material's
	 * [`materialOpacity`](#materialOpacity) are less than 1.
	 */
	get transparent(): boolean {
		return this.#transparent()
	}

	override connectedCallback() {
		super.connectedCallback()

		this.createEffect(() => {
			const mat = this.meshComponent
			if (!mat) return

			mat.alphaTest = this.alphaTest
			mat.colorWrite = this.colorWrite
			mat.depthTest = this.depthTest
			mat.depthWrite = this.depthWrite
			mat.dithering = this.dithering
			this.element.needsUpdate()
		})

		// TODO Better taxonomy organization, no any types, to avoid the below
		// conditional checks.

		// Only some materials have wireframe.
		this.createEffect(() => {
			const mat = this.meshComponent
			if (!(mat && isWireframeMaterial(mat))) return
			mat.wireframe = this.wireframe
			this.element.needsUpdate()
		})

		this.createEffect(() => {
			const mat = this.meshComponent
			if (!(mat && 'side' in mat)) return

			let side: Side

			switch (this.sidedness) {
				case 'front':
					side = FrontSide
					break
				case 'back':
					side = BackSide
					break
				case 'double':
					side = DoubleSide
					break
			}

			mat.side = side

			this.element.needsUpdate()
		})

		this.createEffect(() => {
			const mat = this.meshComponent
			if (!(mat && isColoredMaterial(mat))) return
			mat.color.set(this.color)
			this.element.needsUpdate()
		})

		this.createEffect(() => {
			const mat = this.meshComponent
			if (!mat) return

			mat.opacity = this.element.opacity * this.materialOpacity
			mat.transparent = this.transparent

			this.element.needsUpdate()
		})

		this.createEffect(() => {
			const mat = this.meshComponent
			if (!mat) return

			this.transparent // dependency (if changed based on opacity)
			mat.needsUpdate = true
		})
	}

	override _createComponent(): Material {
		return new Material()
	}

	static textureCache: {[url: string]: {refcount: number; texture: Texture}} = {}

	_handleTexture(
		textureUrl: () => string,
		setTexture: (mat: NonNullable<this['meshComponent']>, t: Texture | null) => void,
		hasTexture: (mat: NonNullable<this['meshComponent']>) => boolean,
		onLoad?: () => void,
		isColor = false,
	) {
		const texUrl = createMemo(textureUrl)
		const meshComponent = createMemo(() => this.meshComponent)

		this.createEffect(() => {
			const mat = meshComponent()
			if (!mat) return

			const url = texUrl() // this is a dependency of the effect

			if (!url) return

			let info = MaterialBehavior.textureCache[url]

			if (info) {
				info.refcount++

				setTexture(mat, info.texture)
				mat.needsUpdate = true
				this.element.needsUpdate()
				onLoad?.()
				this.element.dispatchEvent(new TextureLoadEvent(url))

				onCleanup(() => {
					info!.refcount--

					if (info!.refcount === 0) {
						info!.texture.dispose()
						delete MaterialBehavior.textureCache[url]
					}

					setTexture(mat, null)
					mat.needsUpdate = true // Three.js needs to update the material in the GPU
					this.element.needsUpdate() // LUME needs to re-render
				})

				return
			}

			// TODO The default material color (if not specified) when
			// there's a texture should be white

			let cleaned = false

			// TODO onProgress and onError
			const texture = new TextureLoader().load(url, () => {
				if (cleaned) return

				// We only need to re-compile the shader when we first
				// enable the texture (from null).
				if (!hasTexture(mat!)) mat.needsUpdate = true

				setTexture(mat!, texture)
				this.element.needsUpdate()
				onLoad?.()
				this.element.dispatchEvent(new TextureLoadEvent(url))
			})

			if (isColor) texture.colorSpace = SRGBColorSpace

			mat.needsUpdate = true // Three.js needs to update the material in the GPU
			this.element.needsUpdate() // LUME needs to re-render

			info = MaterialBehavior.textureCache[url] = {texture, refcount: 1}

			onCleanup(() => {
				cleaned = true

				info.refcount--

				if (info.refcount === 0) {
					info.texture.dispose()
					delete MaterialBehavior.textureCache[url]
				}

				setTexture(mat!, null)
				mat.needsUpdate = true // Three.js needs to update the material in the GPU
				this.element.needsUpdate() // LUME needs to re-render
			})
		})
	}
}

function isColoredMaterial(mat: Material): mat is Material & {color: Color} {
	return 'color' in mat
}

function isWireframeMaterial(mat: Material): mat is Material & {wireframe: boolean} {
	return 'wireframe' in mat
}

/** NOTE: Experimental */
// Once we migrate geometry and material behaviors into elements, they will emit
// 'load' events as needed, and we'll delete this.
class TextureLoadEvent extends Event {
	static type = 'textureload'

	/** The URL of the loaded texture. */
	src = ''

	constructor(src: string) {
		super(TextureLoadEvent.type, {bubbles: false, cancelable: false})

		this.src = src
	}
}
