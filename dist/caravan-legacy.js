// The story uses the shipped catalog unchanged. Only explicit expedition actions
// advance the journey; solving or replaying a puzzle on its own never does.
export const COMPANIONS = [
  { id:'pip', name:'Pip', kind:'moth', role:'Keeper of little lights', description:'A brave moth with a very large scarf. Definitely not afraid of the dark. Usually.', quote:'I am checking the dark. From over here.', color:'#d9aa5e' },
  { id:'moss', name:'Moss', kind:'snail', role:'Camp cook', description:'Carries a kettle almost as big as his shell. Believes every difficult journey needs a proper tea break.', quote:'We have time for one small enormous cup.', color:'#759985' },
  { id:'rook', name:'Rook', kind:'bird', role:'Navigator', description:'An old navigator with a pocket full of maps. Sometimes the mountains make more sense upside down.', quote:'Exactly where I expected us to be. More or less.', color:'#829ab6' },
  { id:'bea', name:'Bea', kind:'beetle', role:'Builder and fixer', description:'Keeps useful screws in her hat and likes a problem she can take apart and try again.', quote:'That told us something. Let’s try the next idea.', color:'#cc795e' },
  { id:'fern', name:'Fern', kind:'seedling', role:'Tree tender', description:'Knows that the last living lantern tree needs water, light, and somewhere to put down roots.', quote:'A little care can grow into a very big thing.', color:'#8ca568' },
  { id:'tumble', name:'Tumble', kind:'puff', role:'Carrier of important things', description:'A round, cheerful creature carrying the blankets, the sandwiches, and one completely unnecessary spoon.', quote:'I brought a spare. A spare what? We’ll find out.', color:'#c294aa' }
];

export const ROUTES = [
  { id:'reeds', title:'Through the whispering reeds', subtitle:'A waterway full of hidden bridges', description:'Help Luma the boat keeper open the marsh waterway. Roads, symbols, and careful pouring will get the caravan through.', friend:'Luma, the reed-boat keeper', keepsake:'Luma’s reed bell', scene:'marsh' },
  { id:'ridge', title:'Over the whistling ridge', subtitle:'A high path with a view of tomorrow', description:'Visit Bracken the ridge keeper. Follow reflected light, test a counterweight, and share a pebble game above the clouds.', friend:'Bracken, the ridge keeper', keepsake:'Bracken’s copper weather vane', scene:'ridge' }
];

const pick = (k1, middle, upper) => ({k1,'23':middle,'45':upper});
const encounter = (id,title,mechanic,speaker,intro,success,keepsake,selection) => ({id,title,mechanic,speaker,intro,success,keepsake,selection});
const memory = (title,text) => ({title,text});

