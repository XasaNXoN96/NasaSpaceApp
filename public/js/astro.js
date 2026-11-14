/* Planet positions and the Moon's distance */
/* Singularity’s ephemeris helpers: JPL approximate Keplerian elements (Standish, valid 1800-2050)
   and Meeus' lunar distance series. Kept dependency-free so the page can run it offline. */
var Astro = (function() {
    var D2R = Math.PI / 180, AU = 149597870.7;
    /* a, e, I, L, long. perihelion, long. node  and their rates per Julian century
       source: https://ssd.jpl.nasa.gov/planets/approx_pos.html (Table 1) */
    var EL = {
mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593,
          0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
venus:   [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255,
          0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
earth:   [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0,
          0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
mars:    [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
          0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909,
          -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
saturn:  [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448,
          -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
uranus:  [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503,
          -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574,
          0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]
    };
    function T(ms) { return (ms / 86400000 + 2440587.5 - 2451545.0) / 36525; }   // Julian centuries from J2000
    /* heliocentric ecliptic position in AU */
    function planet(name, ms) {
var k = EL[name], t = T(ms);
var a = k[0] + k[6] * t, e = k[1] + k[7] * t, I = (k[2] + k[8] * t) * D2R,
    L = k[3] + k[9] * t, wb = k[4] + k[10] * t, O = k[5] + k[11] * t;
var w = (wb - O) * D2R, M = ((L - wb) % 360 + 540) % 360 - 180, Mr = M * D2R;
var E = Mr + e * Math.sin(Mr);
for (var i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
var xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
var Or = O * D2R, cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Or), sO = Math.sin(Or), cI = Math.cos(I), sI = Math.sin(I);
return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: (sw * sI) * xp + (cw * sI) * yp,
    a: a, e: e
};
    }
    function distanceAU(p, q) { return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z); }
    function fromEarthAU(name, ms) { return distanceAU(planet(name, ms), planet('earth', ms)); }
    /* geocentric distance of the Moon in km (Meeus, Astronomical Algorithms ch. 47, main terms; ~±50 km) */
    function moonKm(ms) {
var t = T(ms);
var D = (297.8501921 + 445267.1114034 * t) * D2R, M = (357.5291092 + 35999.0502909 * t) * D2R,
    Mp = (134.9633964 + 477198.8675055 * t) * D2R, F = (93.2720950 + 483202.0175233 * t) * D2R;
var Eb = 1 - 0.002516 * t;
var terms = [[0, 0, 1, 0, -20905355], [2, 0, -1, 0, -3699111], [2, 0, 0, 0, -2955968], [0, 0, 2, 0, -569925],
    [0, 1, 0, 0, 48888], [0, 0, 0, 2, -3149], [2, 0, -2, 0, 246158], [2, -1, -1, 0, -152138],
    [2, 0, 1, 0, -170733], [2, -1, 0, 0, -204586], [0, 1, -1, 0, -129620], [1, 0, 0, 0, 108743],
    [0, 1, 1, 0, 104755], [2, 0, 0, -2, 10321], [0, 0, 1, 2, 0], [0, 0, 1, -2, 79661],
    [4, 0, -1, 0, -34782], [0, 0, 3, 0, -23210], [4, 0, -2, 0, -21636], [2, 1, -1, 0, 24208],
    [2, 1, 0, 0, 30824], [1, 0, -1, 0, -8379], [1, 1, 0, 0, -16675], [2, -1, 1, 0, -12831],
    [2, 0, 2, 0, -10445], [4, 0, 0, 0, -11650], [2, 0, -3, 0, 14403], [0, 1, -2, 0, -7003],
    [2, -1, -2, 0, 10056], [1, 0, 1, 0, 6322], [2, -2, 0, 0, -9884]];
var sum = 0;
terms.forEach(function(c) {
    var f = c[4] * (Math.abs(c[1]) === 1 ? Eb : Math.abs(c[1]) === 2 ? Eb * Eb : 1);
    sum += f * Math.cos(c[0] * D + c[1] * M + c[2] * Mp + c[3] * F);
});
return 385000.56 + sum / 1000;
    }
    return { AU: AU, planet: planet, fromEarthAU: fromEarthAU, moonKm: moonKm, names: Object.keys(EL) };
})();
