/* Glossary, keywords and quiz questions */
/* v3: glossary, search, settings and sound, films, "test yourself" and achievements */
/* ============================== GLOSSARY, KEYWORDS AND QUESTIONS ============================== */
/* `m` finds the term in the site's text (first use per section is underlined); `rel` links it to objects */
var GLOSSARY = [
    { id: 'au', t: 'Astronomical unit (AU)', m: /\bAU\b/, rel: ['voyager'], d: 'The average distance between Earth and the Sun, about 149.6 million km. Mars orbits about 1.5 AU from the Sun; Voyager 1 is more than 170 AU away.' },
    { id: 'light-time', t: 'Light-time', m: /\blight[- ](?:time|day)s?\b/i, rel: ['voyager', 'apollo'], d: 'How long light or a radio signal takes to travel a distance, at about 300,000 km every second. From the Moon it takes about 1.3 s; from Voyager 1 almost a whole day. A light-day is about 25.9 billion km.' },
    { id: 'sol', t: 'Sol', m: /\bsols?\b/, rel: ['perseverance', 'spirit', 'opportunity'], d: 'A day on Mars: 24 hours, 39 minutes and 35 seconds. Rover teams count mission days in sols, starting with sol 0 on landing day.' },
    { id: 'rover', t: 'Rover', m: /\brovers?\b/i, rel: ['sojourner', 'spirit', 'opportunity', 'perseverance'], d: 'A robot vehicle that drives across the surface of another world. All four Mars objects on this site are rovers.' },
    { id: 'lander', t: 'Lander', m: /\blanders?\b/i, rel: ['sojourner'], d: 'A spacecraft that lands and stays in one place. Sojourner’s lander, Mars Pathfinder, carried the only radio that could reach Earth.' },
    { id: 'orbiter', t: 'Orbiter', m: /\borbiters?\b/i, rel: ['perseverance'], d: 'A spacecraft that circles a planet. Orbiters around Mars relay most rover data to Earth, because they have bigger radios and see Earth more often.' },
    { id: 'rtg', t: 'RTG (nuclear power source)', m: /\bMMRTG\b|\bRTGs?\b|nuclear power sources?|plutonium generators?/i, rel: ['voyager', 'perseverance'], d: 'A radioisotope thermoelectric generator turns the heat of decaying plutonium-238 into electricity, day and night, with no moving parts. Voyager 1’s RTGs lose about 4 watts a year.' },
    { id: 'solar-panel', t: 'Solar panel', m: /\bsolar (?:panels?|arrays?|cells?|power)\b/i, rel: ['spirit', 'opportunity', 'sojourner'], d: 'A panel that turns sunlight into electricity. Dust and the weak winter Sun ended the solar-powered Spirit and Opportunity.' },
    { id: 'hga', t: 'High-gain antenna', m: /\bhigh-gain antenna\b/i, rel: ['voyager', 'perseverance'], d: 'A dish that sends a narrow, strong radio beam. It has to point very precisely at Earth.' },
    { id: 'dsn', t: 'Deep Space Network', m: /\bDeep Space Network\b|\bDSN\b/, rel: ['voyager'], d: 'NASA’s giant radio dishes in California, Spain and Australia. Spread around the globe, they can always reach a distant spacecraft as Earth turns.' },
    { id: 'telemetry', t: 'Telemetry', m: /\btelemetry\b/i, rel: ['voyager'], d: 'The data a spacecraft sends home about itself and its measurements: temperatures, power, position and science readings.' },
    { id: 'retroreflector', t: 'Retroreflector', m: /\bretroreflectors?\b|corner[- ]cubes?/i, rel: ['apollo'], d: 'A device that sends light straight back to where it came from, whatever the angle. The Apollo 11 array has 100 corner-cube prisms of fused silica.' },
    { id: 'llr', t: 'Lunar laser ranging', m: /\blaser ranging\b/i, rel: ['apollo'], d: 'Firing laser pulses at the reflectors on the Moon and timing the echo. It measures the Earth–Moon distance to a few millimetres and shows the Moon drifting away by about 3.8 cm a year.' },
    { id: 'heliosphere', t: 'Heliosphere', m: /\bheliosphere\b/i, rel: ['voyager'], d: 'The huge bubble that the solar wind, the stream of particles from the Sun, blows around the Solar System. Voyager 1 crossed its edge in 2012.' },
    { id: 'interstellar', t: 'Interstellar space', m: /\binterstellar (?:space|medium)\b/i, rel: ['voyager'], d: 'The space between the stars, outside the Sun’s heliosphere. Voyager 1 was the first human-made object to reach it.' },
    { id: 'solar-wind', t: 'Solar wind', m: /\bsolar wind\b|\bSun’s particles\b/i, rel: ['voyager'], d: 'A constant stream of charged particles flowing out from the Sun at hundreds of kilometres per second.' },
    { id: 'magnetometer', t: 'Magnetometer', m: /\bmagnetometers?\b/i, rel: ['voyager'], d: 'An instrument that measures magnetic fields. Voyager 1’s sits on a 13 m boom so the spacecraft’s own magnetism does not disturb it.' },
    { id: 'spectrometer', t: 'Spectrometer', m: /\bspectrometers?\b/i, rel: ['sojourner', 'spirit', 'opportunity', 'perseverance'], d: 'An instrument that splits light or other radiation into its parts to work out what a rock or a gas is made of.' },
    { id: 'apxs', t: 'APXS', m: /\bAPXS\b/, rel: ['sojourner', 'spirit', 'opportunity'], d: 'Alpha Particle X-ray Spectrometer. Pressed against a rock, it measures which chemical elements the rock contains.' },
    { id: 'rocker-bogie', t: 'Rocker-bogie', m: /\brocker-bogie\b/i, rel: ['sojourner', 'perseverance'], d: 'A six-wheel suspension that lets a rover climb over rocks while keeping every wheel on the ground. Sojourner was the first to use it on Mars.' },
    { id: 'hazcam', t: 'Hazcam', m: /\bhaz ?cams?\b|\bhazard cameras?\b/i, rel: ['perseverance'], d: 'Hazard-avoidance cameras mounted low on a rover that watch for rocks and holes near the wheels.' },
    { id: 'biosignature', t: 'Biosignature', m: /\bbiosignatures?\b/i, rel: ['perseverance'], d: 'A pattern that life could have made. A potential biosignature, like the one in the rock “Cheyava Falls”, is a clue that needs more study, not proof of life.' },
    { id: 'silica', t: 'Silica', m: /\bsilica\b/i, rel: ['spirit'], d: 'Silicon dioxide, the stuff of quartz and glass. The nearly pure silica Spirit dug up forms around hot springs or steam vents, places where life thrives on Earth.' },
    { id: 'hematite', t: 'Hematite', m: /\bhematite\b|\bblueberries\b/i, rel: ['opportunity'], d: 'An iron-oxide mineral. Opportunity found tiny hematite spheres, nicknamed “blueberries”, that formed in water.' },
    { id: 'dust-storm', t: 'Global dust storm', m: /\bdust storms?\b/i, rel: ['opportunity'], d: 'A Martian storm that can grow until it wraps the whole planet for weeks and blocks most of the sunlight. The 2018 storm ended Opportunity’s mission.' },
    { id: 'prime', t: 'Prime mission', m: /\bprime mission\b|\b90-day mission\b/i, rel: ['spirit', 'opportunity', 'sojourner'], d: 'How long a mission is first designed and paid for. Spirit and Opportunity were planned for 90 sols; both lasted years longer.' },
    { id: 'jezero', t: 'Jezero Crater', m: /\bJezero\b/, rel: ['perseverance'], d: 'A 45 km crater on Mars that once held a lake fed by a river. Perseverance explores its old river delta and its rim.' },
    { id: 'gusev', t: 'Gusev Crater', m: /\bGusev\b/, rel: ['spirit'], d: 'A crater about 160 km wide where Spirit landed in January 2004.' },
    { id: 'meridiani', t: 'Meridiani Planum', m: /\bMeridiani\b/, rel: ['opportunity'], d: 'A flat plain near the Martian equator where Opportunity landed in January 2004.' },
    { id: 'ephemeris', t: 'Ephemeris', m: /\bephemeris\b|\bephemerides\b/i, rel: ['voyager'], d: 'A table of where a planet, moon or spacecraft is at given times. SpaceEdu uses the JPL Horizons ephemeris for Voyager 1.' },
    { id: 'ecliptic', t: 'Ecliptic', m: /\becliptic\b/i, rel: ['voyager'], d: 'The flat plane of Earth’s orbit around the Sun. The planets all orbit close to it; Voyager 1 flies about 35° above it.' },
    { id: 'gravity-assist', t: 'Gravity assist', m: /\bgravity assists?\b/i, rel: ['voyager'], d: 'Flying close to a planet to borrow some of its speed. Voyager 1 used Jupiter and Saturn to speed up and change direction.' },
    { id: 'golden-record', t: 'Golden Record', m: /\bGolden Record\b/i, rel: ['voyager'], d: 'A gold-plated copper disc on each Voyager with sounds, music and pictures from Earth, a message for anyone who might find it.' },
    { id: 'pale-blue-dot', t: 'Pale Blue Dot', m: /\bPale Blue Dot\b/i, rel: ['voyager'], d: 'The photo of Earth Voyager 1 took on Feb. 14, 1990 from about 6 billion km away: Earth is less than a single pixel in a sunbeam.' },
    { id: 'moxie', t: 'MOXIE', m: /\bMOXIE\b/, rel: ['perseverance'], d: 'An experiment on Perseverance that made oxygen from the carbon dioxide in Mars’ thin air, a test for future astronauts.' },
    { id: 'sample', t: 'Sample tube', m: /\bsample tubes?\b|\brock cores?\b/i, rel: ['perseverance'], d: 'Perseverance drills rock cores and seals them in tubes. Bringing some of them to Earth has been studied, but how and when is still being decided.' }
];

