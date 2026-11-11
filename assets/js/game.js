/*
 * Surf & Nettoie — jeu de surf 3D de la Surfrider Foundation Sénégal.
 * Three.js (r160) uniquement, toute la géométrie est générée dans le code.
 */
import * as THREE from 'three';

const GAME_DURATION = 60; // secondes
const STORAGE_BEST = 'srsn-game-best-v1';
const STORAGE_SOUND = 'srsn-game-sound-v1';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
if (isTouch) document.body.classList.add('is-touch');

/* ------------------------------------------------------------------ */
/* Données                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Textes (FR par défaut, EN, WO)                                      */
/* ------------------------------------------------------------------ */
const I18N = {
  fr: {
    ui: {
      backSite: '← Retour au site', canvas: 'Jeu de surf en 3D', loading: 'Chargement de la vague…',
      title1: 'Surf', title2: 'Nettoie',
      subtitle: "Surfe les vagues de Dakar, enchaîne les figures et ramasse un maximum de déchets en 60 secondes pour rendre l'océan propre.",
      play: 'Jouer', titleHint: 'Mobile : glisse pour diriger · Ordinateur : flèches + Espace',
      step1: 'Étape 1 / 2', step2: 'Étape 2 / 2', chooseSurfer: 'Choisis ton surfeur', chooseSpot: 'Choisis ton spot',
      back: 'Retour', choose: 'Choisir', surfHere: 'Surfer ici', surfers: 'Surfeurs', spots: 'Spots',
      howTitle: 'Comment jouer',
      hSteer: 'Diriger', hSteerTouch: 'Glisse ton doigt à gauche / à droite.', hSteerKbd: 'Flèches ← → ou A / D.', hSteerTxt: 'À gauche, tu montes vers la lèvre de la vague.',
      hJump: 'Sauter', hJumpTouch: 'Glisse vers le haut ou bouton « Saut ».', hJumpKbd: 'Espace (ou ↑).', hJumpTxt: 'Saute depuis la lèvre pour aller plus haut !',
      hTricks: 'Figures', hTricksTxt: "Cutback, Aerial, 360 : elles ne rapportent des points qu'en l'air ou sur la lèvre. Varie-les !", hTricksKbd: '(touches 1, 2, 3)',
      hTrash: 'Déchets', hTrashTxt: "Ramasse bouteilles, sacs, canettes, filets, mégots et sachets d'eau : l'eau redevient turquoise.",
      hObst: 'Obstacles', hObstTxt: 'Évite rochers et pirogues (ou saute par-dessus). Une chute coupe ton combo.',
      hComboTxt: 'Enchaîne déchets et figures sans attendre pour multiplier tes points.',
      go: "C'est parti !", pause: 'Pause', resume: 'Reprendre', restart: 'Recommencer', changeSpot: 'Changer de spot',
      score: 'Score', time: 'Temps', combo: 'Combo', cleanMeter: 'Océan propre',
      hintDrag: 'Glisse ← → pour surfer · glisse vers le haut pour sauter', jump: 'Saut', space: 'Espace',
      soundOn: 'Activer le son', soundOff: 'Couper le son',
      didYouKnow: 'Le savais-tu ?', waterQuality: "Qualité de l'eau",
      tooLow: 'Trop bas !', tooLowSub: 'Saute ou monte sur la lèvre', bis: '(bis)',
      oceanClean: 'Océan propre !', wipeout: 'Wipeout !', comboLost: 'Combo perdu', over: 'Au-dessus !',
      inAir: "En l'air !", onLip: 'Sur la lèvre !', countGo: 'Surfe !', endPop: 'Fin de session !', pts: 'pts',
      hotspot: "Zone polluée repérée ! Ton œil d'experte la signale en jaune.", hotspotKicker: 'Analyse de Claire',
      wave: 'Vague', trash: 'Déchets', rocks: 'Rochers', pirogues: 'Pirogues', record: 'Record : ', newRecord: 'Nouveau record sur ce spot !',
      perk: 'Atout', sessionOver: 'Session terminée !', finalScore: 'Score final',
      rTricks: 'Figures', rClean: 'Nettoyage', rCount: 'Déchets ramassés', rKg: 'Poids estimé', rCombo: 'Meilleur combo',
      lesson: 'La leçon de la session', replay: 'Rejouer', discover: 'Découvrir les actions de la Surfrider Sénégal',
      waterNote: "Avant de te baigner, renseigne-toi sur la qualité de l'eau et évite la baignade dans les 48 h qui suivent une forte pluie.",
    },
    chars: {
      babacar: { role: 'Président', perk: 'Maître des figures', perkDesc: 'Figures +25 % de points.',
        bio: "Surfeur engagé, il a porté la voix du Sénégal à la Conférence des Nations Unies sur l'Océan (UNOC 3, Nice 2025) avec le film « The Human Side of Plastics »." },
      paulele: { role: 'Trésorière', perk: 'Bonne gestion', perkDesc: 'Ton combo met plus de temps à retomber.',
        bio: "Trésorière de l'association, elle veille à la bonne gestion des ressources pour que chaque action compte." },
      adama: { role: 'Secrétaire', perk: 'Organisateur', perkDesc: 'Aimant : ramasse les déchets de plus loin.',
        bio: "Secrétaire de l'association, il coordonne l'organisation et le suivi des actions." },
      claire: { role: 'Directrice générale, co-fondatrice', perk: "Experte qualité de l'eau", perkDesc: 'Repère les zones polluées et remplit plus vite le compteur « Océan propre ».',
        bio: "Co-fondatrice de l'association, elle pilote le programme « Qualité de l'eau » sur les plages de Dakar." },
    },
    spots: {
      ouakam: { time: "Fin d'après-midi", desc: 'Longue gauche de récif au pied de la Mosquée de la Divinité, pirogues sur la plage.' },
      secret: { time: 'Ciel voilé', desc: 'Pointe des Almadies : vague rapide et creuse qui casse près des roches volcaniques.' },
      virage: { time: 'Ciel couvert', desc: 'Beach break animé le long de la route de Ngor : écume, surfeurs, beaucoup de déchets.' },
      ngor: { time: 'Grand soleil', desc: "La célèbre droite de N'gor : longue, plus douce, embruns sur la lèvre." },
    },
    tricks: { cutback: 'Cutback', aerial: 'Aerial', spin: '360' },
    trash: { bouteille: 'Bouteille', sac: 'Sac plastique', canette: 'Canette', filet: 'Filet de pêche', megot: 'Mégot', sachet: "Sachet d'eau" },
    facts: {
      bouteille: [
        "Une bouteille en plastique peut mettre jusqu'à 450 ans à se dégrader dans l'océan.",
        'En se fragmentant, le plastique devient des microplastiques, avalés par les poissons… puis parfois par nous.',
        'Une gourde réutilisable remplace des centaines de bouteilles jetables chaque année.',
      ],
      sac: [
        'Les tortues marines confondent souvent les sacs plastiques avec des méduses, leur nourriture.',
        "Un sac plastique ne sert en moyenne que quelques minutes, mais peut rester des siècles dans la nature.",
        'Environ 80 % des déchets en mer viendraient de la terre : rues, rivières, égouts…',
      ],
      canette: [
        "Une canette en aluminium peut mettre jusqu'à 200 ans à se dégrader en mer… mais elle se recycle presque à l'infini.",
        "Chaque année, des millions de tonnes de plastique finissent dans l'océan.",
      ],
      filet: [
        'Les filets de pêche perdus, dits « filets fantômes », continuent de piéger poissons, tortues et oiseaux pendant des années.',
        'Les engins de pêche abandonnés font partie des déchets plastiques les plus dangereux pour la faune marine.',
      ],
      megot: [
        "Un seul mégot peut polluer jusqu'à 500 litres d'eau avec les substances toxiques qu'il contient.",
        "Le filtre d'une cigarette n'est pas en coton : c'est un plastique (acétate de cellulose).",
        'Les mégots font partie des déchets les plus ramassés lors des nettoyages de plages dans le monde.',
      ],
      sachet: [
        "Un sachet plastique met jusqu'à 450 ans à se dégrader.",
        "En 2020, le Sénégal a adopté une loi pour réduire les plastiques à usage unique, dont les sachets d'eau.",
        "Une gourde ou un bidon réutilisable évite des centaines de sachets d'eau par an.",
      ],
      water: [
        "La Surfrider Sénégal suit la qualité de l'eau de 6 sites à Dakar depuis 2023 grâce aux Saytoukat Géej (gardiens de la mer).",
        'Les E. coli et les entérocoques sont des bactéries qui indiquent une pollution par les eaux usées.',
        'Évite de te baigner dans les 48 h après une forte pluie : les eaux usées ruissellent vers la mer.',
        'Une eau polluée par les eaux usées peut provoquer otites, gastro-entérites ou infections de la peau.',
      ],
    },
    lessons: {
      bouteille: "Adopte une gourde : chaque bouteille évitée, c'est un déchet de moins sur nos plages.",
      sac: 'Dis non aux sacs plastiques : un sac réutilisable sert des centaines de fois.',
      canette: "Trie et recycle les canettes : l'aluminium se recycle presque à l'infini.",
      filet: 'Signale les filets abandonnés : ce sont des pièges mortels pour la faune marine.',
      megot: "Ne jette jamais ton mégot par terre : la pluie l'emporte jusqu'à la mer.",
      sachet: "Les sachets d'eau sont petits mais innombrables : préfère la gourde ou le bidon.",
      none: 'Chaque déchet compte : rejoins une opération de nettoyage de la Surfrider Sénégal !',
    },
  },

  en: {
    ui: {
      backSite: '← Back to site', canvas: '3D surf game', loading: 'Loading the wave…',
      title1: 'Surf', title2: 'Clean',
      subtitle: 'Surf the waves of Dakar, chain tricks and pick up as much trash as you can in 60 seconds to clean up the ocean.',
      play: 'Play', titleHint: 'Mobile: swipe to steer · Computer: arrow keys + Space',
      step1: 'Step 1 / 2', step2: 'Step 2 / 2', chooseSurfer: 'Choose your surfer', chooseSpot: 'Choose your spot',
      back: 'Back', choose: 'Choose', surfHere: 'Surf here', surfers: 'Surfers', spots: 'Spots',
      howTitle: 'How to play',
      hSteer: 'Steer', hSteerTouch: 'Slide your finger left / right.', hSteerKbd: 'Arrow keys ← → or A / D.', hSteerTxt: 'Go left to climb towards the lip of the wave.',
      hJump: 'Jump', hJumpTouch: 'Swipe up or tap “Jump”.', hJumpKbd: 'Space (or ↑).', hJumpTxt: 'Jump from the lip to fly higher!',
      hTricks: 'Tricks', hTricksTxt: 'Cutback, Aerial, 360: they only score in the air or on the lip. Mix them up!', hTricksKbd: '(keys 1, 2, 3)',
      hTrash: 'Trash', hTrashTxt: 'Pick up bottles, bags, cans, nets, cigarette butts and water sachets: the water turns turquoise again.',
      hObst: 'Obstacles', hObstTxt: 'Avoid rocks and pirogues (or jump over them). A wipeout breaks your combo.',
      hComboTxt: 'Chain trash and tricks quickly to multiply your points.',
      go: "Let's go!", pause: 'Pause', resume: 'Resume', restart: 'Restart', changeSpot: 'Change spot',
      score: 'Score', time: 'Time', combo: 'Combo', cleanMeter: 'Clean ocean',
      hintDrag: 'Swipe ← → to surf · swipe up to jump', jump: 'Jump', space: 'Space',
      soundOn: 'Turn sound on', soundOff: 'Mute sound',
      didYouKnow: 'Did you know?', waterQuality: 'Water quality',
      tooLow: 'Too low!', tooLowSub: 'Jump or ride up to the lip', bis: '(again)',
      oceanClean: 'Clean ocean!', wipeout: 'Wipeout!', comboLost: 'Combo lost', over: 'Cleared!',
      inAir: 'In the air!', onLip: 'On the lip!', countGo: 'Surf!', endPop: 'Session over!', pts: 'pts',
      hotspot: 'Pollution hotspot spotted! Your expert eye marks it in yellow.', hotspotKicker: "Claire's analysis",
      wave: 'Wave', trash: 'Trash', rocks: 'Rocks', pirogues: 'Pirogues', record: 'Best: ', newRecord: 'New record on this spot!',
      perk: 'Perk', sessionOver: 'Session over!', finalScore: 'Final score',
      rTricks: 'Tricks', rClean: 'Cleaning', rCount: 'Trash collected', rKg: 'Estimated weight', rCombo: 'Best combo',
      lesson: 'Lesson of the session', replay: 'Play again', discover: 'Discover Surfrider Senegal’s actions',
      waterNote: 'Before swimming, check the water quality and avoid swimming for 48 hours after heavy rain.',
    },
    chars: {
      babacar: { role: 'President', perk: 'Trick master', perkDesc: 'Tricks score +25%.',
        bio: 'A committed surfer, he carried Senegal’s voice to the UN Ocean Conference (UNOC 3, Nice 2025) with the film “The Human Side of Plastics”.' },
      paulele: { role: 'Treasurer', perk: 'Good management', perkDesc: 'Your combo takes longer to drop.',
        bio: 'Treasurer of the association, she makes sure resources are well managed so every action counts.' },
      adama: { role: 'Secretary', perk: 'Organiser', perkDesc: 'Magnet: picks up trash from further away.',
        bio: 'Secretary of the association, he coordinates the organisation and follow-up of actions.' },
      claire: { role: 'Executive director, co-founder', perk: 'Water quality expert', perkDesc: 'Spots pollution hotspots and fills the “Clean ocean” meter faster.',
        bio: 'Co-founder of the association, she leads the “Water quality” programme on Dakar’s beaches.' },
    },
    spots: {
      ouakam: { time: 'Late afternoon', desc: 'Long reef left below the Mosque of the Divinity, pirogues on the beach.' },
      secret: { time: 'Hazy sky', desc: 'Almadies point: a fast, hollow wave breaking close to volcanic rocks.' },
      virage: { time: 'Overcast', desc: 'Busy beach break along the Ngor road: foam, surfers and lots of trash.' },
      ngor: { time: 'Full sun', desc: 'The famous N’gor right: long, mellower, spray off the lip.' },
    },
    tricks: { cutback: 'Cutback', aerial: 'Aerial', spin: '360' },
    trash: { bouteille: 'Bottle', sac: 'Plastic bag', canette: 'Can', filet: 'Fishing net', megot: 'Cigarette butt', sachet: 'Water sachet' },
    facts: {
      bouteille: [
        'A plastic bottle can take up to 450 years to break down in the ocean.',
        'As it breaks apart, plastic becomes microplastics, eaten by fish… and sometimes by us.',
        'A reusable bottle replaces hundreds of throwaway bottles every year.',
      ],
      sac: [
        'Sea turtles often mistake plastic bags for jellyfish, their food.',
        'A plastic bag is used for just a few minutes on average, but can stay in nature for centuries.',
        'Around 80% of marine litter is thought to come from land: streets, rivers, sewers…',
      ],
      canette: [
        'An aluminium can may take up to 200 years to break down at sea… but it can be recycled almost endlessly.',
        'Every year, millions of tonnes of plastic end up in the ocean.',
      ],
      filet: [
        'Lost fishing nets, called “ghost nets”, keep trapping fish, turtles and birds for years.',
        'Abandoned fishing gear is among the most harmful plastic waste for marine life.',
      ],
      megot: [
        'A single cigarette butt can pollute up to 500 litres of water with the toxic substances it contains.',
        'A cigarette filter is not cotton: it is a plastic (cellulose acetate).',
        'Cigarette butts are among the items most often collected during beach clean-ups worldwide.',
      ],
      sachet: [
        'A plastic sachet can take up to 450 years to break down.',
        'In 2020, Senegal passed a law to reduce single-use plastics, including water sachets.',
        'A reusable bottle or jerrycan avoids hundreds of water sachets a year.',
      ],
      water: [
        'Surfrider Senegal has monitored water quality at 6 sites in Dakar since 2023 with the Saytoukat Géej (guardians of the sea).',
        'E. coli and enterococci are bacteria that indicate pollution from wastewater.',
        'Avoid swimming for 48 hours after heavy rain: wastewater runs off into the sea.',
        'Water polluted by sewage can cause ear infections, stomach bugs or skin infections.',
      ],
    },
    lessons: {
      bouteille: 'Switch to a reusable bottle: every bottle avoided is one less piece of trash on our beaches.',
      sac: 'Say no to plastic bags: a reusable bag can be used hundreds of times.',
      canette: 'Sort and recycle cans: aluminium can be recycled almost endlessly.',
      filet: 'Report abandoned nets: they are deadly traps for marine life.',
      megot: 'Never throw your cigarette butt on the ground: rain carries it to the sea.',
      sachet: 'Water sachets are small but countless: choose a reusable bottle or jerrycan.',
      none: 'Every piece of trash counts: join a Surfrider Senegal clean-up!',
    },
  },

  wo: {
    ui: {
      backSite: '← Dellu ci site bi', canvas: 'Fowu surf ci 3D', loading: 'Duus bi ngi ñëw…',
      title1: 'Surf', title2: 'Setal',
      subtitle: 'Surfeel ci duusi Ndakaaru, def ay figure te dajale mbalit mu bare ci 60 saa ngir setal géej gi.',
      play: 'Tambali', titleHint: 'Telefon : yëngal sa baaraam · Ordinatëer : fèlës yi + Espace',
      step1: 'Tappa 1 / 2', step2: 'Tappa 2 / 2', chooseSurfer: 'Tànn sa surfeur', chooseSpot: 'Tànn sa spot',
      back: 'Dellu', choose: 'Tànn', surfHere: 'Surfe fii', surfers: 'Surfeur yi', spots: 'Spot yi',
      howTitle: 'Naka lañuy fowe',
      hSteer: 'Jiite', hSteerTouch: 'Yëngal sa baaraam ci càmmooñ / ci ndijoor.', hSteerKbd: 'Fèlës ← → walla A / D.', hSteerTxt: 'Ci càmmooñ, dangay yéeg ci kaw duus bi.',
      hJump: 'Tëb', hJumpTouch: 'Yëngal sa baaraam jëm kaw walla bësal « Tëb ».', hJumpKbd: 'Espace (walla ↑).', hJumpTxt: 'Tëbal ci kaw duus bi ngir gën a kawe !',
      hTricks: 'Figure yi', hTricksTxt: 'Cutback, Aerial, 360 : ñoom dañuy indi poñ su fekkee ci jaww ji nga nekk walla ci kaw duus bi. Soppi leen !', hTricksKbd: '(butoŋ 1, 2, 3)',
      hTrash: 'Mbalit', hTrashTxt: 'Dajaleel butéel, saasu plastik, kanet, mbaal, mégot ak sachet ndox : ndox mi dina set.',
      hObst: 'Lu tere', hObstTxt: 'Moytul doj yi ak gaal yi (walla tëb ci seen kaw). Su nga daanoo, sa combo dina dakk.',
      hComboTxt: 'Dajaleel mbalit te def figure te bul xaar ngir yokk sa poñ.',
      go: 'Ñu dem !', pause: 'Taxaw', resume: 'Wéyal', restart: 'Tambaliwaat', changeSpot: 'Soppi spot',
      score: 'Poñ yi', time: 'Waxtu', combo: 'Combo', cleanMeter: 'Géej gu set',
      hintDrag: 'Yëngal ← → ngir surfe · jëm kaw ngir tëb', jump: 'Tëb', space: 'Espace',
      soundOn: 'Ubbi baat bi', soundOff: 'Fey baat bi',
      didYouKnow: 'Ndax xam nga ?', waterQuality: 'Ndox mu set',
      tooLow: 'Dafa suufe !', tooLowSub: 'Tëbal walla yéeg ci kaw duus bi', bis: '(ñaareel)',
      oceanClean: 'Géej gi set na !', wipeout: 'Daanu nga !', comboLost: 'Combo bi dakk na', over: 'Ci kaw !',
      inAir: 'Ci jaww ji !', onLip: 'Ci kaw duus bi !', countGo: 'Surfeel !', endPop: 'Jeex na !', pts: 'poñ',
      hotspot: 'Fii dafa tilim ! Sa bët bu xam-xam dafa ko wone ci mboq.', hotspotKicker: 'Xool bu Claire',
      wave: 'Duus', trash: 'Mbalit', rocks: 'Doj', pirogues: 'Gaal', record: 'Record : ', newRecord: 'Record bu bees ci spot bii !',
      perk: 'Mbiiru', sessionOver: 'Session bi jeex na !', finalScore: 'Poñ yi mujj',
      rTricks: 'Figure yi', rClean: 'Setal', rCount: 'Mbalit mi nga dajale', rKg: 'Diisaay (limu)', rCombo: 'Combo bi gën',
      lesson: 'Njàngat bi', replay: 'Fowaat', discover: 'Xam jëf yu Surfrider Senegaal',
      waterNote: 'Bala ngay sangu, seetal ndoxu géej gi te bul sangu 48 waxtu ginnaaw taw bu bare.',
    },
    chars: {
      babacar: { role: 'Njiit', perk: 'Boroom figure yi', perkDesc: 'Figure yi : +25 % poñ.',
        bio: 'Surfeur bu bokk ci mbir mi, mu yóbbu baatu Senegaal ca Ndajem Mbootaayu Xeet yi ci Géej (UNOC 3, Nice 2025) ak film « The Human Side of Plastics ».' },
      paulele: { role: 'Saytukatu xaalis', perk: 'Saytu bu baax', perkDesc: 'Sa combo day yàgg balaa muy wàññeeku.',
        bio: 'Saytukatu xaalisu mbootaay gi : day saytu alal ji ngir jëf yépp am njariñ.' },
      adama: { role: 'Sekreteer', perk: 'Organisateur', perkDesc: 'Aimant : day dajale mbalit mi ci sore.',
        bio: 'Sekreteeru mbootaay gi, mooy toppatoo organisation ak jëf yi.' },
      claire: { role: 'Njiitu liggéey, kenn ci ña sos mbootaay gi', perk: 'Xamkat ci ndox', perkDesc: 'Day gis fu tilim te day gën a gaaw feesal « Géej gu set ».',
        bio: 'Kenn ci ña sos mbootaay gi, mooy jiite programu « Qualité de l’eau » ci tefesi Ndakaaru.' },
    },
    spots: {
      ouakam: { time: 'Ngoon', desc: 'Duus bu yàgg ci wetu Jumaay Yàlla (Mosquée de la Divinité), gaal yi ci tefes bi.' },
      secret: { time: 'Asamaan bu xiin', desc: 'Pointe des Almadies : duus bu gaaw te xóot, mu toj ci wetu doj yu ñuul yi.' },
      virage: { time: 'Asamaan bu lëndëm', desc: 'Tefes bu ñu bare ci wetu yoonu Ngor : ëpp na mbalit.' },
      ngor: { time: 'Jant bu naaj', desc: 'Duusu ndijooru N’gor bu siiw : dafa yàgg te yomb.' },
    },
    tricks: { cutback: 'Cutback', aerial: 'Aerial', spin: '360' },
    trash: { bouteille: 'Butéel', sac: 'Saasu plastik', canette: 'Kanet', filet: 'Mbaal', megot: 'Mégot', sachet: 'Sachet ndox' },
    facts: {
      bouteille: [
        'Butéel plastik mën na des ba 450 at ci géej gi.',
        'Plastik bi dafay toj ba nekk ay ceeni tuuti (microplastiques) ; jën yi dañu koy lekk, nun itam.',
        'Gourde bu ñuy jëfandikoowaat dina wàññi téeméeri butéel at mu nekk.',
      ],
      sac: [
        'Tortue yi ci géej dañuy jàppe saasu plastik ni méduse, seen ñam.',
        'Saasu plastik, ay simili rekk lañu koy jëfandikoo, waaye mën na des ay téeméeri at.',
        'Lu tollu ci 80 % ci mbalit mi ci géej, ci kaw suuf lay jóge : mbedd yi, dex yi, egóo yi…',
      ],
      canette: [
        'Kanet aliminiyom mën na des ba 200 at ci géej, waaye mën nañu ko defaraat lu bare lool.',
        'At mu nekk, milyoŋi tonn plastik dañuy tàbbi ci géej.',
      ],
      filet: [
        'Mbaal yu réer ci géej dañuy wéy di jàpp jën, tortue ak picc ay at.',
        'Mbaal yi ñu bàyyi ci géej ñoo gën a lor mala yi ci géej.',
      ],
      megot: [
        'Benn mégot mën na tilimal ba 500 liitar ndox.',
        'Filtaru sigaret du koton : plastik la (acétate de cellulose).',
        'Mégot yi ñoo ëpp ci mbalit mi ñuy dajale ci tefes yi ci àddina bi.',
      ],
      sachet: [
        'Sachet plastik mën na des ba 450 at.',
        'Ci 2020, Senegaal def na yoon ngir wàññi plastik yi ñuy jëfandikoo benn yoon, ak sachet ndox yi.',
        'Gourde walla bidoŋ bu ñuy jëfandikoowaat dina wàññi téeméeri sachet ndox at mu nekk.',
      ],
      water: [
        'Surfrider Senegaal dafay saytu ndoxu 6 béreb ci Ndakaaru li dale 2023, ak Saytoukat Géej yi.',
        'E. coli ak entérocoques ay bakteri lañu yuy wone ne ndox mu tilim (eaux usées) dugg na ci géej gi.',
        'Bul sangu 48 waxtu ginnaaw taw bu bare : ndox mu tilim day wal jëm géej.',
        'Ndox mu tilim mën na indi feebaru nopp, biir ak der.',
      ],
    },
    lessons: {
      bouteille: 'Jëfandikool gourde : butéel bu nekk bu ñu moytu, mbalit la mu wàññi ci sunu tefes.',
      sac: 'Bañal saasu plastik : saas bu ñuy jëfandikoowaat mën na liggéey téeméeri yoon.',
      canette: 'Taqaleel kanet yi ngir ñu defaraat leen : aliminiyom mën nañu ko defaraat lu bare lool.',
      filet: 'Xamleel mbaal yi ñu bàyyi : ay fiir lañu ngir mala yi ci géej.',
      megot: 'Bul sànni sa mégot ci suuf : taw bi dina ko yóbbu ba ci géej.',
      sachet: 'Sachet ndox yi tuuti lañu waaye dañu bare : jëfandikool gourde walla bidoŋ.',
      none: 'Mbalit mu nekk am na solo : bokkal ci setal yi Surfrider Senegaal di def !',
    },
  },
};

