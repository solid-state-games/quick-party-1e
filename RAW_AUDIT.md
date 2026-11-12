# Quick Party: RAW audit (AD&D 1e)

Scope: `index.html` as at commit 80ae3ed-era (1,871 lines; "line" below refers to that version). Sources: PHB, DMG, MM text in `ADD-BOOKS-PDF/TEXT`. 1e only.

## Summary

The app's table values were mostly invented or from memory. Rules logic is now in `rules.js` (DOM-free, shared by `index.html` and `test/quickparty.test.js`); `index.html` renders only. Counts: 37 WRONG, 9 MISSING, 6 BUG, 6 NON-RAW (58 findings), all fixed or relabelled. Checks: `node test/quickparty.test.js --check` (about 154,000 assertions) and `python3 test/audit_tables.py` (book text parsed and diffed against `rules.js`: XP tables, mercenary pay and quantity tables, race min/max).

## Findings

| id | sev | line | code did | RAW says | fix |
|---|---|---|---|---|---|
| F01 | MISSING | 1068-1081 | no race ability minimums or maximums; clamp 3-18 | PHB p.15 Table III (e.g. dwarf con 12-19, elf dex 7-19, half-orc cha max 12, halfling wis max 17) | `RMIN`/`RMAX`; class and race chosen only if scores qualify |
| F02 | WRONG | 636 | elf dex over 18 clamped to 18; dwarf dex 17 and half-orc int 17, wis 14 not enforced | PHB p.15 | clamp to table |
| F03 | MISSING | 636 | no sex-based strength maximum, no exceptional strength 18/xx | PHB p.9, p.15 (fighters only; caps by race and sex) | `STRMAX`; `strX` rolled for Fighter, Paladin, Ranger |
| F04 | WRONG | 620-628 | class minimums RAISE low scores (free upgrades) | PHB p.18-31: scores below minimum cannot take the class | players' scores checked, combos filtered; NPC minimums per DMG p.100 only |
| F05 | MISSING | 620 | no minimums for Cleric (wis 9), Fighter (str 9, con 7), MU (int 9, dex 6), Thief (dex 9) | PHB p.20-27 | added |
| F06 | WRONG | 621 | Paladin str 12, cha 17 only | str 12, int 9, wis 13, con 9, cha 17 (PHB p.22) | fixed |
| F07 | WRONG | 622 | Ranger without con 14 | str 13, int 13, wis 14, con 14 (PHB p.24) | fixed |
| F08 | WRONG | 1079 | Assassin human, half-elf, half-orc only | also dwarf (9th), elf (10th), gnome (8th) (PHB p.14-17) | `LIM` |
| F09 | MISSING | 1070 | no multi-class characters | PHB p.15-17, 32-33 list by race | `MULTI`, equal XP split, per-class levels |
| F10 | MISSING | whole | no racial level limits (incl. strength, int, dex footnotes) | PHB p.14 Table II | `limitFor` |
| F11 | WRONG | 1069-1078 | NPC-only classes (dwarf, elf, gnome cleric; halfling druid) not distinguished | PHB p.14 parentheses | `n8`, `n7` markers; PCs exclude them |
| F12 | MISSING | whole | no hit points, hit dice, XP or level titles | PHB p.19-33, p.12 | `rollHP`, `reach`, `title`; multi-class HP per PHB p.19 |
| F13 | WRONG | 936-941 | dex AC: bonuses only, none for low dex; monk gets dex AC | PHB p.11 table (+4 at 3 to -4 at 18); monks none (PHB p.30) | `dexAdj` |
| F14 | WRONG | 926 | monk AC `10-level/3` | Monks Table II, PHB p.31 (AC 10 to -3) | `MONK_AC` |
| F15 | NON-RAW | 922-931 | invented default armour AC by class | class armour and shield lists, PHB p.19; kit by DMG p.175 (chain at 1st, plate at 2nd) | kit from permitted armour |
| F16 | WRONG | 909-916 | magic armour and shield bonus parsing breaks for compound items | PHB p.36 | rewritten `calcAC` |
| F17 | WRONG | 541-547 | sex weighted by class (invented) | none in books | PCs/NPCs 50/50; Name Forge option kept, labelled house rule |
| F18 | WRONG | 1084 | alignments: any of nine for any class | PHB p.33: druid TN, paladin LG, ranger good, thief neutral or evil (NG rarely), assassin evil, monk lawful, cleric not TN | `ALLOW` |
| F19 | NON-RAW | 1315 | PC alignments uncontrolled | DMG p.226: keep party alignments compatible | optional compatible set (default) |
| F20 | WRONG | 561-563 | 3d6 general NPC ok but special NPCs used PC Method I and class reassign | DMG p.11 special characters (+1 per die under 6 in germane abilities), DMG p.100 adjustments and minimums | `specialStats` |
| F21 | WRONG | 1083-1099 | NPC personae tables invented (6-10 entries) | DMG p.100-101 d10/d12/d8 tables (age, appearance, possessions, sanity, tendencies, personality, etc.) | `T10`, `npcTraits` with reroll rules |
| F22 | WRONG | 640-656 | height and weight invented; gnome, half-elf, half-orc missing | DMG p.102 tables | `heightWeight` |
| F23 | WRONG | 1099 | possessions invented | DMG p.100 d10 | fixed |
| F24 | WRONG | 1084-1315 | NPC alignment uniform over nine | DMG p.100 d10 table | `rollAlign` |
| F26 | WRONG | 855-897 | MU spell level access by int: 9 gave 5th level, 10-11 gave 6th | PHB p.10: int 9 to 4th, 10 to 5th, 12 to 6th, 14 to 7th, 16 to 8th, 18 to 9th | `maxSpellLevelInt` |
| F27 | WRONG | 855-897 | MU book counts invented (random min-max per level) | PHB p.10 chance-to-know checks, DMG p.39 start (read magic + 3 spells; illusionist 3 spells), 1 spell per level | `knownSpells`, `bookSpells` |
| F28 | WRONG | 1103-1139 | spell lists from memory: missing Aerial Servant, Part Water, Trip, Snare, Protection from Lightning, Feeblemind (druid), Fool's Gold, Leomund's Trap, Flame Arrow, Tiny Hut, Fire Charm, Wall of Ice, Mnemonic Enhancer, Airy Water, Conjure Elemental, Distance Distortion, Faithful Hound, Glassee, Anti-Magic Shell, Spiritwrack, Statue, Serten's, etc.; extra spells not in the PHB tables | PHB p.40-42 | lists re-transcribed |
| F29 | WRONG | 1138 | "First Level Magic-User Spells" listed as a spell | placeholder meaning 1st-level MU spells usable (PHB p.42, p.100) | removed from list |
| F30 | WRONG | 804-810 | PCs: Paladin, Ranger shown "daily prayers" prose | spell tables PHB p.24-25 | real slots |
| F31 | WRONG | 804-828 | Paladin/Ranger slots from cleric/druid tables at level-8/-7 offset | Paladin PHB p.24 (9th: 1; 12th: 2,2), Ranger p.25 (druid 8th; MU 9th) | own tables |
| F32 | MISSING | 826-839 | ranger MU spells absent; wisdom bonus given to druids; bonus spells ignored spell-level access | PHB p.11 table is for clerics; 6th level needs wis 17, 7th wis 18 | clerics only; gating applied |
| F33 | WRONG | 1143-1194 | magic item chances (Fighter plate 5 etc.) | DMG p.226-227 Appendix P (e.g. fighter shield 10, plate 6, banded 8, chain 10; MU ring 15, bracers 4) | `PROT`, `SCRL`, `WEAP`, `POT` |
| F34 | WRONG | 682-695 | +2/+3 upgrade formula | DMG p.226 (1%/level, add chance over 90) | `plusFor` |
| F35 | WRONG | 757-763 | 0-4 random misc items per character from 50 invented items | DMG p.227: party above 5th/8th gets 1-4 from 16 listed | `MISC`, per party |
| F36 | WRONG | 1185 | potion list (33 types) | DMG p.227 ten types per class | fixed |
| F37 | WRONG | 742-748 | scrolls: wrong chances and spell counts | DMG p.226 | fixed |
| F38 | NON-RAW | 1186 | 50-item misc list | see F35 | removed |
| F39 | WRONG | 773-788 | rival magic: chances and counts (level 1: 2 items) | DMG p.175-176 (1st: 10% one item from Table I; per-level lines) | `partyItems` |
| F40 | WRONG | 1190-1193 | Tables I-IV invented | DMG p.176 Tables I-IV | transcribed; unusable items rerolled (DMG p.176 "select appropriate") |
| F41 | WRONG | 670-680 | class maxima per party (Cleric 2, Fighter 2, Paladin 1...) | DMG p.175: Cleric 3, Druid 2, Fighter 5, Paladin 2, Ranger 2, MU 3, Illusionist 1, Thief 4, Assassin 2, Monk 1 | `MAXPER` |
| F42 | WRONG | 670-680 | class picked uniformly | DMG p.175 Character Subtable d% | `SUB` |
| F43 | BUG | 670-680 | contradictory classes (paladin with assassin) allowed | DMG p.175 ignore contradictions | alignment-compatible only |
| F44 | WRONG | 1413-1415 | character level d6 vs dungeon level formula | DMG p.175: dungeon level through 4th, then d6+6 adjusted 1, cap 12 (16+ lifts) | `rivalLevel` |
| F45 | WRONG | 1459 | henchman level 2/3 of master | DMG p.175: one-third, +1 per 3 levels above 8th (5th gives 2nd, 9th gives 6th) | `henchLevel` |
| F46 | MISSING | 1409 | no non-human or multi-class members | DMG p.176: about 20% non-human, per-race multi-class %, level formula | `raceFor`, `multiLevels` |
| F47 | BUG | 1438-1441 | rangers under 8th given henchmen | PHB p.24, DMG p.175 | filtered |
| F48 | NON-RAW | 1448 | men-at-arms "100% male", fixed gear | DMG p.175 gear (studded leather, crossbow, dagger; or scale, shield, spear, sword, pack); 4-7 hp (DMG p.30) | random sex; DMG gear |
| F49 | NON-RAW | 1405 | one party alignment for all | DMG p.175 compatible | compatible set |
| F50 | WRONG | 1591-1606 | mercenary pay: artillerist 8 (5), crossbowman 3 (2), pikeman 2 (3), hobilar heavy 5 (3), hobilar light 3 (2), horseman archer 5 (6), sapper 3 (4), slinger 1 (3) | DMG p.29 | `MERC` (parser-verified) |
| F51 | WRONG | 1625-1648 | d% table: 89-96 any missile, 97-99 foot, 00 horse | DMG p.30: 89-90 missile, 91-96 foot, 97-99 horseman, 00 specialist or leader | `MERC_D` |
| F52 | WRONG | 1608-1610 | "any horseman" list included hobilars, excluded horse archer/crossbow | DMG p.30 | fixed |
| F53 | WRONG | 1617-1623 | serjeants: min ceil(n/10), max ceil(n/5), extra to troops | DMG p.30-31: 1 per 10 minimum, 1 per 5 maximum, one of those encountered | floor-based, counted in strength |
| F54 | BUG | 1699-1700 | lieutenant only tier III | DMG p.30: tiers 8-9 and 0 with over 10 soldiers; captain over 20 in tier 0 | tier III and IV |
| F55 | BUG | 1696-1697 | serjeant pay used wrong troop rate | DMG p.31: 10x troop rate | follows corrected pay |
| F56 | BUG | 1783 | standalone `_sergeant` d% 81-85 correct; "any specialist" mapped to horse | see F51 | fixed |
| F57 | BUG | 1304 | level 13-15 option not in App. P | App. P: levels to 12 | kept, labelled house rule |
| F58 | MISSING | whole | no thief or monk skills | PHB p.28, p.12 dex adjustments, racial adjustments | `thiefSkill` (assassin at level minus 2, PHB p.29) |
| F59 | NON-RAW | 1304-1330 | PC factory forced class stat priority after the choice | DMG p.226: pick race and class after rolling | rolled pool first, combo chosen from what qualifies |

