// node test/quickparty.test.js --check : asserts QuickParty rules against the 1e books (see RAW_AUDIT.md)
const vm = require('vm'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'rules.js'), 'utf8'), ctx, { filename: 'rules.js' });
const Q = ctx.QPRules;
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; if (fails < 40) console.log('FAIL', m); } };
const AB = Q.AB, idx = a => AB.indexOf(a);
const flat = o => JSON.stringify(o);

function checkChar(c, npc, tag) {
  const st = c.stats;
  AB.forEach(a => { ok(Number.isInteger(st[a]), `${tag} ${a} not int`);
    ok(st[a] >= Q.RMIN[c.race][idx(a)] && st[a] <= Q.RMAX[c.race][idx(a)], `${tag} ${c.race} ${a}=${st[a]} outside race limits`); });
  const male = c.gender === 'Male'; const sm = Q.STRMAX[c.race]; const base = male ? sm[0] : sm[2], xcap = male ? sm[1] : sm[3];
  ok(st.str <= base, `${tag} str ${st.str} > ${base}`);
  ok(st.strX === null || (st.str === 18 && st.strX >= 1 && st.strX <= xcap && c.classes.some(x => ['Fighter','Paladin','Ranger'].includes(x))), `${tag} exceptional str misuse`);
  c.classes.forEach((cl, i) => {
    Object.entries(Q.C[cl].min).forEach(([a, v]) => ok(st[a] >= v, `${tag} ${cl} needs ${a} ${v}, has ${st[a]}`));
    const lim = Q.limitFor(c.race, cl, st);
    ok(lim > 0, `${tag} ${c.race} cannot be ${cl}`);
    ok(c.levels[i] >= 1 && c.levels[i] <= lim, `${tag} ${c.race} ${cl} level ${c.levels[i]} > limit ${lim}`);
    ok(Q.alignsFor([cl]).includes(c.align), `${tag} ${cl} alignment ${c.align}`);
    const v = Q.LIM[c.race][cl]; ok(npc || typeof v !== 'string' || v[0] !== 'n', `${tag} NPC-only combo on PC`);
  });
  if (c.classes.length > 1) ok(Q.MULTI[c.race].some(m => flat(m) === flat(c.classes)), `${tag} illegal multi-class ${c.race} ${c.classes}`);
  else ok(c.race === 'Human' || Q.LIM[c.race][c.classes[0]] !== undefined, `${tag} illegal race/class`);
  if (c.classes.includes('Cleric') && c.classes.length > 1 && c.race === 'Half-elf') ok(st.wis >= 13, `${tag} half-elf multi cleric wis`);
  const [lo, hi] = Q.hpBounds(c.classes, c.levels, st.con);
  ok(c.hp >= lo && c.hp <= hi, `${tag} hp ${c.hp} outside ${lo}-${hi}`);
  c.levels.forEach((l, i) => ok(Q.levelFromXP(c.classes[i], c.xp / c.classes.length) >= l, `${tag} xp too low for level`));
  const txt = [c.charClass, c.levelText, c.align, c.race, c.spells || '', c.equipment.join(','), String(c.ac), String(c.hp), c.titles].join(' ');
  ok(!/undefined|NaN|null/.test(txt), `${tag} bad text: ${txt.slice(0, 200)}`);
  ok(Number.isInteger(c.ac), `${tag} AC`);
  if (c.perm.armor === 'none') ok(!c.equipment.some(e => /Mail|Leather|Studded/.test(e) && !/Bracers/.test(e)), `${tag} armour for armourless`);
  if (!c.perm.shield) ok(!c.equipment.some(e => /^Shield/.test(e)), `${tag} shield for shieldless ${c.classes}`);
}

// 1. 2000 PCs, all four methods and several level ranges
const methods = [1, 2, 3, 4]; let n = 0; const raceSeen = new Set(), multiSeen = new Set();
for (let i = 0; i < 500; i++) for (const m of methods) {
  const lr = [[1,1],[2,4],[5,8],[9,12]][i % 4];
  const party = Q.genPCParty({ count: 1, levelRange: lr, method: m, alignMode: i % 2 ? 'any' : 'compat' });
  const c = party.chars[0]; n++; raceSeen.add(c.race); if (c.classes.length > 1) multiSeen.add(c.classes.join('/'));
  checkChar(c, false, `PC#${n}`);
}
ok(n === 2000, 'count'); ok(raceSeen.size === 7, 'all races seen'); ok(multiSeen.size >= 10, 'multi-classes seen ' + multiSeen.size);

