import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const AU = 1;
const INCLINATION_DEG = 1.221;
const INCLINATION_RAD = (INCLINATION_DEG * Math.PI) / 180;
const SEMI_MAJOR = 1.726;
const ECCENTRICITY = 0.57;
const ORBITAL_PERIOD_YEARS = 2.27;

const ABLATION_SEMI_MAJOR = SEMI_MAJOR + 0.005; 
const ABLATION_ECCENTRICITY = ECCENTRICITY - 0.002;

const ASTEROID_SCALE = 0.005;

const SUN_RADIUS_SCALE = 0.04;
const EARTH_ORBIT_RADIUS = 1;
const EARTH_SPHERE_SCALE = 0.008;
let scene, camera, renderer, controls;
let asteroidMesh, asteroidAblatedMesh, orbitLineCurrent, orbitLineAblated, earthOrbitLine;
let starField, sunLight, sunMesh, earthMesh;
let clock = new THREE.Clock();
function init() {
  const container = document.getElementById('canvas-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);
  scene.fog = new THREE.FogExp2(0x050508, 0.012);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.001, 1000);
  camera.position.set(3.5, 2.2, 3.5);
  camera.lookAt(0, 0, 0);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 0.5;
  controls.maxDistance = 25;
  controls.target.set(0, 0, 0);
  addStarField();
  addSun();
  addEarthOrbit();
  addEarth();
  addOrbitLines();
  addAsteroid();
  window.addEventListener('resize', onResize);
  document.getElementById('caption').classList.add('hidden');
  animate();
}
function addStarField() {
  const starCount = 4000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  for (let i =0; i < starCount; i++) {
    const r = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const b = 0.6 + Math.random() * 0.4;
    colors[i * 3] = b;
    colors[i * 3 + 1] = b;
    colors[i * 3 + 2] = b * 1.1;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });
  starField = new THREE.Points(geometry, material);
  scene.add(starField);
}
function createSunTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height =size;
  const ctx = canvas.getContext('2d');
  const gr = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, '#fff8e0');
  gr.addColorStop(0.4, '#ffdd88');
  gr.addColorStop(0.8, '#e88c30');
  gr.addColorStop(1, '#b85c20');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 28;
    imgData.data[i] = Math.min(255, imgData.data[i] + n);
    imgData.data[i + 1] = Math.min(255, imgData.data[i + 1] + n);
    imgData.data[i + 2] = Math.min(255, imgData.data[i + 2] + n);
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createAsteroidTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gr = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, '#a09078');
  gr.addColorStop(0.6, '#807060');
  gr.addColorStop(1, '#504840');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 60;
    imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + n));
    imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + n));
    imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
