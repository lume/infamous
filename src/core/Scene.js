// TODO: write a test that imports public interfaces in every possible
// permutation to detect circular dependency errors.
// See: https://esdiscuss.org/topic/how-to-solve-this-basic-es6-module-circular-dependency-problem

import Class from 'lowclass'
import Mixin from 'lowclass/Mixin'
import documentReady from '@awaitbox/document-ready'

import Motor from './Motor'
import {getWebGLRendererThree, destroyWebGLRendererThree} from './WebGLRendererThree'
import {getCSS3DRendererThree, destroyCSS3DRendererThree} from './CSS3DRendererThree'
import ImperativeBase, {initImperativeBase, getImperativeBaseProtectedHelper} from './ImperativeBase'
import XYZSizeModeValues from './XYZSizeModeValues'
import XYZNonNegativeValues from './XYZNonNegativeValues'
import {default as HTMLInterface} from '../html/HTMLScene'
import {props} from './props'
import './Camera' // cause a circular dependency with Camera to enforce the SceneProtected gateway below

import {
    Scene as ThreeScene, // so as not to confuse with Infamous Scene.
    PerspectiveCamera,
    //AmbientLight,
    Color,
} from 'three'

initImperativeBase()

const ImperativeBaseProtected = getImperativeBaseProtectedHelper()
const SceneBrand = {brand: 'Scene'}

var SceneProtected
var SceneProtectedImportCount
var maxSceneProtectedImportCount
export function getSceneProtectedHelper() {
    maxSceneProtectedImportCount = maxSceneProtectedImportCount || 3

    // note, SceneProtectedImportCount can be initially undefined,
    // because it is hoisted above all modules
    SceneProtectedImportCount = (SceneProtectedImportCount || 0) + 1

    if (SceneProtectedImportCount > maxSceneProtectedImportCount) {
        throw new Error('Invalid attempt to access SceneProtected')
    }

    return () => SceneProtected
}

