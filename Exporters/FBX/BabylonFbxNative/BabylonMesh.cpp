#include "stdafx.h"
#include "BabylonMesh.h"
#include <map>
#include <vector>
#include <iostream>
#include <sstream>
#include "NodeHelpers.h"

struct BabylonVertex {
	babylon_vector3 position;
	babylon_vector3 normal;
	babylon_vector2 uv;
	babylon_vector2 uv2;
	babylon_color color;
	std::uint32_t boneIndices[4];
	float boneWeights[4];

	BabylonVertex() {
		boneIndices[0] = 0;
		boneIndices[1] = 0;
		boneIndices[2] = 0;
		boneIndices[3] = 0;

		boneWeights[0] = 0;
		boneWeights[1] = 0;
		boneWeights[2] = 0;
		boneWeights[3] = 0;
	}
};

struct triangle {
	std::uint32_t indices[3];
};
inline bool operator <(const triangle& lhs, const triangle& rhs) {
	if (lhs.indices[0] < rhs.indices[0]) {
		return true;
	}
	else if (rhs.indices[0] < lhs.indices[0]) {
		return false;
	}

	if (lhs.indices[1] < rhs.indices[1]) {
		return true;
	}
	else if (rhs.indices[1] < lhs.indices[1]) {
		return false;
	}
	return lhs.indices[2] < rhs.indices[2];
}

inline bool operator <(const BabylonVertex& lhs, const BabylonVertex& rhs) {
	if (lhs.position < rhs.position) {
		return true;
	}
	else if (rhs.position < lhs.position) {
		return false;
	}

	if (lhs.normal < rhs.normal) {
		return true;
	}
	else if (rhs.normal < lhs.normal) {
		return false;
	}

	if (lhs.uv < rhs.uv) {
		return true;
	}
	else if (rhs.uv < lhs.uv) {
		return false;
	}

	if (lhs.uv2 < rhs.uv2) {
		return true;
	}
	else if (rhs.uv2 < lhs.uv2) {
		return false;
	}

	if (lhs.color < rhs.color) {
		return true;
	}
	else if (rhs.color < lhs.color) {
		return false;
	}

	if (lhs.boneIndices[0] < rhs.boneIndices[0]) {
		return true;
	}
	else if (rhs.boneIndices[0] < lhs.boneIndices[0]) {
		return false;
	}

	if (lhs.boneIndices[1] < rhs.boneIndices[1]) {
		return true;
	}
	else if (rhs.boneIndices[1] < lhs.boneIndices[1]) {
		return false;
	}

	if (lhs.boneIndices[2] < rhs.boneIndices[2]) {
		return true;
	}
	else if (rhs.boneIndices[2] < lhs.boneIndices[2]) {
		return false;
	}

	if (lhs.boneIndices[3] < rhs.boneIndices[3]) {
		return true;
	}
	else if (rhs.boneIndices[3] < lhs.boneIndices[3]) {
		return false;
	}

	if (lhs.boneWeights[0] < rhs.boneWeights[0]) {
		return true;
	}
	else if (rhs.boneWeights[0] < lhs.boneWeights[0]) {
		return false;
	}

	if (lhs.boneWeights[1] < rhs.boneWeights[1]) {
		return true;
	}
	else if (rhs.boneWeights[1] < lhs.boneWeights[1]) {
		return false;
	}

	if (lhs.boneWeights[2] < rhs.boneWeights[2]) {
		return true;
	}
	else if (rhs.boneWeights[2] < lhs.boneWeights[2]) {
		return false;
	}

	if (lhs.boneWeights[3] < rhs.boneWeights[3]) {
		return true;
	}
	else if (rhs.boneWeights[3] < lhs.boneWeights[3]) {
		return false;
	}

	return false;
}


struct SubmeshData {
	std::map<BabylonVertex, std::uint32_t> knownVertices;
	std::set<triangle> knownTriangles;
	std::vector<BabylonVertex> vertices;
	std::vector<std::uint32_t> indices;
};

web::json::value convertToJson(const std::vector<babylon_vector3>& v) {
	auto result = web::json::value::array();
	for (auto ix = 0u;ix < v.size();++ix) {
		result[ix * 3] = web::json::value::number(v[ix].x);
		result[ix * 3 + 1] = web::json::value::number(v[ix].y);
		result[ix * 3 + 2] = web::json::value::number(v[ix].z);
	}
	return result;
}


