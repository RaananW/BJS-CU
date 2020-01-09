import { Engine } from "../../../Engines/engine";
import { Constants } from "../../../Engines/constants";
import { AbstractMesh } from "../../../Meshes/abstractMesh";
import { VertexBuffer } from "../../../Meshes/buffer";
import { Scene } from "../../../scene";
import { Material } from "../../material";
import { Texture } from "../texture";
import { DynamicTexture } from "../dynamicTexture";
import { Nullable } from "../../../types";
import { Vector2 } from "../../../Maths/math.vector";
import { TexturePackerFrame } from "./frame";

/**
 * Defines the basic options interface of a TexturePacker
 */
export interface ITexturePackerOptions{

    /**
	 * Custom targets for the channels of a texture packer.  Default is all the channels of the Standard Material
	 */
    map?: string[];

    /**
	 * the UV input targets, as a single value for all meshes or an array of values that matches the mesh count.  Defaults to VertexBuffer.UVKind
	 */
    uvsIn?: string; // | string[];

    /**
	 * the UV output targets, as a single value for all meshes or an array of values that matches the mesh count.  Defaults to VertexBuffer.UVKind
	 */
    uvsOut?: string; // | string[];

    /**
	 * number representing the layout style. Defaults to LAYOUT_STRIP
	 */
    layout?: number;

    /**
	 * number of columns if using custom column count layout(2).  This defaults to 4.
	 */
    colcount?: number;

    /**
	 * flag to update the input meshes to the new packed texture after compilation. Defaults to true.
	 */
    updateInputMeshes?: boolean;

    /**
	* boolean flag to dispose all the source textures.  Defaults to true.
	*/
    disposeSources?: boolean;

    /**
	 * Fills the blank cells in a set to the customFillColor.  Defaults to true.
	 */
    fillBlanks?: boolean;

    /**
	 * string value representing the context fill style color.  Defaults to 'black'.
	 */
    customFillColor?: string;

    /**
	 * Width and Height Value of each Frame in the TexturePacker Sets
	 */
    frameSize?: number;

    /**
	 * Ratio of the value to add padding wise to each cell.  Defaults to 0.0115
	 */
    paddingRatio?: number;

}

/**
 * This is a support class that generates a series of packed texture sets.
 * @see #TODO ADD THIS
 */
export class TexturePacker{

    /** mag = nearest and min = nearest and mip = nearest */
    public static readonly LAYOUT_STRIP = Constants.LAYOUT_STRIP;
    /** mag = nearest and min = linear and mip = nearest */
    public static readonly LAYOUT_POWER2 = Constants.LAYOUT_POWER2;
    /** mag = nearest and min = linear and mip = linear */
    public static readonly LAYOUT_COLNUM = Constants.LAYOUT_COLNUM;

    /** The Name of the Texture Package */
    public name: string;

   /** The scene scope of the TexturePacker */
    public scene: Scene;

    /** The Meshes to target */
    public meshes: AbstractMesh[];

    /** Arguments passed with the Constructor */
    public options: ITexturePackerOptions;

    /** The promise that is started upon initialization */
    public promise: Promise< TexturePacker | string >;

    /** The Container object for the channel sets that are generated */
    public sets: object;

    /** The Container array for the frames that are generated */
    public frames: TexturePackerFrame[];

    /** The List of textures to purge from memory after compilation */
    private _disposeList: Texture[];

    /** The padding value from Math.ceil(frameSize * paddingRatio) */
    private _paddingValue: number;

