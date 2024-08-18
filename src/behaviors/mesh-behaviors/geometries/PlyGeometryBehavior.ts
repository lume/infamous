import {signal} from 'classy-solid'
import 'element-behaviors'
import {stringAttribute} from '@lume/element'
import {behavior} from '../../Behavior.js'
import {receiver} from '../../PropReceiver.js'
import {PLYLoader} from 'three/examples/jsm/loaders/PLYLoader.js'
import {BufferGeometry} from 'three/src/core/BufferGeometry.js'
import {Events} from '../../../core/Events.js'
import {GeometryBehavior} from './GeometryBehavior.js'
import {onCleanup} from 'solid-js'
import {LoadEvent} from '../../../models/LoadEvent.js'

/**
 * @class PlyGeometryBehavior -
 *
 * Behavior: `ply-geometry`
 *
 * This is useful for rendering a set of points from a `.ply` file.
 *
 * Given a `src` attribute that points to a `.ply` file, the behavior will load
 * a set of points from the file to use as geometry.
 *
 * It can be useful to use this behavior on a
 * [`<lume-points>`](../../../meshes/Points) element, which has a
 * [`points-material`](../materials/PointsMaterialBehavior) behavior for
 * configuring how points are rendered.
 *
 * @extends GeometryBehavior
 */
export
@behavior
class PlyGeometryBehavior extends GeometryBehavior {
	/**
	 * @property {string} src
	 *
	 * `string` `attribute`
	 *
	 * Default: `''`
	 *
	 * Path to a `.ply` file to load points from.
	 */
	@stringAttribute @receiver src = ''

	loader = new PLYLoader()
	@signal model: BufferGeometry | null = null

	override _createComponent() {
		// An empty geometry to start with. It will be replaced once the PLY file is loaded.
		if (!this.model) return new BufferGeometry()
		return this.model
	}

	// This is incremented any time we need to cancel a pending load() (f.e. on
	// src change, or on disconnect), so that the loader will ignore the
	// result when a version change has happened.
	#version = 0

	override connectedCallback() {
		super.connectedCallback()

		this.createEffect(() => {
			this.src

			this.#loadModel()

			onCleanup(() => {
				this.model?.dispose()
				// Note that dispose is already called in the super.resetMeshComponent process.
				this.model = null
				// Increment this in case the loader is still loading, so it will ignore the result.
				this.#version++
			})
		})
	}

	#loadModel() {
		const {src} = this
		const version = this.#version

		if (!src) return

		// In the following fbxLoader.load() callbacks, if #version doesn't
		// match, it means this.src or this.dracoDecoder changed while
		// a previous model was loading, in which case we ignore that
		// result and wait for the next model to load.

		this.loader!.load(
			src,
			model => version === this.#version && this.#setModel(model),
			progress => version === this.#version && this.element.emit(Events.PROGRESS, progress),
			error => version === this.#version && this.#onError(error),
		)
	}

	#onError(error: unknown) {
		const message = `Failed to load ${this.element.tagName.toLowerCase()} with src "${
			this.src
		}". See the following error.`
		console.warn(message)
		const err = error instanceof ErrorEvent && error.error ? error.error : error
		console.error(err)
		this.element.emit(Events.MODEL_ERROR, err)
	}

	#setModel(model: BufferGeometry) {
		model.computeVertexNormals()
		this.model = model // triggers the resetMeshComponent effect
		this.element.emit(Events.MODEL_LOAD, {format: 'ply', model})

		// TODO we fire a load event here, but there is no Model
		// element for this behavior. Make a <lume-ply-model> element.
		this.element.dispatchEvent(new LoadEvent())
	}
}

if (globalThis.window?.document && !elementBehaviors.has('ply-geometry'))
	elementBehaviors.define('ply-geometry', PlyGeometryBehavior)