## Verified OK

Racial ability modifiers (PHB p.14); Cleric d8, Fighter d10 etc. (by test); cleric and druid slot tables (PHB p.20-21); thief assassin d6; app N name tables (flavour, untouched); NPC reaction table (DMG p.63); captain level d10 split (5-8) and lieutenant 2nd/3rd (DMG p.30-31); captain/lieutenant 100gp per level; troop numbers for all 16 types and four tiers (parser diff, 0 diffs); men-at-arms 4-7 hp; rival core count d4+1 and total 9; men-at-arms at dungeon levels 1-3 only; MU chance-to-know percentages.

## Interpretations (literal reading, page given)

1. Sub-race for halflings: PHB p.14 note 5 depends on Hairfoot, Tallfellow, Stout. Without sub-race, strength 17-18 caps fighters at 5th (Tallfellow with 18 could be 6th).
2. Elf, half-elf, gnome multi-class: level limits apply per class; XP is shared equally and keeps accruing (PHB p.15-17); HP: the dice of classes still advancing are totalled, adjusted for Con, divided by the number of classes, .5 rounds up (PHB p.19).
3. Con bonus to hit points: only to hit dice; none to the fixed points after the last die (PHB p.12). Fighter types get +3/+4 at 17/18, others +2 (also in multi-classes by die).
4. Appendix P multi-class level: add 1 per class to the rolled level, divide, fractions count as whole (DMG p.226): the share of XP for that level is used and levels are derived from it. For NPC parties DMG p.176 says add n, divide, drop fractions under one-half.
5. Exceptional strength (PHB p.9) given to Fighter, Paladin, Ranger and any multi-class including them.
6. Wisdom bonus spells (PHB p.11) for clerics only. 6th-level cleric spells need wis 17 and 7th wis 18 (PHB p.11); the single 5th-level slot of a 9th-level cleric needs wis 17 (PHB p.20 asterisk). Druid spells not gated.
7. Dex 19 (elves) uses the 18 row of the defensive adjustment (PHB p.11 stops at 18).
8. Illusionists use the MU Intelligence Table II (PHB p.10, p.26 "in most respects conform").
9. Illusionist 7th-level list also allows 1st-level MU spells (PHB p.42, p.100); not modelled, spells drawn from the listed seven.
10. Monster level in DMG p.175 is taken as the dungeon level (the app has no monster table). 00 on the Character Subtable gives a monk (bard is not in PHB/DMG/MM).
11. DMG tables marked "d8, d6" (Tables II, III) are rolled as 16 equal entries.
12. Druid 12th-14th level and monk 8th-17th level slot limits (PHB p.21, p.32), assassin guild slots (p.30): not enforced.
13. PHB p.18 "multi-class limited by thief class only": multi-class with a thief wears leather and no shield; with an assassin leather; gnomes in two classes leather (p.16); half-orcs least favourable armour (p.17).
14. App. P Protective items: only one armour kind tried (random among those listed); items above 100% chance are always won. Potion type chosen at random where PHB/DMG says "select or dice".
15. Starting level 1 characters carry no magic (consistent with App. P "adventuring for some time").
16. Level 0 commoners: hit points d6 (house rule; PHB p.34 says a man-at-arms takes about 5).
17. Serjeants are counted within the number of troops encountered (DMG p.30 "1 will be a serjeant").