    /**
    * Initializes a texture package series from an array of meshes or a single mesh.
    * @param name The name of the package
    * @param meshes The target meshes to compose the package from
    * @param options The arguments that texture packer should follow while building.
    * @param scene The scene which the textures are scoped to.
    * @returns TexturePacker
    */
    constructor(name: string, meshes: AbstractMesh[], options: ITexturePackerOptions, scene: Scene) {

        this.name = name;
        this.meshes = meshes;
        this.scene = scene;

        /**
        * Run through the options and set what ever defaults are needed that where not declared.
        */
        this.options = options;
        this.options.map = this.options.map || [
                'ambientTexture',
                'bumpTexture',
                'diffuseTexture',
                'emissiveTexture',
                'lightmapTexture',
                'opacityTexture',
                'reflectionTexture',
                'refractionTexture',
                'specularTexture'
            ];

        this.options.uvsIn = this.options.uvsIn || VertexBuffer.UVKind;
        this.options.uvsOut = this.options.uvsOut || VertexBuffer.UVKind;
        this.options.layout = this.options.layout || TexturePacker.LAYOUT_STRIP;

        if (this.options.layout === TexturePacker.LAYOUT_COLNUM) {
            this.options.colcount = this.options.colcount || 4;
        }

        this.options.updateInputMeshes = this.options.updateInputMeshes || true;
        this.options.disposeSources = this.options.disposeSources || true;
        this._disposeList = [];

        this.options.fillBlanks = this.options.fillBlanks || true;

        if (this.options.fillBlanks === true) {
            this.options.customFillColor = this.options.customFillColor || 'black';
        }

        this.options.frameSize = this.options.frameSize || 256;
        this.options.paddingRatio = this.options.paddingRatio || 0.0115;

        this._paddingValue = Math.ceil(this.options.frameSize * this.options.paddingRatio);

        //Make it an even padding Number.
        if (this._paddingValue % 2 !== 0) {
            this._paddingValue++;
        }

        this.sets = {};
        this.frames = [];

        /**
        * Create the promise and then run through the materials on the meshes.
        */
        this.promise = new Promise ((resolve, reject) => {
            try {
                let done = 0;
                const doneCheck = (mat: Material) => {
                    done++;
                    //Check Status of all Textures on all meshes, till they are ready.
                    if (this.options.map) {
                        for (let j = 0; j < this.options.map.length; j++) {
                            let index: string = this.options.map[j];
                            let t: Texture = (mat as any)[index];

                            if (t !== null) {
                                if (!(this.sets as any)[this.options.map[j]]) {
                                    (this.sets as any)[this.options.map[j]] = true;
                                }

                                if (this.options.disposeSources) {
                                    this._disposeList.push(t);
                                }
                            }
                        }

                        if (done === this.meshes.length) {
                            this._createFrames(resolve);
                        }
                    }
                };

                for (let i = 0; i < this.meshes.length; i++) {

                    let mesh = this.meshes[i];
                    let material: Nullable<Material> | Material = mesh.material;

                    if (!material) {
                        return new Error('Mesh has no Material assigned!');
                    }

                    material.forceCompilationAsync(mesh).then(() => {
                        doneCheck((material as Material));
                    });
                }

            }catch (e) {
                return reject(e);
            }
        });

    return;
    }

    /**
    * Starts the package process
    * @param resolve The promises resolution function
    * @returns TexturePacker
    */
    private _createFrames(resolve: () => void) {

        let dtSize = this._calculateSize();
        let dtUnits = (new Vector2(1, 1)).divide(dtSize);
        let doneCount = 0;
        let expecting = this._disposeList.length;
        let meshLength = this.meshes.length;

        let sKeys = Object.keys(this.sets);
        for (let i = 0; i < sKeys.length; i++) {
            let setName = sKeys[i];

            let dt = new DynamicTexture(this.name + '.TexturePack.' + setName + 'Set',
                    {width: dtSize.x, height: dtSize.y},
                    this.scene,
                    true, //Generate Mips
                    Texture.TRILINEAR_SAMPLINGMODE,
                    Engine.TEXTUREFORMAT_RGBA
                );

            let dtx = dt.getContext();
            dtx.fillStyle = 'rgba(0,0,0,0)';
            dtx.fillRect(0, 0, dtSize.x, dtSize.y) ;
            dt.update();
            (this.sets as any)[setName] = dt;
        }

        let baseSize = this.options.frameSize || 256;
        let padding = this._paddingValue;
        let tcs = baseSize + (2 * padding);

        const done = () => {
            this._calculateMeshUVFrames(baseSize, padding, dtSize, dtUnits, this.options.updateInputMeshes || false);
        };

        //Update the Textures
        for (let i = 0; i < meshLength; i++) {
            let m = this.meshes[i];
            let mat = m.material;

            //Check if the material has the texture
            //Create a temporary canvas the same size as 1 frame
            //Then apply the texture to the center and the 8 offsets
            //Copy the Context and place in the correct frame on the DT

            for (let j = 0; j < sKeys.length; j++) {
                let tempTexture = new DynamicTexture('temp', tcs, this.scene, true);
                let tcx = tempTexture.getContext();

                //tempTexture.update(false)

                let offset = this._getFrameOffset(i);

                const updateDt = () => {
                    doneCount++;
                    let iDat = tcx.getImageData(0, 0, tcs, tcs);
                    //Update Set
                    let dt = (this.sets as any)[setName];
                    let dtx = dt.getContext();
                    dtx.putImageData(iDat, dtSize.x * offset.x, dtSize.y * offset.y);
                    tempTexture.dispose();
                    dt.update(false);

                        if (doneCount == expecting) {
                            done();
                            resolve();
                        }
                };

                let setName = sKeys[j] || '_blank';
                if ((mat as any)[setName] === null) {
                    tcx.fillStyle = 'rgba(0,0,0,0)';

                    if (this.options.fillBlanks) {
                        tcx.fillStyle = (this.options.customFillColor as string);
                    }

                    tcx.fillRect(0, 0, tcs, tcs);
                    tempTexture.update(false);
                    updateDt();

                }else {
                    let img = new Image();
                    img.src = (mat as any)[setName]!.url;
                    img.onload = () => {
                        tcx.fillStyle = 'rgba(0,0,0,0)';
                        tcx.fillRect(0, 0, tcs, tcs);
                        tempTexture.update(false);
                        tcx.drawImage(
                            img,
                            0,
                            0,
                            img.width,
                            img.height,
                            padding,
                            padding,
                            baseSize,
                            baseSize
                        );

                        //Right
                        tcx.drawImage(
                            img,
                            0,
                            0,
                            img.width,
                            img.height,
                            padding + baseSize,
                            padding,
                            baseSize,
                            baseSize
                        );
                        //RightBottom
                        tcx.drawImage(
                            img,
                            0,
                            0,
                            img.width,
                            img.height,
                            padding + baseSize,
                            padding + baseSize,
                            baseSize,
                            baseSize
                        );
                        //Bottom
                        tcx.drawImage(
                            img,
                            0,
                            0,
                            img.width,
                            img.height,
                            padding,
                            padding + baseSize,
                            baseSize,
                            baseSize
                        );
                        //BottomLeft
                        tcx.drawImage(
                            img,
                            0,
                            0,
                            img.width,
                            img.height,
                            padding - baseSize,
                            padding + baseSize,
                            baseSize,
                            baseSize
                        );
                        //Left
                        tcx.drawImage(
                            img,
                            0,
                            0,
                            img.width,
                            img.height,
                            padding - baseSize,
                            padding,
                            baseSize,
                            baseSize
                        );
                        //LeftTop
                        tcx.drawImage(
                            img,
                            0,
                            0,
                            img.width,
                            img.height,
                            padding - baseSize,
                            padding - baseSize,
                            baseSize,
                            baseSize
                        );
                        //Top
                        tcx.drawImage(
                            img,
                            0,
                            0,
                            img.width,
                            img.height,
                            padding,
                            padding - baseSize,
                            baseSize,
                            baseSize
                        );
                        //TopRight
                        tcx.drawImage(
                            img,
                            0,
                            0,
                            img.width,
                            img.height,
                            padding + baseSize,
                            padding - baseSize,
                            baseSize,
                            baseSize
                        );

                        updateDt();

                    };

                }
            }
        }
    }