const LANGS = ['wo', 'fr', 'en'];
let LANG = 'wo'; // langue par défaut du site
try { const l = localStorage.getItem('sf-lang'); if (LANGS.includes(l)) LANG = l; } catch (e) { /* ignore */ }
function L() { return I18N[LANG] || I18N.fr; }
function t(path) {
  const get = (root) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), root);
  const v = get(L());
  return v == null ? (get(I18N.fr) ?? path) : v;
}
const fmt = (n) => Math.round(n).toLocaleString(LANG === 'en' ? 'en-GB' : 'fr-FR');

const CHARACTERS = [
  // T-shirt Surfrider + board short pour tout le monde ; silhouettes stylisées, sans recherche de ressemblance
  { id: 'babacar', name: 'Babacar', skin: 0x4a2c1d, height: 1.17, hair: 'crop', shirt: 0xf4f4f2, shorts: 0x00853F, board: 0xFDEF42, stripe: 0xE31B23 },
  { id: 'paulele', name: 'Paulèle', skin: 0x5a3626, hair: 'hijab', scarf: 0x0f9b6c, shirt: 0x0072BC, longSleeves: true, shorts: 0xE31B23, longShorts: true, leggings: 0x0B1F33, board: 0xFDEF42, stripe: 0xffffff },
  { id: 'adama', name: 'Adama', skin: 0x4f3020, hair: 'dreads', shirt: 0x1d3557, shorts: 0xFDEF42, board: 0x0072BC, stripe: 0xFDEF42 },
  { id: 'claire', name: 'Claire', skin: 0xf1cdb0, hair: 'ponytail', hairColor: 0x5a3a22, shirt: 0xd8dde2, shorts: 0x0a8fd0, board: 0xffffff, stripe: 0x00853F },
];

const SPOTS = [
  {
    id: 'ouakam', name: 'Ouakam',
    waveH: 6.4, speed: 15, speedGain: 0.4, trashPer100: 6.5, obstPer100: 1.7, obstacle: 'rock',
    rockColor: 0x3a2c24, startClean: 0.1, wave: 3, trashLvl: 2, foam: 0.4, lipSpray: 0.2,
    sky: ['#2f74c0', '#a9cdea', '#f3e2c4'], sun: '#fff0d6', sunI: 2.3, sunDir: [-0.45, 0.5, -0.75], hemi: ['#d8e9ff', '#7a6a50'],
    sand: '#e2cfa8', land: '#b09a74', fog: '#e7e4da',
    water: ['#0a3f86', '#2a8fd0'],
    trashMix: { bouteille: 3, sac: 2, canette: 2, filet: 1, megot: 2, sachet: 2 },
  },
  {
    id: 'secret', name: 'Secret',
    waveH: 7.4, speed: 16.5, speedGain: 0.4, trashPer100: 5.5, obstPer100: 2.3, obstacle: 'rock',
    rockColor: 0x1c1a1a, startClean: 0.15, wave: 4, trashLvl: 1, foam: 0.3, lipSpray: 0.3,
    sky: ['#9fa9ae', '#c9c5b9', '#e4d9c5'], sun: '#fff4e0', sunI: 1.7, sunDir: [-0.3, 0.7, -0.6], hemi: ['#e6e2d8', '#5a5045'],
    sand: '#8f7d68', land: '#8a7556', fog: '#ddd3c2',
    water: ['#0b6a6a', '#3fd0b0'],
    trashMix: { bouteille: 3, sac: 2, canette: 2, filet: 2, megot: 2, sachet: 2 },
  },
  {
    id: 'virage', name: 'Virage',
    waveH: 4.9, speed: 13.5, speedGain: 0.35, trashPer100: 9.5, obstPer100: 1.4, obstacle: 'pirogue',
    startClean: 0, wave: 2, trashLvl: 3, foam: 1, lipSpray: 0,
    sky: ['#8c979f', '#b4bcc1', '#d4d6d3'], sun: '#f4f1ea', sunI: 1.4, sunDir: [0.4, 0.75, -0.5], hemi: ['#e4e8ea', '#8a8270'],
    sand: '#e6d3ae', land: '#c4b08a', fog: '#cfd2d0',
    water: ['#11707a', '#4fd6c0'],
    trashMix: { bouteille: 3, sac: 3, canette: 2, filet: 1, megot: 2, sachet: 4 },
  },
  {
    id: 'ngor', name: "N'gor",
    waveH: 5.6, speed: 14, speedGain: 0.25, trashPer100: 6.5, obstPer100: 0.9, obstacle: 'pirogue',
    startClean: 0.1, wave: 2, trashLvl: 2, foam: 0.7, lipSpray: 1,
    sky: ['#1f6fc4', '#7fb8e6', '#e0f0fb'], sun: '#fffaf0', sunI: 2.4, sunDir: [-0.35, 0.75, -0.55], hemi: ['#e6f3ff', '#6a5040'],
    sand: '#9a5a3a', land: '#8d5634', fog: '#d6eaf6',
    water: ['#0a4f9a', '#3ad6d0'],
    clouds: 14,
    trashMix: { bouteille: 3, sac: 2, canette: 2, filet: 2, megot: 2, sachet: 2 },
  },
];

