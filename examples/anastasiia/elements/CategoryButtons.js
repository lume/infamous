{
	const {Node, element, html, createEffect, untrack} = LUME

	element('av-category-buttons')(
		class CategoryButtons extends Node {
			hasShadow = true

			#categoriesInner

			async categoriesLayout() {
				const {default: yoga} = await import('https://jspm.dev/yoga-layout')
				const {Node: YogaNode} = yoga

				const yogaRoot = YogaNode.create()
				yogaRoot.setJustifyContent(yoga.JUSTIFY_SPACE_EVENLY)
				yogaRoot.setAlignItems(yoga.ALIGN_CENTER)
				yogaRoot.setFlexDirection(yoga.FLEX_DIRECTION_ROW)

				const children = Array.from(this.#categoriesInner.children)

				const yogaNodes = []

				let i = 0
				for (const child of children) {
					const yogaNode = YogaNode.create()

					yogaNodes.push(yogaNode)
					yogaRoot.insertChild(yogaNode, i)

					i++
				}

				createEffect(() => {
					const parentSize = this.#categoriesInner.calculatedSize

					yogaRoot.setWidth(parentSize.x)
					yogaRoot.setHeight(parentSize.y)

					let i = 0
					for (const child of children) {
						const {x, y} = child.calculatedSize

						const node = yogaNodes[i]
						node.setWidth(x)
						node.setHeight(y)

						i++
					}

					yogaRoot.calculateLayout(parentSize.x, parentSize.y, yoga.DIRECTION_LTR)

					i = 0
					for (const child of children) {
						const yogaNode = yogaNodes[i]
						yogaNode.calculateLayout()
						const {left, top, width, height} = yogaNode.getComputedLayout()

						untrack(() => child.position).set(left, top)
						// untrack(() => child.position).set(top, left)
						// child.size.set(width, height)

						i++
					}
				})
			}

			connectedCallback() {
				super.connectedCallback()
				this.categoriesLayout()
			}

			#onClickCategory = e => {
				e.preventDefault()
				this.dispatchEvent(new CategoryChange(e.target.href.split('#')[1]))
			}

			template = () => html`
				<link rel="stylesheet" href="./global.css" />

				${/*<!-- layout is calculated in JS -->*/ ''}
				<lume-element3d ref=${e => (this.#categoriesInner = e)} id="categoriesInner" size-mode="p p" size="1 1">
					<lume-element3d class="centerContent" size="200 100">
						<a href="#experiential" onclick=${this.#onClickCategory}>Experiential</a>
					</lume-element3d>
					<lume-element3d class="centerContent" size="200 100">
						<a href="#industrial" onclick=${this.#onClickCategory}>Industrial</a>
					</lume-element3d>
					<lume-element3d class="centerContent" size="200 100">
						<a href="#visual" onclick=${this.#onClickCategory}>Visual / Digital</a>
					</lume-element3d>
				</lume-element3d>
			`

			css = /*css*/ `
				a {
					padding-left: 4px;
					padding-right: 4px;

					text-transform: uppercase;
					text-decoration: none;

					font-family: 'Open Sans', sans-serif;
					font-weight: 600;
					font-size: calc(20px * var(--scale));
				}

				a:last-child {
				}

				a.active,
				a:hover,
				a:focus,
				a:active {
					outline: none;
					font-family: 'Austin-Semibold', serif;
					font-size: calc(22px * var(--scale));
					text-decoration: underline;
					text-decoration-color: var(--purple);
					text-underline-offset: calc(9px * var(--scale));
					text-decoration-thickness: calc(4px * var(--scale));
				}

				.heading {
					display: flex !important;
					align-items: center;
					color: var(--purple);
					font-size: calc(30px * var(--scale));
					font-family: 'Austin-MediumItalic', serif;
					text-transform: uppercase;
				}
				.heading span:first-child {
					font-family: 'Austin-LightItalic', serif;
					font-weight: 100;
				}

				#categoriesInner {
					/* display: flex !important;
							flex-direction: row;
							justify-content: space-evenly;
							align-items: center; */
				}

				#categoriesInner > * {
					/* width: 300px;
							height: 100px; */
				}
			`
		},
	)

	class CategoryChange extends CustomEvent {
		constructor(/** @type {string} */ category) {
			super('categorychange', {bubbles: true, composed: true, detail: category})
		}
	}
}