web::json::value convertToJson(const std::vector<babylon_vector2>& v) {
	auto result = web::json::value::array();
	for (auto ix = 0u;ix < v.size();++ix) {
		result[ix * 2] = web::json::value::number(v[ix].x);
		result[ix * 2 + 1] = web::json::value::number(v[ix].y);
	}
	return result;
}

web::json::value convertToJson(const std::vector<babylon_color>& v) {
	auto result = web::json::value::array();
	for (auto ix = 0u;ix < v.size();++ix) {
		result[ix * 4] = web::json::value::number(v[ix].r);
		result[ix * 4 + 1] = web::json::value::number(v[ix].g);
		result[ix * 4 + 2] = web::json::value::number(v[ix].b);
		result[ix * 4 + 3] = web::json::value::number(v[ix].a);
	}
	return result;
}

web::json::value convertToJson(const std::vector<babylon_vector4>& v) {
	auto result = web::json::value::array();
	for (auto ix = 0u; ix < v.size(); ++ix) {
		result[ix * 4] = web::json::value::number(v[ix].x);
		result[ix * 4 + 1] = web::json::value::number(v[ix].y);
		result[ix * 4 + 2] = web::json::value::number(v[ix].z);
		result[ix * 4 + 3] = web::json::value::number(v[ix].w);
	}
	return result;
}


web::json::value convertToJson(const std::vector<std::uint32_t>& v){
	auto result = web::json::value::array();
	for (auto ix = 0u; ix < v.size() ; ++ix) {
		result[ix ] = web::json::value::number(v[ix ]);
	}
	return result;
}
web::json::value convertToJson(const std::vector<std::uint32_t>& v, bool changeVertexOrder) {
	if (changeVertexOrder) {
		auto result = web::json::value::array();
		for (auto ix = 0u;ix < v.size() / 3;++ix) {
			result[ix * 3] = web::json::value::number(v[ix * 3]);
			result[ix * 3 + 1] = web::json::value::number(v[ix * 3 + 2]);
			result[ix * 3 + 2] = web::json::value::number(v[ix * 3 + 1]);
		}
		return result;
	}
	else {
		auto result = web::json::value::array();
		for (auto ix = 0u;ix < v.size() / 3;++ix) {
			result[ix * 3] = web::json::value::number(v[ix * 3]);
			result[ix * 3 + 1] = web::json::value::number(v[ix * 3 + 1]);
			result[ix * 3 + 2] = web::json::value::number(v[ix * 3 + 2]);
		}
		return result;
	}
}

web::json::value convertToJson(const std::vector<BabylonSubmesh>& v) {
	auto result = web::json::value::array();

	for (auto ix = 0u;ix < v.size();++ix) {
		auto jsubmesh = web::json::value::object();

		jsubmesh[L"materialIndex"] = web::json::value::number(v[ix].materialIndex);
		jsubmesh[L"verticesStart"] = web::json::value::number(v[ix].verticesStart);
		jsubmesh[L"verticesCount"] = web::json::value::number(v[ix].verticesCount);
		jsubmesh[L"indexStart"] = web::json::value::number(v[ix].indexStart);
		jsubmesh[L"indexCount"] = web::json::value::number(v[ix].indexCount);

		result[result.size()] = jsubmesh;
	}
	return result;
}

web::json::value BabylonSubmesh::toJson(){
	auto jobj = web::json::value::object();
	jobj[L"materialIndex"] = web::json::value::number(materialIndex);
	jobj[L"verticesStart"] = web::json::value::number(verticesStart);
	jobj[L"verticesCount"] = web::json::value::number(verticesCount);
	jobj[L"indexStart"] = web::json::value::number(indexStart);
	jobj[L"indexCount"] = web::json::value::number(indexCount);
	return jobj;
}

