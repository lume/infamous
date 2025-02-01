import {numberAttribute, element, stringAttribute, type ElementAttributes} from '@lume/element'
import {SpotLight as ThreeSpotLight} from 'three/src/lights/SpotLight.js'
import {SpotLightHelper} from 'three/src/helpers/SpotLightHelper.js'
import {CameraHelper} from 'three/src/helpers/CameraHelper.js'
import {Object3D} from 'three/src/core/Object3D.js'
import {createEffect, onCleanup} from 'solid-js'
import {PointLight, type PointLightAttributes} from './PointLight.js'
import {autoDefineElements} from '../LumeConfig.js'
import {Element3D, toRadians} from '../core/index.js'
import {upwardRoots} from '../utils/upwardRoots.js'

export type SpotLightAttributes = PointLightAttributes

/**
 * @element lume-spot-light
 * @class SpotLight -
 *
 * Element: `<lume-spot-light>`
 *
 * This emits light from a single point in one direction along a cone shape that increases in size the further the light goes.
 *
 * This creates light that frays outward as it travels in a particular
 * direction, just like a real-life spot light, unlike a point light that emits
 * light in all directions.
 *
 * ## Example
 *
 * <live-code src="../../examples/spotlight.html"></live-code>
 *
 * @extends PointLight
 */
export
@element('lume-spot-light', autoDefineElements)
class SpotLight extends PointLight {
	/**
	 * @property {number} angle -
	 *
	 * `attribute`
	 *
	 * Default: `60`
	 *
	 * The angle of the cone shape in which light propagates. Should be no more
	 * than 90. This value affects the fov of the light's shadow camera
	 */
	@numberAttribute angle = 60

	/**
	 * @property {number} penumbra -
	 *
	 * `attribute`
	 *
	 * Default: `1`
	 *
	 * The value should be between 0 and 1.
	 *
	 * The percent of the spotlight cone that is attenuated due to a
	 * [penumbra](https://en.wikipedia.org/wiki/Umbra,_penumbra_and_antumbra#Penumbra).
	 * To give the edge of the spotlight's oval a soft fadein from the edge of
	 * the oval, increase this from 0. 1 means that the light fades in from the
	 * oval edge all the way to the center, 0.5 means the light is faded in at
	 * half way to the center, and 0 means that there is no fade in which gives
	 * the oval a sharp/crisp outline.
	 */
	@numberAttribute penumbra = 1

	// TODO color map, like an old-school projector. We need to further abstract
	// _handleTexture from the behaviors (f.e. make it a mixin so we can pull it
	// in here, or make a new material behavior just for this light).
	// @stringAttribute colorMap = ""

	#target: Array<Element3D> = []
	#rawTarget: string | Element3D | null | Array<Element3D | string> = ''
	#observer: MutationObserver | null = null

	// TODO Consolidate "selector ref" functionality in SpotLight,
	// ClipPlanesBehavior, ProjectedMaterialBehavior, etc
	// (https://github.com/lume/lume/issues/300).
	@stringAttribute get target(): Element3D | null {
		return this.#target[0] ?? null
	}
	@stringAttribute set target(value: string | Element3D | null | Array<Element3D | string>) {
		this.#rawTarget = value

		let array: Array<Element3D | string> = []

		if (typeof value === 'string') {
			array.push(value.trim())
		} else if (Array.isArray(value)) {
			array = value
		} else if (typeof value === 'object') {
			if (value) array.push(value)
		} else {
			throw new TypeError('Invalid value for target')
		}

		this.#target = []

		for (const v of array) {
			if (typeof v !== 'string') {
				// TODO #279: This setter is non-reactive to v.scene, so it will
				// not update if the element becomes composed into a Lume scene.
				if (v instanceof Element3D && v.scene) this.#target.push(v)
				continue
			} else if (!v) {
				// skip empty strings, they cause an error with querySelectorAll
				continue
			}

			let root = this.getRootNode() as Document | ShadowRoot | null

			// TODO Should we not search up the composed tree, and stay only
			// in the current ShadowRoot?

			while (root) {
				const els = root.querySelectorAll(v)

				for (let i = 0, l = els.length; i < l; i += 1) {
					const el = els.item(i) as Element | null

					if (!el) continue

					// Find only planes participating in rendering (i.e. in the
					// composed tree, noting that .scene is null when not
					// composed)
					// TODO #279: This setter is non-reactive to el.scene, so it will
					// not update if the element becomes composed into a Lume scene.
					if (el instanceof Element3D && el.scene) this.#target.push(el)

					// TODO check the target is in the same scene
					// TODO We aren't observing el.scene, so if the element
					// becomes a particpant in the scene later nothing will
					// happen.
					// TODO If an element was not yet upgraded, it will not
					// be found here. We need to wait for upgrade.
					// TODO We need to also react to added/removed elements.
				}

				root = root instanceof ShadowRoot ? (root.host.getRootNode() as Document | ShadowRoot) : null
			}
		}
	}

	override updateWorldMatrices(traverse = true) {
		super.updateWorldMatrices(traverse)

		this.#helper?.update()
		this.#camHelper?.update()
	}

	#helper: SpotLightHelper | null = null
	#camHelper: CameraHelper | null = null

	override connectedCallback() {
		super.connectedCallback()

		this.createEffect(() => {
			if (!(this.scene && this.debug)) return

			const scene = this.scene

			this.#helper = new SpotLightHelper(this.three)
			scene.three.add(this.#helper)

			this.#camHelper = new CameraHelper(this.three.shadow.camera)
			scene.three.add(this.#camHelper)

			this.needsUpdate()

			onCleanup(() => {
				this.#helper!.dispose()
				scene.three.remove(this.#helper!)
				this.#helper = null

				this.#camHelper!.dispose()
				scene.three.remove(this.#camHelper!)
				this.#camHelper = null
			})
		})

		this.createEffect(() => {
			const light = this.three

			light.angle = toRadians(this.angle)
			light.penumbra = this.penumbra

			this.#helper?.update()

			this.needsUpdate()
		})

		// TODO consolidate selector observation with the one in ClipPlanes
		this.createEffect(() => {
			if (!this.scene) return

			// Trigger the setter again in case it returned early if there was
			// no scene. Depending on code load order, el.scene inside of set
			// clipPlanes might be null despite that it is a valid Lume element.
			// TODO #279: Instead of this hack, move away
			// from getters/setters, make all logic fully reactive to avoid
			// worrying about code execution order. https://github.com/lume/lume/issues/279
			this.target = this.#rawTarget

			this.#observer = new MutationObserver(() => {
				// TODO this could be more efficient if we check the added nodes directly, but for now we re-run the query logic.
				// This triggers the setter logic.
				this.target = this.#rawTarget
			})

			// TODO This queries in upward roots only. I think we want to also branch downward into sibling roots.
			for (const root of upwardRoots(this)) this.#observer.observe(root, {childList: true, subtree: true})

			createEffect(() => {
				const target = this.target

				if (target) this.three.target = target.three
				else this.three.target = new Object3D() // point at world origin

				this.needsUpdate()
			})

			onCleanup(() => {
				this.#observer?.disconnect()
				this.#observer = null
			})
		})
	}

	// @ts-expect-error FIXME probably better for spotlight not to extend from pointlight, make a common shared class if needed.
	override makeThreeObject3d() {
		return new ThreeSpotLight()
	}
}

declare module 'solid-js' {
	namespace JSX {
		interface IntrinsicElements {
			'lume-spot-light': ElementAttributes<SpotLight, SpotLightAttributes>
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'lume-spot-light': SpotLight
	}
}
