import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('hero globe uses React Three Fiber, Drei, postprocessing, and shaders', async () => {
  const globeSource = await readFile(new URL('../src/FuturisticGlobe.jsx', import.meta.url), 'utf8');

  assert.match(globeSource, /@react-three\/fiber/, 'expected the globe to render with React Three Fiber');
  assert.match(globeSource, /@react-three\/drei/, 'expected the globe to use Drei helpers');
  assert.match(globeSource, /@react-three\/postprocessing/, 'expected bloom/postprocessing effects');
  assert.match(globeSource, /ShaderMaterial/, 'expected GLSL shader materials for the globe visuals');
  assert.match(globeSource, /gsap/, 'expected GSAP-powered entrance transitions');
});

test('landing page mounts the futuristic globe canvas asynchronously', async () => {
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(mainSource, /id="globeHero"/, 'expected a globe canvas mount point in the hero');
  assert.match(mainSource, /import\('\.\/FuturisticGlobe\.jsx'\)/, 'expected the heavy globe bundle to be code-split');
  assert.match(mainSource, /renderHeroGlobe\(refs\.globeHero\)/, 'expected the globe renderer to mount into the hero');
});

test('package includes the 3D globe runtime dependencies', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  for (const dependency of ['three', 'react', 'react-dom', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'postprocessing', 'gsap']) {
    assert.ok(packageJson.dependencies[dependency], `expected ${dependency} to be installed`);
  }
});
