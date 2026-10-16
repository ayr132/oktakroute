// Points of interest shown on the map and in the search boxes.
//
// NOTE: coordinates are APPROXIMATE PLACEHOLDERS laid out around IIUM Gombak
// (~3.250 N, 101.734 E). Replace with surveyed coordinates (e.g. from
// openstreetmap.org or your own GPS walk) before real use.
//
// Fields:
//   id        unique string
//   name      display name
//   type      one of LOCATION_TYPES keys below
//   latitude / longitude   where the building is drawn on the map
//   door      (optional) { latitude, longitude } where the entrance is. Routes start and
//             end here. Defaults to latitude / longitude.
//   nodeId    (optional) graph node where this place connects to the walking
//             network. If omitted, the router snaps to the nearest node.

export const CAMPUS_CENTER = { latitude: 3.2492, longitude: 101.7397 };
export const DEFAULT_ZOOM = 18;

// The map can't be panned outside this box (roughly the IIUM Gombak campus plus a margin),
// and can't be zoomed out further than MIN_ZOOM. Adjust to the real campus boundary.
export const CAMPUS_BOUNDS = [[3.243, 101.727], [3.26, 101.747]]; // [[south, west], [north, east]]
export const MIN_ZOOM = 16;

// Label + emoji + colour per category. Add a new category here and it works
// everywhere (markers, search results).
export const LOCATION_TYPES = {
  entrance: { label: 'Main entrance', icon: '🚪', color: '#7c3aed' },
  academic: { label: 'Academic building', icon: '🏫', color: '#2563eb' },
  library: { label: 'Library', icon: '📚', color: '#d97706' },
  mosque: { label: 'Mosque', icon: '🕌', color: '#059669' },
  cafeteria: { label: 'Cafeteria', icon: '🍽️', color: '#e11d48' },
  hostel: { label: 'Residential college', icon: '🏠', color: '#0891b2' },
  facility: { label: 'Facility', icon: '🏥', color: '#475569' },
};

export const campusLocations = [
  { id: 'loc-main-gate', name: 'Main Gate', type: 'entrance', latitude: 3.2480, longitude: 101.7330, door: { latitude: 3.2480, longitude: 101.7330 }, nodeId: 'n-gate' },
  { id: 'loc-mosque', name: 'Sultan Haji Ahmad Shah Mosque', type: 'mosque', latitude: 3.2513, longitude: 101.7349, door: { latitude: 3.2513, longitude: 101.7349 }, nodeId: 'n-3' },
  { id: 'loc-library', name: 'Central Library', type: 'library', latitude: 3.2521, longitude: 101.7353, door: { latitude: 3.2521, longitude: 101.7353 }, nodeId: 'n-4' },
  { id: 'loc-kict', name: 'KICT (Information & Communication Tech)', type: 'academic', latitude: 3.2506, longitude: 101.7361, door: { latitude: 3.2506, longitude: 101.7361 }, nodeId: 'n-e1' },
  { id: 'loc-koe', name: 'Kulliyyah of Engineering', type: 'academic', latitude: 3.2519, longitude: 101.7368, door: { latitude: 3.2519, longitude: 101.7368 }, nodeId: 'n-e2' },
  { id: 'loc-mahallah-a', name: 'Mahallah Uthman Cafe', type: 'cafeteria', latitude: 3.248937, longitude: 101.740136, door: { latitude: 3.2487776, longitude: 101.7399947 }, nodeId: 'n-u15' },
  { id: 'loc-mahallah-b', name: 'Mahallah Uthman PG', type: 'hostel', latitude: 3.249603, longitude: 101.739656, door: { latitude: 3.249603, longitude: 101.739656 } },
  { id: 'loc-clinic', name: 'Health Centre', type: 'facility', latitude: 3.2491, longitude: 101.7338, door: { latitude: 3.2491, longitude: 101.7338 }, nodeId: 'n-1' },
  { id: 'loc-sports', name: 'Sports Complex', type: 'facility', latitude: 3.2527, longitude: 101.7333, door: { latitude: 3.2527, longitude: 101.7333 }, nodeId: 'n-m' },
  { id: 'loc-new-1', name: 'KENMS', type: 'academic', latitude: 3.2506809, longitude: 101.7388964, door: { latitude: 3.2506809, longitude: 101.7388964 }, nodeId: 'n-new1' },
  { id: 'loc-msc', name: 'Male Sport Center (MSC)', type: 'facility', latitude: 3.2506885, longitude: 101.7406658, door: { latitude: 3.2506885, longitude: 101.7406658 }, nodeId: 'n-msc' },
  { id: 'loc-faruq-cafe', name: 'Mahallah Faruq Cafe', type: 'cafeteria', latitude: 3.248536, longitude: 101.7399732, door: { latitude: 3.248536, longitude: 101.7399732 }, nodeId: 'n-faruq' },
];


// 3.248671, 101.739562
// 3.249603, 101.739656 uthman PG