const TRASH = {
  bouteille: { pts: 50, kg: 0.03 },
  sac: { pts: 60, kg: 0.01 },
  canette: { pts: 40, kg: 0.015 },
  filet: { pts: 120, kg: 1.2 },
  megot: { pts: 30, kg: 0.002 },
  sachet: { pts: 40, kg: 0.005 },
};

const TRICKS = {
  cutback: { pts: 100, dur: 0.5 },
  aerial: { pts: 200, dur: 0.6 },
  spin: { pts: 300, dur: 0.6 },
};

/* ------------------------------------------------------------------ */
/* Moteur 3D                                                           */
/* ------------------------------------------------------------------ */

const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 900);
scene.fog = new THREE.Fog(0xcfe9fb, 90, 380);

const hemi = new THREE.HemisphereLight(0xdfefff, 0x7a6a50, 1.1);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xffffff, 2);
scene.add(sunLight);
scene.add(sunLight.target);

// --- Géométries / matériaux partagés ---
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  cone8: new THREE.ConeGeometry(1, 1, 8),
  ico0: new THREE.IcosahedronGeometry(1, 0),
  ico1: new THREE.IcosahedronGeometry(1, 1),
  dodec: new THREE.DodecahedronGeometry(1, 0),
  hemi: new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  sphere: new THREE.SphereGeometry(1, 10, 6),
};
GEO.leaf = (() => {
  const g = new THREE.ConeGeometry(0.45, 3.2, 3);
  g.translate(0, 1.6, 0);
  g.rotateZ(-(Math.PI / 2 + 0.35));
  g.scale(1, 0.3, 1);
  return g;
})();
GEO.boardShape = (() => {
  const g = new THREE.SphereGeometry(1, 10, 5);
  g.scale(0.32, 0.06, 1.12);
  return g;
})();

const matCache = new Map();
function mat(color, opts) {
  const key = color + (opts ? JSON.stringify(opts) : '');
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: true }, opts || {}));
    matCache.set(key, m);
  }
  return m;
}
function mesh(geo, color, opts) { return new THREE.Mesh(geo, mat(color, opts)); }
function boxM(w, h, d, color) { const m = mesh(GEO.box, color); m.scale.set(w, h, d); return m; }

/* ---------------- Ciel ---------------- */
const skyGeo = new THREE.SphereGeometry(600, 24, 14);
skyGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
sky.renderOrder = -10;
scene.add(sky);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(26, 24), new THREE.MeshBasicMaterial({ color: 0xfff3d0, fog: false, depthWrite: false }));
sunDisc.renderOrder = -9;
scene.add(sunDisc);
const sunDirV = new THREE.Vector3(0, 1, 0);

function setSky(spot) {
  const top = new THREE.Color(spot.sky[0]), mid = new THREE.Color(spot.sky[1]), bot = new THREE.Color(spot.sky[2]);
  const pos = skyGeo.attributes.position, col = skyGeo.attributes.color, c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 600;
    if (y < 0.08) c.copy(bot);
    else if (y < 0.35) c.copy(bot).lerp(mid, (y - 0.08) / 0.27);
    else c.copy(mid).lerp(top, Math.min(1, (y - 0.35) / 0.5));
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
  sunDirV.set(spot.sunDir[0], spot.sunDir[1], spot.sunDir[2]).normalize();
  sunDisc.material.color.set(spot.sun);
  sunLight.color.set(spot.sun);
  sunLight.intensity = spot.sunI;
  sunLight.position.copy(sunDirV).multiplyScalar(100);
  hemi.color.set(spot.hemi[0]);
  hemi.groundColor.set(spot.hemi[1]);
  scene.fog.color.set(spot.fog);
  COL.cleanDeep.set(spot.water[0]);
  COL.cleanLight.set(spot.water[1]);
}

/* ---------------- Vague ---------------- */
const XL = -6;      // lèvre (crête)
const XT = 5;       // creux (pied de la vague)
const X_MIN = XL + 0.3;
const X_MAX = XT + 7;
const LIP_ZONE = XL + 1.9;
const WAVE_X0 = -34, WAVE_X1 = 30, WAVE_Z0 = -230, WAVE_Z1 = 30;
const WSX = 52, WSZ = 80;

const waveGeo = new THREE.PlaneGeometry(WAVE_X1 - WAVE_X0, WAVE_Z1 - WAVE_Z0, WSX, WSZ);
waveGeo.rotateX(-Math.PI / 2);
waveGeo.translate((WAVE_X0 + WAVE_X1) / 2, 0, (WAVE_Z0 + WAVE_Z1) / 2);
const wavePos = waveGeo.attributes.position;
const waveBase = new Float32Array(wavePos.count * 2);
for (let i = 0; i < wavePos.count; i++) {
  // densifie la grille autour de la face de la vague
  let x = wavePos.getX(i);
  const u = (x - WAVE_X0) / (WAVE_X1 - WAVE_X0);
  const center = (XL + XT) / 2;
  const t = u * 2 - 1; // -1..1
  const warped = Math.sign(t) * Math.pow(Math.abs(t), 1.35);
  x = center + warped * (t < 0 ? center - WAVE_X0 : WAVE_X1 - center);
  waveBase[i * 2] = x;
  waveBase[i * 2 + 1] = wavePos.getZ(i);
}
waveGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(wavePos.count * 3), 3));
const waveMesh = new THREE.Mesh(waveGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
waveMesh.frustumCulled = false;
scene.add(waveMesh);

// Lèvre qui déferle (bande de mousse en crochet)
const LIP_PROFILE = [[-0.7, -0.35], [-0.1, 0.2], [0.7, 0.35], [1.4, 0.05], [1.8, -0.55]];
const lipGeo = new THREE.BufferGeometry();
const lipCount = (WSZ + 1) * LIP_PROFILE.length;
lipGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lipCount * 3), 3));
{
  const idx = [];
  const P = LIP_PROFILE.length;
  for (let r = 0; r < WSZ; r++) {
    for (let k = 0; k < P - 1; k++) {
      const a = r * P + k, b = a + 1, c = a + P, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  lipGeo.setIndex(idx);
}
const lipMesh = new THREE.Mesh(lipGeo, new THREE.MeshLambertMaterial({ color: 0xf2fbff, flatShading: true, side: THREE.DoubleSide }));
lipMesh.frustumCulled = false;
scene.add(lipMesh);

// Océan au large
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: 0x1b8fb0 }));
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(-300, -0.45, -300);
scene.add(ocean);

// Plage / terre (statiques)
const sandMesh = new THREE.Mesh(new THREE.PlaneGeometry(70, 1400), new THREE.MeshLambertMaterial({ color: 0xead6b0 }));
sandMesh.rotation.x = -Math.PI / 2;
sandMesh.position.set(WAVE_X1 - 4 + 35, 0.25, -400);
scene.add(sandMesh);
const landMesh = new THREE.Mesh(new THREE.PlaneGeometry(900, 1400), new THREE.MeshLambertMaterial({ color: 0xc9b48a }));
landMesh.rotation.x = -Math.PI / 2;
landMesh.position.set(WAVE_X1 + 66 + 450, 0.5, -400);
scene.add(landMesh);

const COL = {
  murkyDeep: new THREE.Color('#465232'), murkyLight: new THREE.Color('#a39a5c'),
  cleanDeep: new THREE.Color('#0a5f8c'), cleanLight: new THREE.Color('#47e0d6'),
  foam: new THREE.Color('#f4fbff'),
};
const cDeep = new THREE.Color(), cLight = new THREE.Color(), cTmp = new THREE.Color();

const W = { H: 4, travel: 0, t: 0 };
function crestH(p) {
  return W.H * (1 + 0.12 * Math.sin(p * 0.045) + 0.06 * Math.sin(p * 0.11 + 1.3));
}
function profile(x, H) {
  if (x >= XT) return 0;
  if (x >= XL) { const s = (XT - x) / (XT - XL); return H * Math.pow(s, 2.3); }
  const d = (XL - x) / 6;
  return H * Math.exp(-d * d * 1.5);
}
function chop(x, p, t) {
  return 0.13 * Math.sin(x * 0.85 + t * 1.6 + p * 0.21) + 0.1 * Math.sin(p * 0.37 - t * 1.25 + x * 0.3);
}
function surfaceY(x, z) {
  const p = z - W.travel;
  return profile(x, crestH(p)) + chop(x, p, W.t);
}
function slopeAt(x, z) {
  return (surfaceY(x + 0.25, z) - surfaceY(x - 0.25, z)) / 0.5;
}

let waterClean = 0;
function updateWave() {
  const t = W.t, tr = W.travel;
  const foamLvl = S.spot.foam || 0;
  cDeep.copy(COL.murkyDeep).lerp(COL.cleanDeep, waterClean);
  cLight.copy(COL.murkyLight).lerp(COL.cleanLight, waterClean);
  ocean.material.color.copy(cDeep).lerp(cLight, 0.25);
  const pos = wavePos.array, col = waveGeo.attributes.color.array;
  const n = wavePos.count;
  for (let i = 0; i < n; i++) {
    const x = waveBase[i * 2], z = waveBase[i * 2 + 1];
    const p = z - tr;
    const H = crestH(p);
    const h = profile(x, H) + chop(x, p, t);
    pos[i * 3] = x;
    pos[i * 3 + 1] = h;
    pos[i * 3 + 2] = z;
    // couleur
    let r = Math.max(0, h) / H;
    if (x >= XL) cTmp.copy(cDeep).lerp(cLight, Math.min(1, Math.pow(r, 0.8) * 1.05));
    else cTmp.copy(cDeep).lerp(cLight, r * 0.5);
    if (x > XL - 1.2 && x < XL + 1.6 && r > 0.86) cTmp.lerp(COL.foam, 0.7);
    if (foamLvl && x > XT - 0.5 && x < XT + 14) {
      // lignes d'écume / mousse devant la vague
      const f = Math.sin(p * 0.21 + x * 0.7 + t * 0.5) + 0.6 * Math.sin(p * 0.07 - x * 1.3);
      const th = 1.25 - foamLvl * 0.55;
      if (f > th) cTmp.lerp(COL.foam, Math.min(0.5, (f - th) * 1.2) * clamp((-z - 4) / 26, 0, 1));
    }
    if (x > WAVE_X1 - 7) cTmp.lerp(COL.foam, Math.min(1, (x - (WAVE_X1 - 7)) / 6) * 0.6);
    col[i * 3] = cTmp.r; col[i * 3 + 1] = cTmp.g; col[i * 3 + 2] = cTmp.b;
  }
  wavePos.needsUpdate = true;
  waveGeo.attributes.color.needsUpdate = true;

  // lèvre
  const lp = lipGeo.attributes.position.array;
  const P = LIP_PROFILE.length;
  for (let r = 0; r <= WSZ; r++) {
    const z = WAVE_Z0 + (r / WSZ) * (WAVE_Z1 - WAVE_Z0);
    const p = z - tr;
    const H = crestH(p);
    const s = H / 5;
    const wob = 0.15 * Math.sin(p * 0.3 + t * 3);
    for (let k = 0; k < P; k++) {
      const j = (r * P + k) * 3;
      lp[j] = XL + LIP_PROFILE[k][0] * s + wob * (k / P);
      lp[j + 1] = H + LIP_PROFILE[k][1] * s + (k === 2 ? wob : 0);
      lp[j + 2] = z;
    }
  }
  lipGeo.attributes.position.needsUpdate = true;
}

/* ---------------- Écume (particules) ---------------- */
const SPRAY_N = 260;
const sprayGeo = new THREE.BufferGeometry();
const sprayPos = new Float32Array(SPRAY_N * 3);
const sprayVel = new Float32Array(SPRAY_N * 3);
const sprayLife = new Float32Array(SPRAY_N);
sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
for (let i = 0; i < SPRAY_N; i++) sprayPos[i * 3 + 1] = -100;
const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.9, depthWrite: false }));
spray.frustumCulled = false;
scene.add(spray);
let sprayIdx = 0;
function emitSpray(x, y, z, n, power) {
  for (let k = 0; k < n; k++) {
    const i = sprayIdx; sprayIdx = (sprayIdx + 1) % SPRAY_N;
    sprayPos[i * 3] = x + rand(-0.3, 0.3);
    sprayPos[i * 3 + 1] = y + rand(0, 0.3);
    sprayPos[i * 3 + 2] = z + rand(-0.4, 0.6);
    sprayVel[i * 3] = rand(-1, 1) * power;
    sprayVel[i * 3 + 1] = rand(1.5, 4) * power;
    sprayVel[i * 3 + 2] = rand(1, 4) * power;
    sprayLife[i] = rand(0.4, 0.8);
  }
}
// embruns soufflés par le vent de terre depuis la lèvre
function emitLipSpray(z) {
  const i = sprayIdx; sprayIdx = (sprayIdx + 1) % SPRAY_N;
  sprayPos[i * 3] = XL + rand(-0.3, 0.9);
  sprayPos[i * 3 + 1] = crestH(z - W.travel) + rand(0.1, 0.5);
  sprayPos[i * 3 + 2] = z;
  sprayVel[i * 3] = -rand(3, 7);
  sprayVel[i * 3 + 1] = rand(1, 3);
  sprayVel[i * 3 + 2] = rand(-0.5, 0.5);
  sprayLife[i] = rand(0.5, 0.9);
}
function updateSpray(dt, speed) {
  for (let i = 0; i < SPRAY_N; i++) {
    if (sprayLife[i] <= 0) continue;
    sprayLife[i] -= dt;
    sprayVel[i * 3 + 1] -= 12 * dt;
    sprayPos[i * 3] += sprayVel[i * 3] * dt;
    sprayPos[i * 3 + 1] += sprayVel[i * 3 + 1] * dt;
    sprayPos[i * 3 + 2] += (sprayVel[i * 3 + 2] + speed) * dt;
    if (sprayLife[i] <= 0) sprayPos[i * 3 + 1] = -100;
  }
  sprayGeo.attributes.position.needsUpdate = true;
}

/* ---------------- Surfeur ---------------- */
// Logo Surfrider (carré blanc arrondi + vague bleue qui s'enroule) dessiné en CanvasTexture
let logoMat = null;
function getLogoMat() {
  if (logoMat) return logoMat;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = 26;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(r, 4); g.arcTo(124, 4, 124, 124, r); g.arcTo(124, 124, 4, 124, r); g.arcTo(4, 124, 4, 4, r); g.arcTo(4, 4, 124, 4, r);
  g.closePath(); g.fill();
  g.strokeStyle = '#0072BC';
  g.lineCap = 'round';
  // spirale de la vague
  g.lineWidth = 11;
  g.beginPath();
  for (let i = 0; i <= 60; i++) {
    const a = Math.PI * 0.95 + i * 0.075;
    const rad = 44 - i * 0.55;
    const x = 68 + Math.cos(a) * rad, y = 64 + Math.sin(a) * rad;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  // lignes d'eau
  g.lineWidth = 8;
  for (const y of [100, 114]) {
    g.beginPath(); g.moveTo(20, y); g.quadraticCurveTo(64, y - 10, 108, y); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  logoMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true });
  return logoMat;
}