web::json::value BabylonMesh::toJson()
{
	auto jobj = BabylonAbstractMesh::toJson();
	jobj[L"id"] = web::json::value::string(_id);
	jobj[L"name"] = web::json::value::string(_id);
	if (_parentId.size() > 0)
		jobj[L"parentId"] = web::json::value::string(_parentId);
	if (_materialId.size() > 0)
		jobj[L"materialId"] = web::json::value::string(_materialId);


	jobj[L"isEnabled"] = web::json::value::boolean(_isEnabled);
	jobj[L"isVisible"] = web::json::value::boolean(_isVisible);
	jobj[L"pickable"] = web::json::value::boolean(_pickable);
	jobj[L"hasVertexAlpha"] = web::json::value::boolean(_hasVertexAlpha);
	jobj[L"checkCollision"] = web::json::value::boolean(_checkCollision);
	jobj[L"receiveShadows"] = web::json::value::boolean(_receiveShadows);
	jobj[L"infiniteDistance"] = web::json::value::boolean(_infiniteDistance);
	jobj[L"billboardMode"] = web::json::value::number(_billboardMode);
	jobj[L"visibility"] = web::json::value::number(_visibility);
	jobj[L"skeletonId"] = web::json::value::number(_skeletonId);

	auto submeshesArray = web::json::value::array();
	for (auto ix = 0u; ix < submeshes().size(); ++ix){
		submeshesArray[ix] = submeshes()[ix].toJson();
	}
	jobj[L"subMeshes"] = submeshesArray;
	jobj[L"showBoundingBox"] = web::json::value::boolean(_showBoundingBox);
	jobj[L"showSubMeshesBoundingBox"] = web::json::value::boolean(_showSubMeshesBoundingBox);
	jobj[L"applyFog"] = web::json::value::boolean(_applyFog);
	jobj[L"alphaIndex"] = web::json::value::number(_alphaIndex);
	if (_positions.size() > 0)
		jobj[L"positions"] = convertToJson(_positions);
	if (_normals.size() > 0)
		jobj[L"normals"] = convertToJson(_normals);
	if (_uvs.size() > 0)
		jobj[L"uvs"] = convertToJson(_uvs);
	if (_uvs2.size() > 0)
		jobj[L"uvs2"] = convertToJson(_uvs2);
	if (_colors.size() > 0)
		jobj[L"colors"] = convertToJson(_colors);
	if (_indices.size() > 0)
		jobj[L"indices"] = convertToJson(_indices, false);
	if (_boneIndices.size() > 0){
		jobj[L"matricesIndices"] = convertToJson(_boneIndices);
	}
	if (_boneWeights.size() > 0){
		jobj[L"matricesWeights"] = convertToJson(_boneWeights);
	}
	if (animations.size() == 0 && quatAnimations.size() == 0 && !associatedSkeleton){

		jobj[L"autoAnimate"] = web::json::value::boolean(false);
		jobj[L"autoAnimateLoop"] = web::json::value::boolean(false);
		jobj[L"autoAnimateFrom"] = web::json::value::number(0);
		jobj[L"autoAnimateTo"] = web::json::value::number(0);

	}
	else if (animations.size()>0){

		jobj[L"autoAnimate"] = web::json::value::boolean(animations[0]->autoAnimate);
		jobj[L"autoAnimateLoop"] = web::json::value::boolean(animations[0]->autoAnimateLoop);
		jobj[L"autoAnimateFrom"] = web::json::value::number(animations[0]->autoAnimateFrom);
		jobj[L"autoAnimateTo"] = web::json::value::number(animations[0]->autoAnimateTo);
	}
	else if(quatAnimations.size()>0){
		jobj[L"autoAnimate"] = web::json::value::boolean(quatAnimations[0]->autoAnimate);
		jobj[L"autoAnimateLoop"] = web::json::value::boolean(quatAnimations[0]->autoAnimateLoop);
		jobj[L"autoAnimateFrom"] = web::json::value::number(quatAnimations[0]->autoAnimateFrom);
		jobj[L"autoAnimateTo"] = web::json::value::number(quatAnimations[0]->autoAnimateTo);
	}
	else{

		jobj[L"autoAnimate"] = web::json::value::boolean(associatedSkeleton->bones[0].animation->autoAnimate);
		jobj[L"autoAnimateLoop"] = web::json::value::boolean(associatedSkeleton->bones[0].animation->autoAnimateLoop);
		jobj[L"autoAnimateFrom"] = web::json::value::number(associatedSkeleton->bones[0].animation->autoAnimateFrom);
		jobj[L"autoAnimateTo"] = web::json::value::number(associatedSkeleton->bones[0].animation->autoAnimateTo);
	}

	auto janimations = web::json::value::array();
	for (const auto& anim : animations){
		janimations[janimations.size()] = anim->toJson();
	}for (const auto& anim : quatAnimations){
		janimations[janimations.size()] = anim->toJson();
	}
	jobj[L"animations"] = janimations;
	if (!pivotMatrix.IsIdentity()){
		auto jpivot = web::json::value::array();
		for (auto x = 0; x < 4; ++x){
			for (auto y = 0; y < 4; ++y){
				jpivot[x * 4 + y] = web::json::value::number( pivotMatrix[x][y]);
			}
		}
		jobj[L"pivotMatrix"] = jpivot;
	}
	return jobj;
}

