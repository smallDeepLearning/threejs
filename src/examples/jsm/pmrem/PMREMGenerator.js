/**
 * @author Prashant Sharma / spidersharma03
 * @author Ben Houston / bhouston, https://clara.io
 *
 *  To avoid cube map seams<缝隙>, I create an extra pixel around each face. This way when the cube map is
 * 	为了避免立体贴图的缝隙，我在每个面的周围添加了一个额外像素点。这样应用程序后期对立体贴图进行采样时
 * 	sampled by an application later(with a little care by sampling<抽样> the centre of the texel<图素>), the extra 1 border
 * 	（只对图素中心一点进行取样），这样额外的像素边就可以确保产品没有缝隙。
 *	of pixels makes sure that there is no seams artifacts present. This works perfectly for cubeUV format as
 *  无论这六个面是如何排列的，这种立体贴图的方式都能完美满足。
 *	well where the 6 faces can be arranged in any manner whatsoever.
 * 	Code in the beginning of fragment shader's main function does this job for a given resolution.
 *  立体贴图的解决主要在于fragment函数。
 *	Run Scene_PMREM_Test.html in the examples directory to see the sampling from the cube lods generated
 *	by this class.
 *  运行Scene_PMREM_Test.html这个例子，能直接的看到cude是通过这个类如何抽样的
 */

import {
	DoubleSide,
	GammaEncoding,
	LinearEncoding,
	LinearFilter,
	LinearToneMapping,
	Mesh,
	NearestFilter,
	NoBlending,
	OrthographicCamera,
	PlaneBufferGeometry,
	Scene,
	ShaderMaterial,
	WebGLRenderTargetCube,
	sRGBEncoding
} from "../../../build/three.module.js";