// Géométries arrondies partagées (mises en cache)
const geoCache = new Map();
function capsuleGeo(r, len) {
  const k = 'c' + r + '_' + len;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.CapsuleGeometry(r, len, 3, 10));
  return geoCache.get(k);
}
function sphereGeo(r, w = 14, h = 10) {
  const k = 's' + r + '_' + w;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.SphereGeometry(r, w, h));
  return geoCache.get(k);
}
const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
// membre (capsule) entre deux points
function limb(parent, a, b, r, color, smooth) {
  _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]);
  _d.subVectors(_b, _a);
  const len = Math.max(0.01, _d.length());
  const m = new THREE.Mesh(capsuleGeo(r, Math.round(len * 100) / 100), mat(color, smooth ? { flatShading: false } : null));
  m.position.addVectors(_a, _b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, _d.normalize());
  parent.add(m);
  return m;
}

const SMOOTH = { flatShading: false };
function buildSurfer(ch, lite) {
  const skin = ch.skin || 0x6b4430;
  const L = ch.height || 1; // facteur de taille (jambes / tronc)
  const root = new THREE.Group();
  const tilt = new THREE.Group(); root.add(tilt);
  const yaw = new THREE.Group(); tilt.add(yaw);
  const boardG = new THREE.Group(); yaw.add(boardG);
  const board = new THREE.Mesh(GEO.boardShape, mat(ch.board, SMOOTH)); board.position.y = 0.06; boardG.add(board);
  const stripe = boxM(0.05, 0.02, 1.9, ch.stripe); stripe.position.y = 0.115; boardG.add(stripe);
  const fin = boxM(0.04, 0.22, 0.25, 0x0B1F33); fin.position.set(0, -0.05, 0.85); boardG.add(fin);

  const rider = new THREE.Group(); rider.position.y = 0.1; yaw.add(rider);
  const hipY = 0.78 * L;
  const kneeY = 0.4 * L;
  const legs = [];
  if (!lite) {
    const shinCol = ch.leggings || skin;
    for (const s of [-1, 1]) {
      const foot = [0, 0.05, s * 0.4], knee = [-0.12, kneeY, s * 0.3], hip = [0, hipY, s * 0.13];
      legs.push(limb(rider, foot, knee, 0.065, shinCol, true));
      // short de surf : jusqu'au genou (ou plus long pour Paulèle)
      const kneeLow = [knee[0] * 0.9, knee[1] - (ch.longShorts ? 0.06 : -0.04), knee[2]];
      limb(rider, kneeLow, hip, 0.095, ch.shorts, true);
      const f = new THREE.Mesh(sphereGeo(0.06, 8, 6), mat(skin, SMOOTH)); f.scale.set(1, 0.6, 1.7); f.position.set(-0.04, 0.04, s * 0.4); rider.add(f);
    }
  }
  const torso = new THREE.Group(); torso.position.y = hipY; rider.add(torso);
  // bassin (short)
  const pelvis = new THREE.Mesh(sphereGeo(0.16), mat(ch.shorts, SMOOTH)); pelvis.scale.set(0.95, 0.8, 1.35); pelvis.position.y = 0.04; torso.add(pelvis);
  // tronc (T-shirt)
  const tl = 0.3 * L;
  const chest = new THREE.Mesh(capsuleGeo(0.16, Math.round(tl * 100) / 100), mat(ch.shirt, SMOOTH));
  chest.scale.set(0.85, 1, 1.32); chest.position.y = 0.12 + tl / 2 + 0.06; torso.add(chest);
  const topY = 0.12 + tl + 0.12;
  if (!lite) {
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), getLogoMat());
    logo.rotation.y = -Math.PI / 2; logo.position.set(-0.142, topY - 0.17, 0); torso.add(logo);
  }
  // cou + tête
  const neck = limb(torso, [0, topY - 0.02, 0], [-0.01, topY + 0.08, 0], 0.055, skin, true);
  const headY = topY + 0.21;
  const head = new THREE.Mesh(sphereGeo(0.135, 16, 12), mat(skin, SMOOTH)); head.scale.set(1, 1.12, 0.95); head.position.set(-0.02, headY, 0); torso.add(head);
  if (!lite) {
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(sphereGeo(0.018, 6, 4), mat(0x1a1410)); eye.position.set(-0.145, headY + 0.03, s * 0.045); torso.add(eye);
    }
    const nose = new THREE.Mesh(sphereGeo(0.022, 6, 4), mat(skin, SMOOTH)); nose.position.set(-0.155, headY - 0.01, 0); torso.add(nose);
  }
  // coiffure
  const hairCol = ch.hairColor || 0x16100c;
  const hairMat = mat(hairCol, SMOOTH);
  const capGeoKey = 'cap';
  if (!geoCache.has(capGeoKey)) geoCache.set(capGeoKey, new THREE.SphereGeometry(0.143, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42));
  const addCap = (sx = 1, sy = 1.12) => { const c = new THREE.Mesh(geoCache.get(capGeoKey), hairMat); c.scale.set(sx, sy, 0.95); c.position.set(-0.015, headY + 0.005, 0); c.rotation.z = 0.25; torso.add(c); return c; };
  if (ch.hair === 'crop') {
    addCap(0.99, 1.1);
  } else if (ch.hair === 'dreads') {
    addCap(1.02, 1.14);
    if (!lite) {
      for (let i = 0; i < 16; i++) {
        const th = 0.25 + (i % 3) * 0.33, ph = (i / 16) * Math.PI * 2;
        const dir = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
        if (dir[0] < -0.45 && th > 0.5) continue; // dégage le visage
        const base = [-0.015 + dir[0] * 0.13, headY + dir[1] * 0.14, dir[2] * 0.13];
        const tip = [base[0] + dir[0] * 0.09, base[1] + dir[1] * 0.06 - 0.03, base[2] + dir[2] * 0.09];
        limb(torso, base, tip, 0.022, hairCol, true);
      }
    }
  } else if (ch.hair === 'hijab') {
    // voile : couvre cheveux, oreilles et cou, visage dégagé
    const sc = mat(ch.scarf, { flatShading: false, side: THREE.DoubleSide });
    if (!geoCache.has('hijab')) geoCache.set('hijab', new THREE.SphereGeometry(0.158, 18, 12, 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.82));
    const veil = new THREE.Mesh(geoCache.get('hijab'), sc); veil.scale.set(1, 1.12, 1); veil.position.set(-0.01, headY + 0.01, 0); torso.add(veil);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.3), sc); top.scale.set(1, 1.12, 1); top.position.set(-0.01, headY + 0.01, 0); torso.add(top);
    const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, 0.26, 16, 1, true), sc); drape.position.set(0.0, topY + 0.02, 0); drape.scale.z = 1.2; torso.add(drape);
  } else if (ch.hair === 'ponytail') {
    addCap(1.03, 1.16);
    const back = new THREE.Mesh(sphereGeo(0.14, 12, 8), hairMat); back.scale.set(0.8, 1.05, 0.98); back.position.set(0.03, headY + 0.01, 0); torso.add(back);
    const bun = new THREE.Mesh(sphereGeo(0.06, 10, 8), hairMat); bun.position.set(0.15, headY + 0.03, 0); torso.add(bun);
    if (!lite) limb(torso, [0.17, headY + 0.01, 0], [0.24, headY - 0.17, 0], 0.035, hairCol, true);
  } else if (ch.hair === 'bun') {
    addCap();
    const bun = new THREE.Mesh(sphereGeo(0.07, 10, 8), hairMat); bun.position.set(0.13, headY + 0.1, 0); torso.add(bun);
  } else {
    addCap();
  }
  // bras
  const arms = [];
  const shY = topY - 0.08;
  const sleeveCol = ch.shirt;
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(0, shY, s * 0.2); torso.add(arm);
    // bras baissés et souples : coude légèrement plié vers l'avant
    const elbow = [0.04, -0.25, s * 0.15], wrist = [0.13, -0.46, s * 0.22];
    const sh = new THREE.Mesh(sphereGeo(0.075, 10, 8), mat(sleeveCol, SMOOTH)); arm.add(sh);
    if (ch.longSleeves) {
      limb(arm, [0, 0, 0], elbow, 0.055, sleeveCol, true);
      limb(arm, elbow, wrist, 0.047, sleeveCol, true);
    } else {
      const mid = [elbow[0] * 0.45, elbow[1] * 0.45, elbow[2] * 0.45];
      limb(arm, [0, 0, 0], mid, 0.062, sleeveCol, true);
      limb(arm, mid, elbow, 0.05, skin, true);
      limb(arm, elbow, wrist, 0.045, skin, true);
    }
    const hand = new THREE.Mesh(sphereGeo(0.05, 8, 6), mat(skin, SMOOTH)); hand.scale.set(0.8, 1, 1.2); hand.position.set(wrist[0] - 0.01, wrist[1] - 0.02, wrist[2] + s * 0.05); arm.add(hand);
    arm.rotation.x = s * -0.08;
    arms.push(arm);
  }
  torso.rotation.z = 0.25; // penché vers la vague
  root.userData = { tilt, yaw, boardG, rider, torso, arms, legs, neck };
  return root;
}

const shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
shadowBlob.rotation.x = -Math.PI / 2;
const shadowG = new THREE.Group();
shadowG.add(shadowBlob);
scene.add(shadowG);

let surfer = null;
function setSurfer(ch) {
  if (surfer) scene.remove(surfer);
  surfer = buildSurfer(ch);
  scene.add(surfer);
}

/* ---------------- Déchets ---------------- */
function buildTrash(type) {
  const g = new THREE.Group();
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -0.15; g.add(halo);
  const o = new THREE.Group(); g.add(o);
  switch (type) {
    case 'bouteille': {
      const b = mesh(GEO.cyl8, 0xbfe6f5, { transparent: true, opacity: 0.85 }); b.scale.set(0.2, 0.62, 0.2); o.add(b);
      const n = mesh(GEO.cone8, 0xbfe6f5, { transparent: true, opacity: 0.85 }); n.scale.set(0.2, 0.25, 0.2); n.position.y = 0.43; o.add(n);
      const c = mesh(GEO.cyl8, 0x0072BC); c.scale.set(0.08, 0.1, 0.08); c.position.y = 0.6; o.add(c);
      const l = mesh(GEO.cyl8, 0xE31B23); l.scale.set(0.21, 0.18, 0.21); o.add(l);
      o.rotation.z = Math.PI / 2;
      break;
    }
    case 'sac': {
      const s = mesh(GEO.ico0, 0xf7f7f2, { transparent: true, opacity: 0.88 }); s.scale.set(0.5, 0.25, 0.42); o.add(s);
      const h = mesh(GEO.ico0, 0xf7f7f2); h.scale.set(0.15, 0.2, 0.08); h.position.set(0.25, 0.15, 0); o.add(h);
      break;
    }
    case 'canette': {
      const b = mesh(GEO.cyl8, 0xE31B23); b.scale.set(0.16, 0.42, 0.16); o.add(b);
      const t = mesh(GEO.cyl8, 0xd0d4d8); t.scale.set(0.16, 0.04, 0.16); t.position.y = 0.23; o.add(t);
      o.rotation.z = Math.PI / 2; o.rotation.y = 0.6;
      break;
    }
    case 'filet': {
      const t1 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 4, 10), mat(0x2f9e6a)); t1.rotation.x = Math.PI / 2; o.add(t1);
      const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 4, 10), mat(0x2f9e6a)); t2.rotation.x = Math.PI / 2 + 0.6; t2.rotation.y = 0.8; o.add(t2);
      const t3 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 4, 8), mat(0x1f7a52)); t3.rotation.y = 1.2; o.add(t3);
      const cork = mesh(GEO.ico0, 0xFDEF42); cork.scale.setScalar(0.12); cork.position.set(0.5, 0.05, 0); o.add(cork);
      break;
    }
    case 'megot': {
      const b = mesh(GEO.cyl6, 0xf4f4f0); b.scale.set(0.08, 0.32, 0.08); o.add(b);
      const f = mesh(GEO.cyl6, 0xe0913a); f.scale.set(0.085, 0.16, 0.085); f.position.y = -0.22; o.add(f);
      o.rotation.z = Math.PI / 2; o.scale.setScalar(1.4);
      break;
    }
    case 'sachet': {
      const b = mesh(GEO.box, 0xd9f1ff, { transparent: true, opacity: 0.85 }); b.scale.set(0.55, 0.14, 0.38); o.add(b);
      const s = boxM(0.56, 0.15, 0.08, 0x0072BC); o.add(s);
      break;
    }
  }
  return g;
}

