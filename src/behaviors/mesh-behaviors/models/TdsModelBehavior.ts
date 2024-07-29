import 'element-behaviors'
import {stringAttribute} from '@lume/element'
import {onCleanup} from 'solid-js'
import {TDSLoader} from 'three/examples/jsm/loaders/TDSLoader.js'
import type {Group} from 'three/src/objects/Group.js'
import {disposeObjectTree} from '../../../utils/three.js'
import {behavior} from '../../Behavior.js'
import {receiver} from '../../PropReceiver.js'
import {Events} from '../../../core/Events.js'
import {RenderableBehavior} from '../../RenderableBehavior.js'
import {ModelLoadEvent, type Model} from '../../../models/Model.js'

export type TdsModelBehaviorAttributes = 'src'

export
@behavior
class TdsModelBehavior extends RenderableBehavior {
	/** Path to a .3ds file. */
	@stringAttribute @receiver src = ''

	loader = new TDSLoader()
	model?: Group

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
				if (this.model) disposeObjectTree(this.model)
				this.model = undefined
				// Increment this in case the loader is still loading, so it will ignore the result.
				this.#version++
			})
		})
	}

	#loadModel() {
		const {src} = this
		const version = this.#version

		if (!src) return

		// In the following loader.load() callbacks, if __version doesn't
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

	#setModel(model: Group) {
		this.model = model
		this.element.three.add(model)
		this.element.emit(Events.MODEL_LOAD, {format: '3ds', model})
		// Cast so the type check passes. Non-TypeScript users can listen to
		// this event on any non-Model element anyway, while TS users will be
		// using Model elements for type safety.
		;(this.element as Model).dispatchEvent(new ModelLoadEvent('3ds', model))
		this.element.needsUpdate()
	}
}

if (globalThis.window?.document && !elementBehaviors.has('3ds-model'))
	elementBehaviors.define('3ds-model', TdsModelBehavior)
