/** Pre-built room layouts using normalized coords (nx/nz ∈ [-1, 1] across room floor). */

import { FURNITURE_SIZE_FACTOR } from './factories.js';

const HACK_TABLE_W = 1.2 * FURNITURE_SIZE_FACTOR;
const HACK_CHAIR = 0.45 * FURNITURE_SIZE_FACTOR;

/** Pod center positions (meters, room-local). Placement uses live table bounds in furnishing.js. */
export function getHackathonPodCenters(roomW, roomD) {
  const pad = Math.min(0.22, roomW * 0.06, roomD * 0.06);
  const halfW = roomW / 2 - pad;
  const halfD = roomD / 2 - pad;
  const compact = roomW < 6.5 || roomD < 4;

  const edgeClear = HACK_TABLE_W * 0.5 + HACK_CHAIR + 0.12;
  const sideX = Math.min(halfW - edgeClear, compact ? Math.max(0.75, halfW * 0.55) : 1.42);
  const backZ = -Math.min(halfD - edgeClear, halfD * 0.72);
  const frontZ = Math.min(halfD - edgeClear, halfD * 0.68);

  if (compact) {
    return [{ cx: -sideX, cz: 0 }, { cx: sideX, cz: 0 }];
  }
  return [
    { cx: -sideX, cz: backZ },
    { cx: sideX, cz: backZ },
    { cx: 0, cz: frontZ }
  ];
}

/** Auditorium-style conference: rows of simple chairs facing TV + twin whiteboards. */
function buildConferenceLayout() {
  const items = [
    { modelKey: 'wall_flat_tv', wall: 'back', nx: 0, mountYR: 0.66, rotY: 0 },
    { modelKey: 'whiteboard', nx: -0.44, nz: -0.76, rotY: 0 },
    { modelKey: 'whiteboard', nx: 0.44, nz: -0.76, rotY: 0 },
    { modelKey: 'microphone_stand', nx: 0, nz: -0.38, rotY: 0 }
  ];

  const rowNz = [0.02, 0.24, 0.46, 0.68, 0.86];
  const leftNx = [-0.74, -0.54, -0.34, -0.16];
  const rightNx = [0.16, 0.34, 0.54, 0.74];

  for (const nz of rowNz) {
    for (const nx of leftNx) {
      items.push({ modelKey: 'simple_chair', nx, nz, rotY: Math.PI });
    }
    for (const nx of rightNx) {
      items.push({ modelKey: 'simple_chair', nx, nz, rotY: Math.PI });
    }
  }

  return items;
}

/** Procedural media studio zones (meters, room-local). */
export function getMediaStudioLayout(roomW, roomD, roomH) {
  const inset = 0.22;
  const halfW = roomW / 2 - inset;
  const halfD = roomD / 2 - inset;
  const compact = roomW < 6 || roomD < 3.6;

  const deskX = compact ? -0.42 : -halfW * 0.34;
  const deskZ = compact ? -0.05 : -halfD * 0.06;
  const talentX = deskX + (compact ? 0.72 : 0.92);
  const talentZ = deskZ + (compact ? 0.26 : halfD * 0.24);

  return {
    wallTv: { wall: 'back', nx: 0, mountYR: 0.68, rotY: 0 },
    desk: { x: deskX, z: deskZ, rotY: 0 },
    talentChair: { x: talentX, z: talentZ },
    mic: {
      x: talentX + 0.1,
      z: talentZ + (compact ? 0.32 : halfD * 0.32),
      rotY: -0.35
    },
    floorTv: {
      x: -halfW * 0.84,
      z: halfD * 0.64,
      rotY: Math.PI / 2
    },
    speakerMain: {
      x: halfW * 0.8,
      z: halfD * 0.5,
      rotY: -0.55,
      scale: { h: 0.82 }
    },
    speakerFill: {
      x: -halfW * 0.52,
      z: halfD * 0.58,
      rotY: 0.42,
      scale: { h: 0.58 }
    }
  };
}

