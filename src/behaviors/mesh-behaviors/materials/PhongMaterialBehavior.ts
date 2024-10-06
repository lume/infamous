import 'element-behaviors'
import {Color} from 'three/src/math/Color.js'
import {MeshPhongMaterial} from 'three/src/materials/MeshPhongMaterial.js'
import {numberAttribute, stringAttribute, booleanAttribute} from '@lume/element'
import {behavior} from '../../Behavior.js'
import {receiver} from '../../PropReceiver.js'
import {MaterialBehavior, type MaterialBehaviorAttributes} from './MaterialBehavior.js'

export type PhongMaterialBehaviorAttributes =
	| MaterialBehaviorAttributes
	| 'alphaMap'
	| 'aoMap'
	| 'aoMapIntensity'
	| 'bumpMap'
	| 'bumpScale'
	| 'displacementMap'
	| 'emissiveMap'
	| 'emissive'
	| 'emissiveIntensity'
	| 'envMap'
	| 'flatShading'
	| 'lightMap'
	| 'lightMapIntensity'
	| 'texture' // map
	| 'normalMap'
	| 'normalScale'
	| 'reflectivity'
	| 'specularMap'
	| 'specular'
	| 'shininess'

/**
 * @class PhongMaterialBehavior -
 *
 * A cheaper type of material with less realism, based on older principles,
 * [named after computer graphics pioneer Bui Tuong
 * Phong](https://en.wikipedia.org/wiki/Phong_shading), not as realistic as
 * [`StandardMaterialBehavior`](./StandardMaterialBehavior) or
 * [`PhysicalMaterialBehavior`](./PhysicalMaterialBehavior) can be with their
 * "physically-based rendering (PBR)" algorithms.
 *
 * Backed by Three.js [`THREE.MeshPhongMaterial`](https://threejs.org/docs/index.html#api/en/materials/MeshPhongMaterial).
 *
 * @extends MaterialBehavior
 */
export
@behavior
class PhongMaterialBehavior extends MaterialBehavior {
	@stringAttribute @receiver alphaMap = ''
	@stringAttribute @receiver aoMap = ''
	@numberAttribute @receiver aoMapIntensity = 1
	@stringAttribute @receiver bumpMap = ''
	@numberAttribute @receiver bumpScale = 1
	// combine
	@stringAttribute @receiver displacementMap = ''
	@numberAttribute @receiver displacementScale = 1
	@numberAttribute @receiver displacementBias = 0
	@stringAttribute @receiver emissiveMap = ''

	// TODO this is not DRY, similar to the .color and .specular properties, consolidate.
	@stringAttribute @receiver get emissive(): string | number {
		return this.#emissive
	}
	@stringAttribute set emissive(val: string | number | Color) {
		if (typeof val === 'object') this.#emissive = val.getStyle()
		else this.#emissive = val
	}
	#emissive: string | number = 'black'

	@numberAttribute @receiver emissiveIntensity = 1
	@stringAttribute @receiver envMap = ''
	@booleanAttribute @receiver flatShading = false
	@stringAttribute @receiver lightMap = ''
	@numberAttribute @receiver lightMapIntensity = 1
	@stringAttribute @receiver texture = '' // map
	@stringAttribute @receiver normalMap = ''
	// normalMapType
	@numberAttribute @receiver normalScale = 1
	@numberAttribute @receiver reflectivity = 1
	@stringAttribute @receiver specularMap = ''

	@stringAttribute @receiver get specular(): string | number {
		return this.#specular
	}
	@stringAttribute set specular(val: string | number | Color) {
		if (typeof val === 'object') this.#specular = val.getStyle()
		else this.#specular = val
	}
	#specular: string | number = '#111'

	@numberAttribute @receiver shininess = 30

	override _createComponent() {
		return new MeshPhongMaterial({
			color: 0x00ff00,
		})
	}

	override connectedCallback() {
		super.connectedCallback()

		this.createEffect(() => {
			const mat = this.meshComponent
			if (!mat) return

			mat.aoMapIntensity = this.aoMapIntensity
			mat.bumpScale = this.bumpScale
			mat.displacementScale = this.displacementScale
			mat.displacementBias = this.displacementBias
			mat.emissiveIntensity = this.emissiveIntensity
			mat.flatShading = this.flatShading
			mat.lightMapIntensity = this.lightMapIntensity
			mat.normalScale.set(this.normalScale, this.normalScale)
			mat.reflectivity = this.reflectivity
			mat.shininess = this.shininess

			// TODO Needed?
			// mat.needsUpdate = true

			this.element.needsUpdate()
		})

		this.createEffect(() => {
			this.meshComponent?.emissive.set(this.emissive)
			this.element.needsUpdate()
		})

		this.createEffect(() => {
			this.meshComponent?.specular.set(this.specular)
			this.element.needsUpdate()
		})

		this._handleTexture(
			() => this.alphaMap,
			(mat, tex) => (mat.alphaMap = tex),
			mat => !!mat.alphaMap,
		)
		this._handleTexture(
			() => this.aoMap,
			(mat, tex) => (mat.aoMap = tex),
			mat => !!mat.aoMap,
		)
		this._handleTexture(
			() => this.bumpMap,
			(mat, tex) => (mat.bumpMap = tex),
			mat => !!mat.bumpMap,
		)
		this._handleTexture(
			() => this.displacementMap,
			(mat, tex) => (mat.displacementMap = tex),
			mat => !!mat.displacementMap,
		)
		this._handleTexture(
			() => this.emissiveMap,
			(mat, tex) => (mat.emissiveMap = tex),
			mat => !!mat.emissiveMap,
			() => {},
			true,
		)
		this._handleTexture(
			() => this.envMap,
			(mat, tex) => (mat.envMap = tex),
			mat => !!mat.envMap,
		)
		this._handleTexture(
			() => this.lightMap,
			(mat, tex) => (mat.lightMap = tex),
			mat => !!mat.lightMap,
		)
		this._handleTexture(
			() => this.texture, // map
			(mat, tex) => (mat.map = tex),
			mat => !!mat.map,
			() => {},
			true,
		)
		this._handleTexture(
			() => this.normalMap,
			(mat, tex) => (mat.normalMap = tex),
			mat => !!mat.normalMap,
		)
		this._handleTexture(
			() => this.specularMap,
			(mat, tex) => (mat.specularMap = tex),
			mat => !!mat.specularMap,
			() => {},
			true,
		)
	}
}

if (globalThis.window?.document && !elementBehaviors.has('phong-material'))
	elementBehaviors.define('phong-material', PhongMaterialBehavior)