/* ---------------- Obstacles & décor ---------------- */
function buildRock(color) {
  const g = new THREE.Group();
  const r = rand(0.9, 1.4);
  const a = mesh(GEO.dodec, color); a.scale.set(r, r * rand(0.8, 1.2), r * rand(0.9, 1.3)); a.rotation.set(rand(0, 3), rand(0, 3), 0); g.add(a);
  const b = mesh(GEO.dodec, color); b.scale.setScalar(r * 0.55); b.position.set(r * 0.7, -0.2, r * 0.5); g.add(b);
  const foam = new THREE.Mesh(new THREE.RingGeometry(r * 1.0, r * 1.5, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = 0.05; g.add(foam);
  g.userData.r = r;
  return g;
}

const PIROGUE_SETS = [
  [0xE31B23, 0xFDEF42, 0x00853F], [0x0072BC, 0xFDEF42, 0xE31B23], [0x00853F, 0xffffff, 0x0072BC],
  [0xFDEF42, 0xE31B23, 0x0072BC], [0xffffff, 0x00853F, 0xE31B23],
];
function buildPirogue(set) {
  const c = set || pick(PIROGUE_SETS);
  const g = new THREE.Group();
  const L = 6.2, Wd = 1.25;
  const hull = boxM(Wd * 0.75, 0.4, L * 0.9, 0x4a3524); hull.position.y = 0.15; g.add(hull);
  const b1 = boxM(Wd, 0.26, L, c[0]); b1.position.y = 0.45; g.add(b1);
  const b2 = boxM(Wd * 1.05, 0.16, L * 0.96, c[1]); b2.position.y = 0.66; g.add(b2);
  const b3 = boxM(Wd * 1.07, 0.07, L * 0.92, c[2]); b3.position.y = 0.77; g.add(b3);
  for (const s of [-1, 1]) {
    const bow = mesh(GEO.cone4, c[0]); bow.scale.set(Wd * 0.62, 1.6, 0.55);
    bow.rotation.x = s * Math.PI / 2; bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.5, s * (L / 2 + 0.75)); g.add(bow);
    const prow = boxM(0.14, 0.9, 0.35, c[1]); prow.position.set(0, 0.95, s * (L / 2 + 0.9)); prow.rotation.x = -s * 0.5; g.add(prow);
  }
  const seat = boxM(Wd, 0.06, 0.25, 0x7a5a3a); seat.position.set(0, 0.7, 0.8); g.add(seat);
  return g;
}

function buildPalm(h) {
  const g = new THREE.Group();
  const segs = 4, lean = rand(0.08, 0.2);
  let x = 0, y = 0;
  for (let i = 0; i < segs; i++) {
    const sh = h / segs;
    const seg = mesh(GEO.cyl6, 0x8a6a45);
    const r = 0.24 - i * 0.03;
    seg.scale.set(r, sh * 1.05, r);
    const ang = lean * (i + 1) * 0.7;
    const dx = Math.sin(ang) * sh;
    seg.position.set(x + dx / 2, y + sh / 2, 0);
    seg.rotation.z = -ang;
    g.add(seg);
    x += dx; y += Math.cos(ang) * sh;
  }
  const crown = new THREE.Group(); crown.position.set(x, y, 0);
  for (let k = 0; k < 7; k++) {
    const leaf = new THREE.Mesh(GEO.leaf, mat(k % 2 ? 0x2f8a3a : 0x3fa64a));
    leaf.rotation.y = (k / 7) * Math.PI * 2 + rand(-0.2, 0.2);
    crown.add(leaf);
  }
  g.add(crown);
  g.rotation.y = rand(0, Math.PI * 2);
  return g;
}

function buildHouse(w, h, d, color, roof) {
  const g = new THREE.Group();
  const b = boxM(w, h, d, color); b.position.y = h / 2; g.add(b);
  const win = boxM(0.08, h * 0.25, d * 0.6, 0x23384d); win.position.set(-w / 2 - 0.02, h * 0.6, 0); g.add(win);
  if (roof === 'slope') {
    const r = mesh(GEO.cone4, pick([0xE31B23, 0x00853F, 0x0072BC, 0xFDEF42])); r.scale.set(Math.max(w, d) * 0.78, h * 0.5, Math.max(w, d) * 0.78);
    r.rotation.y = Math.PI / 4; r.position.y = h + h * 0.25; g.add(r);
  } else if (roof === 'dome') {
    const r = mesh(GEO.hemi, 0xffffff); r.scale.setScalar(Math.min(w, d) * 0.35); r.position.y = h; g.add(r);
  } else {
    const r = boxM(w * 1.04, 0.2, d * 1.04, 0xe9e2d4); r.position.y = h + 0.1; g.add(r);
  }
  return g;
}

function buildMosque() {
  // Mosquée de la Divinité : minarets carrés blancs, dômes bulbeux à bande rouge et calotte verte, arcs en ogive soulignés de rouge
  const g = new THREE.Group();
  const white = 0xf7f5ef, red = 0xc8262b, green = 0x1f8a4c;
  const base = boxM(11, 6, 20, white); base.position.y = 3; g.add(base);
  const upper = boxM(8, 2.4, 12, white); upper.position.y = 7.2; g.add(upper);
  const dome = mesh(GEO.sphere, white); dome.scale.set(3.6, 3.8, 3.6); dome.position.y = 9.4; g.add(dome);
  const dBand = mesh(GEO.cyl8, red); dBand.scale.set(3.3, 0.35, 3.3); dBand.position.y = 8.7; g.add(dBand);
  const dCap = mesh(GEO.cone8, green); dCap.scale.set(0.9, 1.6, 0.9); dCap.position.y = 13.6; g.add(dCap);
  // arcs en ogive côté mer (-x)
  for (let i = -3; i <= 3; i++) {
    const frame = boxM(0.15, 3.6, 2.1, red); frame.position.set(-5.56, 2.4, i * 2.6); g.add(frame);
    const inner = boxM(0.18, 3.1, 1.5, 0x3c4a52); inner.position.set(-5.6, 2.2, i * 2.6); g.add(inner);
    const tip = mesh(GEO.cone4, red); tip.scale.set(0.1, 0.9, 1.05); tip.position.set(-5.56, 4.65, i * 2.6); g.add(tip);
  }
  for (const s of [-1, 1]) {
    const m = new THREE.Group(); m.position.set(-3.8, 0, s * 11.5);
    const shaft = boxM(2, 22, 2, white); shaft.position.y = 11; m.add(shaft);
    for (const dz of [-0.45, 0.45]) {
      const st = boxM(0.06, 16, 0.18, dz < 0 ? red : green); st.position.set(-1.02, 12, dz); m.add(st);
    }
    const balc = boxM(2.6, 0.5, 2.6, white); balc.position.y = 22.2; m.add(balc);
    const bulb = mesh(GEO.sphere, white); bulb.scale.set(1.5, 1.9, 1.5); bulb.position.y = 24; m.add(bulb);
    for (let k = 0; k < 8; k++) {
      // bande en zigzag rouge
      const zz = mesh(GEO.cone4, red); zz.scale.set(0.28, 0.5, 0.28);
      const a = (k / 8) * Math.PI * 2;
      zz.position.set(Math.cos(a) * 1.42, 23.4 + (k % 2) * 0.35, Math.sin(a) * 1.42);
      zz.rotation.z = k % 2 ? Math.PI : 0;
      m.add(zz);
    }
    const cap = mesh(GEO.cone8, green); cap.scale.set(0.5, 1.4, 0.5); cap.position.y = 26.4; m.add(cap);
    g.add(m);
  }
  return g;
}

function buildHangar(len) {
  // halle du marché aux poissons : murs blancs, toit en tôle grise ondulée
  const g = new THREE.Group();
  const walls = boxM(7, 3, len, 0xeeeae2); walls.position.y = 1.5; g.add(walls);
  for (const s of [-1, 1]) {
    const roof = boxM(4.2, 0.18, len + 1, 0x8e959a); roof.position.set(s * 1.8, 3.7, 0); roof.rotation.z = -s * 0.32; g.add(roof);
    for (let k = -2; k <= 2; k++) {
      const rib = boxM(4.2, 0.24, 0.25, 0x6f767b); rib.position.set(s * 1.8, 3.75, k * len / 5); rib.rotation.z = -s * 0.32; g.add(rib);
    }
  }
  for (let k = -3; k <= 3; k++) { const door = boxM(0.1, 2, 1.6, 0x4a5a63); door.position.set(-3.52, 1, k * len / 7); g.add(door); }
  return g;
}

function buildBench() {
  const g = new THREE.Group();
  const wood = 0x8a5a32;
  const seat = boxM(0.6, 0.12, 2.4, wood); seat.position.y = 0.55; g.add(seat);
  const back = boxM(0.1, 0.5, 2.4, wood); back.position.set(0.3, 0.9, 0); g.add(back);
  for (const z of [-1, 1]) { const l = boxM(0.5, 0.55, 0.1, 0x5a3a20); l.position.set(0, 0.27, z); g.add(l); }
  return g;
}

function buildMonument() {
  // Monument de la Renaissance africaine, très stylisé (bronze)
  const g = new THREE.Group();
  const br = 0x5b4632;
  const ped = boxM(10, 4, 10, 0x9a8f7c); ped.position.y = 2; g.add(ped);
  const man = new THREE.Group(); man.position.set(0, 4, 1.5); g.add(man);
  for (const z of [-1, 1]) { const leg = boxM(1.6, 11, 1.6, br); leg.position.set(0, 5.5, z * 1.3); leg.rotation.x = z * 0.08; man.add(leg); }
  const torso = boxM(3, 9, 4.2, br); torso.position.y = 15.5; man.add(torso);
  const head = mesh(GEO.ico1, br); head.scale.setScalar(1.6); head.position.set(0, 21.5, 0); man.add(head);
  const arm = boxM(1.1, 9, 1.1, br); arm.position.set(-1, 23, -2.6); arm.rotation.x = 0.55; man.add(arm);
  const child = boxM(1.2, 4.5, 1.2, br); child.position.set(-1.6, 28.5, -5.2); child.rotation.x = 0.6; man.add(child);
  const ch = mesh(GEO.ico1, br); ch.scale.setScalar(0.8); ch.position.set(-1.8, 30.8, -6.5); man.add(ch);
  const wom = new THREE.Group(); wom.position.set(1.5, 4, -2.5); wom.rotation.x = -0.25; g.add(wom);
  const wl = boxM(2.6, 10, 2.6, br); wl.position.y = 5; wom.add(wl);
  const wt = boxM(2.4, 7, 3, br); wt.position.y = 13.5; wom.add(wt);
  const wh = mesh(GEO.ico1, br); wh.scale.setScalar(1.3); wh.position.y = 18; wom.add(wh);
  const wa = boxM(0.9, 7, 0.9, br); wa.position.set(0, 13, 3); wa.rotation.x = -1.0; wom.add(wa);
  return g;
}

function buildMamelles(withMonument) {
  const g = new THREE.Group();
  const h1 = mesh(GEO.hemi, 0x7d6a47); h1.scale.set(38, 24, 34); g.add(h1);
  const h2 = mesh(GEO.hemi, 0x857256); h2.scale.set(34, 19, 32); h2.position.set(10, 0, -70); g.add(h2);
  const lh = new THREE.Group(); lh.position.set(0, 23.5, 0);
  const tower = mesh(GEO.cyl8, 0xffffff); tower.scale.set(1.6, 7, 1.6); tower.position.y = 3.5; lh.add(tower);
  const lamp = mesh(GEO.cyl8, 0xffe9a0); lamp.scale.set(1.2, 1.4, 1.2); lamp.position.y = 7.6; lh.add(lamp);
  const cap = mesh(GEO.cone8, 0xE31B23); cap.scale.set(1.5, 1.5, 1.5); cap.position.y = 9; lh.add(cap);
  const house = boxM(5, 2.4, 6, 0xffffff); house.position.set(1, 1.2, 3); lh.add(house);
  g.add(lh);
  if (withMonument) { const m = buildMonument(); m.position.set(10, 18, -70); m.scale.setScalar(0.9); g.add(m); }
  return g;
}

function buildTower(w, h, d, color, glass) {
  const g = new THREE.Group();
  const b = boxM(w, h, d, color); b.position.y = h / 2; g.add(b);
  const floors = Math.min(6, Math.floor(h / 6));
  for (let k = 1; k <= floors; k++) {
    const slab = boxM(w + 0.3, 0.35, d + 0.3, glass ? 0xf2f4f5 : 0xb5532c);
    slab.position.y = (k / (floors + 1)) * h; g.add(slab);
  }
  if (glass) { const strip = boxM(0.1, h * 0.9, d * 0.7, 0x6fa3c8); strip.position.set(-w / 2 - 0.05, h / 2, 0); g.add(strip); }
  return g;
}

const NPC_COLORS = [0xE31B23, 0x00853F, 0xFDEF42, 0x0072BC, 0x222222, 0xf08a4b, 0xffffff];
function buildNpcSurfer() {
  const c = pick(NPC_COLORS);
  const s = buildSurfer({ shirt: c, shorts: 0x1b2a3a, skin: pick([0x4a2c1d, 0x6b4430, 0xc99a78]), board: pick([0xffffff, 0xFDEF42, 0x7fd0f0, 0xf2a7c0]), stripe: pick(NPC_COLORS), hair: Math.random() < 0.4 ? 'bun' : 'crop' }, true);
  const u = s.userData;
  u.rider.position.y = -0.5; // assis sur la planche, jambes dans l'eau
  u.torso.rotation.z = -0.1;
  u.yaw.rotation.y = rand(-1.5, 1.5);
  return s;
}

/* ---------------- Décor des spots ---------------- */
const sceneryGroup = new THREE.Group();
scene.add(sceneryGroup);
let props = []; // {obj, f (facteur de défilement), span, bob}

function addProp(obj, x, y, z, f, span, bob) {
  obj.position.set(x, y, z);
  sceneryGroup.add(obj);
  props.push({ obj, f, span, bob: bob ? { y, ph: rand(0, 6) } : null });
  return obj;
}

function buildScenery(spot) {
  sceneryGroup.clear();
  props = [];
  sandMesh.material.color.set(spot.sand);
  landMesh.material.color.set(spot.land);
  const SPAN = 340, Z0 = -290;
  const near = (n, fn) => { for (let i = 0; i < n; i++) fn(Z0 + (i / n) * SPAN + rand(-4, 4), i); };
  const boatsAtSea = (n) => near(n, (z) => { const p = buildPirogue(); p.rotation.y = rand(-0.6, 0.6); addProp(p, rand(-90, -45), -0.3, z * 1.5, 1, SPAN * 1.5, true); });

  if (spot.id === 'ouakam') {
    // petite plage avec pirogues, halle aux poissons, maisons blanches, arbres, falaises rouges en retrait
    near(12, (z) => { const p = buildPirogue(pick([[0x0072BC, 0xffffff, 0xE31B23], [0xffffff, 0x0072BC, 0xE31B23], [0xE31B23, 0xffffff, 0x0072BC]])); p.rotation.y = Math.PI / 2 + rand(-0.4, 0.4); addProp(p, rand(29, 40), 0.3, z, 1, SPAN); });
    near(3, (z) => addProp(buildHangar(rand(24, 34)), 47, 0.3, z, 1, SPAN));
    near(10, (z) => addProp(buildHouse(rand(4, 7), rand(3, 5), rand(4, 7), pick([0xffffff, 0xf4efe6, 0xece4d4]), 'flat'), rand(56, 68), 0.4, z, 1, SPAN));
    near(12, (z) => addProp(buildPalm(rand(5, 8)), rand(50, 62), 0.4, z, 1, SPAN));
    near(8, (z) => { const t = mesh(GEO.ico0, 0x3f8a3a); t.scale.set(rand(2, 3.5), rand(2, 3), rand(2, 3.5)); addProp(t, rand(52, 70), 2.2, z, 1, SPAN); });
    near(8, (z) => { const c = boxM(rand(10, 16), rand(10, 18), rand(16, 24), pick([0x9a4e2e, 0x8a4326, 0xa65a35])); addProp(c, rand(78, 90), c.scale.y / 2, z, 1, SPAN); });
    near(8, (z) => { const r = buildRock(0x3a2c24); r.scale.setScalar(rand(1, 1.8)); addProp(r, rand(25, 30), 0.1, z, 1, SPAN); });
    addProp(buildMosque(), 42, 0.3, -140, 0.12, 700);
    addProp(buildMamelles(false), 200, 0, -360, 0.05, 900);
    boatsAtSea(2);
  } else if (spot.id === 'secret') {
    // roches volcaniques noires dans l'eau peu profonde, colline avec le monument et le phare des Mamelles
    near(34, (z) => { const r = buildRock(0x1c1a1a); r.scale.setScalar(rand(1, 2.4)); addProp(r, rand(15, 40), 0, z, 1, SPAN); });
    near(14, (z) => {
      const h = buildHouse(rand(5, 10), rand(3.5, 7), rand(6, 11), pick([0xffffff, 0xf0e3cc, 0xe6d6b8, 0xdedad0]), 'flat');
      addProp(h, rand(56, 76), 0.4, z, 1, SPAN);
    });
    near(8, (z) => { const c = boxM(rand(8, 12), rand(5, 9), rand(14, 22), pick([0xa0532f, 0x8e4a2c])); addProp(c, rand(44, 50), c.scale.y / 2 - 1, z, 1, SPAN); });
    near(5, (z) => addProp(buildPalm(rand(5, 8)), rand(52, 60), 0.4, z, 1, SPAN));
    addProp(buildMamelles(true), 170, 0, -300, 0.06, 900);
  } else if (spot.id === 'virage') {
    // plage animée : parasols, cabanes, skyline d'immeubles, surfeurs à l'eau
    near(16, (z) => {
      const g = new THREE.Group();
      const pole = mesh(GEO.cyl6, 0xdddddd); pole.scale.set(0.06, 2.4, 0.06); pole.position.y = 1.2; g.add(pole);
      const top = mesh(GEO.cone8, pick([0xf07a1a, 0xFDEF42, 0xE31B23, 0xf5a623])); top.scale.set(1.5, 0.6, 1.5); top.position.y = 2.5; g.add(top);
      addProp(g, rand(32, 36), 0.3, z, 1, SPAN);
    });
    near(9, (z) => addProp(buildHouse(rand(3, 4.5), rand(2.4, 3.2), rand(3, 4.5), pick([0xc49a6c, 0xf2e3c6, 0x00853F, 0x0072BC]), 'slope'), rand(42, 48), 0.3, z, 1, SPAN));
    near(6, (z) => { const p = buildPirogue(); p.rotation.y = Math.PI / 2 + rand(-0.3, 0.3); addProp(p, rand(28, 31), 0.3, z, 1, SPAN); });
    near(1, () => { const road = boxM(8, 0.12, SPAN * 3, 0x55565a); addProp(road, 56, 0.52, -300, 0, 0); });
    near(16, (z) => {
      const glass = Math.random() < 0.45;
      const t = buildTower(rand(8, 13), rand(22, 42), rand(9, 14), glass ? pick([0xeef3f6, 0xcfe0ea]) : pick([0xd9773f, 0xc8642e, 0xe39a5a, 0xb85a33]), glass);
      addProp(t, rand(64, 90), 0.4, z, 0.8, SPAN);
    });
    near(10, (z) => addProp(buildNpcSurfer(), rand(15, 24), -0.05, z, 1, SPAN, true));
  } else if (spot.id === 'ngor') {
    // pointe de latérite rouge, dalles volcaniques sombres, herbe, banc ; village coloré en retrait
    near(12, (z) => { const c = boxM(rand(8, 14), rand(2.5, 4.5), rand(12, 20), pick([0x9a4a2a, 0xa65530, 0x8a3f22])); c.rotation.y = rand(-0.2, 0.2); addProp(c, rand(36, 44), c.scale.y / 2 - 0.4, z, 1, SPAN); });
    near(22, (z) => { const r = mesh(GEO.dodec, pick([0x221e1c, 0x2e2824])); r.scale.set(rand(2, 4), rand(0.4, 0.8), rand(2, 4)); r.rotation.y = rand(0, 3); addProp(r, rand(25, 33), 0.1, z, 1, SPAN); });
    near(10, (z) => { const gr = boxM(rand(5, 9), 0.3, rand(6, 10), 0x6d9a3a); addProp(gr, rand(42, 50), 4.2, z, 1, SPAN); });
    near(3, (z) => {
      const g = new THREE.Group();
      const blk = boxM(7, 3.8, 9, 0x9a4a2a); blk.position.y = 1.5; g.add(blk);
      const grass = boxM(5, 0.25, 7, 0x6d9a3a); grass.position.set(1, 3.5, 0); g.add(grass);
      const b = buildBench(); b.position.set(-1.8, 3.4, 0); g.add(b);
      addProp(g, 37, 0, z + 6, 1, SPAN);
    });
    near(10, (z) => addProp(buildHouse(rand(3.5, 6), rand(3, 6), rand(3.5, 6), pick([0xE31B23, 0xFDEF42, 0x0072BC, 0xf08a4b, 0xf2a7c0, 0x00853F, 0xffffff]), Math.random() < 0.2 ? 'dome' : 'flat'), rand(56, 72), 0.4, z, 1, SPAN));
    near(10, (z) => addProp(buildPalm(rand(5, 9)), rand(50, 70), 0.4, z, 1, SPAN));
    boatsAtSea(3);
  }
  // nuages
  const nClouds = spot.clouds || 8;
  for (let i = 0; i < nClouds; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const p = new THREE.Mesh(GEO.ico1, mat(0xffffff, { transparent: true, opacity: 0.92 }));
      p.scale.set(rand(6, 11), rand(3, 5), rand(6, 10)); p.position.set(k * 8 - 12, rand(-1, 2), rand(-3, 3));
      c.add(p);
    }
    addProp(c, rand(-200, 220), rand(55, 85), rand(-420, -60), 0.04, 600);
  }
}

