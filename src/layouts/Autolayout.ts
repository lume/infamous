/**
 * This Source Code is licensed under the MIT license. If a copy of the
 * MIT-license was not distributed with this file, You can obtain one at:
 * http://opensource.org/licenses/mit-license.html.
 *
 * @author: Hein Rutjes (IjzerenHein) and Joe Pea (trusktr)
 * @license MIT
 * @copyright Gloey Apps, 2015
 * @copyright Joe Pea, 2018
 */

// TODO:
// - Use MutationObserver to watch for className changes and update laid-out nodes.
// - Perhaps once we get to the ShadowDOM stuff we can use slots instead. It'll
// be more powerful, letting us distribute any number of nodes into each layout
// slot. Also it eliminated edge cases that we'll have to handle with the
// className approach.
// - Make an <lume-visual-format> element that can contain visual format code to
// re-use in multiple layouts.
// - Allow visual-format to be fetch by path (like img src attribute).

import AutoLayout from '@lume/autolayout'
import {attribute, element, type ElementAttributes} from '@lume/element'
import {Element3D, type Element3DAttributes} from '../core/Element3D.js'
import {Motor} from '../core/Motor.js'
import {autoDefineElements} from '../LumeConfig.js'

import type {XYZPartialValuesArray} from '../xyz-values/XYZValues.js'

export {AutoLayout}

type Viewport = {
	width: any
	'min-width': any
	'max-width': any
	height: any
	'min-height': any
	'max-height': any
	'aspect-ratio': number
}

export type AutolayoutAttributes = Element3DAttributes | 'visualFormat'

/**
 * An Element3D that lays children out based on an Apple AutoLayout VFL layout
 * description.
 */
export
@element('lume-autolayout', autoDefineElements)
class Autolayout extends Element3D {
	static DEFAULT_PARSE_OPTIONS = {
		extended: true,
		strict: false,
	}

	@attribute visualFormat: string | null = ''