var PMREMGenerator = (function () {

	var shader = getShader();
	// 正交相机
	var camera = new OrthographicCamera(-1, 1, 1, -1, 0.0, 1000);
	// 场景
	var scene = new Scene();
	// 网格 - 平面缓冲几何体
	var planeMesh = new Mesh(new PlaneBufferGeometry(2, 2, 0), shader);

	planeMesh.material.side = DoubleSide;
	
	scene.add(planeMesh);
	scene.add(camera);

	/**
	 * PEREMGenerator类
	 * @param { Object } sourceTexture 
	 * @param { Number } samplesPerLevel 
	 * @param { Number } resolution 
	 */

	var PMREMGenerator = function (sourceTexture, samplesPerLevel, resolution) {

		this.sourceTexture = sourceTexture;
		this.resolution = (resolution !== undefined) ? resolution : 256;
		// 出于性能原因, 256作为当前硬编码在GLSL代码中
		this.samplesPerLevel = (samplesPerLevel !== undefined) ? samplesPerLevel : 32;

		var monotonicEncoding = (this.sourceTexture.encoding === LinearEncoding) ||
			(this.sourceTexture.encoding === GammaEncoding) || (this.sourceTexture.encoding === sRGBEncoding);

		this.sourceTexture.minFilter = (monotonicEncoding) ? LinearFilter : NearestFilter;
		this.sourceTexture.magFilter = (monotonicEncoding) ? LinearFilter : NearestFilter;
		this.sourceTexture.generateMipmaps = this.sourceTexture.generateMipmaps && monotonicEncoding;

		this.cubeLods = [];

		var size = this.resolution;

		var params = {
			format: this.sourceTexture.format,
			magFilter: this.sourceTexture.magFilter,
			minFilter: this.sourceTexture.minFilter,
			type: this.sourceTexture.type,
			generateMipmaps: this.sourceTexture.generateMipmaps,
			anisotropy: this.sourceTexture.anisotropy,
			encoding: this.sourceTexture.encoding
		};

		// how many LODs fit in the given CubeUV Texture.
		this.numLods = Math.log(size) / Math.log(2) - 2; // IE11 doesn't support Math.log2

		for (var i = 0; i < this.numLods; i++) {

			var renderTarget = new WebGLRenderTargetCube(size, size, params);
			renderTarget.texture.name = "PMREMGenerator.cube" + i;
			this.cubeLods.push(renderTarget);
			size = Math.max(16, size / 2);

		}

	};

	PMREMGenerator.prototype = {

		constructor: PMREMGenerator,

		/*
		 * Prashant Sharma / spidersharma03: More thought and work is needed here.
		 * Right now it's a kind of a hack to use the previously convolved map to convolve the current one.
		 * I tried to use the original map to convolve all the lods, but for many textures(specially the high frequency)
		 * even a high number of samples(1024) dosen't lead to satisfactory results.
		 * By using the previous convolved maps, a lower number of samples are generally sufficient(right now 32, which
		 * gives okay results unless we see the reflection very carefully, or zoom in too much), however the math
		 * goes wrong as the distribution function tries to sample a larger area than what it should be. So I simply scaled
		 * the roughness by 0.9(totally empirical) to try to visually match the original result.
		 * The condition "if(i <5)" is also an attemt to make the result match the original result.
		 * This method requires the most amount of thinking I guess. Here is a paper which we could try to implement in future::
		 * https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch20.html
		 */
		update: function (renderer) {

			// Texture should only be flipped for CubeTexture, not for
			// a Texture created via WebGLRenderTargetCube.
			var tFlip = (this.sourceTexture.isCubeTexture) ? -1 : 1;

			shader.defines['SAMPLES_PER_LEVEL'] = this.samplesPerLevel;
			shader.uniforms['faceIndex'].value = 0;
			shader.uniforms['envMap'].value = this.sourceTexture;
			shader.envMap = this.sourceTexture;
			shader.needsUpdate = true;

			var gammaInput = renderer.gammaInput;
			var gammaOutput = renderer.gammaOutput;
			var toneMapping = renderer.toneMapping;
			var toneMappingExposure = renderer.toneMappingExposure;
			var currentRenderTarget = renderer.getRenderTarget();

			renderer.toneMapping = LinearToneMapping;
			renderer.toneMappingExposure = 1.0;
			renderer.gammaInput = false;
			renderer.gammaOutput = false;

			for (var i = 0; i < this.numLods; i++) {
				var r = i / (this.numLods - 1);
				shader.uniforms['roughness'].value = r * 0.9; // see comment above, pragmatic choice
				// Only apply the tFlip for the first LOD
				shader.uniforms['tFlip'].value = (i == 0) ? tFlip : 1;
				var size = this.cubeLods[i].width;
				shader.uniforms['mapSize'].value = size;
				this.renderToCubeMapTarget(renderer, this.cubeLods[i]);
				if (i < 5) shader.uniforms['envMap'].value = this.cubeLods[i].texture;
			}
			renderer.setRenderTarget(currentRenderTarget);
			renderer.toneMapping = toneMapping;
			renderer.toneMappingExposure = toneMappingExposure;
			renderer.gammaInput = gammaInput;
			renderer.gammaOutput = gammaOutput;
		},

		renderToCubeMapTarget: function (renderer, renderTarget) {
			for (var i = 0; i < 6; i++) {
				this.renderToCubeMapTargetFace(renderer, renderTarget, i);
			}
		},

		renderToCubeMapTargetFace: function (renderer, renderTarget, faceIndex) {
			shader.uniforms['faceIndex'].value = faceIndex;
			renderer.setRenderTarget(renderTarget, faceIndex);
			renderer.clear();
			renderer.render(scene, camera);
		},

		dispose: function () {
			for (var i = 0, l = this.cubeLods.length; i < l; i++) {
				this.cubeLods[i].dispose();
			}
		}
	};

	function getShader() {
		var shaderMaterial = new ShaderMaterial({
			// 使用#define指令在GLSL代码为顶点着色器和片段着色器定义自定义常量;
			// 每个键/值产生一行定义语句;
			defines: {
				"SAMPLES_PER_LEVEL": 20,
			},
			// 指定要传递给shader代码的uniforms;
			// 键为uniform的名称,值(value)是{ value: 1.0 }形式;
			uniforms: {
				"faceIndex": {
					value: 0
				},
				"roughness": {
					value: 0.5
				},
				"mapSize": {
					value: 0.5
				},
				"envMap": {
					value: null
				},
				"tFlip": {
					value: -1
				},
			},
			vertexShader: "varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}",
			fragmentShader: "#include <common>\n\
				varying vec2 vUv;\n\
				uniform int faceIndex;\n\
				uniform float roughness;\n\
				uniform samplerCube envMap;\n\
				uniform float mapSize;\n\
				uniform float tFlip;\n\
				\n\
				float GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {\n\
					float a = ggxRoughness + 0.0001;\n\
					a *= a;\n\
					return ( 2.0 / a - 2.0 );\n\
				}\n\
				vec3 ImportanceSamplePhong(vec2 uv, mat3 vecSpace, float specPow) {\n\
					float phi = uv.y * 2.0 * PI;\n\
					float cosTheta = pow(1.0 - uv.x, 1.0 / (specPow + 1.0));\n\
					float sinTheta = sqrt(1.0 - cosTheta * cosTheta);\n\
					vec3 sampleDir = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);\n\
					return vecSpace * sampleDir;\n\
				}\n\
				vec3 ImportanceSampleGGX( vec2 uv, mat3 vecSpace, float Roughness )\n\
				{\n\
					float a = Roughness * Roughness;\n\
					float Phi = 2.0 * PI * uv.x;\n\
					float CosTheta = sqrt( (1.0 - uv.y) / ( 1.0 + (a*a - 1.0) * uv.y ) );\n\
					float SinTheta = sqrt( 1.0 - CosTheta * CosTheta );\n\
					return vecSpace * vec3(SinTheta * cos( Phi ), SinTheta * sin( Phi ), CosTheta);\n\
				}\n\
				mat3 matrixFromVector(vec3 n) {\n\
					float a = 1.0 / (1.0 + n.z);\n\
					float b = -n.x * n.y * a;\n\
					vec3 b1 = vec3(1.0 - n.x * n.x * a, b, -n.x);\n\
					vec3 b2 = vec3(b, 1.0 - n.y * n.y * a, -n.y);\n\
					return mat3(b1, b2, n);\n\
				}\n\
				\n\
				vec4 testColorMap(float Roughness) {\n\
					vec4 color;\n\
					if(faceIndex == 0)\n\
						color = vec4(1.0,0.0,0.0,1.0);\n\
					else if(faceIndex == 1)\n\
						color = vec4(0.0,1.0,0.0,1.0);\n\
					else if(faceIndex == 2)\n\
						color = vec4(0.0,0.0,1.0,1.0);\n\
					else if(faceIndex == 3)\n\
						color = vec4(1.0,1.0,0.0,1.0);\n\
					else if(faceIndex == 4)\n\
						color = vec4(0.0,1.0,1.0,1.0);\n\
					else\n\
						color = vec4(1.0,0.0,1.0,1.0);\n\
					color *= ( 1.0 - Roughness );\n\
					return color;\n\
				}\n\
				void main() {\n\
					vec3 sampleDirection;\n\
					vec2 uv = vUv*2.0 - 1.0;\n\
					float offset = -1.0/mapSize;\n\
					const float a = -1.0;\n\
					const float b = 1.0;\n\
					float c = -1.0 + offset;\n\
					float d = 1.0 - offset;\n\
					float bminusa = b - a;\n\
					uv.x = (uv.x - a)/bminusa * d - (uv.x - b)/bminusa * c;\n\
					uv.y = (uv.y - a)/bminusa * d - (uv.y - b)/bminusa * c;\n\
					if (faceIndex==0) {\n\
						sampleDirection = vec3(1.0, -uv.y, -uv.x);\n\
					} else if (faceIndex==1) {\n\
						sampleDirection = vec3(-1.0, -uv.y, uv.x);\n\
					} else if (faceIndex==2) {\n\
						sampleDirection = vec3(uv.x, 1.0, uv.y);\n\
					} else if (faceIndex==3) {\n\
						sampleDirection = vec3(uv.x, -1.0, -uv.y);\n\
					} else if (faceIndex==4) {\n\
						sampleDirection = vec3(uv.x, -uv.y, 1.0);\n\
					} else {\n\
						sampleDirection = vec3(-uv.x, -uv.y, -1.0);\n\
					}\n\
					vec3 correctedDirection = vec3( tFlip * sampleDirection.x, sampleDirection.yz );\n\
					mat3 vecSpace = matrixFromVector( normalize( correctedDirection ) );\n\
					vec3 rgbColor = vec3(0.0);\n\
					const int NumSamples = SAMPLES_PER_LEVEL;\n\
					vec3 vect;\n\
					float weight = 0.0;\n\
					for( int i = 0; i < NumSamples; i ++ ) {\n\
						float sini = sin(float(i));\n\
						float cosi = cos(float(i));\n\
						float r = rand(vec2(sini, cosi));\n\
						vect = ImportanceSampleGGX(vec2(float(i) / float(NumSamples), r), vecSpace, roughness);\n\
						float dotProd = dot(vect, normalize(sampleDirection));\n\
						weight += dotProd;\n\
						vec3 color = envMapTexelToLinear(textureCube(envMap, vect)).rgb;\n\
						rgbColor.rgb += color;\n\
					}\n\
					rgbColor /= float(NumSamples);\n\
					//rgbColor = testColorMap( roughness ).rgb;\n\
					gl_FragColor = linearToOutputTexel( vec4( rgbColor, 1.0 ) );\n\
				}",
			// 在使用此材质显示对象时要使用何种混合
			blending: NoBlending
		});
		shaderMaterial.type = 'PMREMGenerator';
		return shaderMaterial;
	}

	return PMREMGenerator;
})();

export {
	PMREMGenerator
};