    /**
    * Calculates the Size of the Channel Sets
    * @returns Vector2
    */
    private _calculateSize(): Vector2 {

        let meshLength: number = this.meshes.length || 0;
        let baseSize: number =  this.options.frameSize || 0;
        let padding: number = this._paddingValue || 0;

        switch (this.options.layout){
            case 0 :
                //STRIP_LAYOUT
                return new Vector2(
                    (baseSize * meshLength) + (2 * padding * meshLength),
                    (baseSize) + (2 * padding)
                );
            break;
        }

        return Vector2.Zero();
    }

    /**
    * Calculates the UV data for the frames.
    * @param baseSize the base frameSize
    * @param padding the base frame padding
    * @param dtSize size of the Dynamic Texture for that channel
    * @param dtUnits is 1/dtSize
    * @param update flag to update the input meshes
    * @returns Void
    */
    private _calculateMeshUVFrames(baseSize: number, padding: number, dtSize: Vector2, dtUnits: Vector2, update: boolean) {
        let meshLength = this.meshes.length;

        for (let i = 0; i < meshLength; i++) {
            let m = this.meshes[i];

            let scale = new Vector2(
                baseSize / dtSize.x,
                baseSize / dtSize.y,
            );

            let pOffset: Vector2 = dtUnits.clone().scale(padding);
            let frameOffset: Vector2 = this._getFrameOffset(i);
            let offset: Vector2 = frameOffset.add(pOffset);

            let frame: TexturePackerFrame = new TexturePackerFrame(i, scale, offset);

            this.frames.push(
                frame
            );

            //Update Output UVs
            if (update) {
                this._updateMeshUV(m, i);
                this._updateTextureRefrences(m);
            }
        }
    }

    private _getFrameOffset(index: number): Vector2 {
        let meshLength = this.meshes.length;
        switch (this.options.layout){
            case 0 :
                //STRIP_LAYOUT
                let xStep = 1 / meshLength;
                return new Vector2(
                    index * xStep,
                    0
                );
            break;
        }

        return Vector2.Zero();
    }

    private _updateMeshUV(mesh: AbstractMesh, frameID: number): void {
        let frame: TexturePackerFrame = (this.frames as any)[frameID];
        let uvIn = mesh.getVerticesData(this.options.uvsIn || VertexBuffer.UVKind);
        let uvOut = [];
        let toCount = 0;

        if (uvIn!.length) {
            toCount = uvIn!.length || 0;
        }

        for (let i = 0; i < toCount; i += 2) {
            uvOut.push(
                ((uvIn as any)[i] * frame.scale.x) + frame.offset.x,
                ((uvIn as any)[i + 1] * frame.scale.y) + frame.offset.y
            );
        }

        mesh.setVerticesData(this.options.uvsOut || VertexBuffer.UVKind, uvOut);
    }

    private _updateTextureRefrences(m: AbstractMesh): void {
        let mat = m.material;
        let sKeys = Object.keys(this.sets);
        for (let i = 0; i < sKeys.length; i++) {
            let setName = sKeys[i];
            if ((mat as any)[setName] !== null) {
                if ((mat as any)[setName].dispose) {
                    (mat as any)[setName].dispose();
                }
                (mat as any)[setName] = (this.sets as any)[setName];
            }
        }
    }

}