/** Procedural classroom: board wall, projector, 2×2 lab rows, instructor desk. */
export function getClassroomLayout(roomW, roomD) {
  const inset = 0.22;
  const halfW = roomW / 2 - inset;
  const halfD = roomD / 2 - inset;
  const compact = roomW < 6 || roomD < 3.8;

  const colX = compact ? 0.9 : Math.min(1.32, halfW * 0.5);
  const rowBack = compact ? -halfD * 0.22 : -halfD * 0.26;
  const rowFront = compact ? halfD * 0.1 : halfD * 0.14;

  const workstations = compact
    ? [
        { x: -colX, z: rowBack },
        { x: colX, z: rowBack }
      ]
    : [
        { x: -colX, z: rowBack },
        { x: colX, z: rowBack },
        { x: -colX, z: rowFront },
        { x: colX, z: rowFront }
      ];

  return {
    whiteboard: { x: -halfW * 0.68, z: -halfD * 0.55, rotY: Math.PI / 2 },
    wallTv: { wall: 'back', nx: compact ? 0.08 : 0.24, mountYR: 0.63, rotY: 0 },
    instructor: compact
      ? null
      : { x: 0, z: halfD * 0.62, rotY: Math.PI },
    workstations
  };
}

export const DEFAULT_TEMPLATE_ID = 'hackathon';

export const ROOM_TEMPLATES = [
  {
    id: 'hackathon',
    label: 'Hackathon',
    tagline: 'Team pods · dual screens · 4 seats',
    accent: '#22c997',
    icon: 'hackathon',
    items: []
  },
  {
    id: 'office',
    label: 'Office',
    tagline: 'Desks · chairs · monitors',
    accent: '#5b8def',
    icon: 'office',
    items: [
      { modelKey: 'office_table', nx: -0.38, nz: 0.05, rotY: 0 },
      { modelKey: 'office_chair', nx: -0.38, nz: 0.52, rotY: Math.PI },
      { modelKey: 'office_monitor', stackOn: 0, lzf: -0.32, rotY: 0 },
      { modelKey: 'keyboard_mouse', stackOn: 0, lzf: 0.28, rotY: 0 },
      { modelKey: 'office_table', nx: 0.38, nz: 0.05, rotY: 0 },
      { modelKey: 'office_chair', nx: 0.38, nz: 0.52, rotY: Math.PI },
      { modelKey: 'office_monitor', stackOn: 4, lzf: -0.32, rotY: 0 },
      { modelKey: 'keyboard_mouse', stackOn: 4, lzf: 0.28, rotY: 0 },
      { modelKey: 'whiteboard', nx: 0, nz: -0.72, rotY: 0 }
    ]
  },
  {
    id: 'conference',
    label: 'Conference',
    tagline: 'Auditorium rows · TV · twin boards',
    accent: '#9b6bff',
    icon: 'conference',
    items: buildConferenceLayout()
  },
  {
    id: 'media',
    label: 'Media Studio',
    tagline: 'Wall feed · podcast desk · dual monitors',
    accent: '#ff7a45',
    icon: 'media',
    items: []
  },
  {
    id: 'classroom',
    label: 'Classroom',
    tagline: 'Lab rows · wall projector · instructor desk',
    accent: '#f0b429',
    icon: 'classroom',
    items: []
  }
];

export function getRoomTemplate(id) {
  return ROOM_TEMPLATES.find(t => t.id === id) ?? null;
}

export function getOrderedRoomTemplates() {
  const list = [...ROOM_TEMPLATES];
  const idx = list.findIndex(t => t.id === DEFAULT_TEMPLATE_ID);
  if (idx > 0) {
    const [pick] = list.splice(idx, 1);
    list.unshift(pick);
  }
  return list;
}

export function getTemplateSummary(template) {
  switch (template.id) {
    case 'hackathon':
      return 'Auto · 3 pods';
    case 'media':
      return 'Auto · studio';
    case 'classroom':
      return 'Auto · lab rows';
    default:
      return `${template.items.length} pieces`;
  }
}

const TEMPLATE_ICONS = {
  office: `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect x="3" y="8" width="18" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 8V6h8v2M6 12h12" stroke="currentColor" stroke-width="1.4"/></svg>`,
  conference: `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><ellipse cx="12" cy="12" rx="8" ry="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="6" r="1.5" fill="currentColor"/><circle cx="6" cy="14" r="1.5" fill="currentColor"/><circle cx="18" cy="14" r="1.5" fill="currentColor"/></svg>`,
  hackathon: `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect x="3" y="5" width="7" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="5" width="7" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="14" width="7" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="14" width="7" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  media: `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><circle cx="12" cy="14" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 11V6M8 8l-2-2M16 8l2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="5" y="17" width="14" height="3" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`,
  classroom: `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect x="4" y="4" width="16" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 16h10M9 16v3M15 16v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
};

export function getTemplateIcon(iconId) {
  return TEMPLATE_ICONS[iconId] ?? TEMPLATE_ICONS.office;
}
