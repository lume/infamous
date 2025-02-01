import {Effectful} from 'classy-solid'
import {Behavior} from './Behavior.js'
import {Element3D} from '../core/Element3D.js'

/**
 * @class RenderableBehavior
 * Base class for element behaviors that provide rendering features (f.e. geometries, materials, etc).
 *
 * @extends Behavior
 */
export abstract class RenderableBehavior extends Effectful(Behavior) {
	declare element: Element3D

	override requiredElementType() {
		return [Element3D]
	}

	override connectedCallback() {
		super.connectedCallback()

		this.element.needsUpdate()
	}

	override disconnectedCallback() {
		super.disconnectedCallback()

		this.element.needsUpdate()
	}
}