let Scene = Mixin(Base => {
    const Parent = ImperativeBase.mixin(Base)

    return Class('Scene').extends(
        Parent,
        ({Super, Public, Protected, Private}) => {
            SceneProtected = Protected

            return {
                static: {
                    defaultElementName: 'i-scene',

                    props: {
                        ...Parent.props,
                        backgroundColor: props.THREE.Color,
                        backgroundOpacity: props.number,
                        shadowmapType: props.string,
                        vr: props.boolean,
                        experimentalWebgl: props.boolean,
                        disableCss: props.boolean,
                    },
                },

                constructor(options = {}) {
                    if (SceneProtectedImportCount > maxSceneProtectedImportCount) {
                        throw new Error('Invalid attempt to access SceneProtected')
                    }

                    const self = super(options)

                    self.isScene = true

                    // The scene should always render CSS properties (it needs to always
                    // be rendered on resized, for example, because it contains the
                    // WebGL canvas which also needs to be resized). Namely, we still
                    // want to apply size values to the scene so that it can size
                    // relative to it's parent container, or literally if size mode is
                    // "literal".
                    this._elementOperations.shouldRender = true

                    // Used by the `scene` getter in ImperativeBase
                    this._scene = self

                    // size of the element where the Scene is mounted
                    // NOTE: z size is always 0, since native DOM elements are always flat.
                    this._elementParentSize = {x: 0, y: 0, z: 0}

                    this._cameraSetup()

                    this._calcSize()
                    self.needsUpdate()

                    return self
                },

                drawScene() {
                    this.__glRenderer && this.__glRenderer.drawScene(this)
                    this.__cssRenderer && this.__cssRenderer.drawScene(this)
                },

                // TODO perspective SkateJS prop
                set perspective(value) {
                    this._perspective = value
                    this._updateCameraPerspective()
                    this._updateCameraProjection()
                    this.needsUpdate()
                },
                get perspective() {
                    return this._perspective
                },

                /**
                 * Mount the scene into the given target.
                 * Resolves the Scene's mountPromise, which can be use to do something once
                 * the scene is mounted.
                 *
                 * @param {string|HTMLElement} [mountPoint=document.body] If a string selector is provided,
                 * the mount point will be selected from the DOM. If an HTMLElement is
                 * provided, that will be the mount point. If no mount point is provided,
                 * the scene will be mounted into document.body.
                 */
                async mount(mountPoint) {
                    // if no mountPoint was provided, just mount onto the <body> element.
                    if (!mountPoint) {
                        if (!document.body) await documentBody()
                        mountPoint = document.body
                    }

                    // if the user supplied a selector, mount there.
                    else if (typeof mountPoint === 'string') {
                        mountPoint = document.querySelector(mountPoint)
                        if (!mountPoint && document.readyState === 'loading') {
                            // maybe the element wasn't parsed yet, check again when the
                            // document is ready.
                            await documentReady()
                            mountPoint = document.querySelector(mountPoint)
                        }
                    }

                    // if we have an actual mount point (the user may have supplied one)
                    if (!(mountPoint instanceof HTMLElement)) {
                        throw new Error(`
                    Invalid mount point specified in Scene.mount() call. Pass a
                    selector, an actual HTMLElement, or don\'t pass anything to
                    mount to <body>.
                `)
                    }

                    // The user can mount to a new location without calling unmount
                    // first. Call it automatically in that case.
                    if (this._mounted) this.unmount()

                    if (mountPoint !== this.parentNode) mountPoint.appendChild(this)

                    this._mounted = true

                    this.__startOrStopSizePolling()
                },

                /**
                 * Unmount the scene from it's mount point. Resets the Scene's
                 * mountPromise.
                 */
                unmount() {
                    if (!this._mounted) return

                    this.__stopSizePolling()

                    if (this.parentNode) this.parentNode.removeChild(this)

                    this._mounted = false
                },

                updated(oldProps, moddedProps) {
                    if (!this.isConnected) return

                    if (moddedProps.experimentalWebgl) {
                        if (this.experimentalWebgl) this._triggerLoadGL()
                        else this._triggerUnloadGL()
                    }

                    if (moddedProps.disableCss) {
                        if (!this.disableCss) this._triggerLoadCSS()
                        else this._triggerUnloadCSS()
                    }

                    // call super.updated() after the above _triggerLoadGL() so that WebGL
                    // stuff will be ready in super.updated()
                    super.updated(oldProps, moddedProps)

                    if (this.experimentalWebgl) {
                        if (moddedProps.backgroundColor) {
                            this.__glRenderer.setClearColor(this, this.backgroundColor, this.backgroundOpacity)
                            this.needsUpdate()
                        }
                        if (moddedProps.backgroundOpacity) {
                            this.__glRenderer.setClearAlpha(this, this.backgroundOpacity)
                            this.needsUpdate()
                        }
                        if (moddedProps.shadowmapType) {
                            this.__glRenderer.setShadowMapType(this, this.shadowmapType)
                            this.needsUpdate()
                        }
                        if (moddedProps.vr) {
                            this.__glRenderer.enableVR(this, this.vr)

                            if (this.vr) {
                                Motor.setFrameRequester(fn => this.__glRenderer.requestFrame(this, fn))
                                this.__glRenderer.createDefaultWebVREntryUI(this)
                            } else {
                                // TODO else return back to normal requestAnimationFrame
                            }
                        }
                    }

                    if (moddedProps.sizeMode) {
                        this.__startOrStopSizePolling()
                    }
                },

                makeDefaultProps() {
                    return Object.assign(super.makeDefaultProps(), {
                        sizeMode: new XYZSizeModeValues('proportional', 'proportional', 'literal'),
                        size: new XYZNonNegativeValues(1, 1, 0),
                    })
                },

                protected: {
                    _mounted: false,
                    _elementParentSize: null, // {x: number, y: number, z: number}

                    // TODO get default camera values from somewhere.
                    _perspective: 1000,

                    _makeThreeObject3d() {
                        return new ThreeScene()
                    },

                    _makeThreeCSSObject() {
                        return new ThreeScene()
                    },

                    _cameraSetup() {
                        // this.threeCamera holds the active camera. There can be many
                        // cameras in the scene tree, but the last one with active="true"
                        // will be the one referenced here.
                        // If there are no cameras in the tree, a virtual default camera is
                        // referenced here, who's perspective is that of the scene's
                        // perspective attribute.
                        this.threeCamera = null
                        this._createDefaultCamera()

                        // holds active cameras found in the DOM tree (if this is empty, it
                        // means no camera elements are in the DOM, but this.threeCamera
                        // will still have a reference to the default camera that scenes
                        // are rendered with when no camera elements exist).
                        this.__activeCameras = new Set()
                    },

                    _createDefaultCamera() {
                        const size = this.calculatedSize
                        // THREE-COORDS-TO-DOM-COORDS
                        // We apply Three perspective the same way as CSS3D perspective here.
                        // TODO CAMERA-DEFAULTS, get defaults from somewhere common.
                        // TODO the "far" arg will be auto-calculated to encompass the furthest objects (like CSS3D).
                        this.threeCamera = new PerspectiveCamera(45, size.x / size.y || 1, 0.1, 10000)
                        this.perspective = 1000
                    },

                    // TODO can this be moved to a render task like _calcSize? It depends
                    // on size values.
                    _updateCameraPerspective() {
                        const perspective = this._perspective
                        this.threeCamera.fov =
                            (180 * (2 * Math.atan(this.calculatedSize.y / 2 / perspective))) / Math.PI
                        this.threeCamera.position.z = perspective
                    },

                    _updateCameraAspect() {
                        this.threeCamera.aspect = this.calculatedSize.x / this.calculatedSize.y || 1
                    },

                    _updateCameraProjection() {
                        this.threeCamera.updateProjectionMatrix()
                    },

                    // TODO leak SceneProtected to Camera to call this, and move to protected
                    _addCamera(camera) {
                        this.__activeCameras.add(camera)
                        this.__setCamera(camera)
                    },

                    _removeCamera(camera) {
                        this.__activeCameras.delete(camera)

                        if (this.__activeCameras.size) {
                            // get the last camera in the Set
                            this.__activeCameras.forEach(c => (camera = c))
                        } else camera = null

                        this.__setCamera(camera)
                    },

                    /** @override */
                    _getParentSize() {
                        return this.parent ? this.parent.calculatedSize : this._elementParentSize
                    },

                    // For now, use the same program (with shaders) for all objects.
                    // Basically it has position, frag colors, point light, directional
                    // light, and ambient light.
                    _loadGL() {
                        if (this._glLoaded) return

                        console.log('    ---------------------------- LOAD SCENE GL')
                        this._composedChildren

                        // THREE
                        // maybe keep this in sceneState in WebGLRendererThree
                        super._loadGL()

                        // We don't let Three update any matrices, we supply our own world
                        // matrices.
                        this.three.autoUpdate = false

                        // TODO: default ambient light when no AmbientLight elements are
                        // present in the Scene.
                        //const ambientLight = new AmbientLight( 0x353535 )
                        //this.three.add( ambientLight )

                        this.__glRenderer = this.__getRenderer('three')

                        // default orange background color and 0 opacity. Use the
                        // backgroundColor and backgroundOpacity attributes to
                        // customize.
                        this.__glRenderer.setClearColor(this, new Color(0xff6600), 0)

                        this.traverse(node => {
                            // skip `this`, we already handled it above
                            if (node === this) return

                            ImperativeBaseProtected()(node)._triggerLoadGL()
                        })
                    },

                    _unloadGL() {
                        if (!this._glLoaded) return

                        console.log('    ---------------------------- UNLOAD SCENE GL')
                        Protected

                        super._unloadGL()

                        if (this.__glRenderer) {
                            this.__glRenderer.uninitialize(this)
                            this.__glRenderer = null
                        }

                        this.traverse(node => {
                            // skip `this`, we already handled it above
                            if (node === this) return

                            ImperativeBaseProtected()(node)._triggerUnloadGL()
                        })
                    },

                    _loadCSS() {
                        if (this._cssLoaded) return
                        console.log('    ---------------------------- LOAD SCENE CSS')
                        Protected

                        super._loadCSS()

                        this.__cssRenderer = this.__getCSSRenderer('three')

                        this.traverse(node => {
                            // skip `this`, we already handled it above
                            if (node === this) return

                            ImperativeBaseProtected()(node)._loadCSS()
                        })

                        console.log([].map.call(this.children, n => [n.constructor.name, n.parent, n.position]))

                        setTimeout(() => {
                            console.log([].map.call(this.children, n => [n.constructor.name, n.parent, n.position]))
                        }, 1000)
                    },

                    _unloadCSS() {
                        if (!this._cssLoaded) return
                        console.log('    ---------------------------- UNLOAD SCENE CSS')

                        super._unloadCSS()

                        if (this.__cssRenderer) {
                            this.__cssRenderer.uninitialize(this)
                            this.__cssRenderer = null
                        }

                        this.traverse(node => {
                            // skip `this`, we already handled it above
                            if (node === this) return

                            ImperativeBaseProtected()(node)._unloadCSS()
                        })
                    },
                },

                private: {
                    __glRenderer: null,
                    __cssRenderer: null,
                    __activeCameras: null, // Set<Camera>

                    // The idea here is that in the future we might have "babylon",
                    // "playcanvas", etc, on a per scene basis.
                    __getRenderer(type) {
                        const scene = this

                        if (this.__glRenderer) return this.__glRenderer

                        let rendererGetter = null

                        if (type === 'three') rendererGetter = getWebGLRendererThree
                        else throw new Error('invalid WebGL renderer')

                        const renderer = rendererGetter(scene)
                        renderer.initialize(scene)

                        return renderer
                    },

                    __getCSSRenderer(type) {
                        const scene = this

                        if (this.__cssRenderer) return this.__cssRenderer

                        let rendererGetter = null

                        if (type === 'three') rendererGetter = getCSS3DRendererThree
                        else throw new Error('invalid WebGL renderer')

                        const renderer = rendererGetter(scene)
                        renderer.initialize(scene)

                        return renderer
                    },

                    // TODO FIXME: manual camera doesn't work after we've added the
                    // default-camera feature.
                    __setCamera(camera) {
                        if (!camera) {
                            this._createDefaultCamera()
                        } else {
                            // TODO?: implement an changecamera event/method and emit/call
                            // that here, then move this logic to the renderer
                            // handler/method?
                            this.threeCamera = camera.three
                            this._updateCameraAspect()
                            this._updateCameraProjection()
                            this.needsUpdate()
                        }
                    },

                    __sizePollTask: null,
                    __parentSize: {x: 0, y: 0, z: 0},

                    // HTM-API
                    __startOrStopSizePolling() {
                        if (
                            this._mounted &&
                            (this._properties.sizeMode.x == 'proportional' ||
                                this._properties.sizeMode.y == 'proportional' ||
                                this._properties.sizeMode.z == 'proportional')
                        ) {
                            this.__startSizePolling()
                        } else {
                            this.__stopSizePolling()
                        }
                    },

                    // observe size changes on the scene element.
                    // HTM-API
                    __startSizePolling() {
                        // NOTE Polling is currently required because there's no other way to do this
                        // reliably, not even with MutationObserver. ResizeObserver hasn't
                        // landed in browsers yet.
                        if (!this.__sizePollTask) this.__sizePollTask = Motor.addRenderTask(this.__checkSize.bind(this))
                        publicThis.on('parentsizechange', this.__onElementParentSizeChange, this)
                    },

                    // HTM-API
                    __stopSizePolling() {
                        publicThis.off('parentsizechange', this.__onElementParentSizeChange)
                        Motor.removeRenderTask(this.__sizePollTask)
                        this.__sizePollTask = null
                    },

                    // NOTE, the Z dimension of a scene doesn't matter, it's a flat plane, so
                    // we haven't taken that into consideration here.
                    // HTM-API
                    __checkSize() {
                        const parent = publicThis.parentNode
                        const parentSize = this.__parentSize
                        const style = getComputedStyle(parent)
                        const width = parseFloat(style.width)
                        const height = parseFloat(style.height)

                        // if we have a size change, trigger parentsizechange
                        if (parentSize.x != width || parentSize.y != height) {
                            parentSize.x = width
                            parentSize.y = height

                            publicThis.trigger('parentsizechange', Object.assign({}, parentSize))
                        }
                    },

                    // HTM-API
                    __onElementParentSizeChange(newSize) {
                        this._elementParentSize = newSize
                        this._calcSize()
                        this.needsUpdate()
                    },
                },
            }
        },
        SceneBrand
    )
})

// TODO cleanup above parentsizechange code

// TODO for now, hard-mixin the HTMLInterface class. We'll do this automatically later.
Scene = Scene.mixin(HTMLInterface)

export {Scene as default}

function documentBody() {
    return new Promise(resolve => {
        if (document.body) return resolve()

        const observer = new MutationObserver(() => {
            if (document.body) {
                resolve()
                observer.disconnect()
            }
        })

        observer.observe(document.documentElement, {childList: true})
    })
}