export const CHAPTERS = [
  {
    id:'sleeping-ferry', title:'The ferry that snored', subtitle:'A little light. A very large journey.', scene:'dock',
    description:'The last lantern tree has outgrown its pot. Six friends are carrying it to the sheltered valley beyond the islands. First, they need a ferry. All they can see is a very dark dock.',
    camp:'The ferry rocks gently beneath your blankets. Pip sleeps beside the lantern tree; Moss’s kettle whistles in time with the ferry’s snore.',
    encounters:[
      encounter('dock-lights','A light at the landing','toggle','pip','“I’m not afraid of the dark,” says Pip. “I just prefer to see it.” The dock’s wires change two lamps at a time. Make the light pattern so the caravan can see what is waiting in the water.','The dock lights blink into place. A huge sleepy face rises beside the landing. The ferry is alive! “Tickets?” it murmurs. Tumble offers a sandwich.',memory('The sandwich ticket','Our ferry accepted a sandwich. Tumble has kept the paper wrapper as our very first ticket.'),pick(2,3,4)),
      encounter('ferry-cradles','Six friends and one enormous kettle','swap','moss','The ferry’s cup-shaped cargo cradles have slipped out of order. Exchange the cups into their marked places so the luggage can travel safely. “The kettle gets a window,” says Moss.','The cradles settle into place. Moss’s kettle fits snugly beside Tumble’s pack. The ferry gives a happy rumble; everyone sits down before it can turn into a sneeze.',memory('A kettle with a window','Moss insists the kettle enjoyed its first boat ride. Nobody has asked how he knows.'),pick(3,4,4)),
      encounter('ferry-bell','The sleepy departure bell','clock','rook','The ferry only leaves when its clockwork markers reach their stars. Work out the clock’s movement to ring the departure bell. Rook has already marked our destination. On the back of the map.','Ding! The ferry stretches its flippers and carries the lantern tree away from the old shore. Ahead, a low reed waterway and a high ridge both lead toward the valley. Which way shall our story go?',memory('The first departure','The old shore grew small. Rook turned the map over. For once, the mountains were the right way up.'),pick(2,3,4))
    ]
  },
  {
    id:'branching-paths', title:'The branching paths', subtitle:'One caravan. Your way through.', scene:'marsh',
    description:'Both paths meet again at the wind shelter. Choose a place to explore and a new friend to help along the way.',
    camp:'The caravan reaches the wind shelter carrying a gift and a story from the path you chose.',
    encounters:[
      encounter('path-first','Luma’s missing deliveries','route','rook','Reed boats bob beside a maze of little bridges. Luma the boat keeper needs every marked road visited before she can open the waterway. Plan the courier’s whole journey.','The last delivery reaches its landing. Luma ties her boat to the caravan’s raft. “I thought you might be coming,” she says. “The reeds have been gossiping.”',memory('A friend in the reeds','We helped Luma visit every landing. Her reed boat will take us to the marsh lift.'),pick(2,3,4)),
      encounter('path-second','The floating seed house','latin','fern','Luma’s floating seed house has lost some of its labels. Fill the symbol garden so each row and column has one of each kind. Fern is taking notes for the lantern tree’s future garden.','Every seed has its place. Luma gives Fern a little packet for the valley. “Something to grow beside your tree.” Fern tucks it carefully into the pot.',memory('Luma’s seed packet','Seeds from the floating garden are traveling with our lantern tree.'),pick(2,3,4)),
      encounter('path-third','Lift a boat with a little water','jug','moss','The marsh lift needs a precisely measured amount of water. Its containers have no measuring marks: fill, pour, and empty according to the puzzle’s rules. Moss offers his kettle, then remembers the tea.','The water settles at just the right amount and the lift carries the caravan into the afternoon sun. Luma gives Pip a reed bell. “Ring it if the fog ever hides you. I know its voice.”',memory('Luma’s reed bell','Luma promised to listen for our little bell if the marsh fog returned.'),pick(1,2,4))
    ]
  },
  {
    id:'weather-turns', title:'When the wind changed', subtitle:'Hold the light. Find a shelter.', scene:'storm',
    description:'The two paths meet at an old wind shelter. Clouds are gathering over the crossing. Bea thinks the shelter’s warning lanterns can show everyone a safe way in.',
    camp:'The storm passes over two safe shelters. Three friends are on each bank. The lantern tree is safe with Fern; Moss has the kettle. Tomorrow, we will find one another.',
    encounters:[
      encounter('shelter-lanterns','Colors through the rain','color','bea','Travelers need to tell nearby shelter lanterns apart through the rain. Give connected lanterns different colors using the available palette. Bea steadies the sign while you work.','The shelter lights are clear even through the drizzle. Small travelers hurry inside, shaking water from their ears. Tumble lends out every blanket but one.',memory('The blanket shelter','The lights helped other travelers find cover. Tumble discovered that one blanket is warmer when shared.'),pick(2,3,5)),
      encounter('shelter-balance','The stubborn roof latch','weigh','moss','One of the latch’s pebbles has a different weight. Use the balance and its clues to identify it so Bea can repair the shelter roof. “No,” Moss tells Tumble, “you may not weigh the kettle.”','You identify the odd pebble. Bea repairs the latch, the roof closes, and the kettle finally boils. Everyone gets a warm cup while the wind rattles outside.',memory('The roof that held','A careful balance test let Bea repair the shelter. The roof held through the whole storm.'),pick(2,3,5)),
      encounter('storm-gate','One last opening','clock','bea','The crossing’s clockwork gate has jammed. Work out when its markers reach the stars so Bea can open the way into the last safe shelter. Fern is holding the tree very tightly.','The gate opens and everyone reaches shelter. Then the wind folds the crossing away! Pip, Bea, and Fern are safe on one bank; Moss, Rook, and Tumble are safe on the other. Across the water, a tiny kettle whistle answers Pip’s call.',memory('The answering whistle','The crossing folded in the wind, but a whistle told us our friends were safe on the far bank.'),pick(3,5,6))
    ]
  },
  {
    id:'across-the-fog', title:'A message across the mist', subtitle:'Two camps. One caravan.', scene:'lighthouse',
    description:'Pip, Bea, and Fern have found an old light room. Across the mist, Moss, Rook, and Tumble are looking for a sign. You will help both little groups find each other.',
    camp:'Six bowls sit around the fire again. Moss makes far too much tea. Nobody minds. Pip hangs the little light above the tree and falls asleep before saying he is not tired.',
    encounters:[
      encounter('mist-mirror','Pip’s borrowed beam','billiard','pip','Pip has found the lighthouse mirror room. Follow its reflected ray and solve the room’s delivery task to make a beam visible across the water. “It’s only a little light,” he says. “But it’s ours.”','The beam skips across the room and shines into the mist. Far away, Tumble spots it and waves both arms. Now we cross to the other camp to help them answer.',memory('Pip’s brave little beam','Pip carried the light into the empty lighthouse. Tumble saw it from the far bank.'),pick(2,3,5)),
      encounter('mist-message','The signal that means us','code','tumble','On the far bank, Rook has found the lantern signal’s test records. Work out the hidden pattern from the clues so Tumble can send the right reply. Moss is polishing the kettle in case it helps.','The reply flashes through the mist. Pip flashes back. “That means US!” shouts Tumble. The two groups follow the lights to the same landing and tumble into one enormous hug. Even the kettle is included.',memory('The enormous reunion','Our signal brought both camps to the same landing. All six friends—and one kettle—are together again.'),pick(2,4,6)),
      encounter('mist-crossing','A path for everyone','route','rook','Together again, the caravan must check the marked crossing roads before carrying the tree onward. Plan the courier route. This time, Rook asks Bea to check which way up he is holding the map.','The crossing is ready. The caravan walks into a clearing, and the mist opens below them. There it is: a sheltered green valley with room for a lantern tree.',memory('The valley in the mist','We checked the crossing together. Beyond it, the valley was real—and waiting for us.'),pick(3,4,5))
    ]
  },
  {
    id:'valley-preparations', title:'A place to put down roots', subtitle:'Home is something we make together.', scene:'valley',
    description:'The valley is sheltered, but the ground is untended and the old hearth has fallen apart. The caravan has reached a place. Now they will help make it a home.',
    camp:'A hearth, a seed bed, and a new neighbor. Fern puts the lantern tree beside the planting place. “Tomorrow,” she whispers. Its leaves glow a little brighter.',
    encounters:[
      encounter('valley-garden','Fern’s first garden','latin','fern','The garden markers show how the seed beds should be arranged: one of each symbol in every row and column. Complete the garden so Fern can plant food and flowers beside the tree.','Fern presses the first seeds into their places. Rook labels a tiny patch “future sandwiches.” Moss adds “please” underneath.',memory('The future sandwich patch','Our first seed beds are ready. Rook’s label remains optimistic.'),pick(3,4,5)),
      encounter('valley-hearth','A hearth for the kettle','tile','moss','Moss has found a dry place for the camp hearth. Cover its whole garden-shaped floor with the domino tiles, without gaps or overlaps. “The kettle would like to live here,” he says. “So would I.”','The last tile fits. Bea sets the kettle on the new hearth, and Tumble spreads the blankets around it. For the first time, nobody has to pack them away in the morning.',memory('A hearth of our own','We made a place for the kettle and the blankets. Moss has stopped calling it a campsite.'),pick(9,9,7)),
      encounter('valley-neighbor','A game at the garden gate','nim','rook','A shy valley neighbor has brought pebbles for a welcome game. Choose a winning opening using the puzzle’s take-away rules. Rook offers advice, then admits he would quite like to learn too.','The neighbor grins at your opening and pulls up another seat. Soon everyone is playing. When the stars appear, the neighbor shows Fern the softest planting spot in the valley.',memory('One more seat','A pebble game turned a shy neighbor into a friend. There is always room beside our hearth.'),pick(2,4,6))
    ]
  },
  {
    id:'last-lantern-tree', title:'The tree that found a home', subtitle:'Carry a little light far enough…', scene:'home',
    description:'A planting place is ready. The last living lantern tree needs its first drink, a safe arrival, and a ring of little lights to welcome it. Every friend has a part to play.',
    camp:'The lantern tree has taken root. Pip tends its lights, Moss keeps the kettle warm, Rook maps paths to new neighbors, Bea builds, Fern gardens, and Tumble makes room for visitors. The light you carried is a home.',
    encounters:[
      encounter('tree-water','The tree’s first drink','jug','fern','Fern knows the exact amount of water the little tree needs. Use the containers and their pouring rules to measure its first drink. Moss is keeping the tea water quite separate.','The measured water sinks into the soft ground. A pale root reaches out from the pot. “It knows,” whispers Fern. “I think it knows this is home.”',memory('The first new root','A careful drink woke the tree’s roots. Fern stayed to watch the very first one grow.'),pick(2,3,5)),
      encounter('tree-arrival','Make room for the roots','swap','tumble','The carrying cups have become a planting cradle. Exchange them into their marked places so Bea can lower the tree into its new bed. Tumble has saved that unnecessary spoon. It turns out to be a very good tiny shovel.','The cradle settles. Bea lowers the tree, Fern loosens its roots, and Tumble pats down the earth with the spoon. Moss brings a cup for every friend. Rook finally folds away the map.',memory('The useful spare spoon','Tumble’s spoon planted the last bit of earth around the tree. It was important after all.'),pick(12,10,9)),
      encounter('tree-lights','A whole valley of little lights','toggle','pip','The tree is planted. Set the welcome lanterns to their glowing pattern by working the paired wires. Pip climbs the lowest branch with his scarf trailing behind him. “I can see the dark just fine from here.”','The welcome lights glow—and the tree answers. Light travels from root to branch until the whole clearing shines. The six friends settle beneath it. The tree you carried across the islands has become the first lantern tree of a new home.',memory('The light we carried','We planted the lantern tree together. Its branches now light the valley for everyone who finds their way here.'),pick(3,5,6))
    ]
  }
];

