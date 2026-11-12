#!/usr/bin/env python3
"""Diff rules.js tables against the 1e book text. usage: audit_tables.py BOOKS_TEXT_DIR   (needs node)"""
import json, re, subprocess, sys, os
books = sys.argv[1] if len(sys.argv) > 1 else '/run/media/tbywater/T7/TIM/AI-WORK/PROJECTS/RPG-STUDIO/ADD-BOOKS-PDF/TEXT'
here = os.path.dirname(os.path.abspath(__file__))
js = "const Q=require('%s/../rules.js');console.log(JSON.stringify({C:Q.C,SL:Q.SLOTS,MERC:Q.MERC,RMIN:Q.RMIN,RMAX:Q.RMAX,LIM:Q.LIM}))" % here
R = json.loads(subprocess.check_output(['node', '-e', js]))
def page(b, n): return open(f'{books}/{b}/p{n:03d}.txt', encoding='utf-8', errors='ignore').read()
bad = 0
def chk(name, got, want):
    global bad
    if got != want: bad += 1; print('DIFF', name, 'rules.js', got, 'book', want)
num = lambda s: int(s.replace(',', ''))
# XP tables: every "lo - hi  level  HD  Title" row on PHB p.20-31; check rules.js level starts appear as (level, lo+1)
rows = set()
# rows the regex cannot read (untitled, open-ended or derived from the 'per level beyond' note); hand-checked against the page
HAND = {('Cleric', 5), ('Cleric', 12), ('Illusionist', 13), ('Thief', 13), ('Assassin', 15), ('Monk', 17)}
for pg in range(20, 32):
    for m in re.finditer(r'([\d,]+)\s*[—-]\s*([\d,]+)\s+(\d+)\s+\d+(?:\s*\+\s*\d+)?\s+[A-Z]', page('PHB', pg)):
        rows.add((int(m.group(3)), num(m.group(1))))
for cls, c in R['C'].items():
    for i, start in enumerate(c['xp']):
        lv = i + 1; lo = start
        if (lv, lo) not in rows and (cls, lv) not in HAND:
            chk(f'PHB XP {cls} level {lv}', start, 'no matching row (lo=%d)' % lo)
# DMG p.29 monthly cost and p.30 numbers table
t29 = page('DMG', 29).replace('\n', ' ')
for k, v in R['MERC'].items():
    name = k.split(' (')[0] if k.startswith('archer') else k
    m = re.search(r'^\s*' + re.escape(k) + r'\s+(\d+)\s*$', page('DMG', 29), re.M)
    if m: chk('DMG p.29 pay ' + k, v['pay'], int(m.group(1)))
t30 = page('DMG', 30)
for k, v in R['MERC'].items():
    m = re.search(r'[\d-]+\s+' + re.escape(k) + r'\s+([\d-]+)\s+([\d-]+)\s+([\d-]+)\s+([\d-]+)', t30, re.M)
    if not m: print('no row', k); continue
    def pr(s): a = s.split('-'); return [int(a[0]), int(a[-1])]
    chk('DMG p.30 qty ' + k, v['q'], [pr(m.group(i)) for i in range(1, 5)])
# PHB p.15 Table III
t15 = page('PHB', 15)
for ab, i in [('STRENGTH', 0), ('INTELLIGENCE', 1), ('WISDOM', 2), ('DEXTERITY', 3), ('CONSTITUTION', 4), ('CHARISMA', 5)]:
    m = re.search(ab + r'\*?\s*M/F[\s\S]*?Min\.\s+([\d/ ]+)\n\s*Max\.\s+([\d/ ]+)', t15) or re.search(ab + r'\s*\n\s*Min\.\s+([\d/ ]+)\n\s*Max\.\s+([\d/ ]+)', t15)
    if not m: print('no row', ab); continue
    mins = [int(x.split('/')[0]) for x in m.group(1).split()]; maxs = [int(x.split('/')[0]) for x in m.group(2).split()]
    for j, r in enumerate(['Dwarf', 'Elf', 'Gnome', 'Half-elf', 'Halfling', 'Half-orc']):
        chk(f'PHB p.15 {r} {ab} min', R['RMIN'][r][i], mins[j]); chk(f'PHB p.15 {r} {ab} max(M)', R['RMAX'][r][i], maxs[j])
print('table audit finished,', bad, 'diffs')
sys.exit(1 if bad else 0)
