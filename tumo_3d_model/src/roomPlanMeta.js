/** Room dimensions/colours for the read-only 2D plan viewer (matches 3D world boxes). */
export const ROOM_PLAN_META = {
  'lime-green-box': { roomId: 'lime-green-box', name: 'Lime Green Box', w: 5.5, d: 3.2, color: '#9dc918' },
  'dark-green-box': { roomId: 'dark-green-box', name: 'Dark Green Box', w: 4.2, d: 4.0, color: '#1a5c2e' },
  'orange-box': { roomId: 'orange-box', name: 'Orange Box', w: 8.0, d: 4.2, color: '#e85d20' },
  'blue-box': { roomId: 'blue-box', name: 'Blue Box', w: 5.2, d: 3.8, color: '#1a5fc8' },
  'red-box': { roomId: 'red-box', name: 'Red Box', w: 3.8, d: 3.5, color: '#d42020' },
  'purple-box': { roomId: 'purple-box', name: 'Purple Box', w: 4.8, d: 2.8, color: '#7b2fbe' },
  'floating-green-box': { roomId: 'floating-green-box', name: 'Floating Green Box', w: 6.5, d: 3.0, color: '#c8d422' },
};

/** Floor group key for isolating the active room in showcase / capture views. */
export const ROOM_FLOOR = {
  'lime-green-box': 'floor0',
  'dark-green-box': 'floor0',
  'orange-box': 'floor1',
  'red-box': 'floor3',
  'blue-box': 'floor3',
  'purple-box': 'floor3',
  'floating-green-box': 'floor3',
};

export function getRoomPlanMeta(roomId) {
  if (!roomId) return null;
  if (ROOM_PLAN_META[roomId]) return ROOM_PLAN_META[roomId];
  return { roomId, name: roomId.replace(/-/g, ' '), w: 6, d: 4, color: '#5b9cf5' };
}