const ridgeEncounters = [
  encounter('path-first','A light on the high path','billiard','pip','Bracken the ridge keeper has left a mirror signal to show the hidden mountain landing. Follow the reflected ray and solve its delivery task to locate the way up. Pip volunteers to carry the light.','The reflected beam finds the landing. Bracken waves from a doorway in the cliff. “Welcome! Mind the wind. It likes to borrow hats.” Bea holds hers firmly.',memory('The hidden ridge landing','We followed Bracken’s reflected signal to a doorway high above the clouds.'),pick(1,2,4)),
  encounter('path-second','Bracken’s wobbly lift','weigh','bea','The ridge lift needs its mismatched counterweight found. Use the balance and the clues to identify the odd pebble, so Bea and Bracken can set the lift right.','The odd pebble is found and the lift steadies. The lantern tree rides up beside Fern. Below them, the islands look like leaves floating in a blue bowl.',memory('The islands from above','We repaired Bracken’s lift and saw our whole journey spread out beneath us.'),pick(1,2,4)),
  encounter('path-third','Pebbles above the clouds','nim','rook','Bracken invites the caravan to a pebble game while the wind settles. Choose a winning opening using the take-away rules. “A thinking traveler,” says Bracken, “is very good company.”','Bracken laughs with delight at your opening. Before you leave, she gives Rook a small copper weather vane. “If the mist comes down, this will point to the sheltered crossing.” Rook pins it to the correct side of his map.',memory('Bracken’s copper weather vane','Bracken’s gift points toward shelter, even when the landmarks disappear.'),pick(1,3,4))
];

