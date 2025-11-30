// GPGPU Position Simulation Shader

export const simulationFragmentShader = `
  // --- FIX START ---
  precision highp float; 
  // uniform vec2 resolution; // GPUComputationRenderer usually injects this, but some versions need explicit declaration if used directly.
  // However, three.js GPUComputationRenderer injects: uniform vec2 resolution;
  // If you get 'redeclaration' error, comment it out. But 'not compiled' usually means missing it or syntax error.
  // Let's rely on auto-injection first, but fix syntax. 
  // Wait, if 'Fragment shader is not compiled' usually means syntax error in the code below.
  // 'resolution' is definitely injected by GPUComputationRenderer.
  // --- FIX END ---

  uniform float uTime;
  uniform float uDelta;
  // uniform sampler2D uTexture; // Commented out to prevent redefinition error (injected by GPUComputationRenderer)
  uniform vec3 uMouse;        // Mouse position (x, y, z=active)
  uniform float uEnergy;      // Audio Energy

  // --- CURL NOISE FUNCTION (Simplex Noise Variant) ---
  // Source: https://github.com/cabbibo/glsl-curl-noise
  
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }
  
  vec3 snoiseVec3( vec3 x ){
    float s  = snoise(vec3( x ));
    float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
    float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
    vec3 c = vec3( s , s1 , s2 );
    return c;
  }
  
  vec3 curlNoise( vec3 p ){
    const float e = .1;
    vec3 dx = vec3( e   , 0.0 , 0.0 );
    vec3 dy = vec3( 0.0 , e   , 0.0 );
    vec3 dz = vec3( 0.0 , 0.0 , e   );
  
    vec3 p_x0 = snoiseVec3( p - dx );
    vec3 p_x1 = snoiseVec3( p + dx );
    vec3 p_y0 = snoiseVec3( p - dy );
    vec3 p_y1 = snoiseVec3( p + dy );
    vec3 p_z0 = snoiseVec3( p - dz );
    vec3 p_z1 = snoiseVec3( p + dz );
  
    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;
  
    const float divisor = 1.0 / ( 2.0 * e );
    return normalize( vec3( x , y , z ) * divisor );
  }

  // --- MAIN ---

  void main() {
    // GPUComputationRenderer injects 'resolution' uniform automatically.
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 tmpPos = texture2D(uTexture, uv);
    vec3 pos = tmpPos.xyz;
    float life = tmpPos.w; // Alpha channel stores life (0-1)

    // 1. Lifecycle Management
    life -= 0.005 * (1.0 + uEnergy * 2.0); // Music makes life decay faster (more turnover)
    
    // Reset if dead
    if (life <= 0.0) {
       // Respawn at strict bottom (Source/Fountain effect)
       // Y range restricted to bottom (-4.5 to -4.0) to keep the base full
       float r = fract(sin(dot(uv + vec2(uTime, 0.0), vec2(12.9898,78.233))) * 43758.5453);
       float angle = r * 6.28;
       float radius = r * 2.5; // Slightly wider base
       
       pos = vec3(cos(angle) * radius, -4.5 + r * 0.5, sin(angle) * radius);
       life = 0.8 + r * 0.2;
    }
    
    // Force reset if too high (keep the flow continuous)
    if (pos.y > 4.5) {
       life = -0.1; // Kill it
    }

    // 2. Curl Noise Movement
    // Intensity increases with Audio Energy
    vec3 curl = curlNoise(pos * 0.5 + uTime * 0.1);
    pos += curl * (0.01 + uEnergy * 0.03);
    
    // Natural Upward Drift (Heat/Fire metaphor)
    // Faster base speed + Burst speed on high energy
    float burst = step(0.7, uEnergy) * 0.05; // Extra kick for heavy beats
    pos.y += 0.03 + uEnergy * 0.1 + burst;

    // 3. Touch Interaction (Repulsion)
    if (uMouse.z > 0.5) {
       vec3 mousePos = vec3(uMouse.x, uMouse.y, 0.0);
       
       float dist = distance(pos, mousePos);
       if (dist < 2.0) {
          vec3 dir = normalize(pos - mousePos);
          // Strong repulsion force
          pos += dir * (2.0 - dist) * 0.1;
       }
    }

    gl_FragColor = vec4(pos, life);
  }
`;