BabylonMesh::BabylonMesh() :
	_isEnabled(true),
	_isVisible(true),
	_billboardMode(0),
	_visibility(1),
	_skeletonId(-1),
	_pickable(true)
{
	pivotMatrix.SetIdentity();
}




BabylonMesh::BabylonMesh(BabylonNode* node) :
	BabylonAbstractMesh(node),
	_isEnabled(true),
	_isVisible(true),
	_billboardMode(0),
	_visibility(1),
	_skeletonId(-1),
	_pickable(true),
	_hasVertexAlpha(false),
	_checkCollision(false),
	_receiveShadows(false),
	_infiniteDistance(false),
	_autoAnimate(false),
	_autoAnimateFrom(0),
	_autoAnimateTo(0),
	_autoAnimateLoop(false),
	_showBoundingBox(false),
	_showSubMeshesBoundingBox(false),
	_applyFog(false),
	_alphaIndex(0)
{

	pivotMatrix.SetIdentity();
	auto fbxNode = node->fbxNode();
	std::string ansiName = fbxNode->GetName();
	name(std::wstring(ansiName.begin(), ansiName.end()));
	id(getNodeId(fbxNode));
	auto parent = fbxNode->GetParent();
	if (parent) {
		parentId(getNodeId(parent));
	}
	pivotMatrix = ConvertToBabylonCoordinateSystem( GetGeometryTransformation(fbxNode));

	auto animStack = fbxNode->GetScene()->GetSrcObject<FbxAnimStack>(0);
	FbxString animStackName = animStack->GetName();
	FbxTakeInfo* takeInfo = fbxNode->GetScene()->GetTakeInfo(animStackName);
	auto startFrame = takeInfo->mLocalTimeSpan.GetStart().GetFrameCount(FbxTime::eFrames24);
	auto endFrame = takeInfo->mLocalTimeSpan.GetStop().GetFrameCount(FbxTime::eFrames24);
	auto animLengthInFrame = endFrame - startFrame + 1;

	auto posAnim = std::make_shared<BabylonAnimation<babylon_vector3>>(BabylonAnimationBase::loopBehavior_Cycle, 24, L"position", L"position", true, 0, animLengthInFrame, true);
	auto rotAnim = std::make_shared<BabylonAnimation<babylon_vector4>>(BabylonAnimationBase::loopBehavior_Cycle, 24, L"rotationQuaternion", L"rotationQuaternion", true, 0, animLengthInFrame, true);
	auto scaleAnim = std::make_shared<BabylonAnimation<babylon_vector3>>(BabylonAnimationBase::loopBehavior_Cycle, 24, L"scale", L"scale", true, 0, animLengthInFrame, true);

	for (auto ix = 0ll; ix < animLengthInFrame; ix++){
		FbxTime currTime;
		currTime.SetFrame(startFrame + ix, FbxTime::eFrames24);

		babylon_animation_key<babylon_vector3> poskey;
		babylon_animation_key<babylon_vector4> rotkey;
		babylon_animation_key<babylon_vector3> scalekey;
		poskey.frame = ix;
		rotkey.frame = ix;
		scalekey.frame = ix;
		poskey.values = node->localTranslate(currTime);
		rotkey.values = node->localRotationQuat(currTime);
		scalekey.values = node->localScale(currTime);
		posAnim->appendKey(poskey);
		rotAnim->appendKey(rotkey);
		scaleAnim->appendKey(scalekey);

		
	}
	if (!posAnim->isConstant()){
		animations.push_back(posAnim);
	}
	if (!rotAnim->isConstant()){
		quatAnimations.push_back(rotAnim);
	}
	if (!scaleAnim->isConstant()){
		animations.push_back(scaleAnim);
	}
	auto mesh = fbxNode->GetMesh();
	if (!mesh) {
		return;
	}
	FbxGeometryConverter conv(mesh->GetFbxManager());
	conv.ComputePolygonSmoothingFromEdgeSmoothing(mesh);
	if (!mesh->IsTriangleMesh()) {
		mesh = (FbxMesh*) conv.Triangulate(mesh, true);
	}


	mesh->RemoveBadPolygons();
	mesh->GenerateNormals();

	FbxStringList uvSetNameList;
	mesh->GetUVSetNames(uvSetNameList);
	std::vector<std::string> uniqueUVSets;

	int uvCount = uvSetNameList.GetCount();
	for (int i = 0; i < uvCount; ++i) {
		std::string value = uvSetNameList.GetStringAt(i);
		if (std::find(uniqueUVSets.begin(), uniqueUVSets.end(), value) == uniqueUVSets.end()) {
			uniqueUVSets.push_back(value);
		}
	}
	bool hasUv = uniqueUVSets.size() > 0;
	bool hasUv2 = uniqueUVSets.size() > 1;
	std::string uvSetName;
	std::string uv2SetName;
	if (hasUv) {
		uvSetName = uniqueUVSets[0];
	}
	if (hasUv2) {
		uv2SetName = uniqueUVSets[1];
	}
	auto colors = mesh->GetElementVertexColor();
	FbxLayerElement::EMappingMode colorMappingMode;
	FbxLayerElement::EReferenceMode colorReferenceMode;
	if (colors) {
		colorMappingMode = colors->GetMappingMode();
		colorReferenceMode = colors->GetReferenceMode();
	}
	auto normals = mesh->GetElementNormal();
	FbxGeometryElementUV* uvs = nullptr;
	FbxGeometryElementUV* uvs2 = nullptr;
	FbxLayerElement::EMappingMode uvsMappingMode;
	FbxLayerElement::EReferenceMode uvsReferenceMode;
	FbxLayerElement::EMappingMode uvs2MappingMode;
	FbxLayerElement::EReferenceMode uvs2ReferenceMode;
	if (hasUv) {
		uvs = mesh->GetElementUV(uvSetName.c_str());
		uvsMappingMode = uvs->GetMappingMode();
		uvsReferenceMode = uvs->GetReferenceMode();
	}
	if (hasUv2) {
		uvs2 = mesh->GetElementUV(uv2SetName.c_str());
		uvs2MappingMode = uvs2->GetMappingMode();
		uvs2ReferenceMode = uvs2->GetReferenceMode();
	}

	auto normalMappingMode = normals->GetMappingMode();
	auto normalReferenceMode = normals->GetReferenceMode();
	std::vector<SubmeshData> submeshes;

	auto materialCount = node->fbxNode()->GetMaterialCount();
	if (materialCount == 0) {
		materialCount = 1;
	}
	submeshes.resize(materialCount);
	auto baseLayer = mesh->GetLayer(0);
	auto materials = baseLayer->GetMaterials();
	FbxLayerElement::EMappingMode materialMappingMode = materials ?
		materials->GetMappingMode() : FbxLayerElement::eByPolygon;

	// extract deformers
	SkinInfo skinInfo(fbxNode);
	if (skinInfo.hasSkin()){
		associatedSkeleton = std::make_shared<BabylonSkeleton>();
		skinInfo.buildBabylonSkeleton(*associatedSkeleton);
	}

	auto triangleCount = mesh->GetPolygonCount();
	for (int triangleIndex = 0; triangleIndex < triangleCount; ++triangleIndex) {

		int materialIndex = 0;
		if (materialCount > 0 && materials) {
			switch (materialMappingMode) {
			case FbxLayerElement::eAllSame:
				materialIndex = materials->GetIndexArray().GetAt(0);
				break;
			case FbxLayerElement::eByPolygon:
				materialIndex = materials->GetIndexArray().GetAt(triangleIndex);
			}
		}

		auto& submesh = submeshes[materialIndex];
		triangle t;
		for (int cornerIndex = 0; cornerIndex < 3; ++cornerIndex) {
			auto controlPointIndex = mesh->GetPolygonVertex(triangleIndex, cornerIndex);
			auto vertexIndex = triangleIndex * 3 + cornerIndex;
			auto position = mesh->GetControlPoints()[controlPointIndex];
			position[2] = -position[2];

			BabylonVertex v;
			v.position = position;
			if (normals) {
				int normalMapIndex = (normalMappingMode == FbxLayerElement::eByControlPoint) ?
				controlPointIndex : vertexIndex;
				int normalValueIndex = (normalReferenceMode == FbxLayerElement::eDirect) ?
				normalMapIndex : normals->GetIndexArray().GetAt(normalMapIndex);
				v.normal = normals->GetDirectArray().GetAt(normalValueIndex);
				v.normal.z = -v.normal.z;
			}
			if (colors) {
				int mappingIndex = (colorMappingMode == FbxLayerElement::eByControlPoint) ?
				controlPointIndex : vertexIndex;
				int valueIndex = (colorReferenceMode == FbxLayerElement::eDirect) ?
				mappingIndex : colors->GetIndexArray().GetAt(mappingIndex);
				v.color = colors->GetDirectArray().GetAt(valueIndex);
			}
			if (uvs) {
				int mappingIndex = (uvsMappingMode == FbxLayerElement::eByControlPoint) ?
				controlPointIndex : vertexIndex;
				int valueIndex = (uvsReferenceMode == FbxLayerElement::eDirect) ?
				mappingIndex : uvs->GetIndexArray().GetAt(mappingIndex);
				v.uv = uvs->GetDirectArray().GetAt(valueIndex);
				//v.uv.y = 1 - v.uv.y;
			}

			if (uvs2) {
				int mappingIndex = (uvs2MappingMode == FbxLayerElement::eByControlPoint) ?
				controlPointIndex : vertexIndex;
				int valueIndex = (uvs2ReferenceMode == FbxLayerElement::eDirect) ?
				mappingIndex : uvs2->GetIndexArray().GetAt(mappingIndex);
				v.uv2 = uvs2->GetDirectArray().GetAt(valueIndex);
				//v.uv2.y = 1 - v.uv2.y;
			}
			if (skinInfo.hasSkin()){
				auto& skinData = skinInfo.controlPointBoneIndicesAndWeights(controlPointIndex);
				for (auto boneix = 0; boneix < skinData.size()&&boneix<4; ++boneix){
					v.boneIndices[boneix] = skinData[boneix].index;
					v.boneWeights[boneix] = skinData[boneix].weight;
				}
				for (auto boneix = skinData.size(); boneix < 4; ++boneix){

					v.boneIndices[boneix] = skinInfo.bonesCount();
					v.boneWeights[boneix] = 0;
				}
			}
			auto foundVertex = submesh.knownVertices.find(v);
			if (foundVertex != submesh.knownVertices.end()) {
				//submesh.indices.push_back(foundVertex->second);
				t.indices[cornerIndex] = foundVertex->second;
			}
			else {
				auto index = submesh.vertices.size();
				submesh.vertices.push_back(v);
				//submesh.indices.push_back(index);
				submesh.knownVertices[v] = index;
				t.indices[cornerIndex] = index;
			}
		}
		if (submesh.knownTriangles.insert(t).second) {
			submesh.indices.push_back(t.indices[0]);
			submesh.indices.push_back(t.indices[1]);
			submesh.indices.push_back(t.indices[2]);
		}
		else {
			std::cout << "duplicate triangle found" << std::endl;
		}

	}
	std::uint32_t vertexOffset = 0;

	for (auto matIndex = 0u; matIndex < submeshes.size(); ++matIndex) {
		auto& submesh = submeshes[matIndex];
		BabylonSubmesh babsubmesh;
		babsubmesh.indexCount = submesh.indices.size();
		babsubmesh.indexStart = _indices.size();
		babsubmesh.materialIndex = matIndex;
		babsubmesh.verticesCount = submesh.vertices.size();
		babsubmesh.verticesStart = _positions.size();
		for (auto& v : submesh.vertices) {
			_positions.push_back(v.position);
			if (normals) {
				_normals.push_back(v.normal);
			}
			if (colors) {
				_colors.push_back(v.color);
			}
			if (uvs) {
				_uvs.push_back(v.uv);
			}
			if (uvs2) {
				_uvs2.push_back(v.uv2);
			}
			if (skinInfo.hasSkin()){
				 float weight0 = v.boneWeights[0];
				 float weight1 = v.boneWeights[1];
				 float weight2 = v.boneWeights[2];
				 int bone0 = v.boneIndices[0];
				 int bone1 = v.boneIndices[1];
				 int bone2 = v.boneIndices[2];
				 int bone3 = v.boneIndices[3];
               
				_boneWeights.push_back(babylon_vector4( weight0, weight1, weight2, 1.0 - weight0 - weight1 - weight2));
                _boneIndices.push_back((bone3 << 24) | (bone2 << 16) | (bone1 << 8) | bone0);
			}
		}
		for (auto i : submesh.indices) {
			_indices.push_back(i + vertexOffset);
		}

		vertexOffset = _positions.size();
		_submeshes.push_back(babsubmesh);
	}



}


BabylonMesh::~BabylonMesh()
{
}
