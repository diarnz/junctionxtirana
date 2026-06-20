import { openFloorPlanEditor } from './floorPlanEditor.js';

export async function showFloorPlanModal(snapshot, onApply) {
  openFloorPlanEditor(snapshot, onApply);
}

export { openFloorPlanEditor };