	/**
	 * Constructor
	 *
	 * @param {Object} [options] options to set.
	 * @param {String|Array} [options.visualFormat] String or array of strings containing VFL.
	 * @param {Object} [options.layoutOptions] Options such as viewport, spacing, etc... TODO make this a reactive property.
	 * @return {Autolayout} this
	 */
	constructor(options: any) {
		super()

		// PORTED {
		this.addEventListener('sizechange', this.#layout)
		this.addEventListener('reflow', this.#layout)
		// }

		// TODO use Settable.set instead.
		if (options) {
			if (options.visualFormat) {
				this.setVisualFormat(options.visualFormat)
			}
			if (options.layoutOptions) {
				this.setLayoutOptions(options.layoutOptions)
			}
		}
	}

	override connectedCallback() {
		super.connectedCallback()

		this.createEffect(() => {
			this.setVisualFormat(this.visualFormat || '')
		})
	}

	#autoLayoutView?: any | undefined

	override childConnectedCallback(child: Element3D) {
		// @prod-prune
		if (!(child instanceof Element3D))
			throw new Error('Child elements of Autolayout must be instances of LUME.Element3D.')

		super.childConnectedCallback(child)

		if (!this.#autoLayoutView) return
		this.#checkNodes()
	}

	override childDisconnectedCallback(child: Element3D) {
		// @prod-prune
		if (!(child instanceof Element3D))
			throw new Error('Child elements of Autolayout must be instances of LUME.Element3D.')

		super.childDisconnectedCallback(child)

		if (!this.#autoLayoutView) return
		const _idToNode = this.#idToNode
		for (const id in _idToNode) {
			if (_idToNode[id] === child) {
				delete _idToNode[id]
				break
			}
		}
		this.#checkNodes()
	}

	#reflowEvent = new Event('reflow')

	/**
	 * Forces a reflow of the layout.
	 *
	 * @return {Autolayout} this
	 */
	reflowLayout() {
		if (!this.#reflowLayout) {
			this.#reflowLayout = true
			Motor.once(() => (this.emit('reflow'), this.dispatchEvent(this.#reflowEvent))) // PORTED
		}
		return this
	}

	/**
	 * Sets the visual-format string.
	 *
	 * @param {String|Array} visualFormat String or array of strings containing VFL.
	 * @param {Object} [parseOptions] Specify to override the parse options for the VFL.
	 * @return {Autolayout} this
	 */
	setVisualFormat(visualFormat: string, parseOptions?: any) {
		// @ts-ignore: TODO, _visualFormat is not used anywhere, but it works???
		this._visualFormat = visualFormat
		var constraints = AutoLayout.VisualFormat.parse(visualFormat, parseOptions || Autolayout.DEFAULT_PARSE_OPTIONS)
		this.#metaInfo = AutoLayout.VisualFormat.parseMetaInfo(visualFormat)
		this.#autoLayoutView = new AutoLayout.View({
			constraints: constraints,
		})
		this.#checkNodes()
		this.reflowLayout()
		return this
	}

	/**
	 * Sets the options such as viewport, spacing, etc...
	 *
	 * @param {Object} options Layout-options to set.
	 * @return {Autolayout} this
	 */
	setLayoutOptions(options: any) {
		this.#layoutOptions = options || {}
		this.reflowLayout()
		return this
	}

	/**
	 * Adds a new child to this node. If this method is called with no argument it will
	 * create a new node, however it can also be called with an existing node which it will
	 * append to the node that this method is being called on. Returns the new or passed in node.
	 *
	 * @param {Element3D|void} child The node to appended or no node to create a new node.
	 * @param {String} id Unique id of the node which matches the id used in the Visual format.
	 * @return {Element3D} the appended node.
	 */
	addToLayout(child: Element3D, id: string) {
		// PORTED
		this.append(child) // PORTED
		// TODO instead of handling nodes here, we should handle them in
		// childComposedCallback, to support ShadowDOM.
		if (id) this.#idToNode[id] = child
		this.reflowLayout()
		return child
	}

	/**
	 * Removes a child node from another node. The passed in node must be
	 * a child of the node that this method is called upon.
	 *
	 * @param {Element3D} [child] node to be removed
	 * @param {String} [id] Unique id of the node which matches the id used in the Visual format.
	 */
	removeFromLayout(child: Element3D, id: string) {
		// PORTED
		if (child && id) {
			this.removeChild(child) // PORTED
			delete this.#idToNode[id]
		} else if (child) {
			for (id in this.#idToNode) {
				if (this.#idToNode[id] === child) {
					delete this.#idToNode[id]
					break
				}
			}
			this.removeChild(child) // PORTED
		} else if (id) {
			this.removeChild(this.#idToNode[id]) // PORTED
			delete this.#idToNode[id]
		}
		this.reflowLayout()
	}

	#layoutOptions: any = {}
	#idToNode: any = {}
	#reflowLayout = false
	#metaInfo?: any

	#setIntrinsicWidths(widths: any) {
		for (var key in widths) {
			var subView = this.#autoLayoutView.subViews[key]
			var node = this.#idToNode[key]
			if (subView && node) {
				subView.intrinsicWidth = node.calculatedSize.x // PORTED
			}
		}
	}

	#setIntrinsicHeights(heights: any) {
		for (var key in heights) {
			var subView = this.#autoLayoutView.subViews[key]
			var node = this.#idToNode[key]
			if (subView && node) {
				subView.intrinsicHeight = node.calculatedSize.y // PORTED
			}
		}
	}

	#setViewPortSize(size: XYZPartialValuesArray<number>, vp: Viewport) {
		size = [
			vp.width !== undefined && vp.width !== true
				? vp.width
				: Math.max(Math.min(size[0], vp['max-width'] || size[0]), vp['min-width'] || 0),
			vp.height !== undefined && vp.height !== true
				? vp.height
				: Math.max(Math.min(size[1]! /*TODO no !*/, vp['max-height'] || size[1]), vp['min-height'] || 0),
		]
		if (vp.width === true && vp.height === true) {
			size[0] = this.#autoLayoutView.fittingWidth
			size[1] = this.#autoLayoutView.fittingHeight
		} else if (vp.width === true) {
			this.#autoLayoutView.setSize(undefined, size[1])
			size[0] = this.#autoLayoutView.fittingWidth
			// TODO ASPECT RATIO?
		} else if (vp.height === true) {
			this.#autoLayoutView.setSize(size[0], undefined)
			size[1] = this.#autoLayoutView.fittingHeight
			// TODO ASPECT RATIO?
		} else {
			size = vp['aspect-ratio']
				? [Math.min(size[0], size[1] * vp['aspect-ratio']), Math.min(size[1], size[0] / vp['aspect-ratio'])]
				: size
			this.#autoLayoutView.setSize(size[0], size[1])
		}
		return size
	}

	#layout = () => {
		if (!this.#autoLayoutView) {
			return
		}
		var x
		var y
		var size = this.size.toArray()
		if (this.#layoutOptions.spacing || this.#metaInfo.spacing) {
			this.#autoLayoutView.setSpacing(this.#layoutOptions.spacing || this.#metaInfo.spacing)
		}
		var widths = this.#layoutOptions.widths || this.#metaInfo.widths
		if (widths) {
			this.#setIntrinsicWidths(widths)
		}
		var heights = this.#layoutOptions.heights || this.#metaInfo.heights
		if (heights) {
			this.#setIntrinsicHeights(heights)
		}
		if (this.#layoutOptions.viewport || this.#metaInfo.viewport) {
			var restrainedSize = this.#setViewPortSize(size, this.#layoutOptions.viewport || this.#metaInfo.viewport)
			x = (size[0] - restrainedSize[0]) / 2
			y = (size[1] - restrainedSize[1]) / 2
		} else {
			this.#autoLayoutView.setSize(size[0], size[1])
			x = 0
			y = 0
		}
		for (var key in this.#autoLayoutView.subViews) {
			var subView = this.#autoLayoutView.subViews[key]
			if (key.indexOf('_') !== 0 && subView.type !== 'stack') {
				var node = this.#idToNode[key]
				if (node) {
					this.#updateNode(node, subView, x, y, widths, heights)
				}
			}
		}
		if (this.#reflowLayout) {
			this.#reflowLayout = false
		}
	}

	#updateNode(node: Element3D, subView: any, x: number, y: number, widths: any, heights: any) {
		// NOTE The following sizeMode, size, and position functions are no-ops,
		// they only perform type casting for use in TypeScript code. Without
		// them there will be type errors.

		node.sizeMode = [
			// PORTED
			// @ts-ignore: TODO, key is not defined from anywhere, but it was working???
			widths && widths[key] === true ? 'proportional' : 'literal',
			// @ts-ignore: TODO, key is not defined from anywhere, but it was working???
			heights && heights[key] === true ? 'proportional' : 'literal',
		]
		node.size = [
			// PORTED
			// @ts-ignore: TODO, key is not defined from anywhere, but it was working???
			widths && widths[key] === true ? 1 : subView.width,
			// @ts-ignore: TODO, key is not defined from anywhere, but it was working???
			heights && heights[key] === true ? 1 : subView.height,
		]
		node.position = [
			// PORTED
			x + subView.left,
			y + subView.top,
			subView.zIndex * 5,
		]
	}

	#checkNodes() {
		const subViews = this.#autoLayoutView.subViews
		const subViewKeys = Object.keys(subViews)
		const _idToNode = this.#idToNode

		// If a node is not found for a subview key, see if exists in this's DOM children by className
		// XXX Should we use a `data-*` attribute instead of a class name?
		for (var key of subViewKeys) {
			var subView = subViews[key]
			if (key.indexOf('_') !== 0 && subView.type !== 'stack') {
				var node = _idToNode[key]
				if (!node) {
					node = this.querySelector('.' + key)
					if (node && node.parentElement === this) _idToNode[key] = node
				}
			}
		}

		this.#showOrHideNodes()
	}

	#showOrHideNodes() {
		const subViews = this.#autoLayoutView.subViews
		const subViewKeys = Object.keys(subViews)
		const _idToNode = this.#idToNode
		const nodeIds = Object.keys(_idToNode)

		// hide the child nodes that are should not be visible for the current subview.
		for (const id of nodeIds) {
			if (subViewKeys.includes(id)) _idToNode[id].visible = true
			else _idToNode[id].visible = false
		}
	}
}

declare module 'solid-js' {
	namespace JSX {
		interface IntrinsicElements {
			'lume-autolayout': ElementAttributes<Autolayout, AutolayoutAttributes>
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'lume-autolayout': Autolayout
	}
}
