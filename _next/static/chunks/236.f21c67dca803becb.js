"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[236],{16916:(e,t,i)=>{i.d(t,{m:()=>s});var r=i(87548);class s extends r.eaF{constructor(){let e=s.SkyShader;super(new r.iNn(1,1,1),new r.BKk({name:e.name,uniforms:r.LlO.clone(e.uniforms),vertexShader:e.vertexShader,fragmentShader:e.fragmentShader,side:r.hsX,depthWrite:!1})),this.isSky=!0}}s.SkyShader={name:"SkyShader",uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new r.Pq0},up:{value:new r.Pq0(0,1,0)}},vertexShader:`
		uniform vec3 sunPosition;
		uniform float rayleigh;
		uniform float turbidity;
		uniform float mieCoefficient;
		uniform vec3 up;

		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		// constants for atmospheric scattering
		const float e = 2.71828182845904523536028747135266249775724709369995957;
		const float pi = 3.141592653589793238462643383279502884197169;

		// wavelength of used primaries, according to preetham
		const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
		// this pre-calcuation replaces older TotalRayleigh(vec3 lambda) function:
		// (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
		const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

		// mie stuff
		// K coefficient for the primaries
		const float v = 4.0;
		const vec3 K = vec3( 0.686, 0.678, 0.666 );
		// MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
		const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

		// earth shadow hack
		// cutoffAngle = pi / 1.95;
		const float cutoffAngle = 1.6110731556870734;
		const float steepness = 1.5;
		const float EE = 1000.0;

		float sunIntensity( float zenithAngleCos ) {
			zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
			return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
		}

		vec3 totalMie( float T ) {
			float c = ( 0.2 * T ) * 10E-18;
			return 0.434 * c * MieConst;
		}

		void main() {

			vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
			vWorldPosition = worldPosition.xyz;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			gl_Position.z = gl_Position.w; // set z to camera.far

			vSunDirection = normalize( sunPosition );

			vSunE = sunIntensity( dot( vSunDirection, up ) );

			vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

			float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

			// extinction (absorbtion + out scattering)
			// rayleigh coefficients
			vBetaR = totalRayleigh * rayleighCoefficient;

			// mie coefficients
			vBetaM = totalMie( turbidity ) * mieCoefficient;

		}`,fragmentShader:`
		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		uniform float mieDirectionalG;
		uniform vec3 up;

		// constants for atmospheric scattering
		const float pi = 3.141592653589793238462643383279502884197169;

		const float n = 1.0003; // refractive index of air
		const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

		// optical length at zenith for molecules
		const float rayleighZenithLength = 8.4E3;
		const float mieZenithLength = 1.25E3;
		// 66 arc seconds -> degrees, and the cosine of that
		const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

		// 3.0 / ( 16.0 * pi )
		const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
		// 1.0 / ( 4.0 * pi )
		const float ONE_OVER_FOURPI = 0.07957747154594767;

		float rayleighPhase( float cosTheta ) {
			return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
		}

		float hgPhase( float cosTheta, float g ) {
			float g2 = pow( g, 2.0 );
			float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
			return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
		}

		void main() {

			vec3 direction = normalize( vWorldPosition - cameraPosition );

			// optical length
			// cutoff angle at 90 to avoid singularity in next formula.
			float zenithAngle = acos( max( 0.0, dot( up, direction ) ) );
			float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
			float sR = rayleighZenithLength * inverse;
			float sM = mieZenithLength * inverse;

			// combined extinction factor
			vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

			// in scattering
			float cosTheta = dot( direction, vSunDirection );

			float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
			vec3 betaRTheta = vBetaR * rPhase;

			float mPhase = hgPhase( cosTheta, mieDirectionalG );
			vec3 betaMTheta = vBetaM * mPhase;

			vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
			Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );

			// nightsky
			float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
			float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
			vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
			vec3 L0 = vec3( 0.1 ) * Fex;

			// composition + solar disc
			float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
			L0 += ( vSunE * 19000.0 * Fex ) * sundisk;

			vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

			vec3 retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );

			gl_FragColor = vec4( retColor, 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`}},21375:(e,t,i)=>{i.d(t,{_c:()=>o,pP:()=>s});var r=i(87548);function s(e,t=!1){let i=null!==e[0].index,o=new Set(Object.keys(e[0].attributes)),n=new Set(Object.keys(e[0].morphAttributes)),l={},h={},c=e[0].morphTargetsRelative,u=new r.LoY,d=0;for(let r=0;r<e.length;++r){let s=e[r],a=0;if(i!==(null!==s.index))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+r+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(let e in s.attributes){if(!o.has(e))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+r+'. All geometries must have compatible attributes; make sure "'+e+'" attribute exists among all geometries, or in none of them.'),null;void 0===l[e]&&(l[e]=[]),l[e].push(s.attributes[e]),a++}if(a!==o.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+r+". Make sure all geometries have the same number of attributes."),null;if(c!==s.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+r+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(let e in s.morphAttributes){if(!n.has(e))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+r+".  .morphAttributes must be consistent throughout all geometries."),null;void 0===h[e]&&(h[e]=[]),h[e].push(s.morphAttributes[e])}if(t){let e;if(i)e=s.index.count;else{if(void 0===s.attributes.position)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+r+". The geometry must have either an index or a position attribute"),null;e=s.attributes.position.count}u.addGroup(d,e,r),d+=e}}if(i){let t=0,i=[];for(let r=0;r<e.length;++r){let s=e[r].index;for(let e=0;e<s.count;++e)i.push(s.getX(e)+t);t+=e[r].attributes.position.count}u.setIndex(i)}for(let e in l){let t=a(l[e]);if(!t)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+e+" attribute."),null;u.setAttribute(e,t)}for(let e in h){let t=h[e][0].length;if(0===t)break;u.morphAttributes=u.morphAttributes||{},u.morphAttributes[e]=[];for(let i=0;i<t;++i){let t=[];for(let r=0;r<h[e].length;++r)t.push(h[e][r][i]);let r=a(t);if(!r)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+e+" morphAttribute."),null;u.morphAttributes[e].push(r)}}return u}function a(e){let t,i,s,a=-1,o=0;for(let r=0;r<e.length;++r){let n=e[r];if(void 0===t&&(t=n.array.constructor),t!==n.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(void 0===i&&(i=n.itemSize),i!==n.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(void 0===s&&(s=n.normalized),s!==n.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(-1===a&&(a=n.gpuType),a!==n.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;o+=n.count*i}let n=new t(o),l=new r.THS(n,i,s),h=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=h/i;for(let t=0,s=r.count;t<s;t++)for(let s=0;s<i;s++){let i=r.getComponent(t,s);l.setComponent(t+e,s,i)}}else n.set(r.array,h);h+=r.count*i}return void 0!==a&&(l.gpuType=a),l}function o(e,t){if(t===r.RJ4)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),e;if(t!==r.rYR&&t!==r.O49)return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",t),e;{let i=e.getIndex();if(null===i){let t=[],r=e.getAttribute("position");if(void 0===r)return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),e;for(let e=0;e<r.count;e++)t.push(e);e.setIndex(t),i=e.getIndex()}let s=i.count-2,a=[];if(t===r.rYR)for(let e=1;e<=s;e++)a.push(i.getX(0)),a.push(i.getX(e)),a.push(i.getX(e+1));else for(let e=0;e<s;e++)e%2==0?(a.push(i.getX(e)),a.push(i.getX(e+1)),a.push(i.getX(e+2))):(a.push(i.getX(e+2)),a.push(i.getX(e+1)),a.push(i.getX(e)));a.length/3!==s&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");let o=e.clone();return o.setIndex(a),o.clearGroups(),o}}},23264:(e,t,i)=>{i.d(t,{p:()=>a});var r=i(87548),s=i(63617);class a extends s.o{constructor(e,t){super(),this.textureID=void 0!==t?t:"tDiffuse",e instanceof r.BKk?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=r.LlO.clone(e.uniforms),this.material=new r.BKk({name:void 0!==e.name?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new s.F(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?e.setRenderTarget(null):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil)),this.fsQuad.render(e)}dispose(){this.material.dispose(),this.fsQuad.dispose()}}},23464:(e,t,i)=>{i.d(t,{X:()=>o});var r=i(87548),s=i(63617);let a={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class o extends s.o{constructor(){super(),this.uniforms=r.LlO.clone(a.uniforms),this.material=new r.D$Q({name:a.name,uniforms:this.uniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.fsQuad=new s.F(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},r.ppV.getTransfer(this._outputColorSpace)===r.KLL&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===r.kyO?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===r.Mjd?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===r.nNL?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===r.FV?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===r.LAk?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===r.aJ8&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),!0===this.renderToScreen?e.setRenderTarget(null):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil)),this.fsQuad.render(e)}dispose(){this.material.dispose(),this.fsQuad.dispose()}}},26451:(e,t,i)=>{i.d(t,{C:()=>n});var r=i(87548),s=i(63617),a=i(52049);let o={name:"LuminosityHighPassShader",shaderID:"luminosityHighPass",uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new r.Q1f(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class n extends s.o{constructor(e,t,i,n){super(),this.strength=void 0!==t?t:1,this.radius=i,this.threshold=n,this.resolution=void 0!==e?new r.I9Y(e.x,e.y):new r.I9Y(256,256),this.clearColor=new r.Q1f(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let l=Math.round(this.resolution.x/2),h=Math.round(this.resolution.y/2);this.renderTargetBright=new r.nWS(l,h,{type:r.ix0}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new r.nWS(l,h,{type:r.ix0});t.texture.name="UnrealBloomPass.h"+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let i=new r.nWS(l,h,{type:r.ix0});i.texture.name="UnrealBloomPass.v"+e,i.texture.generateMipmaps=!1,this.renderTargetsVertical.push(i),l=Math.round(l/2),h=Math.round(h/2)}this.highPassUniforms=r.LlO.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=n,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new r.BKk({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];let c=[3,5,7,9,11];l=Math.round(this.resolution.x/2),h=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(c[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new r.I9Y(1/l,1/h),l=Math.round(l/2),h=Math.round(h/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1,this.compositeMaterial.uniforms.bloomFactors.value=[1,.8,.6,.4,.2],this.bloomTintColors=[new r.Pq0(1,1,1),new r.Pq0(1,1,1),new r.Pq0(1,1,1),new r.Pq0(1,1,1),new r.Pq0(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;let u=a.Z;this.copyUniforms=r.LlO.clone(u.uniforms),this.blendMaterial=new r.BKk({uniforms:this.copyUniforms,vertexShader:u.vertexShader,fragmentShader:u.fragmentShader,blending:r.EZo,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new r.Q1f,this.oldClearAlpha=1,this.basic=new r.V9B,this.fsQuad=new s.F(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(i,s);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(i,s),this.renderTargetsVertical[e].setSize(i,s),this.separableBlurMaterials[e].uniforms.invSize.value=new r.I9Y(1/i,1/s),i=Math.round(i/2),s=Math.round(s/2)}render(e,t,i,r,s){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();let a=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let o=this.renderTargetBright;for(let t=0;t<this.nMips;t++)this.fsQuad.material=this.separableBlurMaterials[t],this.separableBlurMaterials[t].uniforms.colorTexture.value=o.texture,this.separableBlurMaterials[t].uniforms.direction.value=n.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[t]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[t].uniforms.colorTexture.value=this.renderTargetsHorizontal[t].texture,this.separableBlurMaterials[t].uniforms.direction.value=n.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[t]),e.clear(),this.fsQuad.render(e),o=this.renderTargetsVertical[t];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?e.setRenderTarget(null):e.setRenderTarget(i),this.fsQuad.render(e),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=a}getSeperableBlurMaterial(e){let t=[];for(let i=0;i<e;i++)t.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new r.BKk({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new r.I9Y(.5,.5)},direction:{value:new r.I9Y(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new r.BKk({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}n.BlurDirectionX=new r.I9Y(1,0),n.BlurDirectionY=new r.I9Y(0,1)},35833:(e,t,i)=>{i.d(t,{N:()=>p});var r=i(87548);let s={type:"change"},a={type:"start"},o={type:"end"},n=new r.RlV,l=new r.Zcv,h=Math.cos(70*r.cj9.DEG2RAD),c=new r.Pq0,u=2*Math.PI,d={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6};class p extends r.H2z{constructor(e,t=null){super(e,t),this.state=d.NONE,this.enabled=!0,this.target=new r.Pq0,this.cursor=new r.Pq0,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:r.kBv.ROTATE,MIDDLE:r.kBv.DOLLY,RIGHT:r.kBv.PAN},this.touches={ONE:r.wtR.ROTATE,TWO:r.wtR.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new r.Pq0,this._lastQuaternion=new r.PTz,this._lastTargetPosition=new r.Pq0,this._quat=new r.PTz().setFromUnitVectors(e.up,new r.Pq0(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new r.YHV,this._sphericalDelta=new r.YHV,this._scale=1,this._panOffset=new r.Pq0,this._rotateStart=new r.I9Y,this._rotateEnd=new r.I9Y,this._rotateDelta=new r.I9Y,this._panStart=new r.I9Y,this._panEnd=new r.I9Y,this._panDelta=new r.I9Y,this._dollyStart=new r.I9Y,this._dollyEnd=new r.I9Y,this._dollyDelta=new r.I9Y,this._dollyDirection=new r.Pq0,this._mouse=new r.I9Y,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=f.bind(this),this._onPointerDown=m.bind(this),this._onPointerUp=v.bind(this),this._onContextMenu=A.bind(this),this._onMouseWheel=T.bind(this),this._onKeyDown=_.bind(this),this._onTouchStart=b.bind(this),this._onTouchMove=y.bind(this),this._onMouseDown=g.bind(this),this._onMouseMove=x.bind(this),this._interceptControlDown=E.bind(this),this._interceptControlUp=M.bind(this),null!==this.domElement&&this.connect(),this.update()}connect(){this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){null!==this._domElementKeyEvents&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(s),this.update(),this.state=d.NONE}update(e=null){let t=this.object.position;c.copy(t).sub(this.target),c.applyQuaternion(this._quat),this._spherical.setFromVector3(c),this.autoRotate&&this.state===d.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,a=this.maxAzimuthAngle;isFinite(i)&&isFinite(a)&&(i<-Math.PI?i+=u:i>Math.PI&&(i-=u),a<-Math.PI?a+=u:a>Math.PI&&(a-=u),i<=a?this._spherical.theta=Math.max(i,Math.min(a,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+a)/2?Math.max(i,this._spherical.theta):Math.min(a,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),!0===this.enableDamping?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let o=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let e=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),o=e!=this._spherical.radius}if(c.setFromSpherical(this._spherical),c.applyQuaternion(this._quatInverse),t.copy(this.target).add(c),this.object.lookAt(this.target),!0===this.enableDamping?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let e=null;if(this.object.isPerspectiveCamera){let t=c.length();e=this._clampDistance(t*this._scale);let i=t-e;this.object.position.addScaledVector(this._dollyDirection,i),this.object.updateMatrixWorld(),o=!!i}else if(this.object.isOrthographicCamera){let t=new r.Pq0(this._mouse.x,this._mouse.y,0);t.unproject(this.object);let i=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),o=i!==this.object.zoom;let s=new r.Pq0(this._mouse.x,this._mouse.y,0);s.unproject(this.object),this.object.position.sub(s).add(t),this.object.updateMatrixWorld(),e=c.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;null!==e&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(e).add(this.object.position):(n.origin.copy(this.object.position),n.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(n.direction))<h?this.object.lookAt(this.target):(l.setFromNormalAndCoplanarPoint(this.object.up,this.target),n.intersectPlane(l,this.target))))}else if(this.object.isOrthographicCamera){let e=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),e!==this.object.zoom&&(this.object.updateProjectionMatrix(),o=!0)}return this._scale=1,this._performCursorZoom=!1,!!(o||this._lastPosition.distanceToSquared(this.object.position)>1e-6||8*(1-this._lastQuaternion.dot(this.object.quaternion))>1e-6||this._lastTargetPosition.distanceToSquared(this.target)>1e-6)&&(this.dispatchEvent(s),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0)}_getAutoRotationAngle(e){return null!==e?u/60*this.autoRotateSpeed*e:u/60/60*this.autoRotateSpeed}_getZoomScale(e){let t=Math.abs(.01*e);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){c.setFromMatrixColumn(t,0),c.multiplyScalar(-e),this._panOffset.add(c)}_panUp(e,t){!0===this.screenSpacePanning?c.setFromMatrixColumn(t,1):(c.setFromMatrixColumn(t,0),c.crossVectors(this.object.up,c)),c.multiplyScalar(e),this._panOffset.add(c)}_pan(e,t){let i=this.domElement;if(this.object.isPerspectiveCamera){let r=this.object.position;c.copy(r).sub(this.target);let s=c.length();s*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*s/i.clientHeight,this.object.matrix),this._panUp(2*t*s/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let i=this.domElement.getBoundingClientRect(),r=e-i.left,s=t-i.top,a=i.width,o=i.height;this._mouse.x=r/a*2-1,this._mouse.y=-(s/o*2)+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(u*this._rotateDelta.x/t.clientHeight),this._rotateUp(u*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateUp(u*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateUp(-u*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateLeft(u*this.rotateSpeed/this.domElement.clientHeight):this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateLeft(-u*this.rotateSpeed/this.domElement.clientHeight):this._pan(-this.keyPanSpeed,0),t=!0}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(1===this._pointers.length)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateStart.set(i,r)}}_handleTouchStartPan(e){if(1===this._pointers.length)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panStart.set(i,r)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),i=e.pageX-t.x,r=e.pageY-t.y,s=Math.sqrt(i*i+r*r);this._dollyStart.set(0,s)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(1==this._pointers.length)this._rotateEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateEnd.set(i,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(u*this._rotateDelta.x/t.clientHeight),this._rotateUp(u*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(1===this._pointers.length)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panEnd.set(i,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),i=e.pageX-t.x,r=e.pageY-t.y,s=Math.sqrt(i*i+r*r);this._dollyEnd.set(0,s),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return void this._pointers.splice(t,1)}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];void 0===t&&(t=new r.I9Y,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function m(e){!1!==this.enabled&&(0===this._pointers.length&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),this._isTrackingPointer(e)||(this._addPointer(e),"touch"===e.pointerType?this._onTouchStart(e):this._onMouseDown(e)))}function f(e){!1!==this.enabled&&("touch"===e.pointerType?this._onTouchMove(e):this._onMouseMove(e))}function v(e){switch(this._removePointer(e),this._pointers.length){case 0:this.domElement.releasePointerCapture(e.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(o),this.state=d.NONE;break;case 1:let t=this._pointers[0],i=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:i.x,pageY:i.y})}}function g(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case r.kBv.DOLLY:if(!1===this.enableZoom)return;this._handleMouseDownDolly(e),this.state=d.DOLLY;break;case r.kBv.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(!1===this.enablePan)return;this._handleMouseDownPan(e),this.state=d.PAN}else{if(!1===this.enableRotate)return;this._handleMouseDownRotate(e),this.state=d.ROTATE}break;case r.kBv.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(!1===this.enableRotate)return;this._handleMouseDownRotate(e),this.state=d.ROTATE}else{if(!1===this.enablePan)return;this._handleMouseDownPan(e),this.state=d.PAN}break;default:this.state=d.NONE}this.state!==d.NONE&&this.dispatchEvent(a)}function x(e){switch(this.state){case d.ROTATE:if(!1===this.enableRotate)return;this._handleMouseMoveRotate(e);break;case d.DOLLY:if(!1===this.enableZoom)return;this._handleMouseMoveDolly(e);break;case d.PAN:if(!1===this.enablePan)return;this._handleMouseMovePan(e)}}function T(e){!1!==this.enabled&&!1!==this.enableZoom&&this.state===d.NONE&&(e.preventDefault(),this.dispatchEvent(a),this._handleMouseWheel(this._customWheelEvent(e)),this.dispatchEvent(o))}function _(e){!1!==this.enabled&&!1!==this.enablePan&&this._handleKeyDown(e)}function b(e){switch(this._trackPointer(e),this._pointers.length){case 1:switch(this.touches.ONE){case r.wtR.ROTATE:if(!1===this.enableRotate)return;this._handleTouchStartRotate(e),this.state=d.TOUCH_ROTATE;break;case r.wtR.PAN:if(!1===this.enablePan)return;this._handleTouchStartPan(e),this.state=d.TOUCH_PAN;break;default:this.state=d.NONE}break;case 2:switch(this.touches.TWO){case r.wtR.DOLLY_PAN:if(!1===this.enableZoom&&!1===this.enablePan)return;this._handleTouchStartDollyPan(e),this.state=d.TOUCH_DOLLY_PAN;break;case r.wtR.DOLLY_ROTATE:if(!1===this.enableZoom&&!1===this.enableRotate)return;this._handleTouchStartDollyRotate(e),this.state=d.TOUCH_DOLLY_ROTATE;break;default:this.state=d.NONE}break;default:this.state=d.NONE}this.state!==d.NONE&&this.dispatchEvent(a)}function y(e){switch(this._trackPointer(e),this.state){case d.TOUCH_ROTATE:if(!1===this.enableRotate)return;this._handleTouchMoveRotate(e),this.update();break;case d.TOUCH_PAN:if(!1===this.enablePan)return;this._handleTouchMovePan(e),this.update();break;case d.TOUCH_DOLLY_PAN:if(!1===this.enableZoom&&!1===this.enablePan)return;this._handleTouchMoveDollyPan(e),this.update();break;case d.TOUCH_DOLLY_ROTATE:if(!1===this.enableZoom&&!1===this.enableRotate)return;this._handleTouchMoveDollyRotate(e),this.update();break;default:this.state=d.NONE}}function A(e){!1!==this.enabled&&e.preventDefault()}function E(e){"Control"===e.key&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function M(e){"Control"===e.key&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}},50770:(e,t,i)=>{i.d(t,{x:()=>o});var r=i(87548),s=i(63617);let a={name:"BokehShader",defines:{DEPTH_PACKING:1,PERSPECTIVE_CAMERA:1},uniforms:{tColor:{value:null},tDepth:{value:null},focus:{value:1},aspect:{value:1},aperture:{value:.025},maxblur:{value:.01},nearClip:{value:1},farClip:{value:1e3}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#include <common>

		varying vec2 vUv;

		uniform sampler2D tColor;
		uniform sampler2D tDepth;

		uniform float maxblur; // max blur amount
		uniform float aperture; // aperture - bigger values for shallower depth of field

		uniform float nearClip;
		uniform float farClip;

		uniform float focus;
		uniform float aspect;

		#include <packing>

		float getDepth( const in vec2 screenPosition ) {
			#if DEPTH_PACKING == 1
			return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
			#else
			return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		float getViewZ( const in float depth ) {
			#if PERSPECTIVE_CAMERA == 1
			return perspectiveDepthToViewZ( depth, nearClip, farClip );
			#else
			return orthographicDepthToViewZ( depth, nearClip, farClip );
			#endif
		}


		void main() {

			vec2 aspectcorrect = vec2( 1.0, aspect );

			float viewZ = getViewZ( getDepth( vUv ) );

			float factor = ( focus + viewZ ); // viewZ is <= 0, so this is a difference equation

			vec2 dofblur = vec2 ( clamp( factor * aperture, -maxblur, maxblur ) );

			vec2 dofblur9 = dofblur * 0.9;
			vec2 dofblur7 = dofblur * 0.7;
			vec2 dofblur4 = dofblur * 0.4;

			vec4 col = vec4( 0.0 );

			col += texture2D( tColor, vUv.xy );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur9 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur7 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );

			gl_FragColor = col / 41.0;
			gl_FragColor.a = 1.0;

		}`};class o extends s.o{constructor(e,t,i){super(),this.scene=e,this.camera=t;let o=void 0!==i.focus?i.focus:1,n=void 0!==i.aperture?i.aperture:.025,l=void 0!==i.maxblur?i.maxblur:1;this.renderTargetDepth=new r.nWS(1,1,{minFilter:r.hxR,magFilter:r.hxR,type:r.ix0}),this.renderTargetDepth.texture.name="BokehPass.depth",this.materialDepth=new r.CSG,this.materialDepth.depthPacking=r.N5j,this.materialDepth.blending=r.XIg;let h=r.LlO.clone(a.uniforms);h.tDepth.value=this.renderTargetDepth.texture,h.focus.value=o,h.aspect.value=t.aspect,h.aperture.value=n,h.maxblur.value=l,h.nearClip.value=t.near,h.farClip.value=t.far,this.materialBokeh=new r.BKk({defines:Object.assign({},a.defines),uniforms:h,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.uniforms=h,this.fsQuad=new s.F(this.materialBokeh),this._oldClearColor=new r.Q1f}render(e,t,i){this.scene.overrideMaterial=this.materialDepth,e.getClearColor(this._oldClearColor);let r=e.getClearAlpha(),s=e.autoClear;e.autoClear=!1,e.setClearColor(0xffffff),e.setClearAlpha(1),e.setRenderTarget(this.renderTargetDepth),e.clear(),e.render(this.scene,this.camera),this.uniforms.tColor.value=i.texture,this.uniforms.nearClip.value=this.camera.near,this.uniforms.farClip.value=this.camera.far,this.renderToScreen?e.setRenderTarget(null):(e.setRenderTarget(t),e.clear()),this.fsQuad.render(e),this.scene.overrideMaterial=null,e.setClearColor(this._oldClearColor),e.setClearAlpha(r),e.autoClear=s}setSize(e,t){this.materialBokeh.uniforms.aspect.value=e/t,this.renderTargetDepth.setSize(e,t)}dispose(){this.renderTargetDepth.dispose(),this.materialDepth.dispose(),this.materialBokeh.dispose(),this.fsQuad.dispose()}}},52049:(e,t,i)=>{i.d(t,{Z:()=>r});let r={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`}},52747:(e,t,i)=>{i.d(t,{F:()=>d});var r=i(87548),s=i(63617);let a={name:"GTAOShader",defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,DEPTH_SWIZZLING:"x",SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new r.I9Y},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new r.kn4},cameraProjectionMatrixInverse:{value:new r.kn4},cameraWorldMatrix:{value:new r.kn4},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new r.Pq0(-1,-1,-1)},sceneBoxMax:{value:new r.Pq0(1,1,1)}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		varying vec2 vUv;
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraProjectionMatrixInverse;		
		uniform mat4 cameraWorldMatrix;
		uniform float radius;
		uniform float distanceExponent;
		uniform float thickness;
		uniform float distanceFallOff;
		uniform float scale;
		#if SCENE_CLIP_BOX == 1
			uniform vec3 sceneBoxMin;
			uniform vec3 sceneBoxMax;
		#endif
		
		#include <common>
		#include <packing>

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
		#endif

		vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
			vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {  
			return textureLod(tDepth, uv.xy, 0.0).DEPTH_SWIZZLING;
		}

		float fetchDepth(const ivec2 uv) {   
			return texelFetch(tDepth, uv.xy, 0).DEPTH_SWIZZLING;
		}

		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ? ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz : -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ? ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz : -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
			#if NORMAL_VECTOR_TYPE == 2
				return normalize(textureLod(tNormal, uv, 0.).rgb);
			#elif NORMAL_VECTOR_TYPE == 1
				return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
			#else
				return computeNormalFromDepth(uv);
			#endif
		}

		vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
			vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.);
			vec2 sampleUv = sampleClipPos.xy / sampleClipPos.w * 0.5 + 0.5;
			float sampleSceneDepth = getDepth(sampleUv);
			return vec3(sampleUv, sampleSceneDepth);
		}
		
		void main() {
			float depth = getDepth(vUv.xy);
			if (depth >= 1.0) {
				discard;
				return;
			}
			vec3 viewPos = getViewPosition(vUv, depth);
			vec3 viewNormal = getViewNormal(vUv);

			float radiusToUse = radius;
			float distanceFalloffToUse = thickness;
			#if SCREEN_SPACE_RADIUS == 1
				float radiusScale = getViewPosition(vec2(0.5 + float(SCREEN_SPACE_RADIUS_SCALE) / resolution.x, 0.0), depth).x;
				radiusToUse *= radiusScale;
				distanceFalloffToUse *= radiusScale;
			#endif

			#if SCENE_CLIP_BOX == 1
				vec3 worldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
				float boxDistance = length(max(vec3(0.0), max(sceneBoxMin - worldPos, worldPos - sceneBoxMax)));
				if (boxDistance > radiusToUse) {
					discard;
					return;
				}
			#endif
			
			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
			vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;
			vec3 tangent = normalize(vec3(randomVec.xy, 0.));
			vec3 bitangent = vec3(-tangent.y, tangent.x, 0.);
			mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0., 0., 1.));

			const int DIRECTIONS = SAMPLES < 30 ? 3 : 5;
			const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;
			float ao = 0.0;
			for (int i = 0; i < DIRECTIONS; ++i) {
				
				float angle = float(i) / float(DIRECTIONS) * PI;
				vec4 sampleDir = vec4(cos(angle), sin(angle), 0., 0.5 + 0.5 * noiseTexel.w); 
				sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);

				vec3 viewDir = normalize(-viewPos.xyz);
				vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
				vec3 sliceTangent = cross(sliceBitangent, viewDir);
				vec3 normalInSlice = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));
				
				vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
				vec2 cosHorizons = vec2(dot(viewDir, tangentToNormalInSlice), dot(viewDir, -tangentToNormalInSlice));
				
				for (int j = 0; j < STEPS; ++j) {
					vec3 sampleViewOffset = sampleDir.xyz * radiusToUse * sampleDir.w * pow(float(j + 1) / float(STEPS), distanceExponent);	

					vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + sampleViewOffset);
					vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					vec3 viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.x += max(0., (sampleCosHorizon - cosHorizons.x) * mix(1., 2. / float(j + 2), distanceFallOff));
					}		

					sampleSceneUvDepth = getSceneUvAndDepth(viewPos - sampleViewOffset);
					sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.y += max(0., (sampleCosHorizon - cosHorizons.y) * mix(1., 2. / float(j + 2), distanceFallOff));
					}
				}

				vec2 sinHorizons = sqrt(1. - cosHorizons * cosHorizons);
				float nx = dot(normalInSlice, sliceTangent);
				float ny = dot(normalInSlice, viewDir);
				float nxb = 1. / 2. * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
				float nyb = 1. / 2. * (2. - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
				float occlusion = nx * nxb + ny * nyb;
				ao += occlusion;
			}

			ao = clamp(ao / float(DIRECTIONS), 0., 1.);		
		#if SCENE_CLIP_BOX == 1
			ao = mix(ao, 1., smoothstep(0., radiusToUse, boxDistance));
		#endif
			ao = pow(ao, scale);

			gl_FragColor = FRAGMENT_OUTPUT;
		}`},o={name:"GTAODepthShader",defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},n={name:"GTAOBlendShader",uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);
		}`},l={name:"PoissonDenoiseShader",defines:{SAMPLES:16,SAMPLE_VECTORS:h(16,2,1),NORMAL_VECTOR_TYPE:1,DEPTH_VALUE_SOURCE:0},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new r.I9Y},cameraProjectionMatrixInverse:{value:new r.kn4},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`

		varying vec2 vUv;

		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform float lumaPhi;
		uniform float depthPhi;
		uniform float normalPhi;
		uniform float radius;
		uniform int index;
		
		#include <common>
		#include <packing>

		#ifndef SAMPLE_LUMINANCE
		#define SAMPLE_LUMINANCE dot(vec3(0.2125, 0.7154, 0.0721), a)
		#endif

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(denoised, 1.)
		#endif

		float getLuminance(const in vec3 a) {
			return SAMPLE_LUMINANCE;
		}

		const vec3 poissonDisk[SAMPLES] = SAMPLE_VECTORS;

		vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
			vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}
		
		float getDepth(const vec2 uv) {
		#if DEPTH_VALUE_SOURCE == 1    
			return textureLod(tDepth, uv.xy, 0.0).a;
		#else
			return textureLod(tDepth, uv.xy, 0.0).r;
		#endif
		}

		float fetchDepth(const ivec2 uv) {
			#if DEPTH_VALUE_SOURCE == 1    
				return texelFetch(tDepth, uv.xy, 0).a;
			#else
				return texelFetch(tDepth, uv.xy, 0).r;
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ?  ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz
									: -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ?  ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz
									: -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
		#if NORMAL_VECTOR_TYPE == 2
			return normalize(textureLod(tNormal, uv, 0.).rgb);
		#elif NORMAL_VECTOR_TYPE == 1
			return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
		#else
			return computeNormalFromDepth(uv);
		#endif
		}

		void denoiseSample(in vec3 center, in vec3 viewNormal, in vec3 viewPos, in vec2 sampleUv, inout vec3 denoised, inout float totalWeight) {
			vec4 sampleTexel = textureLod(tDiffuse, sampleUv, 0.0);
			float sampleDepth = getDepth(sampleUv);
			vec3 sampleNormal = getViewNormal(sampleUv);
			vec3 neighborColor = sampleTexel.rgb;
			vec3 viewPosSample = getViewPosition(sampleUv, sampleDepth);
			
			float normalDiff = dot(viewNormal, sampleNormal);
			float normalSimilarity = pow(max(normalDiff, 0.), normalPhi);
			float lumaDiff = abs(getLuminance(neighborColor) - getLuminance(center));
			float lumaSimilarity = max(1.0 - lumaDiff / lumaPhi, 0.0);
			float depthDiff = abs(dot(viewPos - viewPosSample, viewNormal));
			float depthSimilarity = max(1. - depthDiff / depthPhi, 0.);
			float w = lumaSimilarity * depthSimilarity * normalSimilarity;
		
			denoised += w * neighborColor;
			totalWeight += w;
		}
		
		void main() {
			float depth = getDepth(vUv.xy);	
			vec3 viewNormal = getViewNormal(vUv);	
			if (depth == 1. || dot(viewNormal, viewNormal) == 0.) {
				discard;
				return;
			}
			vec4 texel = textureLod(tDiffuse, vUv, 0.0);
			vec3 center = texel.rgb;
			vec3 viewPos = getViewPosition(vUv, depth);

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
      		vec2 noiseVec = vec2(sin(noiseTexel[index % 4] * 2. * PI), cos(noiseTexel[index % 4] * 2. * PI));
    		mat2 rotationMatrix = mat2(noiseVec.x, -noiseVec.y, noiseVec.x, noiseVec.y);
		
			float totalWeight = 1.0;
			vec3 denoised = texel.rgb;
			for (int i = 0; i < SAMPLES; i++) {
				vec3 sampleDir = poissonDisk[i];
				vec2 offset = rotationMatrix * (sampleDir.xy * (1. + sampleDir.z * (radius - 1.)) / resolution);
				vec2 sampleUv = vUv + offset;
				denoiseSample(center, viewNormal, viewPos, sampleUv, denoised, totalWeight);
			}
		
			if (totalWeight > 0.) { 
				denoised /= totalWeight;
			}
			gl_FragColor = FRAGMENT_OUTPUT;
		}`};function h(e,t,i){let s=function(e,t,i){let s=[];for(let a=0;a<e;a++){let o=2*Math.PI*t*a/e,n=Math.pow(a/(e-1),i);s.push(new r.Pq0(Math.cos(o),Math.sin(o),n))}return s}(e,t,i),a="vec3[SAMPLES](";for(let t=0;t<e;t++){let i=s[t];a+=`vec3(${i.x}, ${i.y}, ${i.z})${t<e-1?",":")"}`}return a}var c=i(52049);class u{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(256*e.random());this.perm=[];for(let e=0;e<512;e++)this.perm[e]=this.p[255&e];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}dot(e,t,i){return e[0]*t+e[1]*i}dot3(e,t,i,r){return e[0]*t+e[1]*i+e[2]*r}dot4(e,t,i,r,s){return e[0]*t+e[1]*i+e[2]*r+e[3]*s}noise(e,t){let i,r,s,a,o,n=.5*(Math.sqrt(3)-1)*(e+t),l=Math.floor(e+n),h=Math.floor(t+n),c=(3-Math.sqrt(3))/6,u=(l+h)*c,d=e-(l-u),p=t-(h-u);d>p?(a=1,o=0):(a=0,o=1);let m=d-a+c,f=p-o+c,v=d-1+2*c,g=p-1+2*c,x=255&l,T=255&h,_=this.perm[x+this.perm[T]]%12,b=this.perm[x+a+this.perm[T+o]]%12,y=this.perm[x+1+this.perm[T+1]]%12,A=.5-d*d-p*p;A<0?i=0:(A*=A,i=A*A*this.dot(this.grad3[_],d,p));let E=.5-m*m-f*f;E<0?r=0:(E*=E,r=E*E*this.dot(this.grad3[b],m,f));let M=.5-v*v-g*g;return M<0?s=0:(M*=M,s=M*M*this.dot(this.grad3[y],v,g)),70*(i+r+s)}noise3d(e,t,i){let r,s,a,o,n,l,h,c,u,d,p=1/3*(e+t+i),m=Math.floor(e+p),f=Math.floor(t+p),v=Math.floor(i+p),g=1/6*(m+f+v),x=e-(m-g),T=t-(f-g),_=i-(v-g);x>=T?T>=_?(n=1,l=0,h=0,c=1,u=1,d=0):(x>=_?(n=1,l=0,h=0):(n=0,l=0,h=1),c=1,u=0,d=1):T<_?(n=0,l=0,h=1,c=0,u=1,d=1):x<_?(n=0,l=1,h=0,c=0,u=1,d=1):(n=0,l=1,h=0,c=1,u=1,d=0);let b=x-n+1/6,y=T-l+1/6,A=_-h+1/6,E=x-c+1/6*2,M=T-u+1/6*2,S=_-d+1/6*2,R=x-1+1/6*3,P=T-1+1/6*3,w=_-1+1/6*3,C=255&m,D=255&f,N=255&v,I=this.perm[C+this.perm[D+this.perm[N]]]%12,L=this.perm[C+n+this.perm[D+l+this.perm[N+h]]]%12,O=this.perm[C+c+this.perm[D+u+this.perm[N+d]]]%12,U=this.perm[C+1+this.perm[D+1+this.perm[N+1]]]%12,k=.6-x*x-T*T-_*_;k<0?r=0:(k*=k,r=k*k*this.dot3(this.grad3[I],x,T,_));let B=.6-b*b-y*y-A*A;B<0?s=0:(B*=B,s=B*B*this.dot3(this.grad3[L],b,y,A));let F=.6-E*E-M*M-S*S;F<0?a=0:(F*=F,a=F*F*this.dot3(this.grad3[O],E,M,S));let H=.6-R*R-P*P-w*w;return H<0?o=0:(H*=H,o=H*H*this.dot3(this.grad3[U],R,P,w)),32*(r+s+a+o)}noise4d(e,t,i,r){let s,a,o,n,l,h=this.grad4,c=this.simplex,u=this.perm,d=(5-Math.sqrt(5))/20,p=(Math.sqrt(5)-1)/4*(e+t+i+r),m=Math.floor(e+p),f=Math.floor(t+p),v=Math.floor(i+p),g=Math.floor(r+p),x=(m+f+v+g)*d,T=e-(m-x),_=t-(f-x),b=i-(v-x),y=r-(g-x),A=32*(T>_)+16*(T>b)+8*(_>b)+4*(T>y)+2*(_>y)+ +(b>y),E=+(c[A][0]>=3),M=+(c[A][1]>=3),S=+(c[A][2]>=3),R=+(c[A][3]>=3),P=+(c[A][0]>=2),w=+(c[A][1]>=2),C=+(c[A][2]>=2),D=+(c[A][3]>=2),N=+(c[A][0]>=1),I=+(c[A][1]>=1),L=+(c[A][2]>=1),O=+(c[A][3]>=1),U=T-E+d,k=_-M+d,B=b-S+d,F=y-R+d,H=T-P+2*d,z=_-w+2*d,j=b-C+2*d,G=y-D+2*d,V=T-N+3*d,K=_-I+3*d,Y=b-L+3*d,X=y-O+3*d,Z=T-1+4*d,q=_-1+4*d,W=b-1+4*d,Q=y-1+4*d,J=255&m,$=255&f,ee=255&v,et=255&g,ei=u[J+u[$+u[ee+u[et]]]]%32,er=u[J+E+u[$+M+u[ee+S+u[et+R]]]]%32,es=u[J+P+u[$+w+u[ee+C+u[et+D]]]]%32,ea=u[J+N+u[$+I+u[ee+L+u[et+O]]]]%32,eo=u[J+1+u[$+1+u[ee+1+u[et+1]]]]%32,en=.6-T*T-_*_-b*b-y*y;en<0?s=0:(en*=en,s=en*en*this.dot4(h[ei],T,_,b,y));let el=.6-U*U-k*k-B*B-F*F;el<0?a=0:(el*=el,a=el*el*this.dot4(h[er],U,k,B,F));let eh=.6-H*H-z*z-j*j-G*G;eh<0?o=0:(eh*=eh,o=eh*eh*this.dot4(h[es],H,z,j,G));let ec=.6-V*V-K*K-Y*Y-X*X;ec<0?n=0:(ec*=ec,n=ec*ec*this.dot4(h[ea],V,K,Y,X));let eu=.6-Z*Z-q*q-W*W-Q*Q;return eu<0?l=0:(eu*=eu,l=eu*eu*this.dot4(h[eo],Z,q,W,Q)),27*(s+a+o+n+l)}}class d extends s.o{constructor(e,t,i,h,u,d,p){super(),this.width=void 0!==i?i:512,this.height=void 0!==h?h:512,this.clear=!0,this.camera=t,this.scene=e,this.output=0,this._renderGBuffer=!0,this._visibilityCache=new Map,this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=function(e=5){let t=Math.floor(e)%2==0?Math.floor(e)+1:Math.floor(e),i=function(e){let t=Math.floor(e)%2==0?Math.floor(e)+1:Math.floor(e),i=t*t,r=Array(i).fill(0),s=Math.floor(t/2),a=t-1;for(let e=1;e<=i;){if(-1===s&&a===t?(a=t-2,s=0):(a===t&&(a=0),s<0&&(s=t-1)),0!==r[s*t+a]){a-=2,s++;continue}r[s*t+a]=e++,a++,s--}return r}(t),s=i.length,a=new Uint8Array(4*s);for(let e=0;e<s;++e){let t=2*Math.PI*i[e]/s,o=new r.Pq0(Math.cos(t),Math.sin(t),0).normalize();a[4*e]=(.5*o.x+.5)*255,a[4*e+1]=(.5*o.y+.5)*255,a[4*e+2]=127,a[4*e+3]=255}let o=new r.GYF(a,t,t);return o.wrapS=r.GJx,o.wrapT=r.GJx,o.needsUpdate=!0,o}(),this.pdNoiseTexture=this.generateNoise(),this.gtaoRenderTarget=new r.nWS(this.width,this.height,{type:r.ix0}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new r.BKk({defines:Object.assign({},a.defines),uniforms:r.LlO.clone(a.uniforms),vertexShader:a.vertexShader,fragmentShader:a.fragmentShader,blending:r.XIg,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=+!!this.camera.isPerspectiveCamera,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new r.qBx,this.normalMaterial.blending=r.XIg,this.pdMaterial=new r.BKk({defines:Object.assign({},l.defines),uniforms:r.LlO.clone(l.uniforms),vertexShader:l.vertexShader,fragmentShader:l.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new r.BKk({defines:Object.assign({},o.defines),uniforms:r.LlO.clone(o.uniforms),vertexShader:o.vertexShader,fragmentShader:o.fragmentShader,blending:r.XIg}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new r.BKk({uniforms:r.LlO.clone(c.Z.uniforms),vertexShader:c.Z.vertexShader,fragmentShader:c.Z.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:r.wn6,blendDst:r.ojh,blendEquation:r.gO9,blendSrcAlpha:r.hdd,blendDstAlpha:r.ojh,blendEquationAlpha:r.gO9}),this.blendMaterial=new r.BKk({uniforms:r.LlO.clone(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:r.bCz,blendSrc:r.wn6,blendDst:r.ojh,blendEquation:r.gO9,blendSrcAlpha:r.hdd,blendDstAlpha:r.ojh,blendEquationAlpha:r.gO9}),this.fsQuad=new s.F(null),this.originalClearColor=new r.Q1f,this.setGBuffer(u?u.depthTexture:void 0,u?u.normalTexture:void 0),void 0!==d&&this.updateGtaoMaterial(d),void 0!==p&&this.updatePdMaterial(p)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this.fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(e,t){void 0!==e?(this.depthTexture=e,this.normalTexture=t,this._renderGBuffer=!1):(this.depthTexture=new r.VCu,this.depthTexture.format=r.dcC,this.depthTexture.type=r.V3x,this.normalRenderTarget=new r.nWS(this.width,this.height,{minFilter:r.hxR,magFilter:r.hxR,type:r.ix0,depthTexture:this.depthTexture}),this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0);let i=+!!this.normalTexture,s=this.depthTexture===this.normalTexture?"w":"x";this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=i,this.gtaoMaterial.defines.DEPTH_SWIZZLING=s,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=i,this.pdMaterial.defines.DEPTH_SWIZZLING=s,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture}setSceneClipBox(e){e?(this.gtaoMaterial.needsUpdate=1!==this.gtaoMaterial.defines.SCENE_CLIP_BOX,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(e.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(e.max)):(this.gtaoMaterial.needsUpdate=0===this.gtaoMaterial.defines.SCENE_CLIP_BOX,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(e){void 0!==e.radius&&(this.gtaoMaterial.uniforms.radius.value=e.radius),void 0!==e.distanceExponent&&(this.gtaoMaterial.uniforms.distanceExponent.value=e.distanceExponent),void 0!==e.thickness&&(this.gtaoMaterial.uniforms.thickness.value=e.thickness),void 0!==e.distanceFallOff&&(this.gtaoMaterial.uniforms.distanceFallOff.value=e.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),void 0!==e.scale&&(this.gtaoMaterial.uniforms.scale.value=e.scale),void 0!==e.samples&&e.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=e.samples,this.gtaoMaterial.needsUpdate=!0),void 0!==e.screenSpaceRadius&&+!!e.screenSpaceRadius!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=+!!e.screenSpaceRadius,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(e){let t=!1;void 0!==e.lumaPhi&&(this.pdMaterial.uniforms.lumaPhi.value=e.lumaPhi),void 0!==e.depthPhi&&(this.pdMaterial.uniforms.depthPhi.value=e.depthPhi),void 0!==e.normalPhi&&(this.pdMaterial.uniforms.normalPhi.value=e.normalPhi),void 0!==e.radius&&e.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=e.radius),void 0!==e.radiusExponent&&e.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=e.radiusExponent,t=!0),void 0!==e.rings&&e.rings!==this.pdRings&&(this.pdRings=e.rings,t=!0),void 0!==e.samples&&e.samples!==this.pdSamples&&(this.pdSamples=e.samples,t=!0),t&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=h(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(e,t,i){switch(this._renderGBuffer&&(this.overrideVisibility(),this.renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this.restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this.renderPass(e,this.gtaoMaterial,this.gtaoRenderTarget,0xffffff,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.renderPass(e,this.pdMaterial,this.pdRenderTarget,0xffffff,1),this.output){case d.OUTPUT.Off:break;case d.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=i.texture,this.copyMaterial.blending=r.XIg,this.renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case d.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=r.XIg,this.renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case d.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=r.XIg,this.renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case d.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:t);break;case d.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=r.XIg,this.renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case d.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=i.texture,this.copyMaterial.blending=r.XIg,this.renderPass(e,this.copyMaterial,this.renderToScreen?null:t),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.renderPass(e,this.blendMaterial,this.renderToScreen?null:t);break;default:console.warn("THREE.GTAOPass: Unknown output type.")}}renderPass(e,t,i,r,s){e.getClearColor(this.originalClearColor);let a=e.getClearAlpha(),o=e.autoClear;e.setRenderTarget(i),e.autoClear=!1,null!=r&&(e.setClearColor(r),e.setClearAlpha(s||0),e.clear()),this.fsQuad.material=t,this.fsQuad.render(e),e.autoClear=o,e.setClearColor(this.originalClearColor),e.setClearAlpha(a)}renderOverride(e,t,i,r,s){e.getClearColor(this.originalClearColor);let a=e.getClearAlpha(),o=e.autoClear;e.setRenderTarget(i),e.autoClear=!1,r=t.clearColor||r,s=t.clearAlpha||s,null!=r&&(e.setClearColor(r),e.setClearAlpha(s||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=o,e.setClearColor(this.originalClearColor),e.setClearAlpha(a)}setSize(e,t){this.width=e,this.height=t,this.gtaoRenderTarget.setSize(e,t),this.normalRenderTarget.setSize(e,t),this.pdRenderTarget.setSize(e,t),this.gtaoMaterial.uniforms.resolution.value.set(e,t),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(e,t),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}overrideVisibility(){let e=this.scene,t=this._visibilityCache;e.traverse(function(e){t.set(e,e.visible),(e.isPoints||e.isLine)&&(e.visible=!1)})}restoreVisibility(){let e=this.scene,t=this._visibilityCache;e.traverse(function(e){let i=t.get(e);e.visible=i}),t.clear()}generateNoise(e=64){let t=new u,i=new Uint8Array(e*e*4);for(let r=0;r<e;r++)for(let s=0;s<e;s++){let a=r,o=s;i[(r*e+s)*4]=(.5*t.noise(a,o)+.5)*255,i[(r*e+s)*4+1]=(.5*t.noise(a+e,o)+.5)*255,i[(r*e+s)*4+2]=(.5*t.noise(a,o+e)+.5)*255,i[(r*e+s)*4+3]=(.5*t.noise(a+e,o+e)+.5)*255}let s=new r.GYF(i,e,e,r.GWd,r.OUM);return s.wrapS=r.GJx,s.wrapT=r.GJx,s.needsUpdate=!0,s}}d.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5}},53789:(e,t,i)=>{i.d(t,{A:()=>a});var r=i(87548),s=i(63617);class a extends s.o{constructor(e,t,i=null,s=null,a=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=s,this.clearAlpha=a,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new r.Q1f}render(e,t,i){let r,s,a=e.autoClear;e.autoClear=!1,null!==this.overrideMaterial&&(s=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),null!==this.clearColor&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),null!==this.clearAlpha&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),!0==this.clearDepth&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),!0===this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),null!==this.clearColor&&e.setClearColor(this._oldClearColor),null!==this.clearAlpha&&e.setClearAlpha(r),null!==this.overrideMaterial&&(this.scene.overrideMaterial=s),e.autoClear=a}}},56121:(e,t,i)=>{i.d(t,{B:()=>a});var r=i(87548),s=i(21375);class a extends r.aHM{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(e){return new u(e)}),this.register(function(e){return new d(e)}),this.register(function(e){return new b(e)}),this.register(function(e){return new y(e)}),this.register(function(e){return new A(e)}),this.register(function(e){return new m(e)}),this.register(function(e){return new f(e)}),this.register(function(e){return new v(e)}),this.register(function(e){return new g(e)}),this.register(function(e){return new c(e)}),this.register(function(e){return new x(e)}),this.register(function(e){return new p(e)}),this.register(function(e){return new _(e)}),this.register(function(e){return new T(e)}),this.register(function(e){return new l(e)}),this.register(function(e){return new E(e)}),this.register(function(e){return new M(e)})}load(e,t,i,s){let a,o=this;if(""!==this.resourcePath)a=this.resourcePath;else if(""!==this.path){let t=r.r6x.extractUrlBase(e);a=r.r6x.resolveURL(t,this.path)}else a=r.r6x.extractUrlBase(e);this.manager.itemStart(e);let n=function(t){s?s(t):console.error(t),o.manager.itemError(e),o.manager.itemEnd(e)},l=new r.Y9S(this.manager);l.setPath(this.path),l.setResponseType("arraybuffer"),l.setRequestHeader(this.requestHeader),l.setWithCredentials(this.withCredentials),l.load(e,function(i){try{o.parse(i,a,function(i){t(i),o.manager.itemEnd(e)},n)}catch(e){n(e)}},i,n)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return -1===this.pluginCallbacks.indexOf(e)&&this.pluginCallbacks.push(e),this}unregister(e){return -1!==this.pluginCallbacks.indexOf(e)&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,i,r){let s,a={},o={},l=new TextDecoder;if("string"==typeof e)s=JSON.parse(e);else if(e instanceof ArrayBuffer)if(l.decode(new Uint8Array(e,0,4))===S){try{a[n.KHR_BINARY_GLTF]=new P(e)}catch(e){r&&r(e);return}s=JSON.parse(a[n.KHR_BINARY_GLTF].content)}else s=JSON.parse(l.decode(e));else s=e;if(void 0===s.asset||s.asset.version[0]<2){r&&r(Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}let c=new q(s,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});c.fileLoader.setRequestHeader(this.requestHeader);for(let e=0;e<this.pluginCallbacks.length;e++){let t=this.pluginCallbacks[e](c);t.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),o[t.name]=t,a[t.name]=!0}if(s.extensionsUsed)for(let e=0;e<s.extensionsUsed.length;++e){let t=s.extensionsUsed[e],i=s.extensionsRequired||[];switch(t){case n.KHR_MATERIALS_UNLIT:a[t]=new h;break;case n.KHR_DRACO_MESH_COMPRESSION:a[t]=new w(s,this.dracoLoader);break;case n.KHR_TEXTURE_TRANSFORM:a[t]=new C;break;case n.KHR_MESH_QUANTIZATION:a[t]=new D;break;default:i.indexOf(t)>=0&&void 0===o[t]&&console.warn('THREE.GLTFLoader: Unknown extension "'+t+'".')}}c.setExtensions(a),c.setPlugins(o),c.parse(i,r)}parseAsync(e,t){let i=this;return new Promise(function(r,s){i.parse(e,t,r,s)})}}function o(){let e={};return{get:function(t){return e[t]},add:function(t,i){e[t]=i},remove:function(t){delete e[t]},removeAll:function(){e={}}}}let n={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class l{constructor(e){this.parser=e,this.name=n.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let i=0,r=t.length;i<r;i++){let r=t[i];r.extensions&&r.extensions[this.name]&&void 0!==r.extensions[this.name].light&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t,i=this.parser,s="light:"+e,a=i.cache.get(s);if(a)return a;let o=i.json,n=((o.extensions&&o.extensions[this.name]||{}).lights||[])[e],l=new r.Q1f(0xffffff);void 0!==n.color&&l.setRGB(n.color[0],n.color[1],n.color[2],r.Zr2);let h=void 0!==n.range?n.range:0;switch(n.type){case"directional":(t=new r.ZyN(l)).target.position.set(0,0,-1),t.add(t.target);break;case"point":(t=new r.HiM(l)).distance=h;break;case"spot":(t=new r.nCl(l)).distance=h,n.spot=n.spot||{},n.spot.innerConeAngle=void 0!==n.spot.innerConeAngle?n.spot.innerConeAngle:0,n.spot.outerConeAngle=void 0!==n.spot.outerConeAngle?n.spot.outerConeAngle:Math.PI/4,t.angle=n.spot.outerConeAngle,t.penumbra=1-n.spot.innerConeAngle/n.spot.outerConeAngle,t.target.position.set(0,0,-1),t.add(t.target);break;default:throw Error("THREE.GLTFLoader: Unexpected light type: "+n.type)}return t.position.set(0,0,0),t.decay=2,K(t,n),void 0!==n.intensity&&(t.intensity=n.intensity),t.name=i.createUniqueName(n.name||"light_"+e),a=Promise.resolve(t),i.cache.add(s,a),a}getDependency(e,t){if("light"===e)return this._loadLight(t)}createNodeAttachment(e){let t=this,i=this.parser,r=i.json.nodes[e],s=(r.extensions&&r.extensions[this.name]||{}).light;return void 0===s?null:this._loadLight(s).then(function(e){return i._getNodeRef(t.cache,s,e)})}}class h{constructor(){this.name=n.KHR_MATERIALS_UNLIT}getMaterialType(){return r.V9B}extendParams(e,t,i){let s=[];e.color=new r.Q1f(1,1,1),e.opacity=1;let a=t.pbrMetallicRoughness;if(a){if(Array.isArray(a.baseColorFactor)){let t=a.baseColorFactor;e.color.setRGB(t[0],t[1],t[2],r.Zr2),e.opacity=t[3]}void 0!==a.baseColorTexture&&s.push(i.assignTexture(e,"map",a.baseColorTexture,r.er$))}return Promise.all(s)}}class c{constructor(e){this.parser=e,this.name=n.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();let r=i.extensions[this.name].emissiveStrength;return void 0!==r&&(t.emissiveIntensity=r),Promise.resolve()}}class u{constructor(e){this.parser=e,this.name=n.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?r.uSd:null}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let a=[],o=s.extensions[this.name];if(void 0!==o.clearcoatFactor&&(t.clearcoat=o.clearcoatFactor),void 0!==o.clearcoatTexture&&a.push(i.assignTexture(t,"clearcoatMap",o.clearcoatTexture)),void 0!==o.clearcoatRoughnessFactor&&(t.clearcoatRoughness=o.clearcoatRoughnessFactor),void 0!==o.clearcoatRoughnessTexture&&a.push(i.assignTexture(t,"clearcoatRoughnessMap",o.clearcoatRoughnessTexture)),void 0!==o.clearcoatNormalTexture&&(a.push(i.assignTexture(t,"clearcoatNormalMap",o.clearcoatNormalTexture)),void 0!==o.clearcoatNormalTexture.scale)){let e=o.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new r.I9Y(e,e)}return Promise.all(a)}}class d{constructor(e){this.parser=e,this.name=n.KHR_MATERIALS_DISPERSION}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?r.uSd:null}extendMaterialParams(e,t){let i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();let r=i.extensions[this.name];return t.dispersion=void 0!==r.dispersion?r.dispersion:0,Promise.resolve()}}class p{constructor(e){this.parser=e,this.name=n.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?r.uSd:null}extendMaterialParams(e,t){let i=this.parser,r=i.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let s=[],a=r.extensions[this.name];return void 0!==a.iridescenceFactor&&(t.iridescence=a.iridescenceFactor),void 0!==a.iridescenceTexture&&s.push(i.assignTexture(t,"iridescenceMap",a.iridescenceTexture)),void 0!==a.iridescenceIor&&(t.iridescenceIOR=a.iridescenceIor),void 0===t.iridescenceThicknessRange&&(t.iridescenceThicknessRange=[100,400]),void 0!==a.iridescenceThicknessMinimum&&(t.iridescenceThicknessRange[0]=a.iridescenceThicknessMinimum),void 0!==a.iridescenceThicknessMaximum&&(t.iridescenceThicknessRange[1]=a.iridescenceThicknessMaximum),void 0!==a.iridescenceThicknessTexture&&s.push(i.assignTexture(t,"iridescenceThicknessMap",a.iridescenceThicknessTexture)),Promise.all(s)}}class m{constructor(e){this.parser=e,this.name=n.KHR_MATERIALS_SHEEN}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?r.uSd:null}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let a=[];t.sheenColor=new r.Q1f(0,0,0),t.sheenRoughness=0,t.sheen=1;let o=s.extensions[this.name];if(void 0!==o.sheenColorFactor){let e=o.sheenColorFactor;t.sheenColor.setRGB(e[0],e[1],e[2],r.Zr2)}return void 0!==o.sheenRoughnessFactor&&(t.sheenRoughness=o.sheenRoughnessFactor),void 0!==o.sheenColorTexture&&a.push(i.assignTexture(t,"sheenColorMap",o.sheenColorTexture,r.er$)),void 0!==o.sheenRoughnessTexture&&a.push(i.assignTexture(t,"sheenRoughnessMap",o.sheenRoughnessTexture)),Promise.all(a)}}class f{constructor(e){this.parser=e,this.name=n.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?r.uSd:null}extendMaterialParams(e,t){let i=this.parser,r=i.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let s=[],a=r.extensions[this.name];return void 0!==a.transmissionFactor&&(t.transmission=a.transmissionFactor),void 0!==a.transmissionTexture&&s.push(i.assignTexture(t,"transmissionMap",a.transmissionTexture)),Promise.all(s)}}class v{constructor(e){this.parser=e,this.name=n.KHR_MATERIALS_VOLUME}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?r.uSd:null}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let a=[],o=s.extensions[this.name];t.thickness=void 0!==o.thicknessFactor?o.thicknessFactor:0,void 0!==o.thicknessTexture&&a.push(i.assignTexture(t,"thicknessMap",o.thicknessTexture)),t.attenuationDistance=o.attenuationDistance||1/0;let n=o.attenuationColor||[1,1,1];return t.attenuationColor=new r.Q1f().setRGB(n[0],n[1],n[2],r.Zr2),Promise.all(a)}}class g{constructor(e){this.parser=e,this.name=n.KHR_MATERIALS_IOR}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?r.uSd:null}extendMaterialParams(e,t){let i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();let r=i.extensions[this.name];return t.ior=void 0!==r.ior?r.ior:1.5,Promise.resolve()}}class x{constructor(e){this.parser=e,this.name=n.KHR_MATERIALS_SPECULAR}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?r.uSd:null}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let a=[],o=s.extensions[this.name];t.specularIntensity=void 0!==o.specularFactor?o.specularFactor:1,void 0!==o.specularTexture&&a.push(i.assignTexture(t,"specularIntensityMap",o.specularTexture));let n=o.specularColorFactor||[1,1,1];return t.specularColor=new r.Q1f().setRGB(n[0],n[1],n[2],r.Zr2),void 0!==o.specularColorTexture&&a.push(i.assignTexture(t,"specularColorMap",o.specularColorTexture,r.er$)),Promise.all(a)}}class T{constructor(e){this.parser=e,this.name=n.EXT_MATERIALS_BUMP}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?r.uSd:null}extendMaterialParams(e,t){let i=this.parser,r=i.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let s=[],a=r.extensions[this.name];return t.bumpScale=void 0!==a.bumpFactor?a.bumpFactor:1,void 0!==a.bumpTexture&&s.push(i.assignTexture(t,"bumpMap",a.bumpTexture)),Promise.all(s)}}class _{constructor(e){this.parser=e,this.name=n.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){let t=this.parser.json.materials[e];return t.extensions&&t.extensions[this.name]?r.uSd:null}extendMaterialParams(e,t){let i=this.parser,r=i.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let s=[],a=r.extensions[this.name];return void 0!==a.anisotropyStrength&&(t.anisotropy=a.anisotropyStrength),void 0!==a.anisotropyRotation&&(t.anisotropyRotation=a.anisotropyRotation),void 0!==a.anisotropyTexture&&s.push(i.assignTexture(t,"anisotropyMap",a.anisotropyTexture)),Promise.all(s)}}class b{constructor(e){this.parser=e,this.name=n.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,i=t.json,r=i.textures[e];if(!r.extensions||!r.extensions[this.name])return null;let s=r.extensions[this.name],a=t.options.ktx2Loader;if(!a)if(!(i.extensionsRequired&&i.extensionsRequired.indexOf(this.name)>=0))return null;else throw Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return t.loadTextureImage(e,s.source,a)}}class y{constructor(e){this.parser=e,this.name=n.EXT_TEXTURE_WEBP,this.isSupported=null}loadTexture(e){let t=this.name,i=this.parser,r=i.json,s=r.textures[e];if(!s.extensions||!s.extensions[t])return null;let a=s.extensions[t],o=r.images[a.source],n=i.textureLoader;if(o.uri){let e=i.options.manager.getHandler(o.uri);null!==e&&(n=e)}return this.detectSupport().then(function(s){if(s)return i.loadTextureImage(e,a.source,n);if(r.extensionsRequired&&r.extensionsRequired.indexOf(t)>=0)throw Error("THREE.GLTFLoader: WebP required by asset but unsupported.");return i.loadTexture(e)})}detectSupport(){return this.isSupported||(this.isSupported=new Promise(function(e){let t=new Image;t.src="data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",t.onload=t.onerror=function(){e(1===t.height)}})),this.isSupported}}class A{constructor(e){this.parser=e,this.name=n.EXT_TEXTURE_AVIF,this.isSupported=null}loadTexture(e){let t=this.name,i=this.parser,r=i.json,s=r.textures[e];if(!s.extensions||!s.extensions[t])return null;let a=s.extensions[t],o=r.images[a.source],n=i.textureLoader;if(o.uri){let e=i.options.manager.getHandler(o.uri);null!==e&&(n=e)}return this.detectSupport().then(function(s){if(s)return i.loadTextureImage(e,a.source,n);if(r.extensionsRequired&&r.extensionsRequired.indexOf(t)>=0)throw Error("THREE.GLTFLoader: AVIF required by asset but unsupported.");return i.loadTexture(e)})}detectSupport(){return this.isSupported||(this.isSupported=new Promise(function(e){let t=new Image;t.src="data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=",t.onload=t.onerror=function(){e(1===t.height)}})),this.isSupported}}class E{constructor(e){this.name=n.EXT_MESHOPT_COMPRESSION,this.parser=e}loadBufferView(e){let t=this.parser.json,i=t.bufferViews[e];if(!i.extensions||!i.extensions[this.name])return null;{let e=i.extensions[this.name],r=this.parser.getDependency("buffer",e.buffer),s=this.parser.options.meshoptDecoder;if(!s||!s.supported)if(!(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0))return null;else throw Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return r.then(function(t){let i=e.byteOffset||0,r=e.byteLength||0,a=e.count,o=e.byteStride,n=new Uint8Array(t,i,r);return s.decodeGltfBufferAsync?s.decodeGltfBufferAsync(a,o,n,e.mode,e.filter).then(function(e){return e.buffer}):s.ready.then(function(){let t=new ArrayBuffer(a*o);return s.decodeGltfBuffer(new Uint8Array(t),a,o,n,e.mode,e.filter),t})})}}}class M{constructor(e){this.name=n.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,i=t.nodes[e];if(!i.extensions||!i.extensions[this.name]||void 0===i.mesh)return null;for(let e of t.meshes[i.mesh].primitives)if(e.mode!==O.TRIANGLES&&e.mode!==O.TRIANGLE_STRIP&&e.mode!==O.TRIANGLE_FAN&&void 0!==e.mode)return null;let s=i.extensions[this.name].attributes,a=[],o={};for(let e in s)a.push(this.parser.getDependency("accessor",s[e]).then(t=>(o[e]=t,o[e])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(e=>{let t=e.pop(),i=t.isGroup?t.children:[t],s=e[0].count,a=[];for(let e of i){let t=new r.kn4,i=new r.Pq0,n=new r.PTz,l=new r.Pq0(1,1,1),h=new r.ZLX(e.geometry,e.material,s);for(let e=0;e<s;e++)o.TRANSLATION&&i.fromBufferAttribute(o.TRANSLATION,e),o.ROTATION&&n.fromBufferAttribute(o.ROTATION,e),o.SCALE&&l.fromBufferAttribute(o.SCALE,e),h.setMatrixAt(e,t.compose(i,n,l));for(let t in o)if("_COLOR_0"===t){let e=o[t];h.instanceColor=new r.uWO(e.array,e.itemSize,e.normalized)}else"TRANSLATION"!==t&&"ROTATION"!==t&&"SCALE"!==t&&e.geometry.setAttribute(t,o[t]);r.B69.prototype.copy.call(h,e),this.parser.assignFinalMaterial(h),a.push(h)}return t.isGroup?(t.clear(),t.add(...a),t):a[0]}))}}let S="glTF",R={JSON:0x4e4f534a,BIN:5130562};class P{constructor(e){this.name=n.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,12),i=new TextDecoder;if(this.header={magic:i.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==S)throw Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw Error("THREE.GLTFLoader: Legacy binary file detected.");let r=this.header.length-12,s=new DataView(e,12),a=0;for(;a<r;){let t=s.getUint32(a,!0);a+=4;let r=s.getUint32(a,!0);if(a+=4,r===R.JSON){let r=new Uint8Array(e,12+a,t);this.content=i.decode(r)}else if(r===R.BIN){let i=12+a;this.body=e.slice(i,i+t)}a+=t}if(null===this.content)throw Error("THREE.GLTFLoader: JSON content not found.")}}class w{constructor(e,t){if(!t)throw Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=n.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let i=this.json,s=this.dracoLoader,a=e.extensions[this.name].bufferView,o=e.extensions[this.name].attributes,n={},l={},h={};for(let e in o)n[H[e]||e.toLowerCase()]=o[e];for(let t in e.attributes){let r=H[t]||t.toLowerCase();if(void 0!==o[t]){let s=i.accessors[e.attributes[t]],a=U[s.componentType];h[r]=a.name,l[r]=!0===s.normalized}}return t.getDependency("bufferView",a).then(function(e){return new Promise(function(t,i){s.decodeDracoFile(e,function(e){for(let t in e.attributes){let i=e.attributes[t],r=l[t];void 0!==r&&(i.normalized=r)}t(e)},n,h,r.Zr2,i)})})}}class C{constructor(){this.name=n.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(void 0===t.texCoord||t.texCoord===e.channel)&&void 0===t.offset&&void 0===t.rotation&&void 0===t.scale||(e=e.clone(),void 0!==t.texCoord&&(e.channel=t.texCoord),void 0!==t.offset&&e.offset.fromArray(t.offset),void 0!==t.rotation&&(e.rotation=t.rotation),void 0!==t.scale&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}}class D{constructor(){this.name=n.KHR_MESH_QUANTIZATION}}class N extends r.lGw{constructor(e,t,i,r){super(e,t,i,r)}copySampleValue_(e){let t=this.resultBuffer,i=this.sampleValues,r=this.valueSize,s=e*r*3+r;for(let e=0;e!==r;e++)t[e]=i[s+e];return t}interpolate_(e,t,i,r){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,n=2*o,l=3*o,h=r-t,c=(i-t)/h,u=c*c,d=u*c,p=e*l,m=p-l,f=-2*d+3*u,v=d-u,g=1-f,x=v-u+c;for(let e=0;e!==o;e++){let t=a[m+e+o],i=a[m+e+n]*h,r=a[p+e+o],l=a[p+e]*h;s[e]=g*t+x*i+f*r+v*l}return s}}let I=new r.PTz;class L extends N{interpolate_(e,t,i,r){let s=super.interpolate_(e,t,i,r);return I.fromArray(s).normalize().toArray(s),s}}let O={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},U={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},k={9728:r.hxR,9729:r.k6q,9984:r.pHI,9985:r.kRr,9986:r.Cfg,9987:r.$_I},B={33071:r.ghU,33648:r.kTW,10497:r.GJx},F={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},H={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},z={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},j={CUBICSPLINE:void 0,LINEAR:r.PJ3,STEP:r.ljd},G={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function V(e,t,i){for(let r in i.extensions)void 0===e[r]&&(t.userData.gltfExtensions=t.userData.gltfExtensions||{},t.userData.gltfExtensions[r]=i.extensions[r])}function K(e,t){void 0!==t.extras&&("object"==typeof t.extras?Object.assign(e.userData,t.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+t.extras))}function Y(e){let t="",i=Object.keys(e).sort();for(let r=0,s=i.length;r<s;r++)t+=i[r]+":"+e[i[r]]+";";return t}function X(e){switch(e){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}let Z=new r.kn4;class q{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new o,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let i=!1,s=-1,a=!1,n=-1;if("undefined"!=typeof navigator){let e=navigator.userAgent;i=!0===/^((?!chrome|android).)*safari/i.test(e);let t=e.match(/Version\/(\d+)/);s=i&&t?parseInt(t[1],10):-1,n=(a=e.indexOf("Firefox")>-1)?e.match(/Firefox\/([0-9]+)\./)[1]:-1}"undefined"==typeof createImageBitmap||i&&s<17||a&&n<98?this.textureLoader=new r.Tap(this.options.manager):this.textureLoader=new r.Kzg(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new r.Y9S(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),"use-credentials"===this.options.crossOrigin&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let i=this,r=this.json,s=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(e){return e._markDefs&&e._markDefs()}),Promise.all(this._invokeAll(function(e){return e.beforeRoot&&e.beforeRoot()})).then(function(){return Promise.all([i.getDependencies("scene"),i.getDependencies("animation"),i.getDependencies("camera")])}).then(function(t){let a={scene:t[0][r.scene||0],scenes:t[0],animations:t[1],cameras:t[2],asset:r.asset,parser:i,userData:{}};return V(s,a,r),K(a,r),Promise.all(i._invokeAll(function(e){return e.afterRoot&&e.afterRoot(a)})).then(function(){for(let e of a.scenes)e.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],i=this.json.meshes||[];for(let i=0,r=t.length;i<r;i++){let r=t[i].joints;for(let t=0,i=r.length;t<i;t++)e[r[t]].isBone=!0}for(let t=0,r=e.length;t<r;t++){let r=e[t];void 0!==r.mesh&&(this._addNodeRef(this.meshCache,r.mesh),void 0!==r.skin&&(i[r.mesh].isSkinnedMesh=!0)),void 0!==r.camera&&this._addNodeRef(this.cameraCache,r.camera)}}_addNodeRef(e,t){void 0!==t&&(void 0===e.refs[t]&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,i){if(e.refs[t]<=1)return i;let r=i.clone(),s=(e,t)=>{let i=this.associations.get(e);for(let[r,a]of(null!=i&&this.associations.set(t,i),e.children.entries()))s(a,t.children[r])};return s(i,r),r.name+="_instance_"+e.uses[t]++,r}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let i=0;i<t.length;i++){let r=e(t[i]);if(r)return r}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let i=[];for(let r=0;r<t.length;r++){let s=e(t[r]);s&&i.push(s)}return i}getDependency(e,t){let i=e+":"+t,r=this.cache.get(i);if(!r){switch(e){case"scene":r=this.loadScene(t);break;case"node":r=this._invokeOne(function(e){return e.loadNode&&e.loadNode(t)});break;case"mesh":r=this._invokeOne(function(e){return e.loadMesh&&e.loadMesh(t)});break;case"accessor":r=this.loadAccessor(t);break;case"bufferView":r=this._invokeOne(function(e){return e.loadBufferView&&e.loadBufferView(t)});break;case"buffer":r=this.loadBuffer(t);break;case"material":r=this._invokeOne(function(e){return e.loadMaterial&&e.loadMaterial(t)});break;case"texture":r=this._invokeOne(function(e){return e.loadTexture&&e.loadTexture(t)});break;case"skin":r=this.loadSkin(t);break;case"animation":r=this._invokeOne(function(e){return e.loadAnimation&&e.loadAnimation(t)});break;case"camera":r=this.loadCamera(t);break;default:if(!(r=this._invokeOne(function(i){return i!=this&&i.getDependency&&i.getDependency(e,t)})))throw Error("Unknown type: "+e)}this.cache.add(i,r)}return r}getDependencies(e){let t=this.cache.get(e);if(!t){let i=this;t=Promise.all((this.json[e+("mesh"===e?"es":"s")]||[]).map(function(t,r){return i.getDependency(e,r)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],i=this.fileLoader;if(t.type&&"arraybuffer"!==t.type)throw Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(void 0===t.uri&&0===e)return Promise.resolve(this.extensions[n.KHR_BINARY_GLTF].body);let s=this.options;return new Promise(function(e,a){i.load(r.r6x.resolveURL(t.uri,s.path),e,void 0,function(){a(Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(e){let i=t.byteLength||0,r=t.byteOffset||0;return e.slice(r,r+i)})}loadAccessor(e){let t=this,i=this.json,s=this.json.accessors[e];if(void 0===s.bufferView&&void 0===s.sparse){let e=F[s.type],t=U[s.componentType],i=!0===s.normalized,a=new t(s.count*e);return Promise.resolve(new r.THS(a,e,i))}let a=[];return void 0!==s.bufferView?a.push(this.getDependency("bufferView",s.bufferView)):a.push(null),void 0!==s.sparse&&(a.push(this.getDependency("bufferView",s.sparse.indices.bufferView)),a.push(this.getDependency("bufferView",s.sparse.values.bufferView))),Promise.all(a).then(function(e){let a,o,n=e[0],l=F[s.type],h=U[s.componentType],c=h.BYTES_PER_ELEMENT,u=c*l,d=s.byteOffset||0,p=void 0!==s.bufferView?i.bufferViews[s.bufferView].byteStride:void 0,m=!0===s.normalized;if(p&&p!==u){let e=Math.floor(d/p),i="InterleavedBuffer:"+s.bufferView+":"+s.componentType+":"+e+":"+s.count,u=t.cache.get(i);u||(a=new h(n,e*p,s.count*p/c),u=new r.eB$(a,p/c),t.cache.add(i,u)),o=new r.eHs(u,l,d%p/c,m)}else a=null===n?new h(s.count*l):new h(n,d,s.count*l),o=new r.THS(a,l,m);if(void 0!==s.sparse){let t=F.SCALAR,i=U[s.sparse.indices.componentType],a=s.sparse.indices.byteOffset||0,c=s.sparse.values.byteOffset||0,u=new i(e[1],a,s.sparse.count*t),d=new h(e[2],c,s.sparse.count*l);null!==n&&(o=new r.THS(o.array.slice(),o.itemSize,o.normalized)),o.normalized=!1;for(let e=0,t=u.length;e<t;e++){let t=u[e];if(o.setX(t,d[e*l]),l>=2&&o.setY(t,d[e*l+1]),l>=3&&o.setZ(t,d[e*l+2]),l>=4&&o.setW(t,d[e*l+3]),l>=5)throw Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}o.normalized=m}return o})}loadTexture(e){let t=this.json,i=this.options,r=t.textures[e].source,s=t.images[r],a=this.textureLoader;if(s.uri){let e=i.manager.getHandler(s.uri);null!==e&&(a=e)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,i){let s=this,a=this.json,o=a.textures[e],n=a.images[t],l=(n.uri||n.bufferView)+":"+o.sampler;if(this.textureCache[l])return this.textureCache[l];let h=this.loadImageSource(t,i).then(function(t){t.flipY=!1,t.name=o.name||n.name||"",""===t.name&&"string"==typeof n.uri&&!1===n.uri.startsWith("data:image/")&&(t.name=n.uri);let i=(a.samplers||{})[o.sampler]||{};return t.magFilter=k[i.magFilter]||r.k6q,t.minFilter=k[i.minFilter]||r.$_I,t.wrapS=B[i.wrapS]||r.GJx,t.wrapT=B[i.wrapT]||r.GJx,t.generateMipmaps=!t.isCompressedTexture&&t.minFilter!==r.hxR&&t.minFilter!==r.k6q,s.associations.set(t,{textures:e}),t}).catch(function(){return null});return this.textureCache[l]=h,h}loadImageSource(e,t){let i=this.json,s=this.options;if(void 0!==this.sourceCache[e])return this.sourceCache[e].then(e=>e.clone());let a=i.images[e],o=self.URL||self.webkitURL,n=a.uri||"",l=!1;if(void 0!==a.bufferView)n=this.getDependency("bufferView",a.bufferView).then(function(e){l=!0;let t=new Blob([e],{type:a.mimeType});return n=o.createObjectURL(t)});else if(void 0===a.uri)throw Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");let h=Promise.resolve(n).then(function(e){return new Promise(function(i,a){let o=i;!0===t.isImageBitmapLoader&&(o=function(e){let t=new r.gPd(e);t.needsUpdate=!0,i(t)}),t.load(r.r6x.resolveURL(e,s.path),o,void 0,a)})}).then(function(e){var t;return!0===l&&o.revokeObjectURL(n),K(e,a),e.userData.mimeType=a.mimeType||((t=a.uri).search(/\.jpe?g($|\?)/i)>0||0===t.search(/^data\:image\/jpeg/)?"image/jpeg":t.search(/\.webp($|\?)/i)>0||0===t.search(/^data\:image\/webp/)?"image/webp":t.search(/\.ktx2($|\?)/i)>0||0===t.search(/^data\:image\/ktx2/)?"image/ktx2":"image/png"),e}).catch(function(e){throw console.error("THREE.GLTFLoader: Couldn't load texture",n),e});return this.sourceCache[e]=h,h}assignTexture(e,t,i,r){let s=this;return this.getDependency("texture",i.index).then(function(a){if(!a)return null;if(void 0!==i.texCoord&&i.texCoord>0&&((a=a.clone()).channel=i.texCoord),s.extensions[n.KHR_TEXTURE_TRANSFORM]){let e=void 0!==i.extensions?i.extensions[n.KHR_TEXTURE_TRANSFORM]:void 0;if(e){let t=s.associations.get(a);a=s.extensions[n.KHR_TEXTURE_TRANSFORM].extendTexture(a,e),s.associations.set(a,t)}}return void 0!==r&&(a.colorSpace=r),e[t]=a,a})}assignFinalMaterial(e){let t=e.geometry,i=e.material,s=void 0===t.attributes.tangent,a=void 0!==t.attributes.color,o=void 0===t.attributes.normal;if(e.isPoints){let e="PointsMaterial:"+i.uuid,t=this.cache.get(e);t||(t=new r.BH$,r.imn.prototype.copy.call(t,i),t.color.copy(i.color),t.map=i.map,t.sizeAttenuation=!1,this.cache.add(e,t)),i=t}else if(e.isLine){let e="LineBasicMaterial:"+i.uuid,t=this.cache.get(e);t||(t=new r.mrM,r.imn.prototype.copy.call(t,i),t.color.copy(i.color),t.map=i.map,this.cache.add(e,t)),i=t}if(s||a||o){let e="ClonedMaterial:"+i.uuid+":";s&&(e+="derivative-tangents:"),a&&(e+="vertex-colors:"),o&&(e+="flat-shading:");let t=this.cache.get(e);t||(t=i.clone(),a&&(t.vertexColors=!0),o&&(t.flatShading=!0),s&&(t.normalScale&&(t.normalScale.y*=-1),t.clearcoatNormalScale&&(t.clearcoatNormalScale.y*=-1)),this.cache.add(e,t),this.associations.set(t,this.associations.get(i))),i=t}e.material=i}getMaterialType(){return r._4j}loadMaterial(e){let t,i=this,s=this.json,a=this.extensions,o=s.materials[e],l={},h=o.extensions||{},c=[];if(h[n.KHR_MATERIALS_UNLIT]){let e=a[n.KHR_MATERIALS_UNLIT];t=e.getMaterialType(),c.push(e.extendParams(l,o,i))}else{let s=o.pbrMetallicRoughness||{};if(l.color=new r.Q1f(1,1,1),l.opacity=1,Array.isArray(s.baseColorFactor)){let e=s.baseColorFactor;l.color.setRGB(e[0],e[1],e[2],r.Zr2),l.opacity=e[3]}void 0!==s.baseColorTexture&&c.push(i.assignTexture(l,"map",s.baseColorTexture,r.er$)),l.metalness=void 0!==s.metallicFactor?s.metallicFactor:1,l.roughness=void 0!==s.roughnessFactor?s.roughnessFactor:1,void 0!==s.metallicRoughnessTexture&&(c.push(i.assignTexture(l,"metalnessMap",s.metallicRoughnessTexture)),c.push(i.assignTexture(l,"roughnessMap",s.metallicRoughnessTexture))),t=this._invokeOne(function(t){return t.getMaterialType&&t.getMaterialType(e)}),c.push(Promise.all(this._invokeAll(function(t){return t.extendMaterialParams&&t.extendMaterialParams(e,l)})))}!0===o.doubleSided&&(l.side=r.$EB);let u=o.alphaMode||G.OPAQUE;if(u===G.BLEND?(l.transparent=!0,l.depthWrite=!1):(l.transparent=!1,u===G.MASK&&(l.alphaTest=void 0!==o.alphaCutoff?o.alphaCutoff:.5)),void 0!==o.normalTexture&&t!==r.V9B&&(c.push(i.assignTexture(l,"normalMap",o.normalTexture)),l.normalScale=new r.I9Y(1,1),void 0!==o.normalTexture.scale)){let e=o.normalTexture.scale;l.normalScale.set(e,e)}if(void 0!==o.occlusionTexture&&t!==r.V9B&&(c.push(i.assignTexture(l,"aoMap",o.occlusionTexture)),void 0!==o.occlusionTexture.strength&&(l.aoMapIntensity=o.occlusionTexture.strength)),void 0!==o.emissiveFactor&&t!==r.V9B){let e=o.emissiveFactor;l.emissive=new r.Q1f().setRGB(e[0],e[1],e[2],r.Zr2)}return void 0!==o.emissiveTexture&&t!==r.V9B&&c.push(i.assignTexture(l,"emissiveMap",o.emissiveTexture,r.er$)),Promise.all(c).then(function(){let r=new t(l);return o.name&&(r.name=o.name),K(r,o),i.associations.set(r,{materials:e}),o.extensions&&V(a,r,o),r})}createUniqueName(e){let t=r.Nwf.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,i=this.extensions,s=this.primitiveCache,a=[];for(let o=0,l=e.length;o<l;o++){let l=e[o],h=function(e){let t,i=e.extensions&&e.extensions[n.KHR_DRACO_MESH_COMPRESSION];if(t=i?"draco:"+i.bufferView+":"+i.indices+":"+Y(i.attributes):e.indices+":"+Y(e.attributes)+":"+e.mode,void 0!==e.targets)for(let i=0,r=e.targets.length;i<r;i++)t+=":"+Y(e.targets[i]);return t}(l),c=s[h];if(c)a.push(c.promise);else{let e;e=l.extensions&&l.extensions[n.KHR_DRACO_MESH_COMPRESSION]?function(e){return i[n.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(e,t).then(function(i){return W(i,e,t)})}(l):W(new r.LoY,l,t),s[h]={primitive:l,promise:e},a.push(e)}}return Promise.all(a)}loadMesh(e){let t=this,i=this.json,a=this.extensions,o=i.meshes[e],n=o.primitives,l=[];for(let e=0,t=n.length;e<t;e++){var h;let t=void 0===n[e].material?(void 0===(h=this.cache).DefaultMaterial&&(h.DefaultMaterial=new r._4j({color:0xffffff,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:r.hB5})),h.DefaultMaterial):this.getDependency("material",n[e].material);l.push(t)}return l.push(t.loadGeometries(n)),Promise.all(l).then(function(i){let l=i.slice(0,i.length-1),h=i[i.length-1],c=[];for(let i=0,u=h.length;i<u;i++){let u,d=h[i],p=n[i],m=l[i];if(p.mode===O.TRIANGLES||p.mode===O.TRIANGLE_STRIP||p.mode===O.TRIANGLE_FAN||void 0===p.mode)!0===(u=!0===o.isSkinnedMesh?new r.I46(d,m):new r.eaF(d,m)).isSkinnedMesh&&u.normalizeSkinWeights(),p.mode===O.TRIANGLE_STRIP?u.geometry=(0,s._c)(u.geometry,r.O49):p.mode===O.TRIANGLE_FAN&&(u.geometry=(0,s._c)(u.geometry,r.rYR));else if(p.mode===O.LINES)u=new r.DXC(d,m);else if(p.mode===O.LINE_STRIP)u=new r.N1A(d,m);else if(p.mode===O.LINE_LOOP)u=new r.FCc(d,m);else if(p.mode===O.POINTS)u=new r.ONl(d,m);else throw Error("THREE.GLTFLoader: Primitive mode unsupported: "+p.mode);Object.keys(u.geometry.morphAttributes).length>0&&function(e,t){if(e.updateMorphTargets(),void 0!==t.weights)for(let i=0,r=t.weights.length;i<r;i++)e.morphTargetInfluences[i]=t.weights[i];if(t.extras&&Array.isArray(t.extras.targetNames)){let i=t.extras.targetNames;if(e.morphTargetInfluences.length===i.length){e.morphTargetDictionary={};for(let t=0,r=i.length;t<r;t++)e.morphTargetDictionary[i[t]]=t}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}(u,o),u.name=t.createUniqueName(o.name||"mesh_"+e),K(u,o),p.extensions&&V(a,u,p),t.assignFinalMaterial(u),c.push(u)}for(let i=0,r=c.length;i<r;i++)t.associations.set(c[i],{meshes:e,primitives:i});if(1===c.length)return o.extensions&&V(a,c[0],o),c[0];let u=new r.YJl;o.extensions&&V(a,u,o),t.associations.set(u,{meshes:e});for(let e=0,t=c.length;e<t;e++)u.add(c[e]);return u})}loadCamera(e){let t,i=this.json.cameras[e],s=i[i.type];return s?("perspective"===i.type?t=new r.ubm(r.cj9.radToDeg(s.yfov),s.aspectRatio||1,s.znear||1,s.zfar||2e6):"orthographic"===i.type&&(t=new r.qUd(-s.xmag,s.xmag,s.ymag,-s.ymag,s.znear,s.zfar)),i.name&&(t.name=this.createUniqueName(i.name)),K(t,i),Promise.resolve(t)):void console.warn("THREE.GLTFLoader: Missing camera parameters.")}loadSkin(e){let t=this.json.skins[e],i=[];for(let e=0,r=t.joints.length;e<r;e++)i.push(this._loadNodeShallow(t.joints[e]));return void 0!==t.inverseBindMatrices?i.push(this.getDependency("accessor",t.inverseBindMatrices)):i.push(null),Promise.all(i).then(function(e){let i=e.pop(),s=[],a=[];for(let o=0,n=e.length;o<n;o++){let n=e[o];if(n){s.push(n);let e=new r.kn4;null!==i&&e.fromArray(i.array,16*o),a.push(e)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[o])}return new r.EAD(s,a)})}loadAnimation(e){let t=this.json,i=this,s=t.animations[e],a=s.name?s.name:"animation_"+e,o=[],n=[],l=[],h=[],c=[];for(let e=0,t=s.channels.length;e<t;e++){let t=s.channels[e],i=s.samplers[t.sampler],r=t.target,a=r.node,u=void 0!==s.parameters?s.parameters[i.input]:i.input,d=void 0!==s.parameters?s.parameters[i.output]:i.output;void 0!==r.node&&(o.push(this.getDependency("node",a)),n.push(this.getDependency("accessor",u)),l.push(this.getDependency("accessor",d)),h.push(i),c.push(r))}return Promise.all([Promise.all(o),Promise.all(n),Promise.all(l),Promise.all(h),Promise.all(c)]).then(function(e){let t=e[0],s=e[1],o=e[2],n=e[3],l=e[4],h=[];for(let e=0,r=t.length;e<r;e++){let r=t[e],a=s[e],c=o[e],u=n[e],d=l[e];if(void 0===r)continue;r.updateMatrix&&r.updateMatrix();let p=i._createAnimationTracks(r,a,c,u,d);if(p)for(let e=0;e<p.length;e++)h.push(p[e])}return new r.tz3(a,void 0,h)})}createNodeMesh(e){let t=this.json,i=this,r=t.nodes[e];return void 0===r.mesh?null:i.getDependency("mesh",r.mesh).then(function(e){let t=i._getNodeRef(i.meshCache,r.mesh,e);return void 0!==r.weights&&t.traverse(function(e){if(e.isMesh)for(let t=0,i=r.weights.length;t<i;t++)e.morphTargetInfluences[t]=r.weights[t]}),t})}loadNode(e){let t=this.json.nodes[e],i=this._loadNodeShallow(e),r=[],s=t.children||[];for(let e=0,t=s.length;e<t;e++)r.push(this.getDependency("node",s[e]));let a=void 0===t.skin?Promise.resolve(null):this.getDependency("skin",t.skin);return Promise.all([i,Promise.all(r),a]).then(function(e){let t=e[0],i=e[1],r=e[2];null!==r&&t.traverse(function(e){e.isSkinnedMesh&&e.bind(r,Z)});for(let e=0,r=i.length;e<r;e++)t.add(i[e]);return t})}_loadNodeShallow(e){let t=this.json,i=this.extensions,s=this;if(void 0!==this.nodeCache[e])return this.nodeCache[e];let a=t.nodes[e],o=a.name?s.createUniqueName(a.name):"",n=[],l=s._invokeOne(function(t){return t.createNodeMesh&&t.createNodeMesh(e)});return l&&n.push(l),void 0!==a.camera&&n.push(s.getDependency("camera",a.camera).then(function(e){return s._getNodeRef(s.cameraCache,a.camera,e)})),s._invokeAll(function(t){return t.createNodeAttachment&&t.createNodeAttachment(e)}).forEach(function(e){n.push(e)}),this.nodeCache[e]=Promise.all(n).then(function(t){let n;if((n=!0===a.isBone?new r.$Kf:t.length>1?new r.YJl:1===t.length?t[0]:new r.B69)!==t[0])for(let e=0,i=t.length;e<i;e++)n.add(t[e]);if(a.name&&(n.userData.name=a.name,n.name=o),K(n,a),a.extensions&&V(i,n,a),void 0!==a.matrix){let e=new r.kn4;e.fromArray(a.matrix),n.applyMatrix4(e)}else void 0!==a.translation&&n.position.fromArray(a.translation),void 0!==a.rotation&&n.quaternion.fromArray(a.rotation),void 0!==a.scale&&n.scale.fromArray(a.scale);return s.associations.has(n)||s.associations.set(n,{}),s.associations.get(n).nodes=e,n}),this.nodeCache[e]}loadScene(e){let t=this.extensions,i=this.json.scenes[e],s=this,a=new r.YJl;i.name&&(a.name=s.createUniqueName(i.name)),K(a,i),i.extensions&&V(t,a,i);let o=i.nodes||[],n=[];for(let e=0,t=o.length;e<t;e++)n.push(s.getDependency("node",o[e]));return Promise.all(n).then(function(e){for(let t=0,i=e.length;t<i;t++)a.add(e[t]);return s.associations=(e=>{let t=new Map;for(let[e,i]of s.associations)(e instanceof r.imn||e instanceof r.gPd)&&t.set(e,i);return e.traverse(e=>{let i=s.associations.get(e);null!=i&&t.set(e,i)}),t})(a),a})}_createAnimationTracks(e,t,i,s,a){let o,n=[],l=e.name?e.name:e.uuid,h=[];switch(z[a.path]===z.weights?e.traverse(function(e){e.morphTargetInfluences&&h.push(e.name?e.name:e.uuid)}):h.push(l),z[a.path]){case z.weights:o=r.Hit;break;case z.rotation:o=r.MBL;break;case z.position:case z.scale:o=r.RiT;break;default:o=1===i.itemSize?r.Hit:r.RiT}let c=void 0!==s.interpolation?j[s.interpolation]:r.PJ3,u=this._getArrayFromAccessor(i);for(let e=0,i=h.length;e<i;e++){let i=new o(h[e]+"."+z[a.path],t.array,u,c);"CUBICSPLINE"===s.interpolation&&this._createCubicSplineTrackInterpolant(i),n.push(i)}return n}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let e=X(t.constructor),i=new Float32Array(t.length);for(let r=0,s=t.length;r<s;r++)i[r]=t[r]*e;t=i}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(e){return new(this instanceof r.MBL?L:N)(this.times,this.values,this.getValueSize()/3,e)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function W(e,t,i){let s=t.attributes,a=[];for(let t in s){let r=H[t]||t.toLowerCase();r in e.attributes||a.push(function(t,r){return i.getDependency("accessor",t).then(function(t){e.setAttribute(r,t)})}(s[t],r))}if(void 0!==t.indices&&!e.index){let r=i.getDependency("accessor",t.indices).then(function(t){e.setIndex(t)});a.push(r)}return r.ppV.workingColorSpace!==r.Zr2&&"COLOR_0"in s&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${r.ppV.workingColorSpace}" not supported.`),K(e,t),!function(e,t,i){let s=t.attributes,a=new r.NRn;if(void 0===s.POSITION)return;{let e=i.json.accessors[s.POSITION],t=e.min,o=e.max;if(void 0===t||void 0===o)return console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");if(a.set(new r.Pq0(t[0],t[1],t[2]),new r.Pq0(o[0],o[1],o[2])),e.normalized){let t=X(U[e.componentType]);a.min.multiplyScalar(t),a.max.multiplyScalar(t)}}let o=t.targets;if(void 0!==o){let e=new r.Pq0,t=new r.Pq0;for(let r=0,s=o.length;r<s;r++){let s=o[r];if(void 0!==s.POSITION){let r=i.json.accessors[s.POSITION],a=r.min,o=r.max;if(void 0!==a&&void 0!==o){if(t.setX(Math.max(Math.abs(a[0]),Math.abs(o[0]))),t.setY(Math.max(Math.abs(a[1]),Math.abs(o[1]))),t.setZ(Math.max(Math.abs(a[2]),Math.abs(o[2]))),r.normalized){let e=X(U[r.componentType]);t.multiplyScalar(e)}e.max(t)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}a.expandByVector(e)}e.boundingBox=a;let n=new r.iyt;a.getCenter(n.center),n.radius=a.min.distanceTo(a.max)/2,e.boundingSphere=n}(e,t,i),Promise.all(a).then(function(){return void 0!==t.targets?function(e,t,i){let r=!1,s=!1,a=!1;for(let e=0,i=t.length;e<i;e++){let i=t[e];if(void 0!==i.POSITION&&(r=!0),void 0!==i.NORMAL&&(s=!0),void 0!==i.COLOR_0&&(a=!0),r&&s&&a)break}if(!r&&!s&&!a)return Promise.resolve(e);let o=[],n=[],l=[];for(let h=0,c=t.length;h<c;h++){let c=t[h];if(r){let t=void 0!==c.POSITION?i.getDependency("accessor",c.POSITION):e.attributes.position;o.push(t)}if(s){let t=void 0!==c.NORMAL?i.getDependency("accessor",c.NORMAL):e.attributes.normal;n.push(t)}if(a){let t=void 0!==c.COLOR_0?i.getDependency("accessor",c.COLOR_0):e.attributes.color;l.push(t)}}return Promise.all([Promise.all(o),Promise.all(n),Promise.all(l)]).then(function(t){let i=t[0],o=t[1],n=t[2];return r&&(e.morphAttributes.position=i),s&&(e.morphAttributes.normal=o),a&&(e.morphAttributes.color=n),e.morphTargetsRelative=!0,e})}(e,t.targets,i):e})}},58745:(e,t,i)=>{i.d(t,{j:()=>o});var r=i(87548);let s=new r.Pq0;function a(e,t,i,r,a,o){let n=2*Math.PI*a/4,l=Math.max(o-2*a,0),h=Math.PI/4;s.copy(t),s[r]=0,s.normalize();let c=.5*n/(n+l),u=1-s.angleTo(e)/h;return 1===Math.sign(s[i])?u*c:l/(n+l)+c+c*(1-u)}class o extends r.iNn{constructor(e=1,t=1,i=1,s=2,o=.1){if(s=2*s+1,o=Math.min(e/2,t/2,i/2,o),super(1,1,1,s,s,s),1===s)return;let n=this.toNonIndexed();this.index=null,this.attributes.position=n.attributes.position,this.attributes.normal=n.attributes.normal,this.attributes.uv=n.attributes.uv;let l=new r.Pq0,h=new r.Pq0,c=new r.Pq0(e,t,i).divideScalar(2).subScalar(o),u=this.attributes.position.array,d=this.attributes.normal.array,p=this.attributes.uv.array,m=u.length/6,f=new r.Pq0,v=.5/s;for(let r=0,s=0;r<u.length;r+=3,s+=2)switch(l.fromArray(u,r),h.copy(l),h.x-=Math.sign(h.x)*v,h.y-=Math.sign(h.y)*v,h.z-=Math.sign(h.z)*v,h.normalize(),u[r+0]=c.x*Math.sign(l.x)+h.x*o,u[r+1]=c.y*Math.sign(l.y)+h.y*o,u[r+2]=c.z*Math.sign(l.z)+h.z*o,d[r+0]=h.x,d[r+1]=h.y,d[r+2]=h.z,Math.floor(r/m)){case 0:f.set(1,0,0),p[s+0]=a(f,h,"z","y",o,i),p[s+1]=1-a(f,h,"y","z",o,t);break;case 1:f.set(-1,0,0),p[s+0]=1-a(f,h,"z","y",o,i),p[s+1]=1-a(f,h,"y","z",o,t);break;case 2:f.set(0,1,0),p[s+0]=1-a(f,h,"x","z",o,e),p[s+1]=a(f,h,"z","x",o,i);break;case 3:f.set(0,-1,0),p[s+0]=1-a(f,h,"x","z",o,e),p[s+1]=1-a(f,h,"z","x",o,i);break;case 4:f.set(0,0,1),p[s+0]=1-a(f,h,"x","y",o,e),p[s+1]=1-a(f,h,"y","x",o,t);break;case 5:f.set(0,0,-1),p[s+0]=a(f,h,"x","y",o,e),p[s+1]=1-a(f,h,"y","x",o,t)}}}},63617:(e,t,i)=>{i.d(t,{F:()=>l,o:()=>s});var r=i(87548);class s{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}let a=new r.qUd(-1,1,1,-1,0,1);class o extends r.LoY{constructor(){super(),this.setAttribute("position",new r.qtW([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new r.qtW([0,2,0,0,2,0],2))}}let n=new o;class l{constructor(e){this._mesh=new r.eaF(n,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,a)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}},78710:(e,t,i)=>{i.d(t,{Y:()=>s});var r=i(87548);class s extends r.BRH{constructor(e){super(e),this.type=r.ix0}parse(e){let t,i,s,a=function(e,t){switch(e){case 1:throw Error("THREE.RGBELoader: Read Error: "+(t||""));case 2:throw Error("THREE.RGBELoader: Write Error: "+(t||""));case 3:throw Error("THREE.RGBELoader: Bad File Format: "+(t||""));default:throw Error("THREE.RGBELoader: Memory Error: "+(t||""))}},o=function(e,t,i){t=t||1024;let r=e.pos,s=-1,a=0,o="",n=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));for(;0>(s=n.indexOf("\n"))&&a<t&&r<e.byteLength;)o+=n,a+=n.length,r+=128,n+=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));return -1<s&&(!1!==i&&(e.pos+=a+s+1),o+n.slice(0,s))},n=new Uint8Array(e);n.pos=0;let l=function(e){let t,i,r=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,s=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,n=/^\s*FORMAT=(\S+)\s*$/,l=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,h={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0};for(!(e.pos>=e.byteLength)&&(t=o(e))||a(1,"no header found"),(i=t.match(/^#\?(\S+)/))||a(3,"bad initial token"),h.valid|=1,h.programtype=i[1],h.string+=t+"\n";!1!==(t=o(e));){if(h.string+=t+"\n","#"===t.charAt(0)){h.comments+=t+"\n";continue}if((i=t.match(r))&&(h.gamma=parseFloat(i[1])),(i=t.match(s))&&(h.exposure=parseFloat(i[1])),(i=t.match(n))&&(h.valid|=2,h.format=i[1]),(i=t.match(l))&&(h.valid|=4,h.height=parseInt(i[1],10),h.width=parseInt(i[2],10)),2&h.valid&&4&h.valid)break}return 2&h.valid||a(3,"missing format specifier"),4&h.valid||a(3,"missing image size specifier"),h}(n),h=l.width,c=l.height,u=function(e,t,i){if(t<8||t>32767||2!==e[0]||2!==e[1]||128&e[2])return new Uint8Array(e);t!==(e[2]<<8|e[3])&&a(3,"wrong scanline width");let r=new Uint8Array(4*t*i);r.length||a(4,"unable to allocate buffer space");let s=0,o=0,n=4*t,l=new Uint8Array(4),h=new Uint8Array(n),c=i;for(;c>0&&o<e.byteLength;){o+4>e.byteLength&&a(1),l[0]=e[o++],l[1]=e[o++],l[2]=e[o++],l[3]=e[o++],(2!=l[0]||2!=l[1]||(l[2]<<8|l[3])!=t)&&a(3,"bad rgbe scanline format");let i=0,u;for(;i<n&&o<e.byteLength;){let t=(u=e[o++])>128;if(t&&(u-=128),(0===u||i+u>n)&&a(3,"bad scanline data"),t){let t=e[o++];for(let e=0;e<u;e++)h[i++]=t}else h.set(e.subarray(o,o+u),i),i+=u,o+=u}for(let e=0;e<t;e++){let i=0;r[s]=h[e+i],i+=t,r[s+1]=h[e+i],i+=t,r[s+2]=h[e+i],i+=t,r[s+3]=h[e+i],s+=4}c--}return r}(n.subarray(n.pos),h,c);switch(this.type){case r.RQf:let d=new Float32Array(4*(s=u.length/4));for(let e=0;e<s;e++)!function(e,t,i,r){let s=Math.pow(2,e[t+3]-128)/255;i[r+0]=e[t+0]*s,i[r+1]=e[t+1]*s,i[r+2]=e[t+2]*s,i[r+3]=1}(u,4*e,d,4*e);t=d,i=r.RQf;break;case r.ix0:let p=new Uint16Array(4*(s=u.length/4));for(let e=0;e<s;e++)!function(e,t,i,s){let a=Math.pow(2,e[t+3]-128)/255;i[s+0]=r.GxU.toHalfFloat(Math.min(e[t+0]*a,65504)),i[s+1]=r.GxU.toHalfFloat(Math.min(e[t+1]*a,65504)),i[s+2]=r.GxU.toHalfFloat(Math.min(e[t+2]*a,65504)),i[s+3]=r.GxU.toHalfFloat(1)}(u,4*e,p,4*e);t=p,i=r.ix0;break;default:throw Error("THREE.RGBELoader: Unsupported type: "+this.type)}return{width:h,height:c,data:t,header:l.string,gamma:l.gamma,exposure:l.exposure,type:i}}setDataType(e){return this.type=e,this}load(e,t,i,s){return super.load(e,function(e,i){switch(e.type){case r.RQf:case r.ix0:e.colorSpace=r.Zr2,e.minFilter=r.k6q,e.magFilter=r.k6q,e.generateMipmaps=!1,e.flipY=!0}t&&t(e,i)},i,s)}}},91246:(e,t,i)=>{i.d(t,{G:()=>r});let r={name:"VignetteShader",uniforms:{tDiffuse:{value:null},offset:{value:1},darkness:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float offset;
		uniform float darkness;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			// Eskil's vignette

			vec4 texel = texture2D( tDiffuse, vUv );
			vec2 uv = ( vUv - vec2( 0.5 ) ) * vec2( offset );
			gl_FragColor = vec4( mix( texel.rgb, vec3( 1.0 - darkness ), dot( uv, uv ) ), texel.a );

		}`}},94497:(e,t,i)=>{i.d(t,{s:()=>h});var r=i(87548),s=i(52049),a=i(23264),o=i(63617);class n extends o.o{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){let r,s,a=e.getContext(),o=e.state;o.buffers.color.setMask(!1),o.buffers.depth.setMask(!1),o.buffers.color.setLocked(!0),o.buffers.depth.setLocked(!0),this.inverse?(r=0,s=1):(r=1,s=0),o.buffers.stencil.setTest(!0),o.buffers.stencil.setOp(a.REPLACE,a.REPLACE,a.REPLACE),o.buffers.stencil.setFunc(a.ALWAYS,r,0xffffffff),o.buffers.stencil.setClear(s),o.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),o.buffers.color.setLocked(!1),o.buffers.depth.setLocked(!1),o.buffers.color.setMask(!0),o.buffers.depth.setMask(!0),o.buffers.stencil.setLocked(!1),o.buffers.stencil.setFunc(a.EQUAL,1,0xffffffff),o.buffers.stencil.setOp(a.KEEP,a.KEEP,a.KEEP),o.buffers.stencil.setLocked(!0)}}class l extends o.o{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class h{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),void 0===t){let i=e.getSize(new r.I9Y);this._width=i.width,this._height=i.height,(t=new r.nWS(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:r.ix0})).texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new a.p(s.Z),this.copyPass.material.blending=r.XIg,this.clock=new r.zD7}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);-1!==t&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){void 0===e&&(e=this.clock.getDelta());let t=this.renderer.getRenderTarget(),i=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(!1!==r.enabled){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),r.needsSwap){if(i){let t=this.renderer.getContext(),i=this.renderer.state.buffers.stencil;i.setFunc(t.NOTEQUAL,1,0xffffffff),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),i.setFunc(t.EQUAL,1,0xffffffff)}this.swapBuffers()}void 0!==n&&(r instanceof n?i=!0:r instanceof l&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(void 0===e){let t=this.renderer.getSize(new r.I9Y);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,(e=this.renderTarget1.clone()).setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let i=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(i,r),this.renderTarget2.setSize(i,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(i,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}}}]);