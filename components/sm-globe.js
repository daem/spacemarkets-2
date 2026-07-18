/* sm-globe — high-fidelity WebGL night-Earth for the SpaceMarkets hero.
   Slow auto-rotation, drag to spin, two annotated satellites on tilted
   orbits whose labels track their projected screen positions. */
(function () {
  if (typeof window === 'undefined') return;
  if (customElements.get('sm-globe')) return;
  const TEX_URLS = ['/earth-night.jpg'];
  const MONO = "'JetBrains Mono', monospace";

  class SmGlobe extends HTMLElement {
    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.style.display = 'block';
      this.style.position = 'relative';
      if (!this.style.width) this.style.width = '100%';
      if (!this.style.height) this.style.height = '100%';
      this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._boot().catch((e) => console.warn('sm-globe failed', e));
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      this._ro && this._ro.disconnect();
      this._renderer && this._renderer.dispose();
    }

    async _boot() {
      const THREE = await import('three');
      this._THREE = THREE;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      this.appendChild(renderer.domElement);
      this._renderer = renderer;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 0, 5.5);
      this._scene = scene; this._camera = camera;

      // Earth — night lights as emissive-style basic map
      const tex = await this._loadTexture(THREE);
      if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; }
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(1, 96, 96),
        tex
          ? new THREE.MeshBasicMaterial({ map: tex })
          : new THREE.MeshBasicMaterial({ color: 0x071421 })
      );
      // Darken slightly toward institutional void
      earth.material.color = new THREE.Color(0.82, 0.86, 0.95);
      const globe = new THREE.Group();
      globe.add(earth);
      globe.rotation.z = 0.12;
      globe.rotation.x = 0.18;
      scene.add(globe);
      this._globe = globe;

      // Atmosphere rim
      const atm = new THREE.Mesh(
        new THREE.SphereGeometry(1.06, 96, 96),
        new THREE.ShaderMaterial({
          vertexShader: 'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
          fragmentShader: 'varying vec3 vN;void main(){float i=pow(0.72-dot(vN,vec3(0.,0.,1.)),3.2);gl_FragColor=vec4(0.24,0.62,1.0,1.0)*i;}',
          side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        })
      );
      scene.add(atm);

      // Orbits + satellites
      this._sats = [
        this._makeSat(THREE, scene, { r: 1.42, tiltX: 0.42, tiltZ: -0.25, speed: 0.055, phase: 2.1, color: 0x20d9ff, label: 'GEO-COMM-11 — PRICING', sub: '' }),
        this._makeSat(THREE, scene, { r: 1.18, tiltX: -0.5, tiltZ: 0.35, speed: 0.09, phase: 0.4, color: 0xff9d3b, label: 'LEO-CMPT-04', sub: 'SETTLING · USDC / BASE' }),
      ];

      // Labels
      for (const s of this._sats) {
        const el = document.createElement('div');
        el.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;font-family:${MONO};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#F5F8FF;white-space:nowrap;text-shadow:0 1px 8px rgba(3,7,11,0.9)`;
        el.innerHTML = `<span style="display:inline-block;width:26px;height:1px;background:rgba(245,248,255,0.35);vertical-align:middle;margin-right:10px"></span>${s.label}` +
          (s.sub ? `<div style="margin-left:36px;margin-top:5px;color:#8E99AA;letter-spacing:0.18em">${s.sub}</div>` : '');
        this.appendChild(el);
        s.el = el;
      }

      // Drag to spin
      let dragging = false, px = 0, py = 0;
      this._vel = 0;
      this.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; this.setPointerCapture(e.pointerId); this.style.cursor = 'grabbing'; });
      this.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
        globe.rotation.y += dx * 0.005;
        globe.rotation.x = Math.max(-0.6, Math.min(0.6, globe.rotation.x + dy * 0.003));
        this._vel = dx * 0.005;
      });
      const end = () => { dragging = false; this.style.cursor = 'grab'; };
      this.addEventListener('pointerup', end);
      this.addEventListener('pointercancel', end);
      this.style.cursor = 'grab';
      this.style.touchAction = 'pan-y';

      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this);
      this._resize();

      if (this._reduced) { this._renderFrame(0.016); }
      else {
        let last = performance.now();
        const tick = (now) => {
          const dt = Math.min((now - last) / 1000, 0.05); last = now;
          if (!document.hidden) {
            if (!dragging) {
              this._vel *= 0.95;
              globe.rotation.y += 0.018 * dt + this._vel;
            }
            this._renderFrame(dt);
          }
          this._raf = requestAnimationFrame(tick);
        };
        this._raf = requestAnimationFrame(tick);
      }
    }

    _makeSat(THREE, scene, cfg) {
      const g = new THREE.Group();
      g.rotation.x = cfg.tiltX; g.rotation.z = cfg.tiltZ;
      // Ring
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * cfg.r, 0, Math.sin(a) * cfg.r));
      }
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 })
      );
      g.add(ring);
      // Dot sprite
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const col = '#' + cfg.color.toString(16).padStart(6, '0');
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, col); grad.addColorStop(0.35, col + 'aa'); grad.addColorStop(1, col + '00');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(32, 32, 4, 0, Math.PI * 2); ctx.fill();
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: true }));
      sprite.scale.set(0.16, 0.16, 1);
      g.add(sprite);
      scene.add(g);
      return { group: g, sprite, ...cfg, angle: cfg.phase };
    }

    _resize() {
      const w = this.clientWidth || 600, h = this.clientHeight || 600;
      this._renderer.setSize(w, h);
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
      this._renderFrame(0);
    }

    _renderFrame(dt) {
      const THREE = this._THREE;
      for (const s of this._sats) {
        if (!this._reduced) s.angle += s.speed * dt;
        s.sprite.position.set(Math.cos(s.angle) * s.r, 0, Math.sin(s.angle) * s.r);
      }
      this._scene.updateMatrixWorld(true);
      this._renderer.render(this._scene, this._camera);
      const W = this.clientWidth, H = this.clientHeight;
      for (const s of this._sats) {
        if (s.el) {
          const v = new THREE.Vector3();
          s.sprite.getWorldPosition(v);
          v.project(this._camera);
          const x = (v.x * 0.5 + 0.5) * W;
          const y = (-v.y * 0.5 + 0.5) * H;
          const labelW = s.el.offsetWidth || 200;
          const rect = this.getBoundingClientRect();
          // Flip label to the left of the dot when its text would run past the viewport's right edge
          const flip = rect.left + x + 14 + labelW > window.innerWidth - 16;
          const lx = flip ? x - 14 - labelW : x + 14;
          const hidden = v.z > 1 || rect.left + lx < 8 || y < 0 || y > H;
          s.el.style.transform = `translate(${lx.toFixed(1)}px, ${(y - 8).toFixed(1)}px)`;
          s.el.style.opacity = hidden ? '0' : '1';
        }
      }
    }

    _loadTexture(THREE) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      const tryUrl = (i) => new Promise((res) => {
        if (i >= TEX_URLS.length) return res(null);
        loader.load(TEX_URLS[i], (t) => res(t), undefined, () => tryUrl(i + 1).then(res));
      });
      return tryUrl(0);
    }
  }
  customElements.define('sm-globe', SmGlobe);
})();

export {};
