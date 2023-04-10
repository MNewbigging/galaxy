import * as THREE from "three";
import GUI from "lil-gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { GameLoader } from "./loaders/game-loader";

interface GalaxyProps {
  count: number;
  size: number;
  radius: number;
  branches: number;
  spin: number;
  randomness: number;
  randomnessPower: number;
  insideColor: string;
  outsideColor: string;
}

export class GameState {
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private gui = new GUI();
  private galaxyProps: GalaxyProps = {
    count: 1000,
    size: 0.02,
    radius: 5,
    branches: 3,
    spin: 1,
    randomness: 0.2,
    randomnessPower: 3,
    insideColor: "#ff6030",
    outsideColor: "#1b3984",
  };
  private galaxy?: THREE.Points;

  constructor(
    private canvas: HTMLCanvasElement,
    private gameLoader: GameLoader
  ) {
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(3, 3, 3);

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    THREE.ColorManagement.legacyMode = false;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    window.addEventListener("resize", this.onCanvasResize);
    this.onCanvasResize();

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight();
    this.scene.add(directLight);

    this.setupDebugUI();
    this.generateGalaxy();

    // Start game
    this.update();
  }

  private setupDebugUI() {
    this.gui.add(this.galaxyProps, "count").min(100).max(500000).step(1000);
    this.gui.add(this.galaxyProps, "size").min(0.001).max(0.1).step(0.001);
    this.gui.add(this.galaxyProps, "radius").min(0.01).max(20).step(0.01);
    this.gui.add(this.galaxyProps, "branches").min(2).max(20).step(1);
    this.gui.add(this.galaxyProps, "spin").min(-5).max(5).step(0.001);
    this.gui.add(this.galaxyProps, "randomness").min(0).max(2).step(0.001);
    this.gui
      .add(this.galaxyProps, "randomnessPower")
      .min(1)
      .max(10)
      .step(0.001);
    this.gui.addColor(this.galaxyProps, "insideColor");
    this.gui.addColor(this.galaxyProps, "outsideColor");

    this.gui.onFinishChange(() => this.generateGalaxy());
  }

  private generateGalaxy() {
    // Remove any previous galaxy
    if (this.galaxy) {
      this.scene.remove(this.galaxy);
      this.galaxy.geometry.dispose();
      (this.galaxy.material as THREE.PointsMaterial).dispose();
      this.galaxy = undefined;
    }

    // Then generate a new one
    const {
      count,
      size,
      radius,
      branches,
      spin,
      randomness,
      randomnessPower,
      insideColor,
      outsideColor,
    } = this.galaxyProps;

    const galaxyGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorInside = new THREE.Color(insideColor);
    const colorOutside = new THREE.Color(outsideColor);

    for (let i = 0; i < count * 3; i++) {
      const i3 = i * 3;

      // Position
      const branchProgress = Math.random() * radius;
      const spinAngle = branchProgress * spin;

      const branch = i % branches;
      const branchAngle = (branch / branches) * Math.PI * 2;

      // or multiply by math.sign (math.random - 0.5)
      const randomX =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        randomness *
        branchProgress;
      const randomY =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        randomness *
        branchProgress;
      const randomZ =
        Math.pow(Math.random(), randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        randomness *
        branchProgress;

      positions[i3] =
        Math.cos(branchAngle + spinAngle) * branchProgress + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] =
        Math.sin(branchAngle + spinAngle) * branchProgress + randomZ;

      // Color
      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, branchProgress / radius);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
    }

    galaxyGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    galaxyGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const galaxyMat = new THREE.PointsMaterial({
      size: this.galaxyProps.size,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const galaxy = new THREE.Points(galaxyGeom, galaxyMat);

    this.scene.add(galaxy);

    this.galaxy = galaxy;
  }

  private onCanvasResize = () => {
    this.renderer.setSize(
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      false
    );

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;

    this.camera.updateProjectionMatrix();
  };

  private update = () => {
    requestAnimationFrame(this.update);

    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  };
}