// 2. NPC specials and rival parties
for (let i = 0; i < 400; i++) { const lvl = 1 + (i % 12); const p = Q.genSpecialNPC(lvl, {}); const c = Q.npcToRecord(p, []); checkChar(c, true, `NPC#${i}`); }
for (let i = 0; i < 300; i++) {
  const D = 1 + (i % 20); const r = Q.genRival(D);
  ok(r.chars.length >= 1 && r.chars.length <= 5, 'rival core count'); ok(r.chars.length + r.followers.length <= 9, 'party over 9');
  const counts = {}; r.chars.forEach(c => { checkChar(c, true, `RIV D${D}`); c.classes.forEach(x => counts[x] = (counts[x] || 0) + 1); });
  Object.entries(counts).forEach(([k, v]) => ok(v <= Q.MAXPER[k] + 3, 'class max ' + k));
  ok(!(Object.keys(counts).includes('Paladin') && Object.keys(counts).includes('Assassin')), 'paladin with assassin');
  r.chars.forEach(c => { const lv = Math.max(...c.levels); ok(D > 4 || lv <= D || c.classes.length > 1, `rival level ${lv} D${D}`); });
  r.followers.forEach(f => { if (D <= 3) ok(f.kind === 'man-at-arms' && f.hp >= 4 && f.hp <= 7, 'man-at-arms hp'); else { ok(f.kind === 'henchman', 'henchman at D>3'); checkChar(f, true, 'HENCH'); } });
}

// 3. spot values from the books
const eq = (a, b, m) => ok(flat(a) === flat(b), `${m}: got ${flat(a)} want ${flat(b)}`);
eq(Q.reach('Cleric', 9), 225001, 'PHB p.20 cleric 9th'); eq(Q.reach('Fighter', 9), 250001, 'PHB p.22 fighter 9th');
eq(Q.reach('Magic-User', 11), 375001, 'PHB p.25 MU 11th'); eq(Q.reach('Thief', 10), 160001, 'PHB p.27 thief 10th');
eq(Q.reach('Monk', 17), 3250001, 'PHB p.31 monk 17th'); eq(Q.reach('Paladin', 2), 2751, 'PHB p.24 paladin 2nd');
eq(Q.reach('Fighter', 12), 1000001, 'PHB p.22 fighter 12th = 1,000,001');
eq(Q.SLOTS['Magic-User'][12], [4,4,4,4,4,1], 'PHB p.26 MU 12th slots'); eq(Q.SLOTS.Cleric[9], [4,4,3,2,1], 'PHB p.20 cleric 9th slots');
eq(Q.SLOTS.Paladin[12], [2,2], 'PHB p.24 paladin 12th'); eq(Q.SLOTS.Illusionist[14], [5,5,4,3,2,2,1], 'PHB p.26 illusionist 14th');
eq(Q.limitFor('Dwarf', 'Fighter', { str: 17 }), 8, 'PHB p.14 dwarf fighter 17 str'); eq(Q.limitFor('Elf', 'Magic-User', { int: 16 }), 9, 'PHB p.14 elf MU int 16');
eq(Q.limitFor('Half-orc', 'Cleric', {}), 4, 'PHB p.14 half-orc cleric'); eq(Q.limitFor('Gnome', 'Illusionist', { int: 17, dex: 17 }), 6, 'PHB p.14 gnome illusionist');
eq(Q.RMIN.Dwarf[4], 12, 'PHB p.15 dwarf con min'); eq(Q.RMAX['Half-orc'][5], 12, 'PHB p.15 half-orc cha max'); eq(Q.RMAX.Elf[3], 19, 'PHB p.15 elf dex max');
eq(Q.intTable(15), [65, 7, 11], 'PHB p.10 int 15'); eq(Q.intTable(9), [35, 4, 6], 'PHB p.10 int 9');
eq(Q.conAdj(17, true), 3, 'PHB p.12 fighter con 17'); eq(Q.conAdj(17, false), 2, 'PHB p.12 other con 17');
eq(Q.thiefSkill(1, 'Human', 13)['Open Locks'], 25, 'PHB p.28 thief 1 locks'); eq(Q.thiefSkill(10, 'Human', 13)['Move Silently'], 78, 'PHB p.28 thief 10 move silently');
eq(Q.thiefSkill(1, 'Halfling', 13)['Hide in Shadows'], 25, 'PHB p.28 halfling hide');
eq(Q.henchLevel(5), 2, 'DMG p.175 5th level master -> 2nd'); eq(Q.henchLevel(9), 6, 'DMG p.175 9th level master -> 6th'); eq(Q.henchLevel(12), 8, 'DMG p.175 12th level master');
eq(Q.calcAC(['Fighter'], 5, ['Plate Mail', 'Shield'], 10), 2, 'PHB p.36 plate + shield'); eq(Q.calcAC(['Fighter'], 5, ['Chain Mail +1', 'Shield +2'], 16), -1, 'chain+1 shield+2 dex16');
eq(Q.calcAC(['Monk'], 9, [], 18), 3, 'PHB p.31 monk 9th AC 3'); eq(Q.dexAdj(3), 4, 'PHB p.11 dex 3');