function updateProps(dt, speed) {
  for (const pr of props) {
    if (!pr.f) continue;
    pr.obj.position.z += speed * pr.f * dt;
    if (pr.obj.position.z > 60) pr.obj.position.z -= pr.span;
    if (pr.bob) pr.obj.position.y = pr.bob.y + Math.sin(W.t * 1.6 + pr.bob.ph) * 0.18;
  }
}

/* ------------------------------------------------------------------ */
/* Son (WebAudio, désactivé par défaut)                                */
/* ------------------------------------------------------------------ */
const Sound = {
  enabled: false, ctx: null, master: null, ambient: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // bruit de vagues
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = this.ctx.createGain(); g.gain.value = 0.12;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.15;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.06;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(); lfo.start();
  },
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) { this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    else if (this.ctx) this.ctx.suspend();
    try { localStorage.setItem(STORAGE_SOUND, this.enabled ? '1' : '0'); } catch (e) { /* ignore */ }
    return this.enabled;
  },
  tone(freq, dur, type = 'sine', vol = 0.25, slide = 0) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, freq, vol = 0.3) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(freq * 2.5, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  },
  collect() { this.tone(660, 0.12, 'triangle', 0.2, 400); },
  trick() { this.noise(0.35, 700, 0.35); this.tone(440, 0.25, 'square', 0.06, 440); },
  wipe() { this.noise(0.6, 180, 0.5); this.tone(160, 0.4, 'sawtooth', 0.08, -100); },
  jump() { this.noise(0.2, 1200, 0.2); },
  tick() { this.tone(880, 0.08, 'sine', 0.15); },
  end() { this.tone(523, 0.18, 'triangle', 0.2); setTimeout(() => this.tone(784, 0.3, 'triangle', 0.2), 160); },
};

/* ------------------------------------------------------------------ */
/* État du jeu                                                         */
/* ------------------------------------------------------------------ */
const S = {
  mode: 'loading',
  spot: SPOTS[0], char: CHARACTERS[0],
  speed: 12, time: GAME_DURATION, elapsed: 0,
  x: 2, vx: 0, h: 0, vy: 0, air: false, onLip: false,
  steer: 0, touchTarget: null,
  score: 0, trickPts: 0, cleanPts: 0, count: 0, kg: 0, collected: {},
  chain: 0, comboT: 0, mult: 1, bestMult: 1,
  clean: 0, cleanBonusDone: false,
  wipe: 0, invuln: 0,
  trick: null, trickT: 0, lastTrick: null,
  items: [], obstacles: [], rings: [],
  nextTrash: 0, nextObst: 0, nextHotspot: 0,
  factIdx: {}, lastFactAt: -99, waterFactI: 0,
  menuT: 0,
};

let best = {};
try { best = JSON.parse(localStorage.getItem(STORAGE_BEST) || '{}') || {}; } catch (e) { best = {}; }
function saveBest() { try { localStorage.setItem(STORAGE_BEST, JSON.stringify(best)); } catch (e) { /* ignore */ } }

function applySpot(spot) {
  S.spot = spot;
  W.H = spot.waveH;
  setSky(spot);
  buildScenery(spot);
  waterClean = spot.startClean;
}

function clearEntities() {
  for (const it of S.items) scene.remove(it.obj);
  for (const o of S.obstacles) scene.remove(o.obj);
  for (const r of S.rings) scene.remove(r.obj);
  S.items = []; S.obstacles = []; S.rings = [];
}

function resetRun() {
  clearEntities();
  Object.assign(S, {
    speed: S.spot.speed, time: GAME_DURATION, elapsed: 0,
    x: 2, vx: 0, h: 0, vy: 0, air: false, onLip: false, steer: 0, touchTarget: null,
    score: 0, trickPts: 0, cleanPts: 0, count: 0, kg: 0, collected: {},
    chain: 0, comboT: 0, mult: 1, bestMult: 1,
    clean: S.spot.startClean, cleanBonusDone: false,
    wipe: 0, invuln: 0, trick: null, trickT: 0, lastTrick: null,
    lastFactAt: -99, lastLaunch: -99,
  });
  keys.left = keys.right = false;
  waterClean = S.clean;
  W.travel = 0;
  S.nextTrash = 0; S.nextObst = 40; S.nextHotspot = 90;
  // pré-remplissage devant le surfeur
  for (let z = -30; z > -170; z -= 100 / S.spot.trashPer100) spawnTrash(z);
  for (let z = -70; z > -170; z -= 100 / S.spot.obstPer100) spawnObstacle(z);
  S.nextTrash = gap(S.spot.trashPer100);
  S.nextObst = gap(S.spot.obstPer100);
  updateHud(true);
}

const SPAWN_Z = -175;
function gap(per100) { return (100 / per100) * rand(0.6, 1.4); }

function weightedType(mix) {
  let total = 0;
  for (const k in mix) total += mix[k];
  let r = Math.random() * total;
  for (const k in mix) { r -= mix[k]; if (r <= 0) return k; }
  return 'bouteille';
}

function blockedByObstacle(x, z) {
  for (const o of S.obstacles) {
    if (Math.abs(o.p + W.travel - z) < 7 && Math.abs(o.x - x) < 3) return true;
  }
  return false;
}

function spawnTrash(z, x, type) {
  type = type || weightedType(S.spot.trashMix);
  if (x === undefined) x = Math.random() < 0.25 ? rand(XL + 0.4, LIP_ZONE) : rand(XL + 1.5, XT + 5);
  if (blockedByObstacle(x, z)) return null;
  const obj = buildTrash(type);
  obj.rotation.y = rand(0, Math.PI * 2);
  scene.add(obj);
  const it = { obj, type, x, p: z - W.travel, spin: rand(-1.2, 1.2), bob: rand(0, 6) };
  S.items.push(it);
  return it;
}

function spawnHotspot() {
  const cx = rand(XL + 3, XT + 2);
  const z = SPAWN_Z;
  const n = 6 + Math.floor(Math.random() * 3);
  const type = weightedType(S.spot.trashMix);
  for (let i = 0; i < n; i++) spawnTrash(z + rand(-7, 7), clamp(cx + rand(-2.4, 2.4), X_MIN + 0.2, X_MAX - 0.5), Math.random() < 0.6 ? type : undefined);
  if (S.char.id === 'claire') {
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.4, 28), new THREE.MeshBasicMaterial({ color: 0xFDEF42, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.scale.set(1, 2.2, 1);
    scene.add(ring);
    S.rings.push({ obj: ring, x: cx, p: z - W.travel });
    showFact(t('ui.hotspot'), t('ui.hotspotKicker'));
  }
}

function spawnObstacle(z) {
  const type = S.spot.obstacle;
  let obj, x, rad, top, halfZ;
  if (type === 'rock') {
    obj = buildRock(S.spot.rockColor);
    x = rand(XL + 2, XT + 4);
    rad = obj.userData.r * 0.9; top = obj.userData.r * 0.9; halfZ = rad;
  } else {
    obj = buildPirogue();
    x = rand(XT - 4, XT + 6);
    obj.rotation.y = rand(-0.25, 0.25);
    rad = 0.9; top = 1.0; halfZ = 3.4;
  }
  scene.add(obj);
  S.obstacles.push({ obj, type, x, p: z - W.travel, rad, top, halfZ, passed: false });
}

/* ------------------------------------------------------------------ */
/* Entrées                                                             */
/* ------------------------------------------------------------------ */
const keys = { left: false, right: false };

window.addEventListener('keydown', (e) => {
  const k = e.code;
  if (S.mode === 'play' || S.mode === 'countdown') {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(k)) e.preventDefault();
  }
  if (S.mode === 'play') {
    if (k === 'ArrowLeft' || k === 'KeyA' || k === 'KeyQ') keys.left = true;
    else if (k === 'ArrowRight' || k === 'KeyD') keys.right = true;
    else if (!e.repeat && (k === 'Space' || k === 'ArrowUp' || k === 'KeyW' || k === 'KeyZ')) jump();
    else if (!e.repeat && (k === 'Digit1' || k === 'Numpad1')) doTrick('cutback');
    else if (!e.repeat && (k === 'Digit2' || k === 'Numpad2')) doTrick('aerial');
    else if (!e.repeat && (k === 'Digit3' || k === 'Numpad3')) doTrick('spin');
    else if (k === 'Escape' || k === 'KeyP') pauseGame();
  } else if (S.mode === 'paused' && (k === 'Escape' || k === 'KeyP')) {
    resumeGame();
  }
});
window.addEventListener('keyup', (e) => {
  const k = e.code;
  if (k === 'ArrowLeft' || k === 'KeyA' || k === 'KeyQ') keys.left = false;
  else if (k === 'ArrowRight' || k === 'KeyD') keys.right = false;
});
window.addEventListener('blur', () => { keys.left = keys.right = false; });

const touch = { id: null, sx: 0, sy: 0, sxSurfer: 0, ly: 0, lt: 0, jumped: false, upStartY: 0 };
canvas.addEventListener('pointerdown', (e) => {
  if (S.mode !== 'play') return;
  e.preventDefault();
  touch.id = e.pointerId;
  touch.sx = e.clientX; touch.sy = e.clientY;
  touch.sxSurfer = S.x;
  touch.ly = e.clientY; touch.lt = performance.now(); touch.upStartY = e.clientY;
  touch.jumped = false;
  S.touchTarget = S.x;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  hideHint();
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== touch.id || S.mode !== 'play') return;
  const w = Math.max(320, window.innerWidth);
  const dx = e.clientX - touch.sx;
  S.touchTarget = clamp(touch.sxSurfer + dx * ((X_MAX - X_MIN) / (w * 0.7)), X_MIN, X_MAX);
  // swipe vers le haut = saut
  const now = performance.now();
  const dy = e.clientY - touch.ly;
  const dt = Math.max(1, now - touch.lt);
  if (dy > 2) touch.upStartY = e.clientY; // on redescend : on réinitialise
  if (!touch.jumped && (touch.upStartY - e.clientY) > 40 && dy / dt < -0.35) {
    touch.jumped = true;
    jump();
  }
  touch.ly = e.clientY; touch.lt = now;
});
function endTouch(e) {
  if (e.pointerId !== touch.id) return;
  touch.id = null;
  S.touchTarget = null;
}
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function bindHold(btn, fn) {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btn.classList.add('is-pressed');
    fn();
  });
  const up = () => btn.classList.remove('is-pressed');
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointerleave', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fn(); } });
}
bindHold($('#btn-jump'), () => { if (S.mode === 'play') jump(); });
for (const b of $$('.ctl-trick')) bindHold(b, () => { if (S.mode === 'play') doTrick(b.dataset.trick); });

let hintTimer = 0;
function hideHint() { $('#hint-drag').classList.add('is-hidden'); }

/* ------------------------------------------------------------------ */
/* Gameplay                                                            */
/* ------------------------------------------------------------------ */
function jump(boost) {
  if (S.air || S.wipe > 0) return false;
  S.air = true;
  S.vy = boost || (S.onLip ? 10.5 : 8);
  Sound.jump();
  if (surfer) emitSpray(S.x, surfaceY(S.x, 0), 0, 14, 1.1);
  return true;
}

function comboWindow() { return S.char.id === 'paulele' ? 5 : 3; }

function addChain() {
  S.chain++;
  S.comboT = comboWindow();
  S.mult = Math.min(5, 1 + Math.floor(S.chain / 3) * 0.5);
  if (S.mult > S.bestMult) S.bestMult = S.mult;
}

