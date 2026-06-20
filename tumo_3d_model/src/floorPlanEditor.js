import { MODEL_CATALOG, FURNITURE_SIZE_FACTOR, getModelRotYOffset } from './factories.js';
import { loadTopViewImage, preloadTopViews, renderModelTopView } from './floorPlanTopView.js';

const GRID_STEP = 0.25;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 3.5;
const ROOM_INSET = 0.12;
const DRAG_THRESHOLD = 5;
const MIN_HIT_PX = 28;
const STACKABLE_MODELS = new Set(['office_monitor', 'keyboard_mouse', 'speaker']);

const CATALOG_SECTIONS = [
  { title: 'Seating', keys: ['office_chair', 'simple_chair'] },
  { title: 'Tables', keys: ['office_table', 'simple_table'] },
  { title: 'Tech', keys: ['office_monitor', 'keyboard_mouse', 'speaker', 'microphone_stand', 'led_tv', 'whiteboard'] },
  { title: 'Wall', keys: ['wall_flat_tv'] }
];

const FOOTPRINTS = {
  office_table:     { w: 1.5,  d: 0.8 },
  office_chair:     { w: 0.5,  d: 0.5 },
  office_monitor:   { w: 0.52,  d: 0.2 },
  keyboard_mouse:   { w: 0.4,  d: 0.25 },
  simple_table:     { w: 1.2,  d: 0.8 },
  simple_chair:     { w: 0.45, d: 0.45 },
  speaker:          { w: 0.35, d: 0.35 },
  microphone_stand: { w: 0.25, d: 0.25 },
  led_tv:           { w: 1.0,  d: 0.15 },
  wall_flat_tv:     { w: 1.3,  d: 0.1 },
  whiteboard:       { w: 1.8,  d: 0.08 }
};

