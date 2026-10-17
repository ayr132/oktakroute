// Issue categories users can report against a path.
//
// effect — what an ACTIVE report of this type does to routing:
//   'blocks-all'        path is unavailable to everyone (available: false)
//   'blocks-wheelchair' path stays open to walkers but is unusable for wheelchairs
//   'none'              informational only, routing unchanged
export const REPORT_TYPES = {
  maintenance: { label: 'Ongoing maintenance', icon: '🚧', effect: 'blocks-all' },
  blocked: { label: 'Path blocked', icon: '🚫', effect: 'blocks-all' },
  damaged: { label: 'Broken / damaged pathway', icon: '🕳️', effect: 'blocks-wheelchair' },
  ramp: { label: 'Damaged / unavailable ramp', icon: '♿', effect: 'blocks-wheelchair' },
  stairs: { label: 'Stairs or unexpected steps', icon: '🪜', effect: 'blocks-wheelchair' },
  obstruction: { label: 'Obstruction', icon: '🌳', effect: 'blocks-all' },
  vehicle: { label: 'Blocked by a vehicle', icon: '🚗', effect: 'blocks-all' },
  other: { label: 'Other', icon: '⚠️', effect: 'none' },
};

export const EFFECT_LABELS = {
  'blocks-all': 'Path unavailable',
  'blocks-wheelchair': 'Not wheelchair accessible',
  none: 'No routing impact',
};

export const REPORT_STATUS = {
  active: { label: 'Active', classes: 'bg-red-100 text-red-700' },
  resolved: { label: 'Resolved', classes: 'bg-green-100 text-green-700' },
  expired: { label: 'Expired', classes: 'bg-slate-100 text-slate-600' },
};