CHAPTERS.forEach((chapter, chapterIndex) => chapter.encounters.forEach(e => { e.chapterIndex = chapterIndex; }));
ridgeEncounters.forEach(e => { e.chapterIndex = 1; });
const encounterIds = CHAPTERS.flatMap(c => c.encounters.map(e => e.id));
const allCompanionIds = COMPANIONS.map(c => c.id);
const knownRoutes = new Set(ROUTES.map(r => r.id));

export const freshJourney = () => ({version:1,started:false,route:null,completed:[],bindings:{}});
export function ensureJourney(profile) {
  if (!Object.hasOwn(profile,'journey')) profile.journey = freshJourney();
  return profile.journey;
}

export function getEncounter(id, journey = freshJourney()) {
  let found = CHAPTERS.flatMap(c => c.encounters).find(e => e.id === id);
  if (!found) return null;
  if (found.chapterIndex === 1 && journey.route === 'ridge') found = ridgeEncounters.find(e => e.id === id);
  if (id === 'mist-crossing' && journey.route) {
    const callback = journey.route === 'reeds'
      ? 'Pip rings Luma’s reed bell. Out of the mist comes her little boat, carrying a lantern to mark the sheltered crossing.'
      : 'Rook’s copper weather vane turns toward the sheltered crossing. Bracken has left a fresh chalk arrow there, just as she promised.';
    return {...found,intro:`${callback} ${found.intro}`};
  }
  if (id === 'tree-lights' && journey.route) {
    const callback = journey.route === 'reeds'
      ? ' At the edge of the clearing, Luma rings an answering bell. The seeds she gave Fern are sprouting beside the tree.'
      : ' At the edge of the clearing, Bracken waves her hat. Her copper weather vane turns gently above the new hearth.';
    return {...found,success:found.success + callback};
  }
  return found;
}