function uid() {
  return `fp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const FOOTPRINT_CACHE = new Map();

function getFootprint(modelKey) {
  if (FOOTPRINT_CACHE.has(modelKey)) return FOOTPRINT_CACHE.get(modelKey);
  const measured = renderModelTopView(modelKey);
  const fp = measured?.w
    ? { w: measured.w, d: measured.d }
    : {
        w: (FOOTPRINTS[modelKey]?.w || 0.6) * FURNITURE_SIZE_FACTOR,
        d: (FOOTPRINTS[modelKey]?.d || 0.6) * FURNITURE_SIZE_FACTOR
      };
  FOOTPRINT_CACHE.set(modelKey, fp);
  return fp;
}

function getWorldRotY(modelKey, logicalRotY = 0) {
  return logicalRotY + getModelRotYOffset(modelKey);
}

function getRotatedExtents(modelKey, logicalRotY = 0) {
  const rotY = getWorldRotY(modelKey, logicalRotY);
  const { w, d } = getFootprint(modelKey);
  const hw = w / 2;
  const hd = d / 2;
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  return {
    extX: hw * c + hd * s,
    extZ: hw * s + hd * c
  };
}

function clampPositionToRoom(x, z, modelKey, rotY, roomW, roomD) {
  const { extX, extZ } = getRotatedExtents(modelKey, rotY);
  const maxX = roomW / 2 - extX - ROOM_INSET;
  const maxZ = roomD / 2 - extZ - ROOM_INSET;
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    z: Math.max(-maxZ, Math.min(maxZ, z))
  };
}

function cloneItems(items) {
  return items.map(it => ({ ...it, id: it.id || uid() }));
}

class PlanTransform {
  constructor(roomW, roomD, canvasW, canvasH) {
    this.roomW = roomW;
    this.roomD = roomD;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.baseScale = Math.min(
      (canvasW - 80) / roomW,
      (canvasH - 80) / roomD
    );
  }

  get scale() {
    return this.baseScale * this.zoom;
  }

  toCanvas(x, z) {
    const cx = this.canvasW / 2 + x * this.scale + this.panX;
    const cy = this.canvasH / 2 + z * this.scale + this.panY;
    return { cx, cy };
  }

  toWorld(cx, cy) {
    const x = (cx - this.canvasW / 2 - this.panX) / this.scale;
    const z = (cy - this.canvasH / 2 - this.panY) / this.scale;
    return { x, z };
  }

  roomRect() {
    const tl = this.toCanvas(-this.roomW / 2, -this.roomD / 2);
    const br = this.toCanvas(this.roomW / 2, this.roomD / 2);
    return { x: tl.cx, y: tl.cy, w: br.cx - tl.cx, h: br.cy - tl.cy };
  }
}

function pointInRotatedRect(px, py, cx, cy, hw, hh, angle) {
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
}

export class FloorPlanEditor {
  constructor(options) {
    this.roomData = options.roomData;
    this.onApply = options.onApply;
    this.onRequestClose = options.onRequestClose;
    this.items = cloneItems(options.items || []);
    this.selectedId = null;
    this.placingModel = null;
    this.snapGrid = true;
    this.showGrid = true;
    this.sprites = new Map();
    this.clipboard = null;

    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.transform = null;

    this.drag = null;
    this.panning = null;
    this.pointerStart = null;
    this.pendingHit = null;
    this.pendingPan = false;
    this.dirty = true;
    this.raf = null;
    this.renderRaf = null;
    this.accentColor = '#5b9cf5';
    this._lastZoomLabel = '';

    this._bindEvents();
    this._bindToolbar(options.root);
    this._buildPalette(options.paletteEl);
    this._syncAccentColor();
    this._resize();
    preloadTopViews(Object.keys(MODEL_CATALOG)).then((loaded) => {
      const keys = Object.keys(MODEL_CATALOG);
      loaded.forEach((entry, i) => {
        if (!entry) return;
        this.sprites.set(keys[i], entry);
        getFootprint(keys[i]);
      });
      this._scheduleRender();
    });
  }

  _syncAccentColor() {
    this.accentColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--fp-accent')
      .trim() || '#5b9cf5';
  }

  _scheduleRender() {
    this.dirty = true;
    if (this.renderRaf) return;
    this.renderRaf = requestAnimationFrame(() => {
      this.renderRaf = null;
      this._render();
    });
  }

  _resize() {
    const wrap = this.canvas.parentElement;
    const w = wrap.clientWidth || 640;
    const h = wrap.clientHeight || 480;
    this.displayW = w;
    this.displayH = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const prevPanX = this.transform?.panX ?? 0;
    const prevPanY = this.transform?.panY ?? 0;
    const prevZoom = this.transform?.zoom ?? 1;
    this.transform = new PlanTransform(this.roomData.w, this.roomData.d, w, h);
    this.transform.panX = prevPanX;
    this.transform.panY = prevPanY;
    this.transform.zoom = prevZoom;
    this.dirty = true;
    this._scheduleRender();
  }

  _bindEvents() {
    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const before = this.transform.toWorld(mx, my);
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      this.transform.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.transform.zoom * factor));
      const after = this.transform.toWorld(mx, my);
      this.transform.panX += (after.x - before.x) * this.transform.scale;
      this.transform.panY += (after.z - before.z) * this.transform.scale;
      this.dirty = true;
      this._scheduleRender();
    }, { passive: false });

    this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this._onPointerUp(e));

    this._onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this._deleteSelected();
      } else if (e.key === 'r' || e.key === 'R') {
        this._rotateSelected(Math.PI / 4);
      } else if (e.key === 'Escape') {
        if (this.placingModel) {
          this.placingModel = null;
          this.canvas.classList.remove('fp-placing');
          document.querySelectorAll('.fp-palette-item').forEach(b => b.classList.remove('active'));
          this._updateStatus('Placement cancelled');
        } else if (this.selectedId) {
          this.selectedId = null;
          this._updateInspector();
          this._updateStatus('Selection cleared');
        } else {
          this.onRequestClose?.();
          return;
        }
        this.dirty = true;
        this._scheduleRender();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        this._copySelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        this._pasteClipboard();
      }
    };
    window.addEventListener('keydown', this._onKeyDown);
  }

  _bindToolbar(root) {
    root.querySelector('[data-action="grid"]')?.addEventListener('click', () => {
      this.showGrid = !this.showGrid;
      root.querySelector('[data-action="grid"]')?.classList.toggle('active', this.showGrid);
      this.dirty = true;
      this._scheduleRender();
    });
    root.querySelector('[data-action="snap"]')?.addEventListener('click', () => {
      this.snapGrid = !this.snapGrid;
      root.querySelector('[data-action="snap"]')?.classList.toggle('active', this.snapGrid);
      this._updateStatus(this.snapGrid ? 'Snap on (0.25 m)' : 'Snap off');
      this.dirty = true;
      this._scheduleRender();
    });
    root.querySelector('[data-action="rotate"]')?.addEventListener('click', () => {
      this._rotateSelected(Math.PI / 4);
    });
    root.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      this._deleteSelected();
    });
    root.querySelector('[data-action="fit"]')?.addEventListener('click', () => {
      this.transform.panX = 0;
      this.transform.panY = 0;
      this.transform.zoom = 1;
      this.dirty = true;
      this._scheduleRender();
    });
    root.querySelector('[data-action="export"]')?.addEventListener('click', () => {
      this._exportPng();
    });
    root.querySelector('[data-action="apply"]')?.addEventListener('click', () => {
      this.onApply?.(this.getItems());
      this._updateStatus('Applied to 3D room');
    });
  }

  _buildPalette(el) {
    if (!el) return;
    el.innerHTML = '';

    CATALOG_SECTIONS.forEach(({ title, keys }) => {
      const section = document.createElement('div');
      section.className = 'fp-catalog-section';

      const heading = document.createElement('p');
      heading.className = 'fp-catalog-section-title';
      heading.textContent = title;
      section.appendChild(heading);

      const grid = document.createElement('div');
      grid.className = 'fp-catalog-grid';

      keys.forEach(key => {
        const meta = MODEL_CATALOG[key];
        if (!meta) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fp-palette-item';
        btn.dataset.model = key;

        const thumb = document.createElement('div');
        thumb.className = 'fp-palette-thumb';
        loadTopViewImage(key).then(({ img }) => {
          thumb.style.backgroundImage = `url(${img.src})`;
        }).catch(() => {});

        const label = document.createElement('span');
        label.className = 'fp-palette-label';
        label.textContent = meta.label;

        btn.append(thumb, label);
        btn.addEventListener('click', () => {
          this.placingModel = key;
          this.canvas.classList.add('fp-placing');
          this.selectedId = null;
          this._updateInspector();
          this._updateStatus(`Place ${meta.label} — click on the floor`);
          document.querySelectorAll('.fp-palette-item').forEach(b => {
            b.classList.toggle('active', b.dataset.model === key);
          });
        });
        grid.appendChild(btn);
      });

      section.appendChild(grid);
      el.appendChild(section);
    });
  }

  _selectItem(id) {
    this.placingModel = null;
    this.canvas.classList.remove('fp-placing');
    document.querySelectorAll('.fp-palette-item').forEach(b => b.classList.remove('active'));
    this.selectedId = id;
    this._updateInspector();
    this.dirty = true;
    this._scheduleRender();
    const item = this.items.find(it => it.id === id);
    if (item) {
      this._updateStatus(`Selected ${MODEL_CATALOG[item.modelKey]?.label || item.modelKey}`);
    }
  }

  _snap(v) {
    if (!this.snapGrid) return v;
    return Math.round(v / GRID_STEP) * GRID_STEP;
  }

  _clampToRoom(x, z, modelKey, rotY = 0) {
    return clampPositionToRoom(x, z, modelKey, rotY, this.roomData.w, this.roomData.d);
  }

  _hitTest(mx, my) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const fp = getFootprint(item.modelKey);
      const { cx, cy } = this.transform.toCanvas(item.x, item.z);
      let hw = (fp.w * this.transform.scale) / 2;
      let hh = (fp.d * this.transform.scale) / 2;
      hw = Math.max(hw, MIN_HIT_PX) + 10;
      hh = Math.max(hh, MIN_HIT_PX) + 10;
      if (pointInRotatedRect(mx, my, cx, cy, hw, hh, getWorldRotY(item.modelKey, item.rotY || 0))) {
        return item;
      }
    }
    return null;
  }

  _canvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { mx: e.clientX - rect.left, my: e.clientY - rect.top };
  }

  _onPointerDown(e) {
    if (e.button !== 0 && e.button !== 1) return;
    this.canvas.setPointerCapture(e.pointerId);
    const { mx, my } = this._canvasPos(e);
    this.pointerStart = { mx, my, panX: this.transform.panX, panY: this.transform.panY };

    if (e.button === 1 || e.altKey) {
      this.panning = { startX: mx, startY: my, panX: this.transform.panX, panY: this.transform.panY };
      this.pendingHit = null;
      this.pendingPan = false;
      return;
    }

    const hit = this._hitTest(mx, my);
    if (hit) {
      this.pendingHit = hit;
      this.pendingPan = false;
      this.placingModel = null;
      document.querySelectorAll('.fp-palette-item').forEach(b => b.classList.remove('active'));
      return;
    }

    if (this.placingModel) {
      const world = this.transform.toWorld(mx, my);
      const snapped = this._clampToRoom(
        this._snap(world.x),
        this._snap(world.z),
        this.placingModel,
        0
      );
      const meta = MODEL_CATALOG[this.placingModel];
      const item = {
        id: uid(),
        modelKey: this.placingModel,
        x: snapped.x,
        z: snapped.z,
        y: 0,
        rotY: 0,
        type: meta?.type || 'floor'
      };
      if (item.type !== 'wall') item.surfaceY = 0;
      this.items.push(item);
      this._selectItem(item.id);
      this.placingModel = null;
      document.querySelectorAll('.fp-palette-item').forEach(b => b.classList.remove('active'));
      this.dirty = true;
      this._scheduleRender();
      return;
    }

    this.pendingHit = null;
    this.pendingPan = true;
  }

  _pointerDist(mx, my) {
    if (!this.pointerStart) return 0;
    const dx = mx - this.pointerStart.mx;
    const dy = my - this.pointerStart.my;
    return Math.hypot(dx, dy);
  }

  _onPointerMove(e) {
    const { mx, my } = this._canvasPos(e);

    if (this.panning) {
      this.transform.panX = this.panning.panX + (mx - this.panning.startX);
      this.transform.panY = this.panning.panY + (my - this.panning.startY);
      this.dirty = true;
      this._scheduleRender();
      return;
    }

    if (this.pendingHit && !this.drag && this._pointerDist(mx, my) > DRAG_THRESHOLD) {
      this.selectedId = this.pendingHit.id;
      this.drag = {
        id: this.pendingHit.id,
        startX: mx,
        startY: my,
        origX: this.pendingHit.x,
        origZ: this.pendingHit.z
      };
      this._scheduleRender();
    }

    if (this.pendingPan && !this.panning && this._pointerDist(mx, my) > DRAG_THRESHOLD) {
      this.panning = {
        startX: this.pointerStart.mx,
        startY: this.pointerStart.my,
        panX: this.pointerStart.panX,
        panY: this.pointerStart.panY
      };
      this.pendingPan = false;
    }

    if (!this.drag) return;
    const item = this.items.find(it => it.id === this.drag.id);
    if (!item) return;

    const dx = (mx - this.drag.startX) / this.transform.scale;
    const dz = (my - this.drag.startY) / this.transform.scale;
    const next = this._clampToRoom(
      this._snap(this.drag.origX + dx),
      this._snap(this.drag.origZ + dz),
      item.modelKey,
      item.rotY ?? 0
    );
    item.x = next.x;
    item.z = next.z;
    this._scheduleRender();
  }

  _onPointerUp(e) {
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }

    const wasDragging = !!this.drag;

    if (this.pendingHit && !this.drag) {
      this._selectItem(this.pendingHit.id);
    } else if (this.pendingPan && !this.panning && !this.drag) {
      this.selectedId = null;
      this._updateInspector();
      this._scheduleRender();
    } else if (wasDragging && this.selectedId) {
      this._updateInspector();
    }

    this.drag = null;
    this.panning = null;
    this.pendingHit = null;
    this.pendingPan = false;
    this.pointerStart = null;
  }

  _rotateSelected(delta) {
    const item = this.items.find(it => it.id === this.selectedId);
    if (!item) return;
    item.rotY = (item.rotY || 0) + delta;
    const clamped = this._clampToRoom(item.x, item.z, item.modelKey, item.rotY);
    item.x = clamped.x;
    item.z = clamped.z;
    this._scheduleRender();
    this._updateInspector();
  }

  _copySelected() {
    const item = this.items.find(it => it.id === this.selectedId);
    if (!item) {
      this._updateStatus('Select an item to copy');
      return;
    }
    const { id, ...rest } = item;
    this.clipboard = { ...rest };
    this._updateStatus(`Copied ${MODEL_CATALOG[item.modelKey]?.label || item.modelKey}`);
  }

  _pasteClipboard() {
    if (!this.clipboard) {
      this._updateStatus('Nothing to paste — select an item and Ctrl+C first');
      return;
    }
    const offset = GRID_STEP;
    const rotY = this.clipboard.rotY ?? 0;
    const clamped = this._clampToRoom(
      this.clipboard.x + offset,
      this.clipboard.z + offset,
      this.clipboard.modelKey,
      rotY
    );
    const item = {
      ...this.clipboard,
      id: uid(),
      x: clamped.x,
      z: clamped.z,
      rotY
    };
    this.items.push(item);
    this.selectedId = item.id;
    this._updateInspector();
    this._scheduleRender();
    this._updateStatus(`Pasted ${MODEL_CATALOG[item.modelKey]?.label || item.modelKey}`);
  }

  _deleteSelected() {
    if (!this.selectedId) return;
    this.items = this.items.filter(it => it.id !== this.selectedId);
    this.selectedId = null;
    this._updateInspector();
    this._scheduleRender();
    this._updateStatus('Item removed');
  }

  _updateStatus(text) {
    const el = document.getElementById('fp-status');
    if (el) el.textContent = text;
  }

  _updateInspector() {
    const el = document.getElementById('fp-inspector');
    if (!el) return;

    const listHtml = this.items.length
      ? `<div class="fp-object-list">
          <p class="fp-object-list-title">In room (${this.items.length})</p>
          ${this.items.map(item => {
            const label = MODEL_CATALOG[item.modelKey]?.label || item.modelKey;
            const active = item.id === this.selectedId ? ' active' : '';
            return `<button type="button" class="fp-object-row${active}" data-select-id="${item.id}">${label}</button>`;
          }).join('')}
        </div>`
      : `<p class="fp-inspector-empty">No objects yet — add from the left catalog.</p>`;

    const item = this.items.find(it => it.id === this.selectedId);
    if (!item) {
      el.innerHTML = `${listHtml}
        <p class="fp-inspector-empty">Click an object on the plan or pick from the list above.</p>`;
      el.querySelectorAll('[data-select-id]').forEach(btn => {
        btn.addEventListener('click', () => this._selectItem(btn.dataset.selectId));
      });
      return;
    }

    const label = MODEL_CATALOG[item.modelKey]?.label || item.modelKey;
    el.innerHTML = `${listHtml}
      <p class="fp-inspector-title">${label}</p>
      <dl class="fp-inspector-props">
        <dt>X</dt><dd>${item.x.toFixed(2)} m</dd>
        <dt>Z</dt><dd>${item.z.toFixed(2)} m</dd>
        <dt>Rotation</dt><dd>${((item.rotY || 0) * 180 / Math.PI).toFixed(0)}°</dd>
      </dl>
      <button type="button" class="fp-inspector-btn" data-inspect-rotate>Rotate 45°</button>
      <button type="button" class="fp-inspector-btn fp-inspector-btn--danger" data-inspect-delete>Remove</button>`;

    el.querySelectorAll('[data-select-id]').forEach(btn => {
      btn.addEventListener('click', () => this._selectItem(btn.dataset.selectId));
    });
    el.querySelector('[data-inspect-rotate]')?.addEventListener('click', () => {
      this._rotateSelected(Math.PI / 4);
    });
    el.querySelector('[data-inspect-delete]')?.addEventListener('click', () => {
      this._deleteSelected();
    });
  }

  getItems() {
    return this.items.map(({ id, y, ...rest }) => {
      const clamped = clampPositionToRoom(
        rest.x,
        rest.z,
        rest.modelKey,
        rest.rotY ?? 0,
        this.roomData.w,
        this.roomData.d
      );
      const item = { ...rest, x: clamped.x, z: clamped.z };
      const type = item.type || MODEL_CATALOG[item.modelKey]?.type || 'floor';
      if (type !== 'wall') {
        delete item.surfaceY;
        if (!STACKABLE_MODELS.has(item.modelKey)) {
          item.surfaceY = 0;
        }
      }
      return item;
    });
  }

  _drawFloor(ctx) {
    const rect = this.transform.roomRect();
    const wt = 10;
    const accent = this.accentColor;

    ctx.fillStyle = '#1a1410';
    ctx.fillRect(rect.x - wt - 4, rect.y - wt - 4, rect.w + wt * 2 + 8, rect.h + wt * 2 + 8);

    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
    ctx.globalAlpha = 1;

    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, '#fafaf8');
    grad.addColorStop(0.5, '#f4f4f2');
    grad.addColorStop(1, '#ececea');
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    const tileCols = 6;
    const tileRows = 8;
    const tileW = rect.w / tileCols;
    const tileH = rect.h / tileRows;
    ctx.strokeStyle = 'rgba(190,188,184,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let c = 1; c < tileCols; c++) {
      const px = rect.x + c * tileW;
      ctx.moveTo(px, rect.y);
      ctx.lineTo(px, rect.y + rect.h);
    }
    for (let r = 1; r < tileRows; r++) {
      const py = rect.y + r * tileH;
      ctx.moveTo(rect.x, py);
      ctx.lineTo(rect.x + rect.w, py);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let c = 0; c < tileCols; c++) {
      for (let r = 0; r < tileRows; r++) {
        const tx = rect.x + c * tileW + 2;
        const ty = rect.y + r * tileH + 2;
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + tileW * 0.35, ty + tileH * 0.25);
      }
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    ctx.fillStyle = '#e8e6e2';
    ctx.fillRect(rect.x - wt, rect.y - wt, rect.w + wt * 2, wt);
    ctx.fillRect(rect.x - wt, rect.y + rect.h, rect.w + wt * 2, wt);
    ctx.fillRect(rect.x - wt, rect.y, wt, rect.h);
    ctx.fillRect(rect.x + rect.w, rect.y, wt, rect.h);
  }

  _drawGrid(ctx) {
    if (!this.showGrid) return;
    const { w, d } = this.roomData;
    const rect = this.transform.roomRect();
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    const drawLines = (step, style) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = -w / 2; gx <= w / 2 + 0.001; gx += step) {
        const a = this.transform.toCanvas(gx, -d / 2);
        const b = this.transform.toCanvas(gx, d / 2);
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
      }
      for (let gz = -d / 2; gz <= d / 2 + 0.001; gz += step) {
        const a = this.transform.toCanvas(-w / 2, gz);
        const b = this.transform.toCanvas(w / 2, gz);
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
      }
      ctx.stroke();
    };

    if (this.snapGrid && this.transform.scale >= 18) {
      drawLines(GRID_STEP, 'rgba(255,255,255,0.035)');
    }
    drawLines(1, 'rgba(255,255,255,0.09)');
    ctx.restore();
  }

  _drawEmptyHint(ctx) {
    const rect = this.transform.roomRect();
    const name = this.roomData.name || 'Room';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = '700 22px Inter, system-ui, sans-serif';
    ctx.fillText(name, rect.x + rect.w / 2, rect.y + rect.h / 2 - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('Pick from catalog · click floor to place', rect.x + rect.w / 2, rect.y + rect.h / 2 + 16);
    ctx.restore();
  }

  _drawDimensions(ctx) {
    const rect = this.transform.roomRect();
    const { w, d } = this.roomData;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '600 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${w.toFixed(1)} m`, rect.x + rect.w / 2, rect.y - 14);
    ctx.save();
    ctx.translate(rect.x - 14, rect.y + rect.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${d.toFixed(1)} m`, 0, 0);
    ctx.restore();
  }

  _drawItem(ctx, item) {
    const sprite = this.sprites.get(item.modelKey);
    if (!sprite?.img?.complete) {
      loadTopViewImage(item.modelKey).then(loaded => {
        this.sprites.set(item.modelKey, loaded);
        this._scheduleRender();
      }).catch(() => {});
      return;
    }
    const { img } = sprite;
    const fp = getFootprint(item.modelKey);
    const drawW = fp.w * this.transform.scale;
    const drawH = fp.d * this.transform.scale;
    const { cx, cy } = this.transform.toCanvas(item.x, item.z);
    const isSelected = item.id === this.selectedId;
    const isWall = item.type === 'wall';

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(getWorldRotY(item.modelKey, item.rotY || 0));

    if (isWall) {
      ctx.fillStyle = 'rgba(80,140,255,0.25)';
      ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
    }

    ctx.globalAlpha = 0.22;
    ctx.drawImage(img, -drawW / 2 + 2, -drawH / 2 + 3, drawW, drawH);
    ctx.globalAlpha = 1;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    if (isSelected) {
      const accent = this.accentColor;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-drawW / 2 - 6, -drawH / 2 - 6, drawW + 12, drawH + 12);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, -drawH / 2 - 14, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _render() {
    if (!this.transform || !this.dirty) return;
    const canvasW = this.displayW || 640;
    const canvasH = this.displayH || 480;

    this.ctx.fillStyle = '#08080c';
    this.ctx.fillRect(0, 0, canvasW, canvasH);

    this._drawFloor(this.ctx);
    this._drawGrid(this.ctx);

    for (const item of this.items) {
      this._drawItem(this.ctx, item);
    }

    if (!this.items.length && !this.placingModel) {
      this._drawEmptyHint(this.ctx);
    }

    this._drawDimensions(this.ctx);

    const meta = document.getElementById('floorplan-meta');
    if (meta) {
      meta.textContent = `${this.roomData.w.toFixed(1)} × ${this.roomData.d.toFixed(1)} m · ${this.items.length} objects`;
    }

    const zoomLabel = `${Math.round(this.transform.zoom * 100)}%`;
    if (zoomLabel !== this._lastZoomLabel) {
      this._lastZoomLabel = zoomLabel;
      const zoomEl = document.getElementById('fp-zoom');
      if (zoomEl) zoomEl.textContent = zoomLabel;
    }
    this.dirty = false;
  }

  _exportPng() {
    const link = document.createElement('a');
    link.download = `floor-plan-${this.roomData.name || 'room'}-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    this._updateStatus('PNG exported');
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
    if (this.renderRaf) cancelAnimationFrame(this.renderRaf);
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}