/* keywords for the search and the tag chips */
var TAGS = {
    apollo: ['Moon', 'laser', 'retroreflector', 'Apollo', '1969', 'passive', 'Earth–Moon distance'],
    voyager: ['interstellar', 'nuclear power', 'Jupiter', 'Saturn', 'Golden Record', 'heliosphere', '1977', 'deep space'],
    sojourner: ['Mars', 'rover', 'lander', 'Pathfinder', '1997', 'first rover', 'solar power'],
    spirit: ['Mars', 'rover', 'solar power', 'silica', 'Gusev', '2004', 'stuck in sand', 'winter'],
    opportunity: ['Mars', 'rover', 'solar power', 'dust storm', 'hematite', 'Meridiani', '2004', 'record drive'],
    perseverance: ['Mars', 'rover', 'nuclear power', 'Jezero', 'samples', 'biosignature', 'MOXIE', 'active']
};

/* the "test yourself" missions round: [question, [right, wrong, wrong, wrong], why, object] */
var QUESTIONS = [
    ['Which object has no power at all, yet is still used every year?', ['Apollo 11 laser retroreflector', 'Voyager 1', 'Spirit', 'Sojourner'], 'It is a passive mirror: observatories fire lasers at it and time the echo.', 'apollo'],
    ['How long does a laser pulse take to reach the Moon and come back?', ['About 2.5 seconds', 'About 0.25 seconds', 'About 25 seconds', 'About 4 minutes'], 'The Moon is about 384,000 km away; light covers that twice in roughly 2.5 s.', 'apollo'],
    ['What ended Opportunity’s mission?', ['A dust storm that covered the whole planet', 'It got stuck in soft sand', 'Its lander’s battery failed', 'Its plutonium ran out'], 'In June 2018 the storm blocked the sunlight its solar panels needed.', 'opportunity'],
    ['How far did Opportunity drive on Mars?', ['45.16 km', '7.73 km', '450 km', '800 m'], 'A record on another world for years, until Perseverance passed it.', 'opportunity'],
    ['Why did Spirit go silent in 2010?', ['Stuck in sand, it could not tilt its solar panels toward the winter Sun', 'A meteorite hit it', 'A dust storm buried it', 'Its antenna broke off'], 'Without enough power to stay warm through the winter, it never woke up again.', 'spirit'],
    ['What did Spirit’s broken, dragging wheel dig up?', ['Nearly pure silica', 'Ice', 'Gold', 'A fossil'], 'Silica like this forms around hot springs: a sign of a wetter, warmer past.', 'spirit'],
    ['How did Sojourner send its data to Earth?', ['Through its lander’s radio', 'Straight to Earth with its own dish', 'Through an orbiter', 'It stored it to be collected later'], 'That is why it ended when the Pathfinder lander fell silent.', 'sojourner'],
    ['Sojourner was planned for 7 days. How long did it work?', ['83 days', '7 days', '1 year', '14 years'], 'Almost 12 times its plan.', 'sojourner'],
    ['When did Voyager 1 enter interstellar space?', ['2012', '1979', '1990', '2025'], 'On Aug. 25, 2012 it crossed the edge of the Sun’s heliosphere.', 'voyager'],
    ['What powers Voyager 1?', ['Plutonium generators (RTGs)', 'Solar panels', 'Batteries charged from Earth', 'A small rocket engine'], 'Sunlight is far too weak out there. The RTGs lose about 4 W a year.', 'voyager'],
    ['How many of Voyager 1’s ten instruments are still switched on?', ['2', '10', '6', '0'], 'Engineers switch them off one by one to save power.', 'voyager'],
    ['How long does Voyager 1’s radio signal take to reach Earth?', ['Almost a whole day', 'About 8 minutes', 'About 4 hours', 'About a week'], 'It is more than 25 billion km away, almost one light-day.', 'voyager'],
    ['What did Perseverance find in the rock “Cheyava Falls”?', ['Potential biosignatures: clues, not proof of life', 'Living bacteria', 'Liquid water', 'Nothing unusual'], 'Scientists are careful: such patterns can sometimes form without life.', 'perseverance'],
    ['Where is Perseverance exploring?', ['Jezero Crater, an ancient lake bed', 'Gusev Crater', 'The Sea of Tranquility', 'Olympus Mons'], 'Water once filled the crater and a river built a delta there.', 'perseverance'],
    ['Which was the first wheeled vehicle on another planet?', ['Sojourner', 'Spirit', 'Perseverance', 'Opportunity'], 'It rolled onto Mars in July 1997.', 'sojourner'],
    ['What is a sol?', ['A day on Mars', 'A Martian year', 'A unit of power', 'A type of rock'], 'It lasts 24 h 39 min 35 s.', 'perseverance']
];