// 4. mercenaries: DMG p.29-31
const pay = { 'archer (longbow)': 4, 'archer (shortbow)': 2, artillerist: 5, crossbowman: 2, 'footman, heavy': 2, 'footman, light': 1, 'footman, pikeman': 3, 'hobilar, heavy': 3, 'hobilar, light': 2, 'horseman, archer': 6, 'horseman, crossbowman': 4, 'horseman, heavy': 6, 'horseman, light': 3, 'horseman, medium': 4, 'sapper/miner': 4, slinger: 3 };
Object.entries(pay).forEach(([k, v]) => eq(Q.MERC[k].pay, v, 'DMG p.29 pay ' + k));
for (let i = 0; i < 3000; i++) {
  const t = Q.mercType(1 + (i % 100)); ok(Q.MERC[t] || /^_(captain|lieutenant|serjeant)$/.test(t), 'mercType ' + t);
  if (!Q.MERC[t]) continue;
  const u = Q.mercUnit(t, i % 4); const [a, b] = Q.MERC[t].q[i % 4];
  ok(u.count >= a && u.count <= b, 'merc qty'); ok(u.cost === u.troops * u.pay + u.sgts * u.pay * 10 + u.lt * 100 + u.cpt * 100, 'merc cost');
  if (u.count <= 5) ok(u.sgts === 0, 'no serjeant under 6'); else ok(u.sgts >= 1 && u.sgts >= Math.floor(u.count / 10) && u.sgts <= Math.max(1, Math.floor(u.count / 5)), 'serjeants ' + u.count + ' ' + u.sgts);
  ok(!(u.lt && u.count <= 10), 'lt only over 10'); ok(!(u.cpt && (u.count <= 20 || (i % 4) !== 3)), 'captain only tier IV over 20');
}
eq(Q.mercType(41), '_lieutenant', 'DMG p.30 d% 41'); eq(Q.mercType(13), '_captain', 'DMG p.30 d% 13'); ok(['footman, heavy','footman, light','footman, pikeman'].includes((Q.rng = () => 0.95, Q.mercType(93))), 'any foot'); Q.rng = Math.random;
eq(Q.mercTier(4), 0, 'tier d10 4'); eq(Q.mercTier(10), 3, 'tier d10 0');

// 5. appendix P / DMG tables shape
eq(Q.PROT.Fighter, { shield: 10, plate: 6, banded: 8, chain: 10 }, 'DMG p.226 fighter protective'); eq(Q.POT['Magic-User'], [10, 3], 'DMG p.227 MU potions'); eq(Q.WEAP.Cleric, { mace: 12 }, 'DMG p.226 cleric weapons');
eq(Q.MISC.length, 16, 'DMG p.227 misc items'); eq(Q.DMGTABLES.I.length, 20, 'DMG p.176 table I'); eq(Q.DMGTABLES.IV.length, 12, 'DMG p.176 table IV');
// NPC text
for (let i = 0; i < 300; i++) { const t = Q.npcTraits(); ok(!/undefined|NaN/.test(JSON.stringify(t)), 'traits'); ok(!/undefined|NaN/.test(Q.heightWeight(Q.RACES[i % 7], i % 2 === 0)), 'hw'); ok(!/undefined/.test(Q.reaction()), 'reaction'); }

console.log(`${checks} checks, ${fails} failures`);
if (fails) { console.log('QUICKPARTY CHECK FAILED'); process.exit(1); }
console.log('QUICKPARTY CHECK OK'); 