let activeEditor = null;

export function isFloorPlanEditorOpen() {
  return activeEditor != null;
}

export function openFloorPlanEditor(snapshot, onApply) {
  const modal = document.getElementById('floorplan-modal');
  if (!modal || !snapshot?.roomData) return;

  if (activeEditor) {
    activeEditor.destroy();
    activeEditor = null;
  }

  const accent = snapshot.roomData.color || '#5b9cf5';
  document.documentElement.style.setProperty('--fp-accent', accent);

  const title = document.getElementById('floorplan-title');
  if (title) title.textContent = snapshot.roomData.name || 'Floor Plan';

  const canvas = document.getElementById('fp-canvas');
  const close = () => {
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('fp-editor-open');
    activeEditor?.destroy();
    activeEditor = null;
  };

  activeEditor = new FloorPlanEditor({
    canvas,
    root: modal,
    paletteEl: document.getElementById('fp-palette'),
    roomData: snapshot.roomData,
    items: snapshot.items,
    onApply: (items) => {
      onApply?.(items);
    },
    onRequestClose: close
  });
  activeEditor._syncAccentColor();
  activeEditor._updateInspector();
  activeEditor._updateStatus('Click an object to select · Ctrl+C/V to copy · scroll to zoom');

  document.body.classList.add('fp-editor-open');
  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => activeEditor?._resize());

  document.getElementById('floorplan-close')?.addEventListener('click', close, { once: true });
}

export function renderPlanExport(roomData, items) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 640;
  const editor = new FloorPlanEditor({
    canvas,
    root: document.createElement('div'),
    roomData,
    items,
    onApply: () => {}
  });
  editor.dirty = true;
  editor._render();
  return canvas.toDataURL('image/png');
}
