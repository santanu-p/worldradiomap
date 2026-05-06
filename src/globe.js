import * as THREE from 'three';

export function initGlobe(container) {
  if (!container) return;
  container.innerHTML = '';

  const width = container.clientWidth || 300;
  const height = container.clientHeight || 300;

  const scene = new THREE.Scene();

  // Camera setup
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 18;
  camera.position.y = 2;
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Group to rotate everything
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  // 1. Inner solid sphere (dark void) to block backface wireframes
  const innerGeometry = new THREE.SphereGeometry(4.9, 64, 64);
  const innerMaterial = new THREE.MeshBasicMaterial({
    color: 0x05101a, // Dark void color from the theme
  });
  const innerSphere = new THREE.Mesh(innerGeometry, innerMaterial);
  globeGroup.add(innerSphere);

  // 2. High-tech Geodesic wireframe (Light blue)
  // Icosahedron with detail 8 gives a very cool triangular grid mapping
  const wireGeometry = new THREE.IcosahedronGeometry(5, 8); 
  const wireMaterial = new THREE.LineBasicMaterial({
    color: 0x29b6f6,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending
  });
  // Use EdgesGeometry for a cleaner tech look than pure wireframe
  const edges = new THREE.EdgesGeometry(wireGeometry);
  const wireGlobe = new THREE.LineSegments(edges, wireMaterial);
  globeGroup.add(wireGlobe);

  // 3. Orbiting Data Nodes (Satellites)
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const satellites = [];
  const satColors = [0x29b6f6, 0xfff59d, 0xffca28];

  for (let i = 0; i < 3; i++) {
    const radius = 6.5 + i * 1.5;
    const group = new THREE.Group();
    // Tilt the orbit paths randomly
    group.rotation.x = Math.random() * Math.PI;
    group.rotation.y = Math.random() * Math.PI;
    
    // Orbit Ring
    const ringGeo = new THREE.RingGeometry(radius, radius + 0.02, 64);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: satColors[i], 
      transparent: true, 
      opacity: 0.08, 
      side: THREE.DoubleSide 
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Node Core
    const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const nodeMat = new THREE.MeshBasicMaterial({ color: satColors[i] });
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    
    // Node Glow Aura
    const glowGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: satColors[i], 
      transparent: true, 
      opacity: 0.3, 
      blending: THREE.AdditiveBlending 
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    node.add(glow);

    group.add(node);
    orbitGroup.add(group);

    satellites.push({
      group,
      node,
      radius,
      angle: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.004
    });
  }

  // 4. Radio Signal Ripples (Surface flashes)
  const ripples = [];
  function createRipple(lat, lng, color) {
    const latRad = lat * (Math.PI / 180);
    const lngRad = -lng * (Math.PI / 180);
    // Position slightly above the surface to avoid z-fighting
    const pos = new THREE.Vector3(
      5.05 * Math.cos(latRad) * Math.cos(lngRad),
      5.05 * Math.sin(latRad),
      5.05 * Math.cos(latRad) * Math.sin(lngRad)
    );

    const ringGeo = new THREE.RingGeometry(0.05, 0.15, 32);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const ripple = new THREE.Mesh(ringGeo, ringMat);
    ripple.position.copy(pos);
    
    // Look straight out from the center of the earth to lay flat on the surface
    const normal = pos.clone().normalize();
    ripple.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    
    globeGroup.add(ripple);
    ripples.push({ mesh: ripple, age: 0, scale: 1 });
  }

  // 5. Ambient stars/data dust in background
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = [];
  for(let i = 0; i < 200; i++) {
    dustPos.push(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40
    );
  }
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ 
    color: 0x29b6f6, 
    size: 0.08, 
    transparent: true, 
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  const clock = new THREE.Clock();
  let lastRippleTime = 0;

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Rotate globe
    globeGroup.rotation.y += 0.08 * delta;
    
    // Add a very subtle majestic tilt wobble
    globeGroup.rotation.x = Math.sin(time * 0.3) * 0.08; 

    // Rotate dust slowly
    dust.rotation.y -= 0.02 * delta;

    // Animate Satellites strictly on orbit paths
    satellites.forEach(s => {
      s.angle += s.speed;
      s.node.position.x = Math.cos(s.angle) * s.radius;
      s.node.position.z = Math.sin(s.angle) * s.radius;
    });

    // Spawn signal ripples
    if (time - lastRippleTime > 0.15 && ripples.length < 15) {
      lastRippleTime = time;
      // Focus ripples closer to the equator (most radio stations)
      const lat = (Math.random() - 0.5) * 110; 
      const lng = (Math.random() - 0.5) * 360;
      const color = satColors[Math.floor(Math.random() * satColors.length)];
      createRipple(lat, lng, color);
    }

    // Update ripples (grow and fade)
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.age += delta;
      
      // Fast expansion
      r.scale += delta * 12; 
      r.mesh.scale.set(r.scale, r.scale, r.scale);
      
      // Fade out
      r.mesh.material.opacity = Math.max(0, 0.9 - r.age * 0.7);

      // Remove when fully faded
      if (r.age > 1.3) {
        globeGroup.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        ripples.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }

  animate();

  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      const { width, height } = entry.contentRect;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
  });

  resizeObserver.observe(container);
}
