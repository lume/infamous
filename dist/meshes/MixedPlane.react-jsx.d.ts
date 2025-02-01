import type {MixedPlane, MixedPlaneAttributes} from './MixedPlane'
import type {ReactElementAttributes} from '@lume/element/src/react'

// React users can import this to have appropriate types for the element in their JSX markup.
declare module 'react' {
	namespace JSX {
		interface IntrinsicElements {
			'lume-mixed-plane': ReactElementAttributes<MixedPlane, MixedPlaneAttributes>
		}
	}
}