function currentChapter(journey, index) {
  const chapter = CHAPTERS[index];
  if (index !== 1 || !journey.route) return chapter;
  const route = ROUTES.find(r => r.id === journey.route);
  return {...chapter,title:route.title,subtitle:route.subtitle,description:route.description,scene:route.scene,
    camp:journey.route === 'reeds' ? 'Luma’s bell hangs beside Pip’s scarf. Moss serves tea on the last dry landing, while Fern admires the seed packet tucked beside the tree.' : 'Above the clouds, everyone crowds into Bracken’s little shelter for tea. Rook’s copper weather vane catches the sunset.',
    encounters:chapter.encounters.map(e => getEncounter(e.id,journey))};
}

function sceneCaption(journey) {
  const captions = [
    'The old dock is dark, and six friends wait beside a tiny glowing tree.',
    'A sleepy ferry lifts its enormous head beside the lantern-lit dock.',
    'The luggage is aboard, with the kettle in a cradle and everyone waiting for the departure bell.',
    journey.route==='reeds' ? 'Luma’s boats bob beside the bridges of the whispering marsh.' : journey.route==='ridge' ? 'A mirror signal shines somewhere above the high path.' : 'From the ferry, the caravan can see a reed waterway and a high ridge.',
    journey.route==='ridge' ? 'Bracken welcomes the caravan to a doorway in the cliff beside her wobbly lift.' : 'The last delivery is safe, and Luma’s floating seed house waits just around the bend.',
    journey.route==='ridge' ? 'Above the clouds, Bracken sets out pebbles for a game before the caravan leaves.' : 'Fern has new seeds tucked beside the tree, and the marsh lift is waiting for its water.',
    'Clouds gather over the old wind shelter as the caravan arrives from the branching paths.',
    'The warning lanterns guide travelers inside, but the shelter’s roof still rattles in the wind.',
    'The roof is repaired and the tea is warm, but the clockwork crossing gate has jammed.',
    'Pip, Bea, and Fern shelter safely with the tree on one bank, with their three friends safe across the mist.',
    'Moss, Rook, and Tumble have spotted Pip’s little beam and are ready to send a reply.',
    'Six friends are together again at the landing, with one last misty crossing ahead.',
    'The caravan has reached the sheltered valley, where an untended garden waits beneath the stars.',
    'Fern’s seed beds are planted, and Moss has found a dry place to build a hearth.',
    'The kettle has a hearth of its own, and a shy neighbor waits at the garden gate with a pebble game.',
    'The garden and hearth are ready, and Fern is preparing the tree’s first drink.',
    'A pale new root reaches from the pot as the tree drinks its carefully measured water.',
    'The tree is planted, and six friends gather around it to light the welcome lanterns.',
    'The lantern tree lights a new home, with six friends and a warm kettle beneath its branches.'
  ];
  return captions[journey.completed.length];
}

