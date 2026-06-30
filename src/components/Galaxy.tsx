/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { Renderer, Camera, Transform, Program, Mesh, Geometry } from 'ogl';

interface GalaxyProps {
  mouseRepulsion?: boolean;
  mouseInteraction?: boolean;
  density?: number;
  glowIntensity?: number;
  saturation?: number;
  hueShift?: number;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  speed?: number;
  transparent?: boolean;
}

export default function Galaxy({
  mouseRepulsion = true,
  mouseInteraction = true,
  density = 1.8,
  glowIntensity = 0.6,
  saturation = 0.9,
  hueShift = 220,
  twinkleIntensity = 0.4,
  rotationSpeed = 0.05,
  speed = 0.8,
  transparent = true,
}: GalaxyProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Create OGL Renderer
    const renderer = new Renderer({
      alpha: transparent,
      antialias: true,
      premultipliedAlpha: false,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, transparent ? 0 : 1);
    gl.canvas.style.position = 'absolute';
    gl.canvas.style.top = '0';
    gl.canvas.style.left = '0';
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.pointerEvents = 'none';
    container.appendChild(gl.canvas);

    // 2. Create Camera & Scene
    const camera = new Camera(gl, { fov: 45 });
    camera.position.set(0, 0, 4);

    const scene = new Transform();

    // 3. Shaders
    const vertex = `
      attribute vec3 position;
      attribute vec3 randoms;
      
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uSpeed;
      uniform float uMouseRepulsion;
      uniform float uTwinkle;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec3 pos = position;

        // Twinkle / noise calculations
        float t = uTime * uSpeed * (0.5 + randoms.x * 0.5);
        float twinkle = sin(t + randoms.y * 6.28) * uTwinkle;
        vAlpha = 0.5 + 0.5 * sin(t) + twinkle;

        // Determine color based on index & hueShift
        float hue = randoms.z * 3.14159 * 2.0;
        vColor = vec3(
          0.5 + 0.5 * sin(hue + 0.0),
          0.5 + 0.5 * sin(hue + 2.09),
          0.7 + 0.3 * sin(hue + 4.18)
        );

        // Simple mouse repulsion
        if (uMouseRepulsion > 0.0) {
          float dist = distance(pos.xy, uMouse);
          if (dist < 0.8) {
            float force = (0.8 - dist) * 0.25;
            vec2 dir = normalize(pos.xy - uMouse);
            pos.xy += dir * force;
          }
        }

        // Project
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Point size based on distance & scaling
        gl_PointSize = (10.0 + randoms.x * 12.0) * (1.0 / -mvPosition.z);
      }
    `;

    const fragment = `
      precision highp float;
      varying vec3 vColor;
      varying float vAlpha;
      
      uniform float uGlow;
      uniform float uSaturation;

      void main() {
        // Star points round rendering
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;

        // Soft glow center
        float intensity = smoothstep(0.5, 0.0, dist) * uGlow;
        
        // Saturate colors
        vec3 color = mix(vec3(dot(vColor, vec3(0.299, 0.587, 0.114))), vColor, uSaturation);
        
        gl_FragColor = vec4(color, vAlpha * intensity);
      }
    `;

    // 4. Create Star Geometry
    const count = Math.floor(1200 * density);
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Galaxy spiral generation
      const angle = (i % 3) * 2.094 + (i / count) * 4.0; // 3 arms
      const dist = (i / count) * 1.5 + 0.1;
      const noiseX = (Math.random() - 0.5) * 0.15;
      const noiseY = (Math.random() - 0.5) * 0.15;
      const noiseZ = (Math.random() - 0.5) * 0.05;

      positions[i * 3 + 0] = Math.cos(angle) * dist + noiseX;
      positions[i * 3 + 1] = Math.sin(angle) * dist + noiseY;
      positions[i * 3 + 2] = noiseZ;

      randoms[i * 3 + 0] = Math.random(); // scaling / individual speed
      randoms[i * 3 + 1] = Math.random(); // offset for twinkle
      randoms[i * 3 + 2] = Math.random(); // offset for color hue
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      randoms: { size: 3, data: randoms },
    });

    // 5. Create Program
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: [99, 99] },
        uSpeed: { value: speed },
        uMouseRepulsion: { value: mouseRepulsion ? 1 : 0 },
        uTwinkle: { value: twinkleIntensity },
        uGlow: { value: glowIntensity },
        uSaturation: { value: saturation },
      },
      transparent: true,
      depthTest: false,
    });

    // 6. Mesh
    const points = new Mesh(gl, { mode: gl.POINTS, geometry, program });
    points.setParent(scene);

    // Resize
    const resize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.perspective({ aspect: w / h });
    };
    window.addEventListener('resize', resize, false);
    resize();

    // Mouse Move
    let mouseX = 99;
    let mouseY = 99;
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseInteraction) return;
      const rect = gl.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseX = x;
      mouseY = y;
    };
    window.addEventListener('mousemove', onMouseMove, false);

    // 7. Render Loop
    let animationId: number;
    let time = 0;
    const update = () => {
      animationId = requestAnimationFrame(update);

      time += 0.01;
      program.uniforms.uTime.value = time;
      program.uniforms.uMouse.value = [mouseX, mouseY];

      // Slowly rotate galaxy
      points.rotation.z += 0.001 * rotationSpeed * 10;

      renderer.render({ scene, camera });
    };
    update();

    // 8. Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      if (gl.canvas.parentNode) {
        gl.canvas.parentNode.removeChild(gl.canvas);
      }
      // Lose WebGL context specifically to free memory
      const extension = gl.getExtension('WEBGL_lose_context');
      if (extension) extension.loseContext();
    };
  }, [mouseRepulsion, mouseInteraction, density, glowIntensity, saturation, hueShift, twinkleIntensity, rotationSpeed, speed, transparent]);

  return <div ref={containerRef} className="galaxy-container w-full h-full pointer-events-none relative" />;
}
