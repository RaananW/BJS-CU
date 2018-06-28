﻿module BABYLON {
    /**
     * Defines how the parser contract is defined.
     */
    export type BabylonFileParser = (parsedData: any, scene: Scene, container: AssetContainer, rootUrl: string) => void;

    /**
     * Base class of the scene acting as a container for the different elements composing a scene.
     * This class is dynamically extended by the different components of the scene increasing 
     * flexibility and reducing coupling.
     */
    export abstract class AbstractScene {
        /**
         * Stores the list of available parsers in the application.
         */
        private static _BabylonFileParsers: { [key: string]: BabylonFileParser } = { };

        /**
         * Adds a parser in the list of availables ones.
         * @param name Defines the name of the parser
         * @param parser Defines the parser to add
         */
        public static AddParser(name: string, parser: BabylonFileParser): void {
            this._BabylonFileParsers[name] = parser;
        }

        /**
         * Parser json data and populate both a scene and its associated container object
         * @param jsonData Defines the data to parse
         * @param scene Defines the scene to parse the data for
         * @param container Defines the container attached to the parsing sequence
         * @param rootUrl Defines the root url of the data
         */
        public static Parse(jsonData: any, scene: Scene, container: AssetContainer, rootUrl: string): void {
            for (let parserName in this._BabylonFileParsers) {
                if (this._BabylonFileParsers.hasOwnProperty(parserName)) {
                    this._BabylonFileParsers[parserName](jsonData, scene, container, rootUrl);
                }
            }
        }

        /** All of the cameras added to this scene
         * @see http://doc.babylonjs.com/babylon101/cameras
         */
        public cameras = new Array<Camera>();

        /**
        * All of the lights added to this scene
        * @see http://doc.babylonjs.com/babylon101/lights
        */
        public lights = new Array<Light>();

        /**
        * All of the (abstract) meshes added to this scene
        */
        public meshes = new Array<AbstractMesh>();

        /**
         * The list of skeletons added to the scene
         * @see http://doc.babylonjs.com/how_to/how_to_use_bones_and_skeletons
         */
        public skeletons = new Array<Skeleton>();

        /**
        * All of the particle systems added to this scene
        * @see http://doc.babylonjs.com/babylon101/particles
        */
        public particleSystems = new Array<IParticleSystem>();

        /**
         * Gets a list of Animations associated with the scene
         */        
        public animations: Animation[] = [];

        /**
        * All of the animation groups added to this scene
        * @see http://doc.babylonjs.com/how_to/group
        */
        public animationGroups = new Array<AnimationGroup>();

        /**
        * All of the multi-materials added to this scene
        * @see http://doc.babylonjs.com/how_to/multi_materials
        */
        public multiMaterials = new Array<MultiMaterial>();

        /**
        * All of the materials added to this scene
        * @see http://doc.babylonjs.com/babylon101/materials
        */
        public materials = new Array<Material>();

        /**
         * The list of morph target managers added to the scene
         * @see http://doc.babylonjs.com/how_to/how_to_dynamically_morph_a_mesh
         */
        public morphTargetManagers = new Array<MorphTargetManager>();
        
        /**
         * The list of geometries used in the scene.
         */
        public geometries = new Array<Geometry>();

        /**
        * All of the tranform nodes added to this scene
        * @see http://doc.babylonjs.com/how_to/transformnode
        */
        public transformNodes = new Array<TransformNode>();

        /**
         * ActionManagers available on the scene.
         */
        public actionManagers = new Array<ActionManager>();

        /**
         * Sounds to keep.
         */
        public sounds = new Array<Sound>();

        /**
         * Textures to keep.
         */
        public textures = new Array<BaseTexture>();
    }
}