export function getProgress(profile, puzzles) {
  const journey = profile.journey || freshJourney();
  const completedCount = journey.completed.length;
  const complete = completedCount === encounterIds.length;
  const chapterIndex = Math.min(Math.floor(completedCount/3), CHAPTERS.length-1);
  return {chapterIndex,chapter:currentChapter(journey,chapterIndex),sceneCaption:sceneCaption(journey),encounter:complete ? null : getEncounter(encounterIds[completedCount],journey),
    complete,needsRoute:completedCount === 3 && journey.route === null,completedCount,total:encounterIds.length,
    memories:journey.completed.map(id => {const e=getEncounter(id,journey);return {...e.keepsake,speaker:e.speaker};}),
    party:completedCount===9 ? ['pip','bea','fern'] : completedCount===10 ? ['moss','rook','tumble'] : [...allCompanionIds]};
}

export function puzzleForEncounter(encounter, profile, puzzles) {
  if (!encounter) return null;
  const bound = profile.journey?.bindings[encounter.id];
  if (bound) return puzzles.find(p => p.id === bound) || null;
  const number = encounter.selection[profile.band];
  return puzzles.find(p => p.mechanic === encounter.mechanic && (p.band === profile.band || p.band === 'all') && p.number === number) || null;
}

export function startJourney(profile) {
  const journey=ensureJourney(profile);
  journey.started=true;
  return journey;
}

export function chooseRoute(profile, route) {
  const journey = ensureJourney(profile);
  if (!journey.started || !knownRoutes.has(route) || journey.completed.length !== 3 || (journey.route && journey.route !== route)) return false;
  journey.route = route;
  return true;
}

export function beginEncounter(profile, puzzles, encounterId) {
  const journey = ensureJourney(profile), progress = getProgress(profile,puzzles);
  if (!journey.started) return null;
  const id = encounterId || progress.encounter?.id;
  if (!id || (!journey.completed.includes(id) && (progress.needsRoute || id !== progress.encounter?.id))) return null;
  const encounter = getEncounter(id,journey), puzzle=puzzleForEncounter(encounter,profile,puzzles);
  if (!puzzle) return null;
  journey.bindings[id]=puzzle.id;
  return {encounter,puzzle};
}

export function completeEncounter(profile, puzzleId, encounterId, puzzles) {
  const journey = ensureJourney(profile), progress=getProgress(profile,puzzles);
  if (!journey.started || progress.complete || progress.needsRoute || progress.encounter.id !== encounterId || journey.bindings[encounterId] !== puzzleId) return false;
  if (!profile.attempts[puzzleId]?.completed || !puzzles.some(p => p.id === puzzleId)) return false;
  journey.completed.push(encounterId);
  return true;
}

export function validateJourney(value, profile, puzzles) {
  const fail = () => {throw new Error('This caravan journey does not match the saved puzzles.');};
  if (!value || value.version!==1 || typeof value.started!=='boolean' || (value.route!==null && !knownRoutes.has(value.route)) || !Array.isArray(value.completed) || value.completed.length>encounterIds.length || !value.bindings || typeof value.bindings!=='object' || Array.isArray(value.bindings)) return fail();
  const count=value.completed.length;
  if (value.completed.some((id,i) => id!==encounterIds[i]) || (!value.started && (count || value.route || Object.keys(value.bindings).length)) || (count<3 && value.route!==null) || (count>3 && value.route===null)) return fail();
  const bindings={};
  const validBoundIds=new Set([...value.completed,...(count<encounterIds.length && !(count===3 && value.route===null) ? [encounterIds[count]] : [])]);
  for (const [id,puzzleId] of Object.entries(value.bindings)) {
    if (!validBoundIds.has(id) || typeof puzzleId!=='string') return fail();
    const encounter=getEncounter(id,value), puzzle=puzzles.find(p => p.id===puzzleId);
    // A saved binding may belong to an earlier band: changing the entry point
    // must never change a puzzle already opened or erase an earlier adventure.
    const expectedNumber=puzzle?.band==='all' ? Object.values(encounter.selection).includes(puzzle.number) : encounter.selection[puzzle?.band]===puzzle?.number;
    if (!puzzle || puzzle.mechanic!==encounter.mechanic || !expectedNumber || (value.completed.includes(id) && profile.attempts[puzzleId]?.completed!==true)) return fail();
    bindings[id]=puzzleId;
  }
  if (value.completed.some(id => !Object.hasOwn(bindings,id))) return fail();
  return {version:1,started:value.started,route:value.route,completed:[...value.completed],bindings};
}
