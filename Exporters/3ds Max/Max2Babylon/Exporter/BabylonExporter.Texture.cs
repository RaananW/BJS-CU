﻿using System.Collections.Generic;
using System.IO;
using Autodesk.Max;
using Autodesk.Max.MaxSDK.Util;
using BabylonExport.Entities;
using MaxSharp;

namespace Max2Babylon
{
    partial class BabylonExporter
    {
        private BabylonTexture ExportTexture(IStdMat2 stdMat, int index, BabylonScene babylonScene)
        {
            if (!stdMat.MapEnabled(index))
            {
                return null;
            }
            var babylonTexture = new BabylonTexture();

            var texMap = stdMat.GetSubTexmap(index);
            var texture = texMap.GetParamBlock(0).Owner as IBitmapTex;

            if (texture == null)
            {
                return null;
            }

            babylonTexture.hasAlpha = (texture.AlphaSource != 3);
            babylonTexture.getAlphaFromRGB = (texture.AlphaSource == 2);
            babylonTexture.level = stdMat.GetTexmapAmt(index, 0);

            var uvGen = texture.UVGen;

            switch (uvGen.GetCoordMapping(0))
            {
                case 1: //MAP_SPHERICAL
                    babylonTexture.coordinatesMode = 1;
                    break;
                case 2: //MAP_PLANAR
                    babylonTexture.coordinatesMode = 2;
                    break;
                default:
                    babylonTexture.coordinatesMode = 0;
                    break;
            }

            babylonTexture.coordinatesIndex = uvGen.MapChannel - 1;
            if (uvGen.MapChannel > 2)
            {
                RaiseWarning(string.Format("Unsupported map channel, Only channel 1 and 2 are supported."));
            }

            babylonTexture.uOffset = uvGen.GetUOffs(0);
            babylonTexture.vOffset = uvGen.GetVOffs(0);

            babylonTexture.uScale = uvGen.GetUScl(0);
            babylonTexture.vScale = uvGen.GetVScl(0);

            if (Path.GetExtension(texture.MapName).ToLower() == ".dds")
            {
                babylonTexture.vScale *= -1; // Need to invert Y-axis for DDS texture
            }

            babylonTexture.uAng = uvGen.GetUAng(0);
            babylonTexture.vAng = uvGen.GetVAng(0);
            babylonTexture.wAng = uvGen.GetWAng(0);

            babylonTexture.wrapU = 0; // CLAMP
            if ((uvGen.TextureTiling & 1) != 0) // WRAP
            {
                babylonTexture.wrapU = 1;
            }
            else if ((uvGen.TextureTiling & 4) != 0) // MIRROR
            {
                babylonTexture.wrapU = 2;
            }

            babylonTexture.wrapV = 0; // CLAMP
            if ((uvGen.TextureTiling & 2) != 0) // WRAP
            {
                babylonTexture.wrapV = 1;
            }
            else if ((uvGen.TextureTiling & 8) != 0) // MIRROR
            {
                babylonTexture.wrapV = 2;
            }

            babylonTexture.name = Path.GetFileName(texture.MapName);

            // Animations
            var animations = new List<BabylonAnimation>();
            ExportFloatAnimation("uOffset", animations, key => new []{uvGen.GetUOffs(key)});
            ExportFloatAnimation("vOffset", animations, key => new[] { uvGen.GetVOffs(key) });
            ExportFloatAnimation("uScale", animations, key => new[] { uvGen.GetUScl(key) });
            ExportFloatAnimation("vScale", animations, key => new[] { uvGen.GetVScl(key) });
            ExportFloatAnimation("uAng", animations, key => new[] { uvGen.GetUAng(key) });
            ExportFloatAnimation("vAng", animations, key => new[] { uvGen.GetVAng(key) });
            ExportFloatAnimation("wAng", animations, key => new[] { uvGen.GetWAng(key) });

            babylonTexture.animations = animations.ToArray();

            // Copy texture to output
            try
            {
                if (File.Exists(texture.MapName))
                {
                    File.Copy(texture.MapName, Path.Combine(babylonScene.OutputPath, babylonTexture.name), true);
                }
                else
                {
                    var texturepath = Path.Combine(Path.GetDirectoryName(Loader.Core.CurFilePath), babylonTexture.name);
                    if (File.Exists(texturepath))
                    {
                        File.Copy(texturepath, Path.Combine(babylonScene.OutputPath, babylonTexture.name), true);
                    }
                    else
                    {
                        RaiseWarning(string.Format("Texture {0} not found.", babylonTexture.name), true);
                    }
                }
            }
            catch
            {
                RaiseWarning(string.Format("Unable to copy {0} to output folder.", babylonTexture.name), true);
            }

            return babylonTexture;
        }
    }
}