function addSun() {
  const sunGeometry = new THREE.SphereGeometry(SUN_RADIUS_SCALE, 32, 32);
  const sunTex = createSunTexture();
  const sunMaterial = new THREE.MeshBasicMaterial({
    map: sunTex,
    transparent: false,
    side: THREE.FrontSide,
  });
  sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  scene.add(sunMesh);
  const sunLoader = new THREE.TextureLoader();
  sunLoader.setCrossOrigin('anonymous');
  sunLoader.load(
    'https://upload.wikimedia.org/wikipedia/commons/c/cb/Solarsystemscope_texture_2k_sun.jpg',
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      if (sunMesh && sunMesh.material) {
        sunMesh.material.map = tex;
        sunMesh.material.needsUpdate = true;
      }
    },
    undefined,
    () => {}
  );
  const glowGeometry = new THREE.SphereGeometry(SUN_RADIUS_SCALE * 1.4, 24, 24);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa44,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  scene.add(glow);
  sunLight = new THREE.PointLight(0xffeedd, 1.2, 80);
  scene.add(sunLight);
  const ambient = new THREE.AmbientLight(0x1a1a2e, 0.25);
  scene.add(ambient);
}
function ellipsePoints(a, e, inclinationRad, numPoints = 256) {
  const points = [];
  const axisX = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= numPoints; i++) {
    const theta = (i / numPoints) * Math.PI * 2;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const v = new THREE.Vector3(x, y, 0);
    v.applyAxisAngle(axisX, inclinationRad);
    points.push(v);
  }
  return points;
}
function addEarthOrbit() {
  const points = [];
  for (let i = 0; i <= 128; i++) {
    const t = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * EARTH_ORBIT_RADIUS, Math.sin(t) * EARTH_ORBIT_RADIUS, 0));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.35,
    linewidth: 1,
  });
  earthOrbitLine = new THREE.Line(geometry, material);
  scene.add(earthOrbitLine);
}
function addOrbitLines() {
  const ptsCurrent = ellipsePoints(SEMI_MAJOR, ECCENTRICITY, INCLINATION_RAD);
  const geomCurrent = new THREE.BufferGeometry().setFromPoints(ptsCurrent);
  orbitLineCurrent = new THREE.Line(
    geomCurrent,
    new THREE.LineBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.9,
    })
  );
  scene.add(orbitLineCurrent);
  const ptsAblated = ellipsePoints(ABLATION_SEMI_MAJOR, ABLATION_ECCENTRICITY, INCLINATION_RAD * 1.02);
  const geomAblated = new THREE.BufferGeometry().setFromPoints(ptsAblated);
  orbitLineAblated = new THREE.Line(
    geomAblated,
    new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.85,
    })
  );
  scene.add(orbitLineAblated);
}
function addEarth() {
  const geo = new THREE.SphereGeometry(EARTH_SPHERE_SCALE * 2, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.5
  });
  earthMesh = new THREE.Mesh(geo, mat);
  scene.add(earthMesh);
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg', (tex) => {
    earthMesh.material.map = tex;
    earthMesh.material.needsUpdate = true;
  });
}
function addAsteroid() {
  const geometry = new THREE.IcosahedronGeometry(ASTEROID_SCALE * 2, 2);
  const posAttr = geometry.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(posAttr, i);
    vertex.multiplyScalar(0.8 + Math.random() * 0.4);
    posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  asteroidMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x888888 }));
  scene.add(asteroidMesh);
  asteroidAblatedMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff }));
  scene.add(asteroidAblatedMesh);
}
function trueAnomalyFromTime(tYears, periodYears, e) {
  const n = (2 * Math.PI) / periodYears;
  const M = n * tYears;
  let E = M;
  for (let i = 0; i < 15; i++) {
    E =M + e * Math.sin(E);
  }
  const nu = 2 *Math.atan2(
    Math.sqrt(1 + e) *Math.sin(E / 2),
    Math.sqrt(1 - e) *Math.cos(E / 2)
  );
  return nu;
}
function positionOnOrbit(a, e, inclinationRad, tYears, periodYears) {
  const nu = trueAnomalyFromTime(tYears, periodYears, e);
  const r = (a *(1 - e * e)) / (1 + e * Math.cos(nu));
  const x = r *Math.cos(nu); 
  const y = r * Math.sin(nu);
  const v = new THREE.Vector3(x, y, 0);
  v.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
  return v;
}
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const year = (t * 0.15) % ORBITAL_PERIOD_YEARS;
  const pos1 = positionOnOrbit(SEMI_MAJOR, ECCENTRICITY, INCLINATION_RAD, year, ORBITAL_PERIOD_YEARS);
  if (asteroidMesh) asteroidMesh.position.copy(pos1);
  const pos2 = positionOnOrbit(ABLATION_SEMI_MAJOR, ABLATION_ECCENTRICITY, INCLINATION_RAD, year, ORBITAL_PERIOD_YEARS);
  if (asteroidAblatedMesh) {
    asteroidAblatedMesh.position.copy(pos2);
    asteroidAblatedMesh.rotation.x += 0.01;
  }
  if (asteroidMesh) asteroidMesh.rotation.y += 0.01;
  const earthAngle = (t * 0.15) % (Math.PI * 2); 
  if (earthMesh) {
    
    earthMesh.position.set(Math.cos(earthAngle) * EARTH_ORBIT_RADIUS, Math.sin(earthAngle) * EARTH_ORBIT_RADIUS, 0);
}

  renderer.render(scene, camera);
}
function onResize() {

  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}
init(); 