function doTrick(id) {
  if (S.wipe > 0) return;
  if (S.trick) return; // une figure à la fois
  const tr = TRICKS[id];
  let valid = S.air || S.onLip;
  if (id === 'aerial' && !S.air) {
    if (S.onLip) { jump(11.5); valid = true; } else valid = false;
  }
  S.trick = id; S.trickT = 0;
  if (!valid) {
    popTrick(t('ui.tooLow'), t('ui.tooLowSub'), 'is-bad');
    S.trick = id; // l'animation se joue quand même
    return;
  }
  Sound.trick();
  let pts = tr.pts * S.mult;
  if (S.char.id === 'babacar') pts *= 1.25;
  let label = t('tricks.' + id);
  if (S.lastTrick === id) { pts *= 0.5; label += ' ' + t('ui.bis'); }
  pts = Math.round(pts / 5) * 5;
  S.lastTrick = id;
  S.trickPts += pts; S.score += pts;
  addChain();
  popTrick(label + ' !', '+' + fmt(pts));
  floatText('+' + fmt(pts), false);
  emitSpray(S.x, surfaceY(S.x, 0) + S.h, 0, id === 'cutback' ? 30 : 18, 1.4);
}

function collect(it) {
  const info = TRASH[it.type];
  const pts = Math.round((info.pts * S.mult) / 5) * 5;
  S.cleanPts += pts; S.score += pts;
  S.count++; S.kg += info.kg;
  S.collected[it.type] = (S.collected[it.type] || 0) + 1;
  const inc = (1 / 34) * (S.char.id === 'claire' ? 1.45 : 1);
  S.clean = Math.min(1, S.clean + inc);
  addChain();
  Sound.collect();
  floatText('+' + fmt(pts), true);
  if (S.clean >= 1 && !S.cleanBonusDone) {
    S.cleanBonusDone = true;
    S.cleanPts += 1000; S.score += 1000;
    popTrick(t('ui.oceanClean'), '+' + fmt(1000), 'is-good');
  }
  // fait écologique
  if (S.elapsed - S.lastFactAt > 5.5) {
    const facts = L().facts;
    let list = facts[it.type];
    let key = it.type;
    if ((S.count % 3) === 0) { list = facts.water; key = 'water'; }
    const i = S.factIdx[key] || 0;
    S.factIdx[key] = (i + 1) % list.length;
    showFact(list[i % list.length], key === 'water' ? t('ui.waterQuality') : t('trash.' + it.type));
  }
}

function wipeout() {
  S.wipe = 2; S.invuln = 3.2;
  S.chain = 0; S.comboT = 0; S.mult = 1;
  S.air = false; S.h = 0; S.vy = 0; S.trick = null;
  S.touchTarget = null; touch.id = null;
  Sound.wipe();
  popTrick(t('ui.wipeout'), t('ui.comboLost'), 'is-bad');
  emitSpray(S.x, surfaceY(S.x, 0) + 0.5, 0, 40, 1.6);
}

function updateGame(dt) {
  S.elapsed += dt;
  S.time = Math.max(0, GAME_DURATION - S.elapsed);
  const spot = S.spot;
  let target = spot.speed * (1 + spot.speedGain * (S.elapsed / GAME_DURATION));
  if (S.wipe > 0) target *= 0.45;
  S.speed = lerp(S.speed, target, Math.min(1, dt * 1.5));
  W.travel += S.speed * dt;

  // combo
  if (S.comboT > 0) {
    S.comboT -= dt;
    if (S.comboT <= 0) { S.chain = 0; S.mult = 1; S.lastTrick = null; }
  }
  if (S.invuln > 0) S.invuln -= dt;

  // mouvement latéral
  if (S.wipe > 0) {
    S.wipe -= dt;
    S.vx *= 0.9;
  } else if (S.touchTarget !== null) {
    const desired = (S.touchTarget - S.x) * 9;
    S.vx = clamp(desired, -14, 14);
  } else {
    const steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    const targetV = steer * 11;
    S.vx = lerp(S.vx, targetV, Math.min(1, dt * (steer ? 6 : 3)));
  }
  // la pente fait légèrement redescendre
  if (!S.air && S.wipe <= 0 && S.x < XT) S.vx += 2.2 * dt * (S.touchTarget === null ? 1 : 0.3);
  S.x += S.vx * dt;
  if (S.x < X_MIN) {
    // lancement depuis la lèvre si on arrive vite
    if (!S.air && S.vx < -9.5 && S.wipe <= 0 && S.elapsed - S.lastLaunch > 1.2) { S.lastLaunch = S.elapsed; jump(9.5); }
    S.x = X_MIN; if (S.vx < 0) S.vx = 0;
  }
  if (S.x > X_MAX) { S.x = X_MAX; if (S.vx > 0) S.vx = 0; }

  S.onLip = !S.air && S.x < LIP_ZONE && S.wipe <= 0;

  // vertical
  if (S.air) {
    S.vy -= 21 * dt;
    S.h += S.vy * dt;
    if (S.h <= 0) {
      S.h = 0; S.air = false; S.vy = 0;
      emitSpray(S.x, surfaceY(S.x, 0), 0, 16, 1);
    }
  }

  // figure en cours
  if (S.trick) {
    S.trickT += dt;
    if (S.trickT >= TRICKS[S.trick].dur || (!S.air && S.trickT > 0.2 && S.trick !== 'cutback' && !S.onLip)) S.trick = null;
  }

  // apparition
  const tr = W.travel;
  if (tr >= S.nextTrash) { spawnTrash(SPAWN_Z); S.nextTrash = tr + gap(spot.trashPer100); }
  if (tr >= S.nextObst) { spawnObstacle(SPAWN_Z); S.nextObst = tr + gap(spot.obstPer100); }
  if (tr >= S.nextHotspot) { spawnHotspot(); S.nextHotspot = tr + rand(200, 280); }

  const surfY = surfaceY(S.x, 0);
  const sY = surfY + S.h;

  // déchets
  const radius = S.char.id === 'adama' ? 2.6 : 1.5;
  for (let i = S.items.length - 1; i >= 0; i--) {
    const it = S.items[i];
    const z = it.p + W.travel;
    if (S.char.id === 'adama' && z > -7 && z < 2 && Math.abs(it.x - S.x) < 5) it.x = lerp(it.x, S.x, Math.min(1, dt * 3));
    const y = surfaceY(it.x, z) + 0.2 + Math.sin(W.t * 2 + it.bob) * 0.1;
    it.obj.position.set(it.x, y, z);
    it.obj.children[1].rotation.y += it.spin * dt;
    if (z > 14) { scene.remove(it.obj); S.items.splice(i, 1); continue; }
    if (S.wipe <= 0 && Math.abs(z) < radius && Math.abs(it.x - S.x) < radius && Math.abs(sY - y) < 2.4) {
      collect(it);
      scene.remove(it.obj); S.items.splice(i, 1);
    }
  }
  // anneaux zones polluées
  for (let i = S.rings.length - 1; i >= 0; i--) {
    const r = S.rings[i];
    const z = r.p + W.travel;
    r.obj.position.set(r.x, surfaceY(r.x, z) + 0.1, z);
    r.obj.material.opacity = 0.45 + Math.sin(W.t * 6) * 0.25;
    if (z > 20) { scene.remove(r.obj); S.rings.splice(i, 1); }
  }
  // obstacles
  for (let i = S.obstacles.length - 1; i >= 0; i--) {
    const o = S.obstacles[i];
    const z = o.p + W.travel;
    const y = surfaceY(o.x, z);
    o.obj.position.set(o.x, o.type === 'rock' ? y * 0.6 - 0.1 : y - 0.15, z);
    if (o.type === 'pirogue') {
      o.obj.rotation.z = Math.atan(slopeAt(o.x, z)) * 0.8;
      o.obj.rotation.x = Math.sin(W.t * 1.5 + o.p) * 0.05;
    }
    if (z > 20) { scene.remove(o.obj); S.obstacles.splice(i, 1); continue; }
    if (o.passed || S.wipe > 0) continue;
    if (Math.abs(z) < o.halfZ + 0.5 && Math.abs(o.x - S.x) < o.rad + 0.45) {
      const topY = o.obj.position.y + o.top;
      if (sY > topY + 0.15) {
        // saut par-dessus
        if (!o.jumped) {
          o.jumped = true;
          const pts = Math.round((50 * S.mult) / 5) * 5;
          S.trickPts += pts; S.score += pts;
          floatText(t('ui.over') + ' +' + pts, false);
        }
      } else if (S.invuln <= 0) {
        o.passed = true;
        wipeout();
      }
    }
    if (z > o.halfZ + 1) o.passed = true;
  }

  waterClean = lerp(waterClean, S.clean, Math.min(1, dt * 2));

  // spray de carving
  if (!S.air && S.wipe <= 0 && Math.abs(S.vx) > 5 && Math.random() < 0.6) emitSpray(S.x + (S.vx > 0 ? -0.3 : 0.3), surfY, 0.6, 2, 0.8);
  if (S.onLip && Math.random() < 0.4) emitSpray(S.x - 0.5, surfY + 0.2, 0.3, 2, 0.9);

  if (S.time <= 0) endGame();
}

function updateSurferPose(dt, menu) {
  if (!surfer) return;
  const u = surfer.userData;
  const x = S.x;
  const surfY = surfaceY(x, 0);
  surfer.position.set(x, surfY + S.h, 0);
  const slope = Math.atan(slopeAt(x, 0));
  const slopeC = clamp(slope, -0.85, 0.85);
  u.tilt.rotation.z = lerp(u.tilt.rotation.z, S.air ? slopeC * 0.3 : slopeC, Math.min(1, dt * 8));
  u.tilt.rotation.x = lerp(u.tilt.rotation.x, clamp(-S.vx * 0.03, -0.3, 0.3), Math.min(1, dt * 6));
  // direction : le nez de la planche suit la trajectoire
  let yawT = clamp(-S.vx * 0.045, -0.5, 0.5);
  let spin = 0, roll = 0, crouch = 0;
  if (S.trick) {
    const k = clamp(S.trickT / TRICKS[S.trick].dur, 0, 1);
    if (S.trick === 'spin') spin = k * Math.PI * 2;
    if (S.trick === 'cutback') yawT += Math.sin(k * Math.PI) * 1.4;
    if (S.trick === 'aerial') { roll = Math.sin(k * Math.PI) * 0.9; crouch = Math.sin(k * Math.PI) * 0.25; }
  }
  u.baseYaw = lerp(u.baseYaw || 0, yawT, Math.min(1, dt * 7));
  u.yaw.rotation.y = u.baseYaw + spin;
  u.boardG.rotation.x = roll;
  u.rider.rotation.x = roll;
  // corps
  const bob = Math.sin(W.t * 3.2) * 0.03;
  u.rider.position.y = 0.1 + bob - crouch - (S.air ? 0.08 : 0);
  u.torso.rotation.z = 0.25 + clamp(-S.vx * 0.02, -0.25, 0.25);
  u.arms[0].rotation.x = 0.1 + Math.sin(W.t * 2) * 0.08 + (S.air ? 0.55 : 0);
  u.arms[1].rotation.x = -0.1 - Math.sin(W.t * 2.3) * 0.08 - (S.air ? 0.55 : 0);
  // chute
  if (S.wipe > 0) {
    const k = clamp((2 - S.wipe) / 0.35, 0, 1);
    u.rider.rotation.z = lerp(0, 1.45, k);
    u.rider.position.y = 0.1 - k * 0.6;
    u.boardG.rotation.z = Math.sin(W.t * 8) * 0.4 * k;
    surfer.visible = S.wipe > 1.6 || Math.floor(S.wipe * 10) % 2 === 0;
  } else {
    u.rider.rotation.z = lerp(u.rider.rotation.z, 0, Math.min(1, dt * 8));
    u.boardG.rotation.z = 0;
    surfer.visible = menu || S.invuln <= 0 || Math.floor(S.invuln * 12) % 2 === 0 || S.invuln > 3;
  }
  shadowG.position.set(x, surfY + 0.06, 0);
  shadowG.rotation.z = slope;
  shadowBlob.position.y = 0;
  const sc = clamp(1 - S.h * 0.15, 0.4, 1);
  shadowBlob.scale.set(sc, sc * 1.6, sc);
}

/* ------------------------------------------------------------------ */
/* Caméra                                                              */
/* ------------------------------------------------------------------ */
const camPos = new THREE.Vector3(10, 7, 12);
const camLook = new THREE.Vector3(0, 2, -10);
const tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3();
function updateCamera(dt, menu) {
  const portrait = camera.aspect < 0.9;
  const sy = surfaceY(S.x, 0) + S.h;
  if (menu) {
    const a = S.menuT * 0.12;
    tmpV.set(S.x + 9 + Math.sin(a) * 4, sy + 3.5 + Math.sin(a * 0.7), 9 + Math.cos(a) * 3);
    tmpL.set(S.x - 3, sy + 0.8, -6);
  } else {
    tmpV.set(S.x * 0.55 + (portrait ? 7.5 : 9), sy * 0.45 + (portrait ? 3.4 : 2.6), portrait ? 10.5 : 9);
    tmpL.set(S.x * 0.55 - 3, sy * 0.5 + 1.8, -12);
  }
  const k = Math.min(1, dt * 4);
  camPos.lerp(tmpV, k);
  camLook.lerp(tmpL, k);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  sky.position.copy(camera.position);
  sunDisc.position.copy(camera.position).addScaledVector(sunDirV, 520);
  sunDisc.lookAt(camera.position);
  sunLight.position.copy(camera.position).addScaledVector(sunDirV, 100);
  sunLight.target.position.copy(camera.position);
}

/* ------------------------------------------------------------------ */
/* Interface                                                           */
/* ------------------------------------------------------------------ */
const ui = {
  score: $('#hud-score'), timer: $('#hud-timer'), timerBox: $('.hud-timer'), mult: $('#hud-mult'),
  comboBar: $('#hud-combo-bar'), cleanBar: $('#hud-clean-bar'), cleanPct: $('#hud-clean-pct'), cleanBox: $('.hud-clean'),
  state: $('#hud-state'), pop: $('#trick-pop'), fact: $('#fact-toast'), factText: $('#fact-text'), factKicker: $('#fact-toast .fact-kicker'),
  floatLayer: $('#float-layer'), hud: $('#hud'), pauseBtn: $('#btn-pause'), countdown: $('#countdown'),
};

const last = {};
function setText(el, key, v) { if (last[key] !== v) { last[key] = v; el.textContent = v; } }
function updateHud(force) {
  if (force) for (const k in last) delete last[k];
  setText(ui.score, 'score', fmt(S.score));
  const secs = Math.ceil(S.time);
  if (last.t !== String(secs) && S.mode === 'play' && secs <= 5 && secs > 0) Sound.tick();
  setText(ui.timer, 't', String(secs));
  ui.timerBox.classList.toggle('is-low', secs <= 10);
  setText(ui.mult, 'mult', 'x' + (LANG === 'en' ? String(S.mult) : String(S.mult).replace('.', ',')));
  ui.comboBar.style.width = (S.chain > 0 ? (S.comboT / comboWindow()) * 100 : 0).toFixed(1) + '%';
  const pct = Math.round(S.clean * 100);
  ui.cleanBar.style.width = pct + '%';
  setText(ui.cleanPct, 'pct', pct + ' %');
  ui.cleanBox.classList.toggle('is-full', pct >= 100);
  let st = '', cls = '';
  if (S.wipe > 0) st = '';
  else if (S.air) { st = t('ui.inAir'); cls = 'is-air'; }
  else if (S.onLip) st = t('ui.onLip');
  if (last.st !== st) {
    last.st = st;
    ui.state.textContent = st;
    ui.state.classList.toggle('is-on', !!st);
    ui.state.classList.toggle('is-air', cls === 'is-air');
    const ready = !!st;
    for (const b of $$('.ctl-trick')) b.classList.toggle('is-ready', ready);
  }
}

