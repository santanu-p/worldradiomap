import React, { Suspense, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Points, PointMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { gsap } from 'gsap';
import * as THREE from 'three';

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDirection, normalize(vNormal)), 0.0), 2.2);
    float pulse = 0.75 + 0.25 * sin(uTime * 1.2);
    vec3 color = mix(vec3(0.18, 0.45, 1.0), vec3(0.95, 0.32, 1.0), fresnel);
    gl_FragColor = vec4(color, fresnel * 0.72 * pulse);
  }
`;

const CONNECTIONS = [
  [[40.7, -74.0], [51.5, -0.1]],
  [[34.0, -118.2], [35.7, 139.7]],
  [[48.8, 2.3], [1.3, 103.8]],
  [[52.5, 13.4], [-33.9, 151.2]],
  [[25.2, 55.3], [19.4, -99.1]],
  [[37.8, -122.4], [28.6, 77.2]],
  [[-23.5, -46.6], [40.4, -3.7]],
  [[31.2, 121.5], [59.9, 10.8]]
];

function latLngToVector3(lat, lng, radius = 1.72) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function getArcPoints(start, end) {
  const startVector = latLngToVector3(start[0], start[1], 1.74);
  const endVector = latLngToVector3(end[0], end[1], 1.74);
  const mid = startVector.clone().add(endVector).multiplyScalar(0.5).normalize();
  const distance = startVector.distanceTo(endVector);
  mid.multiplyScalar(1.92 + distance * 0.18);
  const curve = new THREE.QuadraticBezierCurve3(startVector, mid, endVector);
  return curve.getPoints(64);
}

function isInContinent(lat, lon) {
  const regions = [
    { lat: 48, lon: -101, rx: 33, ry: 19 },
    { lat: 17, lon: -88, rx: 14, ry: 10 },
    { lat: -16, lon: -61, rx: 18, ry: 28 },
    { lat: 51, lon: 18, rx: 23, ry: 12 },
    { lat: 7, lon: 20, rx: 22, ry: 31 },
    { lat: 38, lon: 78, rx: 47, ry: 22 },
    { lat: 12, lon: 103, rx: 18, ry: 18 },
    { lat: -25, lon: 134, rx: 19, ry: 12 },
    { lat: 68, lon: -42, rx: 17, ry: 8 },
    { lat: 61, lon: 96, rx: 50, ry: 14 }
  ];

  return regions.some((region) => {
    const dx = (lon - region.lon) / region.rx;
    const dy = (lat - region.lat) / region.ry;
    return dx * dx + dy * dy < 1;
  });
}

function createDottedWorldTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size / 2;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let lat = -70; lat <= 76; lat += 2.15) {
    for (let lon = -178; lon <= 180; lon += 2.15) {
      if (!isInContinent(lat, lon)) continue;
      const x = ((lon + 180) / 360) * canvas.width;
      const y = ((90 - lat) / 180) * canvas.height;
      const alpha = 0.48 + Math.random() * 0.34;
      context.fillStyle = `rgba(198, 194, 255, ${alpha})`;
      context.beginPath();
      context.arc(x, y, 1.55, 0, Math.PI * 2);
      context.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}


function GlobeMesh() {
  const globeRef = useRef();
  const atmosphereRef = useRef();
  const texture = useMemo(createDottedWorldTexture, []);
  const atmosphereMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: ATMOSPHERE_VERTEX_SHADER,
    fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  }), []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    atmosphereMaterial.uniforms.uTime.value = elapsed;
    if (globeRef.current) globeRef.current.rotation.y = elapsed * 0.08;
    if (atmosphereRef.current) atmosphereRef.current.rotation.y = elapsed * 0.065;
  });

  return (
    <group ref={globeRef} rotation={[0.08, -0.35, -0.06]}>
      <mesh>
        <sphereGeometry args={[1.68, 128, 128]} />
        <meshBasicMaterial color="#0b124a" transparent opacity={0.96} toneMapped={false} />
      </mesh>
      <mesh scale={1.012}>
        <sphereGeometry args={[1.68, 128, 128]} />
        <meshBasicMaterial
          map={texture}
          color="#d8d3ff"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={atmosphereRef} material={atmosphereMaterial} scale={1.065}>
        <sphereGeometry args={[1.68, 96, 96]} />
      </mesh>
    </group>
  );
}

function ConnectionArcs() {
  const group = useRef();
  const markerRefs = useRef([]);
  const arcs = useMemo(() => CONNECTIONS.map(([start, end]) => ({
    points: getArcPoints(start, end),
    start: latLngToVector3(start[0], start[1], 1.79),
    end: latLngToVector3(end[0], end[1], 1.79)
  })), []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = elapsed * 0.08;
    markerRefs.current.forEach((marker, index) => {
      if (!marker) return;
      const arc = arcs[index % arcs.length];
      const pointIndex = Math.floor(((elapsed * 18 + index * 11) % arc.points.length));
      marker.position.copy(arc.points[pointIndex]);
      marker.scale.setScalar(0.78 + Math.sin(elapsed * 3 + index) * 0.22);
    });
  });

  return (
    <group ref={group} rotation={[0.08, -0.35, -0.06]}>
      {arcs.map((arc, index) => (
        <group key={`arc-${index}`}>
          <Line
            points={arc.points}
            color={index % 2 ? '#ff63d8' : '#64d8ff'}
            lineWidth={index % 2 ? 1.3 : 1.7}
            transparent
            opacity={0.42}
            blending={THREE.AdditiveBlending}
          />
          <mesh position={arc.start}>
            <sphereGeometry args={[0.018, 12, 12]} />
            <meshBasicMaterial color="#7ffff4" transparent opacity={0.84} toneMapped={false} />
          </mesh>
          <mesh position={arc.end}>
            <sphereGeometry args={[0.014, 12, 12]} />
            <meshBasicMaterial color="#ff78e7" transparent opacity={0.74} toneMapped={false} />
          </mesh>
          <mesh ref={(node) => { markerRefs.current[index] = node; }}>
            <sphereGeometry args={[0.026, 16, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.95} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ParticleField() {
  const pointsRef = useRef();
  const positions = useMemo(() => {
    const count = 760;
    const array = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 2.2 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      array[index * 3 + 1] = radius * Math.cos(phi) * 0.68;
      array[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 0.28;
    }
    return array;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const elapsed = clock.getElapsedTime();
    pointsRef.current.rotation.y = elapsed * 0.012;
    pointsRef.current.rotation.x = Math.sin(elapsed * 0.12) * 0.04;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled>
      <PointMaterial transparent color="#b4c7ff" size={0.012} sizeAttenuation depthWrite={false} opacity={0.72} />
    </Points>
  );
}

function CameraRig({ root }) {
  const { camera, pointer } = useThree();
  const target = useMemo(() => ({ x: 0, y: 0 }), []);

  useFrame(() => {
    target.x = THREE.MathUtils.lerp(target.x, pointer.x, 0.045);
    target.y = THREE.MathUtils.lerp(target.y, pointer.y, 0.045);
    camera.position.x = target.x * 0.34;
    camera.position.y = 0.05 + target.y * 0.18;
    camera.lookAt(0, 0, 0);
    if (root.current) {
      root.current.rotation.x = target.y * 0.05;
      root.current.rotation.y = target.x * -0.07;
    }
  });

  return null;
}

function FuturisticGlobe() {
  const root = useRef();

  React.useEffect(() => {
    if (!root.current) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(root.current.scale, { x: 0.92, y: 0.92, z: 0.92 }, {
        x: 1,
        y: 1,
        z: 1,
        duration: 1.25,
        ease: 'power3.out'
      });
    });
    return () => context.revert();
  }, []);

  return (
    <group ref={root} position={[0, -0.06, 0]}>
      <CameraRig root={root} />
      <ambientLight intensity={0.46} />
      <directionalLight position={[-3, 2.4, 4]} intensity={1.65} color="#7fa7ff" />
      <pointLight position={[-2.8, 1.1, 2.4]} intensity={8} color="#4f79ff" distance={6} />
      <pointLight position={[2.4, -1.6, 1.2]} intensity={5.5} color="#ff45d0" distance={5} />
      <ParticleField />
      <GlobeMesh />
      <ConnectionArcs />
    </group>
  );
}

function GlobeFallback() {
  return (
    <div className="globe-fallback" aria-hidden="true">
      <span />
      <i />
    </div>
  );
}

export function GlobeHeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0.08, 4.7], fov: 43, near: 0.1, far: 20 }}
      dpr={[1, 1.65]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      performance={{ min: 0.55 }}
    >
      <color attach="background" args={[0x020817]} />
      <fog attach="fog" args={[0x06091d, 4.8, 8.4]} />
      <Suspense fallback={null}>
        <FuturisticGlobe />
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom intensity={1.55} luminanceThreshold={0.18} luminanceSmoothing={0.35} mipmapBlur radius={0.72} />
          <Vignette eskil offset={0.12} darkness={0.72} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

export function renderHeroGlobe(container) {
  if (!container) return null;
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <GlobeFallback />
      <GlobeHeroCanvas />
    </React.StrictMode>
  );
  return root;
}
