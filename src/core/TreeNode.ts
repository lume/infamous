import {Eventful} from '@lume/eventful'
import {Element as LumeElement} from '@lume/element'
import {Effectful} from 'classy-solid'

/**
 * @class TreeNode - The `TreeNode` class represents objects that are connected
 * to each other in parent-child relationships in a tree structure. A parent
 * can have multiple children, and a child can have only one parent.
 * @extends Eventful
 * @extends LumeElement
 */
export class TreeNode extends Effectful(Eventful(LumeElement)) {
	/**
	 * @property {TreeNode | null} parentLumeElement -
	 *
	 * *readonly*
	 *
	 * The LUME-specific parent of the current TreeNode. Each node in a tree can
	 * have only one parent. This is `null` if there is no parent when not
	 * connected into a tree, or if the parentElement while connected into a
	 * tree is not as LUME 3D element.
	 */
	get parentLumeElement(): TreeNode | null {
		if (this.parentElement instanceof TreeNode) return this.parentElement
		return null
	}

	/**
	 * @property {TreeNode[]} lumeChildren -
	 *
	 * *readonly*
	 *
	 * An array of this element's LUME-specific children. This returns a new
	 * static array each time, so and modifying this array directly does not
	 * effect the state of the TreeNode. Use [TreeNode.append(child)](#append)
	 * and [TreeNode.removeChild(child)](#removechild) to modify a TreeNode's
	 * actual children.
	 */
	get lumeChildren(): TreeNode[] {
		return Array.prototype.filter.call(this.children, c => c instanceof TreeNode) as TreeNode[]
	}

	/**
	 * @property {number} lumeChildCount -
	 *
	 * *readonly*
	 *
	 * The number of children this TreeNode has.
	 */
	get lumeChildCount(): number {
		return this.lumeChildren.length
	}

	override disconnectedCallback() {
		super.disconnectedCallback()
		this.stopEffects()
	}

	/** @deprecated Use `addEventListener()` instead. */
	override on(eventName: string, callback: Function, context?: any) {
		super.on(eventName, callback, context)
	}

	/** @deprecated Use `dispatchEvent()` instead. */
	override emit(eventName: string, data?: any) {
		super.emit(eventName, data)
	}
}
