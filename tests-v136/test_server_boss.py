"""NG+ server accepts level-gated, out-of-order boss clues without allowing early reveals."""
from pathlib import Path
import copy,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import preserve_boss_state

def player(level,who='warrior'):
    return {'id':who,'progressionVersion':2,'masteryPoints':25*(level-1)*(level+8)}

def make_existing(cycle=1,level=20,found=None,injected=None):
    boss={'schema':1,'key':'demon','hp':68,'defense':17,'attack':7,'damage':'D12',
          'clueOrder':[3,0,5,1,4,2],'found':found or [],'injected':injected or [],'heartUnlocked':False}
    return {'ngPlusCycle':cycle,'ngPlusStartLevels':{'warrior':20},'gameOver':False,'boss':boss}

def update(old,level,found=None,injected=None):
    proposed=copy.deepcopy(old['boss']);proposed['found']=list(found or []);proposed['injected']=list(injected or [])
    inc={'ngPlusCycle':old['ngPlusCycle'],'ngPlusStartLevels':{'warrior':1},'gameOver':False,
         'players':[player(level)],'boss':proposed,'decks':{'exploreOuter':{'draw':[489,495,497,499], 'discard':[]},'exploreHeart':{'draw':[490,496,498,500], 'discard':[]}}}
    preserve_boss_state(old,inc)
    return inc
old=make_existing()
assert update(old,21,found=[3],injected=[3])['boss']['found']==[], 'early clue must not be accepted'
at22=update(old,22,found=[],injected=[3]);assert at22['boss']['injected']==[3]
at24=update(old,24,found=[0],injected=[3,0]);assert at24['boss']['found']==[0],at24['boss']
assert at24['boss']['injected']==[3,0],at24['boss']
assert at24['ngPlusStartLevels']=={'warrior':20},'starting level must stay authoritative'
# An earlier clue can be discovered after the second.
at26=update(make_existing(found=[0],injected=[3,0]),26,found=[0,3],injected=[3,0,5]);assert at26['boss']['found']==[0,3]
assert at26['boss']['injected']==[3,0,5]
# In-progress NG+ saves from v0.6.135 may already have a clue in a deck
# before their first +2 level milestone. Do not invalidate that clue.
old_migration=make_existing(found=[],injected=[3])
legacy=update(old_migration,20,found=[3],injected=[3])
assert legacy['boss']['found']==[3] and legacy['boss']['injected']==[3],legacy['boss']
# The old (non-NG+) sequential rules remain unchanged.
standard=make_existing(cycle=0,level=1)
normal=update(standard,3,found=[0],injected=[3,0]);assert normal['boss']['found']==[]
normal=update(standard,4,found=[3],injected=[3]);assert normal['boss']['found']==[3]
print('PASS: NG+ server level milestones, out-of-order discoveries, no early clues, normal mode unchanged')
