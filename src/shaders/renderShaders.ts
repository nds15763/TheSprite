// Particle Rendering Shaders

export const renderVertexShader = `
  uniform sampler2D uPositionTexture;
  uniform float uSize;
  uniform float uBass;
  
  attribute vec2 reference; // UV coordinate to look up position in texture
  
  varying float vLife;
  varying vec3 vColor;
  
  void main() {
    // Read position from GPGPU texture
    vec4 posData = texture2D(uPositionTexture, reference);
    vec3 pos = posData.xyz;
    vLife = posData.w;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Size logic:
    // 1. Distance attenuation (perspective)
    // 2. Bass boosts size
    // 3. Life fades size
    gl_PointSize = uSize * (1.0 + uBass * 2.0) * vLife * (100.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
    
    // Color Logic passed to Fragment
    // We can calculate color here based on height (Y) or speed
    vColor = vec3(1.0); // Default white, modified in fragment
  }
`;

export const renderFragmentShader = `
  varying float vLife;
  varying vec3 vColor;
  
  uniform float uHigh; // High frequencies
  uniform float uEnergy; // Total energy for color shifting
  
  void main() {
    // Circular particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    if(length(coord) > 0.5) discard;
    
    // Dynamic Color Palette based on Energy
    // Low Energy: Cool Blues/Purples
    // High Energy: Hot Reds/Golds/Cyans
    
    vec3 coldCore = vec3(0.2, 0.6, 1.0); // Electric Blue
    vec3 coldMid = vec3(0.1, 0.0, 0.4);  // Deep Purple
    vec3 coldEnd = vec3(0.0, 0.0, 0.1);  // Black/Blue
    
    vec3 hotCore = vec3(1.0, 0.9, 0.7);  // White Gold
    vec3 hotMid = vec3(1.0, 0.2, 0.1);   // Red Orange
    vec3 hotEnd = vec3(0.4, 0.0, 0.2);   // Magenta
    
    // Mix palettes based on smoothed energy
    vec3 targetCore = mix(coldCore, hotCore, uEnergy);
    vec3 targetMid = mix(coldMid, hotMid, uEnergy);
    vec3 targetEnd = mix(coldEnd, hotEnd, uEnergy);
    
    vec3 finalColor = mix(targetEnd, targetMid, vLife);
    finalColor = mix(finalColor, targetCore, smoothstep(0.6, 1.0, vLife));
    
    // High frequency boost (Sparkle/Bloom)
    finalColor += vec3(0.2, 0.5, 1.0) * (uHigh + 0.2) * vLife;
    
    // Simple opacity based on life (Increased slightly)
    gl_FragColor = vec4(finalColor, vLife * 0.6); 
  }
`;

