/* Parts of each 3D model */
/* Parts you can point at on each 3D model. For NASA's models `p` is in the viewer's normalised space
   (bounding sphere radius 1, base on the ground), measured from the model files; for the two models
   built here it is in metres, in the build's own coordinates. `d` may differ per object (Spirit and
   Opportunity share one model). */
var MER_PARTS = [
    { p: [-0.03, 0.95, 0.28], t: 'Pancam mast', d: 'Colour panoramic cameras and navigation cameras on a mast about as tall as a person.' },
    { p: [0.45, 0.43, -0.3], t: 'Solar panels', d: {
        spirit: 'They powered it for six years; the cold, dim Martian winter of 2009 to 2010 was too much.',
        opportunity: 'In 2018 a dust storm that covered the whole planet blocked the sunlight they needed.' } },
    { p: [0.24, 0.53, -0.09], t: 'High-gain antenna', d: 'A steerable dish for talking straight to Earth.' },
    { p: [0, 0.25, 0.36], t: 'Robotic arm', d: 'Carries a microscopic imager, two spectrometers and a tool that ground into rocks to see inside them.' },
    { p: [0.36, 0.08, 0.35], t: 'Six wheels', d: {
        spirit: 'Its right-front wheel stopped turning in 2006. Dragging it is how Spirit dug up nearly pure silica.',
        opportunity: 'They carried it 45.16 km, a record on another world until Perseverance passed it in 2026.' } },
    { p: [0.34, 0.3, 0.05], t: 'Warm electronics box', d: 'Keeps the computer and batteries warm through freezing Martian nights.' }
];
var SPACE_PARTS = {
    perseverance: { space: 'holder', parts: [
        { p: [-0.205, 0.77, 0.143], t: 'Remote sensing mast', d: 'Mastcam-Z, the zoom cameras, and SuperCam, which fires a laser at rocks to find out what they are made of.' },
        { p: [0.12, 0.7, 0.62], t: 'Robotic arm and turret', d: 'A 2.1 m arm carrying the coring drill and the PIXL and SHERLOC instruments that studied “Cheyava Falls”.' },
        { p: [-0.005, 0.415, 0.173], t: 'Sample handling', d: 'Inside the front of the body, a small inner arm seals rock cores into tubes for a possible return to Earth.' },
        { p: [0, 0.45, -0.59], t: 'Nuclear power source (MMRTG)', d: 'Turns the heat of decaying plutonium into electricity, day and night, whatever the dust.' },
        { p: [0.15, 0.48, -0.25], t: 'High-gain antenna', d: 'The steerable dish that can talk to Earth directly; most data goes through orbiters overhead.' },
        { p: [0, 0.288, -0.509], t: 'RIMFAX radar', d: 'Ground-penetrating radar that maps the rock layers beneath the rover as it drives.' },
        { p: [-0.03, 0.27, 0.24], t: 'Front hazard cameras', d: 'Cameras that watch for rocks and holes in front of the wheels.' },
        { p: [0.47, 0.1, 0.35], t: 'Wheels and rocker-bogie', d: 'Six aluminium wheels on a suspension that keeps all of them on the ground; they have carried it more than 45 km.' },
        { p: [0, 0.47, -0.15], t: 'Rover body', d: 'The warm electronics box: computers, batteries, and MOXIE, the experiment that made oxygen on Mars.' }
    ] },
    spirit: { space: 'holder', parts: MER_PARTS },
    opportunity: { space: 'holder', parts: MER_PARTS },
    voyager: { space: 'holder', parts: [
        { p: [0.11, 0.28, -0.393], t: 'High-gain antenna', d: 'A 3.7 m dish kept pointed at Earth. Its signal now takes almost a day to arrive.' },
        { p: [0.088, 0.203, -0.393], t: 'Ten-sided body', d: 'Holds the computers and radios. Bolted to the outside is the Golden Record of sounds and pictures from Earth.' },
        { p: [0, 0.976, 0.743], t: 'Magnetometer boom', d: 'A 13 m boom keeps the magnetometer away from the spacecraft’s own magnetism. MAG is one of the two instruments still on.' },
        { p: [0, 0.201, -0.095], t: 'Nuclear power sources (RTGs)', d: 'Three plutonium generators on their own boom. They lose about 4 W a year, so instruments are switched off one by one.' },
        { p: [0, 0.213, -0.695], t: 'Science boom', d: 'Carried the cameras, switched off for good in 1990 after the Pale Blue Dot.' }
    ] },
    apollo: { space: 'local', parts: [
        { p: [0, 0.16, 0.03], t: 'Corner-cube array', d: '100 fused-silica prisms, each 3.8 cm across. Each one sends light straight back to where it came from.' },
        { p: [0.25, 0.13, 0.12], t: 'Aluminium panel', d: '46 × 46 cm, tilted toward Earth, which hangs high in the sky above Tranquility Base.' },
        { p: [0.26, 0.03, -0.2], t: 'Pallet and legs', d: 'Carried out of the Lunar Module and set down by Buzz Aldrin in July 1969. No power, no moving parts, nothing to wear out.' },
        { beam: 0.9, t: 'Laser pulse from Earth', d: 'Observatories fire short laser pulses at the array. The round trip takes about 2.5 seconds and only a few photons come back.' }
    ] },
    sojourner: { space: 'local', parts: [
        { p: [0, 0.255, 0], t: 'Solar panel', d: 'Its main power came from 0.2 m² of solar cells on the roof.' },
        { p: [0, 0.2, 0.23], t: 'Front cameras', d: 'A stereo pair, with laser stripes to judge how tall the rocks ahead were.' },
        { p: [0.215, 0.065, 0.22], t: 'Six 13 cm wheels', d: 'On a rocker-bogie suspension, the idea later used by Spirit, Opportunity and Perseverance.' },
        { p: [0, 0.1, -0.3], t: 'APXS spectrometer', d: 'Pressed against rocks such as “Yogi” to measure which chemical elements they contain.' },
        { p: [0.14, 0.4, -0.24], t: 'Radio antenna', d: 'Talked to the lander, never to Earth directly, which is why it stayed within about 12 m of it.' },
        { p: [0.15, 0.19, 0.05], t: 'Warm electronics box', d: '10.6 kg in total: the whole rover was about the size of a microwave oven.' }
    ] }
};
