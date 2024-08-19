import type {CubeLayout, CubeLayoutAttributes} from './CubeLayout'
import type {ReactElementAttributes} from '@lume/element/src/react'

// React users can import this to have appropriate types for the element in their JSX markup.
declare module 'react' {
	namespace JSX {
		interface IntrinsicElements {
			'lume-cube-layout': ReactElementAttributes<CubeLayout, CubeLayoutAttributes>
		}
	}
}
