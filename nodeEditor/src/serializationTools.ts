import { NodeMaterial } from 'babylonjs/Materials/Node/nodeMaterial';
import { GlobalState } from './globalState';
import { Texture } from 'babylonjs/Materials/Textures/texture';
import { DataStorage } from 'babylonjs/Misc/dataStorage';
import { NodeMaterialBlock } from 'babylonjs/Materials/Node/nodeMaterialBlock';
import { Nullable } from 'babylonjs/types';
import { GraphFrame } from './diagram/graphFrame';

export class SerializationTools {

    public static UpdateLocations(material: NodeMaterial, globalState: GlobalState, selectedBlocks?: NodeMaterialBlock[], frame?: Nullable<GraphFrame>) {
        material.editorData = {
            locations: []
        };

        // Store node locations
        let blocks: NodeMaterialBlock[];
        if (selectedBlocks) {
            blocks = selectedBlocks;
        } else {
            blocks = material.attachedBlocks;
        }
        for (var block of blocks) {
            let node = globalState.onGetNodeFromBlock(block);

            material.editorData.locations.push({
                blockId: block.uniqueId,
                x: node ? node.x : 0,
                y: node ? node.y : 0
            });
        }

        globalState.storeEditorData(material.editorData, frame);
    }

    public static Serialize(material: NodeMaterial, globalState: GlobalState, selectedBlocks?: NodeMaterialBlock[], frame?: Nullable<GraphFrame>) {
        let bufferSerializationState = Texture.SerializeBuffers;
        Texture.SerializeBuffers = DataStorage.ReadBoolean("EmbedTextures", true);

        this.UpdateLocations(material, globalState, selectedBlocks, frame);

        let serializationObject = material.serialize(selectedBlocks);

        Texture.SerializeBuffers = bufferSerializationState;

        return JSON.stringify(serializationObject, undefined, 2);
    }

    public static Deserialize(serializationObject: any, globalState: GlobalState) {
        globalState.onIsLoadingChanged.notifyObservers(true);
        globalState.nodeMaterial!.loadFromSerialization(serializationObject, "");
    }
}