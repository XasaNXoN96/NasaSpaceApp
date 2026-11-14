/* SpaceEdu facts: the ONE place where each object's data lives.
   Every section of the site (hero, live cards, detail window, compare table, quiz, presentation)
   reads from here, so a change made here shows up everywhere at once.
   Source: the team's table NASA_объекты_таблица.xlsx (collected from NASA pages, Oct. 22, 2026). */
window.SPACE_DATA = {
    order: ['apollo', 'voyager', 'sojourner', 'spirit', 'opportunity', 'perseverance'],
    /* status: ok = operating, pas = passive but still used, lim = transmitting with limits, off = on the surface, not working */
    status: { apollo: 'pas', voyager: 'lim', sojourner: 'off', spirit: 'off', opportunity: 'off', perseverance: 'ok' },
    statusLabel: { ok: 'Operating', pas: 'Passive, still used', lim: 'Transmitting, limited', off: 'On surface, not working' },
    statusText: {
        ok: 'Active and returning science.',
        pas: 'No power at all, yet still part of today’s measurements.',
        lim: 'Still sending data, with fewer instruments switched on.',
        off: 'Still there, no longer operating.'
    },
    objects: {
        apollo: {
            name: 'APOLLO 11',
            title: 'Apollo 11 laser retroreflector',
            kind: 'LASER REFLECTOR · ON THE MOON SINCE 1969',
            lede: 'A panel of 100 glass corner cubes that Neil Armstrong and Buzz Aldrin left on the Moon. It needs no power, and observatories still fire lasers at it to time the Earth&ndash;Moon distance to within a few millimetres.',
            launched: 'July 16, 1969',
            where: 'Sea of Tranquility, Moon',
            status: 'Passive, still used',
            state: 'passive',
            creditType: 'Image',
            credit: 'NASA (photo by Neil Armstrong)',
            pia: 'AS11-40-5948',
            creditLink: 'https://images.nasa.gov/details/as11-40-5948'
        },
        sojourner: {
            name: 'SOJOURNER',
            title: 'Sojourner',
            kind: 'MARS ROVER · WORKED 1997',
            lede: 'The first wheeled vehicle on another planet, about the size of a microwave oven. Planned for 7 days, it worked for 83, analysed the rocks around the Pathfinder lander and found signs that water once flowed there.',
            launched: 'Dec. 4, 1996',
            where: 'Ares Vallis, Mars',
            status: 'Mission ended 1997',
            state: 'ended',
            creditType: 'Image',
            credit: 'NASA/JPL',
            pia: 'PIA00766',
            creditLink: 'https://www.jpl.nasa.gov/images/pia00766-sojourner-yogi/'
        },
        voyager: {
            name: 'VOYAGER 1',
            title: 'Voyager 1',
            kind: 'SPACE PROBE · IN FLIGHT SINCE 1977',
            lede: 'After flying past Jupiter and Saturn, it became the first spacecraft to leave the heliosphere, in 2012. It is still sending data from interstellar space, though only two of its ten instruments remain on.',
            launched: 'Sept. 5, 1977',
            where: 'Interstellar space',
            status: 'Active, 2 of 10 instruments on',
            state: 'active',
            creditType: 'Illustration',
            credit: 'NASA/JPL-Caltech',
            pia: 'PIA17462',
            creditLink: 'https://science.nasa.gov/photojournal/voyager-1-entering-interstellar-space-artist-concept/'
        },
        spirit: {
            name: 'SPIRIT',
            title: 'Spirit',
            kind: 'MARS ROVER · WORKED 2004–2010',
            lede: 'Built for a 90-day mission in Gusev Crater, it worked for more than six years. Its stuck wheel dug up nearly pure silica, the kind that forms around hot springs, a sign of a much wetter ancient Mars.',
            launched: 'June 10, 2003',
            where: 'Gusev Crater, Mars',
            status: 'Mission ended 2011',
            state: 'ended',
            creditType: 'Image',
            credit: 'NASA/JPL-Caltech/Cornell',
            pia: 'PIA03272',
            creditLink: 'https://science.nasa.gov/photojournal/still-shining-after-all-this-time-vertical/'
        },
        opportunity: {
            name: 'OPPORTUNITY',
            title: 'Opportunity',
            kind: 'MARS ROVER · WORKED 2004–2018',
            lede: 'Planned for 90 days, it explored Meridiani Planum for almost 15 years and drove 45 km. Hematite spherules and gypsum veins it found showed that liquid water once flowed on Mars.',
            launched: 'July 7, 2003',
            where: 'Endeavour Crater, Mars',
            status: 'Mission ended 2019',
            state: 'ended',
            creditType: 'Image',
            credit: 'NASA/JPL-Caltech/Cornell Univ./Arizona State Univ.',
            pia: 'PIA18079',
            creditLink: 'https://science.nasa.gov/photojournal/self-portrait-by-freshly-cleaned-opportunity-mars-rover-in-march-2014/'
        },
        perseverance: {
            name: 'PERSEVERANCE',
            title: 'Perseverance',
            kind: 'MARS ROVER · ON MARS SINCE 2021',
            lede: 'Exploring Jezero Crater, an ancient lake bed, and collecting rock samples for a possible return to Earth. In 2024 it found potential biosignatures in the rock &ldquo;Cheyava Falls&rdquo;: intriguing clues, not proof of life.',
            launched: 'July 30, 2020',
            where: 'Jezero Crater rim, Mars',
            status: 'Active, to about 2028',
            state: 'active',
            creditType: 'Image',
            credit: 'NASA/JPL-Caltech/MSSS',
            pia: 'PIA26344',
            creditLink: 'https://science.nasa.gov/photojournal/perseverances-selfie-with-cheyava-falls/'
        }
    },
    details: {
        apollo: {
            bannerAlt: 'Buzz Aldrin on the Moon beside the seismometer and the laser reflector, with the flag and the Lunar Module behind',
            stats: [
                ['100', 'glass corner cubes'],
                ['3.8 cm', 'the Moon moves away each year'],
                ['0 W', 'power it needs'],
                ['55+ years', 'still in use']
            ],
            built: 'Send laser pulses from Earth straight back to where they came from, so observatories can time the round trip and measure the distance to the Moon.',
            found: [
                'The Moon is moving away from Earth by about 3.8 cm (1.5 in) a year.',
                'The Moon has a fluid core, although scientists had expected a cool, solid one.',
                'Gravity passes a test of Einstein’s ideas: the Sun pulls on Earth and the Moon in the same way, even though Earth contains more iron.',
                'The Earth–Moon distance is now measured to within a few millimetres.'
            ],
            badge: 'Passive, still used',
            status: [
                'It has no power and no moving parts, which is why it has lasted more than 55 years.',
                'Four telescopes, in New Mexico, France, Italy and Germany, fire lasers at the Apollo arrays.',
                'Limits: the reflector is far too small to see from Earth, and by the time the laser reaches the Moon the beam is several kilometres wide.',
                'The light that comes back is extremely faint: in good conditions about one photon every few seconds, so only a few observatories can do this.'
            ],
            timeline: [
                ['July 16, 1969', 'Apollo 11 launches from Kennedy Space Center, Florida.'],
                ['July 20, 1969', 'Armstrong and Aldrin land in the Sea of Tranquility and walk on the Moon.'],
                ['July 21, 1969', 'The reflector is set up near the end of the moonwalk (UTC date).'],
                ['1971', 'Apollo 14 and Apollo 15 leave two more reflector arrays.'],
                ['2004', 'After 35 years, ranging is accurate to about 2 cm.'],
                ['2019', 'After 50 years, measurements reach a few millimetres.']
            ],
            figure: {
                src: 'lm',
                alt: 'The Apollo 11 Lunar Module standing on the grey lunar surface, with the Sun behind it',
                caption: 'The Lunar Module Eagle on the Sea of Tranquility. The reflector was set up a short walk away.',
                credit: 'NASA',
                pia: 'Apollo 11',
                link: 'https://www.nasa.gov/mission/apollo-11/'
            },
            sources: [
                ['JPL: the Apollo experiment that keeps on giving, 2019', 'https://www.jpl.nasa.gov/news/the-apollo-experiment-that-keeps-on-giving/'],
                ['JPL: still going strong after 35 years, 2004', 'https://www.jpl.nasa.gov/news/apollo-11-experiment-still-going-strong-after-35-years/'],
                ['NASA ILRS: Apollo 11 reflector', 'https://ilrs.gsfc.nasa.gov/missions/satellite_missions/current_missions/ap11_general.html']
            ]
        },
        sojourner: {
            bannerAlt: 'The small Sojourner rover pressing its spectrometer against a large rock called Yogi',
            stats: [
                ['10.6 kg', 'rover mass'],
                ['83 days', 'worked, against 7 planned'],
                ['~100 m', 'driven in total'],
                ['550', 'pictures it took']
            ],
            built: 'Show that a small wheeled rover can drive and do science on Mars, and that a low-cost landing on airbags works. Its spectrometer (APXS) measured what the nearby rocks and soil were made of.',
            found: [
                'It became the first wheeled vehicle on another planet.',
                'Rounded pebbles and rocks that look like conglomerates: running water once shaped the landing site, so ancient Mars was warmer and wetter.',
                'Dust in the Martian air is magnetic, probably because of a mineral called maghemite.',
                'The mission watched dust devils and early-morning clouds of water ice.',
                'Its airbag landing was later used for Spirit and Opportunity.'
            ],
            badge: 'Not working',
            status: [
                'It never went more than about 12 m from the lander, because it talked to Earth through the lander’s radio.',
                'The last data came on Sept. 27, 1997, when contact with the lander was lost.',
                'It lasted 12 times longer than planned.',
                'The rover is still physically on Mars, in Ares Vallis.'
            ],
            timeline: [
                ['Dec. 4, 1996', 'Mars Pathfinder launches from Cape Canaveral, Florida.'],
                ['July 4, 1997', 'Lands in Ares Vallis, bouncing on airbags.'],
                ['July 5, 1997', 'Sojourner rolls down a ramp onto Mars.'],
                ['July 1997', 'Studies its first rocks, “Barnacle Bill” and “Yogi”.'],
                ['Sept. 27, 1997', 'Last data from the mission.']
            ],
            figure: {
                src: 'pathfinder',
                alt: 'The Mars Pathfinder lander seen from above on orange Martian ground, its three solar petals open among deflated airbags',
                caption: 'The Mars Pathfinder lander on Mars, its petals open among the deflated airbags. Sojourner drove off it down a ramp.',
                credit: 'NASA',
                pia: 'Mars Pathfinder',
                link: 'https://science.nasa.gov/mission/mars-pathfinder/'
            },
            sources: [
                ['NASA: Mars Pathfinder mission page', 'https://science.nasa.gov/mission/mars-pathfinder/'],
                ['NASA history: 25 years since Pathfinder, 2021', 'https://www.nasa.gov/history/25-years-ago-mars-pathfinder-launches-to-mars-to-deploy-sojourner-the-first-planetary-rover-2/'],
                ['NASA: July 4, 1997, Sojourner arrives', 'https://www.nasa.gov/image-article/july-4-1997-sojourner-arrives-red-planet/']
            ]
        },
        voyager: {
            bannerAlt: 'Illustration of the Voyager 1 spacecraft with its large dish antenna, entering interstellar space',
            stats: [
                ['1977', 'launched'],
                ['2 of 10', 'instruments still on'],
                ['~4 W', 'power lost every year'],
                ['1 light-day', 'away from Earth on Nov. 18, 2026 (expected)']
            ],
            built: 'Fly past Jupiter and Saturn and study the two giant planets, their rings and their moons, including Saturn’s largest moon, Titan.',
            found: [
                'Jupiter has a faint ring, and two moons nobody knew about: Thebe and Metis.',
                'Its pictures from March 1979 showed volcanoes erupting on Io, a moon of Jupiter: the first active volcanoes seen beyond Earth.',
                'Saturn has five more moons, a new ring, and small “shepherd” moons that keep some rings sharp.',
                'Titan’s atmosphere is about 90% nitrogen and so thick it hides the surface completely.',
                'It is the first spacecraft to leave the heliosphere, the bubble of the Sun’s influence, so it measures interstellar space directly.',
                'On Feb. 14, 1990 it took the “Pale Blue Dot”: Earth seen from about 6 billion km away.'
            ],
            badge: 'Working, with limits',
            status: [
                'Two instruments are still on: the magnetometer (MAG) and the plasma wave subsystem (PWS).',
                'The low-energy charged particles instrument (LECP) was switched off on Apr. 17, 2026 to save power.',
                'Its nuclear power sources (RTGs) lose about 4 W every year, so the team switches instruments off one by one.',
                'The cameras have been off since 1990: no new pictures, only measurements.',
                'A radio signal now takes almost a full day to reach Earth.'
            ],
            timeline: [
                ['Sept. 5, 1977', 'Launched from Cape Canaveral, Florida.'],
                ['Mar. 5, 1979', 'Closest approach to Jupiter.'],
                ['Nov. 12, 1980', 'Closest approach to Saturn and Titan.'],
                ['Feb. 14, 1990', 'Takes the “Pale Blue Dot”; cameras are switched off.'],
                ['Aug. 25, 2012', 'Crosses the heliopause into interstellar space.'],
                ['Apr. 17, 2026', 'LECP instrument switched off to save power.'],
                ['Nov. 18, 2026', 'Will be one light-day (about 25.9 billion km) from Earth.']
            ],
            figure: {
                src: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia23/pia23645/PIA23645.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg',
                alt: 'Earth as a single faint bright dot inside a band of scattered sunlight against black space',
                caption: '“Pale Blue Dot Revisited”: Earth (the tiny dot in the light band) from about 6 billion km. Colours are false.',
                credit: 'NASA/JPL-Caltech',
                pia: 'PIA23645',
                link: 'https://science.nasa.gov/photojournal/pale-blue-dot-revisited/'
            },
            sources: [
                ['NASA: Voyager 1 mission page', 'https://science.nasa.gov/mission/voyager/voyager-1/'],
                ['JPL: instrument shut off, Apr. 2026', 'https://www.jpl.nasa.gov/news/nasa-shuts-off-instrument-on-voyager-1-to-keep-spacecraft-operating/'],
                ['NASA: where are the Voyagers now', 'https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/']
            ]
        },
        spirit: {
            bannerAlt: 'Spirit rover’s solar-panel deck seen from above, lightly coated in dust',
            stats: [
                ['90 days', 'planned mission'],
                ['6 yr 2 mo', 'actually worked'],
                ['7.73 km', 'driven'],
                ['25×', 'longer than planned']
            ],
            built: 'Study rocks and soil in Gusev Crater and look for clues that water once flowed there. The mission was planned for 90 Martian days.',
            found: [
                'In the Columbia Hills: bedrock of many kinds, some of it changed by water.',
                'At “Home Plate”: traces of an ancient volcano and explosive eruptions driven by hot underground water.',
                'In 2007 its broken, dragging wheel dug up soil that was about 90% pure silica. On Earth this forms at hot springs and steam vents, so ancient Mars was much wetter.',
                'In the “Comanche” rocks: about ten times more carbonate than in any Martian rock studied before, a sign of water that was not acidic and could have suited life.',
                'In 2005 it filmed dust devils moving across the plains.'
            ],
            badge: 'Not working',
            status: [
                'Got stuck in soft soil on May 1, 2009.',
                'Last contact on Mar. 22, 2010. Most likely the Martian winter grew too cold for its heaters.',
                'NASA stopped trying to reach it on May 25, 2011, after sending more than 1,300 commands.',
                'The rover is still physically on Mars, next to Home Plate.'
            ],
            timeline: [
                ['June 10, 2003', 'Launched from Cape Canaveral, Florida.'],
                ['Jan. 3, 2004', 'Lands in Gusev Crater.'],
                ['2005', 'Films dust devils in motion.'],
                ['2007', 'Finds nearly pure silica.'],
                ['May 1, 2009', 'Gets stuck in soft soil.'],
                ['Mar. 22, 2010', 'Last contact with Earth.'],
                ['May 25, 2011', 'NASA ends the mission.']
            ],
            sources: [
                ['NASA: Spirit mission page', 'https://science.nasa.gov/mission/mer-spirit/'],
                ['NASA: Spirit and Opportunity science highlights', 'https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/science-highlights/'],
                ['JPL: carbonates in Comanche, 2010', 'https://www.jpl.nasa.gov/news/nasa-rover-finds-clue-to-mars-past-and-environment-for-life/']
            ]
        },
        opportunity: {
            bannerAlt: 'Opportunity rover self-portrait with clean solar panels on the reddish Martian surface',
            stats: [
                ['90 days', 'planned mission'],
                ['~15 years', 'actually worked'],
                ['45.16 km', 'driven'],
                ['32°', 'steepest slope climbed']
            ],
            built: 'Find places on Mars where conditions may once have suited life, and look for signs of past water. The plan was 90 Martian days and 1 km of driving.',
            found: [
                'Small round grains of hematite, nicknamed “blueberries”. This mineral usually forms in water, but that water was acidic, which is hard on life.',
                'Bright veins of gypsum near Endeavour Crater, left by water flowing through cracks underground.',
                'Clay minerals that formed in neutral water: the friendliest conditions for life of anywhere it went.',
                'In January 2005, an iron-nickel meteorite nicknamed “Heat Shield Rock”.'
            ],
            badge: 'Not working',
            status: [
                'In 2018 a dust storm covered the whole planet and blocked sunlight from its solar panels.',
                'Last contact on June 10, 2018.',
                'NASA declared the mission over on Feb. 13, 2019, after sending more than 1,000 commands.',
                'Its 45.16 km driving record stood until Perseverance passed it on Oct. 11, 2026.',
                'The rover is still physically on Mars, in Perseverance Valley on Endeavour Crater.'
            ],
            timeline: [
                ['July 7, 2003', 'Launched from Cape Canaveral, Florida.'],
                ['Jan. 24, 2004', 'Lands in Eagle crater, Meridiani Planum (US time).'],
                ['Jan. 2005', 'Finds the “Heat Shield Rock” meteorite.'],
                ['Aug. 2011', 'Reaches Endeavour Crater.'],
                ['Mar. 10, 2016', 'Drives on a 32° slope, the steepest for any Mars rover.'],
                ['June 10, 2018', 'Last contact, during a planet-wide dust storm.'],
                ['Feb. 13, 2019', 'NASA ends the mission.']
            ],
            sources: [
                ['NASA: Opportunity mission page', 'https://science.nasa.gov/mission/mer-opportunity/'],
                ['NASA: Spirit and Opportunity science highlights', 'https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/science-highlights/'],
                ['JPL: mission comes to an end, 2019', 'https://www.jpl.nasa.gov/news/nasas-opportunity-rover-mission-on-mars-comes-to-end/']
            ]
        },
        perseverance: {
            bannerAlt: 'Perseverance rover selfie next to an arrowhead-shaped rock called Cheyava Falls',
            stats: [
                ['45.22 km', 'driven, a record'],
                ['2,006', 'Martian days at the record'],
                ['24+', 'rock samples collected'],
                ['~2028', 'extended mission end']
            ],
            built: 'Look for signs of ancient microbial life in Jezero Crater, study whether Mars could support life, collect rock and soil samples for a possible trip to Earth, and help prepare for human missions.',
            found: [
                'Jezero Crater once held a lake, a river delta and rivers: a place that could have supported life.',
                'The crater floor is made of two kinds of volcanic rock that were changed by water.',
                'A 2024 sample from the rock “Cheyava Falls”, named “Sapphire Canyon”, holds potential biosignatures (published in Nature, Sept. 2025). These are clues, not proof: the same minerals can also form without life.',
                'Its MOXIE experiment made oxygen from the carbon dioxide in Mars’ air.',
                'Its microphones made the first recordings of sound on the surface of Mars.'
            ],
            badge: 'Working',
            status: [
                'Its driving systems are fully working.',
                'On Oct. 11, 2026, its 2,006th Martian day, it passed Opportunity’s record: 45.22 km.',
                'Its first extended mission runs from October 2026 to about the end of 2028, along the crater rim and south toward “Rainbow Falls”.',
                'Limits: the biosignatures can only be confirmed in labs on Earth, and the sample return is not yet approved. When it drives toward the Sun, glare in its cameras makes it park by mid-afternoon.'
            ],
            timeline: [
                ['July 30, 2020', 'Launched from Cape Canaveral, Florida.'],
                ['Feb. 18, 2021', 'Lands in Jezero Crater.'],
                ['July 2024', 'Collects the “Sapphire Canyon” sample from “Cheyava Falls”.'],
                ['Sept. 2025', 'Potential biosignatures published in Nature.'],
                ['June 2026', 'Passes a marathon distance (42.2 km).'],
                ['Oct. 11, 2026', 'Sets the off-world driving record.'],
                ['Oct. 2026', 'First extended mission begins.']
            ],
            figure: {
                src: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia26/pia26726/PIA26726.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg',
                alt: 'View from orbit of reddish ridged Martian ground with faint rover tracks and a tiny rover',
                caption: 'Seen from orbit on June 13, 2026 by the HiRISE camera: Perseverance is the small speck at the end of its tracks, a day before it passed the marathon distance.',
                credit: 'NASA/JPL-Caltech/University of Arizona',
                pia: 'PIA26726',
                link: 'https://science.nasa.gov/photojournal/nasas-hirise-captures-perseverance-marking-a-milestone-on-mars/'
            },
            sources: [
                ['NASA: Perseverance mission page', 'https://science.nasa.gov/mission/mars-2020-perseverance/'],
                ['NASA blog: driving record, Oct. 2026', 'https://science.nasa.gov/blogs/perseverance-mars-rover/2026/10/12/nasas-perseverance-sets-off-world-record-for-total-distance-driven/'],
                ['NASA: potential biosignature, 2025', 'https://www.nasa.gov/news-release/nasa-says-mars-rover-discovered-potential-biosignature-last-year/']
            ]
        }
    }
};