let popTimer = 0;
function popTrick(title, sub, cls) {
  ui.pop.className = 'trick-pop';
  ui.pop.innerHTML = '';
  const tEl = document.createElement('span'); tEl.className = 't'; tEl.textContent = title;
  const p = document.createElement('span'); p.className = 'p'; p.textContent = sub || '';
  ui.pop.append(tEl, p);
  void ui.pop.offsetWidth; // relance l'animation
  ui.pop.classList.add('is-show');
  if (cls) ui.pop.classList.add(cls);
  clearTimeout(popTimer);
  popTimer = setTimeout(() => { ui.pop.className = 'trick-pop'; }, 1150);
}

let factTimer = 0;
function showFact(text, kicker) {
  S.lastFactAt = S.elapsed;
  ui.factText.textContent = text;
  ui.factKicker.textContent = kicker ? t('ui.didYouKnow') + ' · ' + kicker : t('ui.didYouKnow');
  ui.fact.classList.add('is-show');
  clearTimeout(factTimer);
  factTimer = setTimeout(() => ui.fact.classList.remove('is-show'), 5000);
}

const projV = new THREE.Vector3();
function floatText(text, isTrash) {
  if (!surfer) return;
  projV.set(S.x, surfaceY(S.x, 0) + S.h + 2.2, 0).project(camera);
  const el = document.createElement('span');
  el.className = 'float-pts' + (isTrash ? ' is-trash' : '');
  el.textContent = text;
  el.style.left = ((projV.x * 0.5 + 0.5) * window.innerWidth + rand(-20, 20)) + 'px';
  el.style.top = ((-projV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  ui.floatLayer.appendChild(el);
  setTimeout(() => el.remove(), 850);
}

/* ---------------- Écrans ---------------- */
let currentScreen = 'loading';
function showScreen(id) {
  currentScreen = id;
  for (const s of $$('.screen')) s.classList.toggle('is-active', s.id === 'screen-' + id);
  const el = $('#screen-' + id);
  if (el) {
    el.scrollTop = 0;
    const focusable = el.querySelector('.btn-primary');
    if (focusable && !isTouch) setTimeout(() => focusable.focus({ preventScroll: true }), 30);
  }
}

// Vignettes des personnages (rendu hors-écran une seule fois)
function renderThumbs() {
  const thumbs = {};
  let r;
  try {
    const c = document.createElement('canvas');
    r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(220, 220, false);
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.4));
    const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(-3, 5, 4); sc.add(dl);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.6, 7), new THREE.MeshLambertMaterial({ color: 0x2fb8c8, flatShading: true }));
    water.rotation.x = -Math.PI / 2; sc.add(water);
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    cam.position.set(-3.0, 1.75, 3.3); cam.lookAt(0, 1.0, 0);
    for (const ch of CHARACTERS) {
      const s = buildSurfer(ch);
      s.userData.yaw.rotation.y = 0.5;
      s.userData.arms[0].rotation.x = 0.4; s.userData.arms[1].rotation.x = -0.4;
      sc.add(s);
      r.setClearColor(0x000000, 0);
      r.render(sc, cam);
      thumbs[ch.id] = c.toDataURL('image/png');
      sc.remove(s);
    }
  } catch (e) {
    // pas grave : les cartes restent sans vignette
  } finally {
    if (r) { r.dispose(); r.forceContextLoss(); }
  }
  return thumbs;
}

let thumbCache = null;
function buildCharCards() {
  const thumbs = thumbCache || (thumbCache = renderThumbs());
  const grid = $('#char-grid');
  grid.innerHTML = '';
  for (const ch of CHARACTERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.setAttribute('role', 'radio');
    b.dataset.id = ch.id;
    b.innerHTML = `<img class="thumb" alt="" ${thumbs[ch.id] ? `src="${thumbs[ch.id]}"` : ''}>
      <span class="card-body"><span class="name"></span><span class="role"></span><span class="perk"></span></span>`;
    b.querySelector('.name').textContent = ch.name;
    b.querySelector('.role').textContent = t(`chars.${ch.id}.role`);
    b.querySelector('.perk').textContent = t(`chars.${ch.id}.perk`);
    b.addEventListener('click', () => selectChar(ch));
    b.addEventListener('dblclick', () => { selectChar(ch); showScreen('spot'); });
    grid.appendChild(b);
  }
  selectChar(S.char);
}
function selectChar(ch) {
  S.char = ch;
  for (const c of $$('#char-grid .card')) c.setAttribute('aria-checked', String(c.dataset.id === ch.id));
  const d = $('#char-detail');
  d.innerHTML = '<h3></h3><p class="bio"></p><p class="perk-line"></p>';
  const tx = (k) => t(`chars.${ch.id}.${k}`);
  d.querySelector('h3').textContent = ch.name + ' · ' + tx('role');
  d.querySelector('.bio').textContent = tx('bio');
  d.querySelector('.perk-line').textContent = t('ui.perk') + ' « ' + tx('perk') + ' » : ' + tx('perkDesc');
  setSurfer(ch);
}

function buildSpotCards() {
  const grid = $('#spot-grid');
  grid.innerHTML = '';
  for (const sp of SPOTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card spot-card';
    b.setAttribute('role', 'radio');
    b.dataset.id = sp.id;
    const dots = (n) => '●'.repeat(n) + '○'.repeat(Math.max(0, 4 - n));
    b.innerHTML = `<span class="thumb" style="background:linear-gradient(180deg, ${sp.sky[0]} 0%, ${sp.sky[1]} 45%, ${sp.sky[2]} 62%, #1d8fae 63%, #0b5f86 100%)"><span class="spot-time"></span></span>
      <span class="card-body"><span class="name"></span><span class="desc"></span>
      <span class="meta"><span>${t('ui.wave')} ${dots(sp.wave)}</span><span>${t('ui.trash')} ${dots(sp.trashLvl)}</span><span>${sp.obstacle === 'rock' ? t('ui.rocks') : t('ui.pirogues')}</span></span>
      <span class="best"></span></span>`;
    b.querySelector('.spot-time').textContent = t(`spots.${sp.id}.time`);
    b.querySelector('.name').textContent = sp.name;
    b.querySelector('.desc').textContent = t(`spots.${sp.id}.desc`);
    b.querySelector('.best').textContent = best[sp.id] ? t('ui.record') + fmt(best[sp.id]) : '';
    b.addEventListener('click', () => selectSpot(sp));
    b.addEventListener('dblclick', () => { selectSpot(sp); showScreen('howto'); });
    grid.appendChild(b);
  }
  selectSpot(S.spot);
}
function selectSpot(sp) {
  for (const c of $$('#spot-grid .card')) c.setAttribute('aria-checked', String(c.dataset.id === sp.id));
  if (S.spot !== sp || !props.length) applySpot(sp);
}

/* ---------------- Déroulé d'une partie ---------------- */
let countdownTimer = 0;
function startCountdown() {
  applySpot(S.spot);
  resetRun();
  showScreen('none');
  ui.hud.hidden = false;
  ui.pauseBtn.hidden = false;
  $('#hint-drag').classList.remove('is-hidden');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(hideHint, 6000);
  S.mode = 'countdown';
  const seq = ['3', '2', '1', t('ui.countGo')];
  let i = 0;
  const step = () => {
    if (S.mode !== 'countdown') return;
    if (i < seq.length) {
      ui.countdown.innerHTML = '';
      const s = document.createElement('span'); s.textContent = seq[i];
      ui.countdown.appendChild(s);
      if (i < 3) Sound.tick(); else Sound.tone(1046, 0.25, 'triangle', 0.2);
      i++;
      countdownTimer = setTimeout(step, i === seq.length ? 500 : 700);
    } else {
      ui.countdown.innerHTML = '';
      S.mode = 'play';
      S.elapsed = 0;
    }
  };
  step();
}

function pauseGame() {
  if (S.mode !== 'play' && S.mode !== 'countdown') return;
  clearTimeout(countdownTimer);
  ui.countdown.innerHTML = '';
  S.mode = 'paused';
  keys.left = keys.right = false;
  S.touchTarget = null;
  showScreen('pause');
}
function resumeGame() {
  if (S.mode !== 'paused') return;
  showScreen('none');
  S.mode = 'play';
}
function quitToMenu(screen) {
  clearTimeout(countdownTimer);
  ui.countdown.innerHTML = '';
  S.mode = 'menu';
  ui.hud.hidden = true;
  ui.pauseBtn.hidden = true;
  ui.fact.classList.remove('is-show');
  clearEntities();
  S.h = 0; S.air = false; S.wipe = 0; S.invuln = 0; S.trick = null; S.vx = 0;
  if (screen === 'spot') buildSpotCards();
  showScreen(screen);
}

function endGame() {
  S.mode = 'over';
  S.air = false; S.h = 0; S.trick = null;
  Sound.end();
  popTrick(t('ui.endPop'), fmt(S.score) + ' ' + t('ui.pts'), 'is-good');
  setTimeout(showResults, 1400);
}

function showResults() {
  if (S.mode !== 'over') return;
  ui.hud.hidden = true;
  ui.pauseBtn.hidden = true;
  ui.fact.classList.remove('is-show');
  const total = Math.round(S.score);
  const prev = best[S.spot.id] || 0;
  const isRecord = total > prev;
  if (isRecord) { best[S.spot.id] = total; saveBest(); }
  $('#res-spot').textContent = S.spot.name + ' · ' + S.char.name;
  $('#res-total').textContent = fmt(total);
  const rec = $('#res-record');
  rec.className = 'record' + (isRecord && total > 0 ? ' is-new' : '');
  rec.textContent = isRecord && total > 0 ? t('ui.newRecord') : t('ui.record') + fmt(prev);
  $('#res-tricks').textContent = fmt(S.trickPts) + ' ' + t('ui.pts');
  $('#res-clean').textContent = fmt(S.cleanPts) + ' ' + t('ui.pts');
  $('#res-count').textContent = String(S.count);
  // estimation ludique (poids moyens approximatifs par type de déchet)
  const kg = S.kg;
  $('#res-kg').textContent = kg < 1 ? '≈ ' + Math.round(kg * 1000) + ' g' : '≈ ' + (LANG === 'en' ? kg.toFixed(1) : kg.toFixed(1).replace('.', ',')) + ' kg';
  $('#res-combo').textContent = 'x' + (LANG === 'en' ? String(S.bestMult) : String(S.bestMult).replace('.', ','));
  $('#res-ocean').textContent = Math.round(S.clean * 100) + ' %';
  let topType = 'none', topN = 0;
  for (const k in S.collected) if (S.collected[k] > topN) { topN = S.collected[k]; topType = k; }
  $('#res-lesson').textContent = t('lessons.' + topType);
  showScreen('results');
}

/* ---------------- Boutons ---------------- */
$('#btn-start').addEventListener('click', () => { buildCharCards(); showScreen('char'); });
$('#btn-char-ok').addEventListener('click', () => { buildSpotCards(); showScreen('spot'); });
$('#btn-spot-ok').addEventListener('click', () => showScreen('howto'));
$('#btn-go').addEventListener('click', startCountdown);
$('#btn-pause').addEventListener('click', pauseGame);
$('#btn-resume').addEventListener('click', resumeGame);
$('#btn-restart').addEventListener('click', () => { showScreen('none'); startCountdown(); });
$('#btn-quit').addEventListener('click', () => quitToMenu('spot'));
$('#btn-replay').addEventListener('click', startCountdown);
$('#btn-spot-change').addEventListener('click', () => quitToMenu('spot'));
for (const b of $$('[data-go]')) {
  b.addEventListener('click', () => {
    const to = b.dataset.go;
    if (to === 'char') buildCharCards();
    if (to === 'spot') buildSpotCards();
    showScreen(to);
  });
}
const soundBtn = $('#btn-sound');
soundBtn.addEventListener('click', () => {
  const on = Sound.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  updateSoundLabel();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

/* ------------------------------------------------------------------ */
/* Redimensionnement & boucle                                          */
/* ------------------------------------------------------------------ */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 0.7 ? 74 : camera.aspect < 1.1 ? 66 : 56;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  tick(Math.min(0.05, clock.getDelta()));
}
function tick(dt) {
  const playing = S.mode === 'play';
  const frozen = S.mode === 'paused';
  if (!frozen) {
    W.t += dt;
    if (playing) {
      updateGame(dt);
    } else {
      // mode démo (menus, compte à rebours, fin)
      S.menuT += dt;
      const sp = S.mode === 'over' ? S.speed * 0.98 : S.spot.speed * 0.8;
      if (S.mode === 'over') S.speed = sp;
      W.travel += sp * dt;
      if (S.mode === 'menu' || S.mode === 'loading') {
        S.x = lerp(XL + 3, XT + 2, 0.5 + 0.5 * Math.sin(S.menuT * 0.5));
        S.vx = Math.cos(S.menuT * 0.5) * 0.5 * (XT - XL) * 0.25;
        waterClean = lerp(waterClean, 0.75, dt * 0.5);
      }
      if (S.mode === 'countdown' || S.mode === 'over') {
        // les objets suivent le défilement de l'eau
        for (const it of S.items) { const z = it.p + W.travel; it.obj.position.set(it.x, surfaceY(it.x, z) + 0.2, z); }
        for (const o of S.obstacles) { const z = o.p + W.travel; o.obj.position.set(o.x, o.type === 'rock' ? surfaceY(o.x, z) * 0.6 - 0.1 : surfaceY(o.x, z) - 0.15, z); }
      }
    }
    const spd = playing ? S.speed : S.spot.speed * 0.8;
    updateProps(dt, spd);
    updateWave();
    if (S.spot.lipSpray) for (let k = 0; k < 3; k++) if (Math.random() < S.spot.lipSpray * 0.8) emitLipSpray(rand(-60, 6));
    updateSpray(dt, spd);
    updateSurferPose(dt, !playing && S.mode !== 'over' && S.mode !== 'countdown');
  }
  updateCamera(dt, S.mode === 'menu' || S.mode === 'loading');
  if (playing || S.mode === 'countdown') updateHud();
  renderer.render(scene, camera);
}

/* ---------------- Langue ---------------- */
function updateSoundLabel() {
  soundBtn.setAttribute('aria-label', Sound.enabled ? t('ui.soundOff') : t('ui.soundOn'));
  soundBtn.title = soundBtn.getAttribute('aria-label');
}
function applyLang() {
  document.documentElement.lang = LANG;
  for (const el of $$('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of $$('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  $('#char-grid').setAttribute('aria-label', t('ui.surfers'));
  $('#spot-grid').setAttribute('aria-label', t('ui.spots'));
  for (const b of $$('.lang-btn')) b.setAttribute('aria-pressed', String(b.dataset.lang === LANG));
  updateSoundLabel();
  // écrans construits dynamiquement
  if ($('#char-grid').children.length) buildCharCards();
  if ($('#spot-grid').children.length) buildSpotCards();
  updateHud(true);
}
function setLang(l) {
  if (!LANGS.includes(l)) return;
  LANG = l;
  try { localStorage.setItem('sf-lang', l); } catch (e) { /* ignore */ }
  applyLang();
}
for (const b of $$('.lang-btn')) b.addEventListener('click', () => setLang(b.dataset.lang));
window.addEventListener('storage', (e) => {
  if (e.key === 'sf-lang' && LANGS.includes(e.newValue) && e.newValue !== LANG) { LANG = e.newValue; applyLang(); }
});

// Démarrage
applyLang();
setSurfer(S.char);
applySpot(SPOTS[0]);
S.mode = 'menu';
window.__srGameReady = true;
showScreen('title');
frame();
