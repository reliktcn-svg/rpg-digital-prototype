"""Checks for generated boss preservation across allowed new-game-plus cycle."""
from pathlib import Path
import sys,copy
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import preserve_boss_state
old_boss={'schema':1,'key':'demon','hp':68,'defense':17,'attack':7,'damage':'D12','found':[0,1,2,3], 'injected':[0,1,2,3], 'clueOrder':[0,1,2,3,4,5]}
new_boss={'schema':1,'key':'undead','hp':73,'defense':18,'attack':8,'damage':'2D8','found':[], 'injected':[], 'clueOrder':[5,4,3,2,1,0]}
existing={'ngPlusCycle':0,'gameOver':{'winnerId':'warrior'},'boss':old_boss}
valid={'ngPlusCycle':1,'gameOver':False,'ngPlusStartLevels':{'warrior':16},'boss':copy.deepcopy(new_boss)}
preserve_boss_state(existing,valid)
assert valid['boss']==new_boss,'new boss lost'
unauth={'ngPlusCycle':0,'gameOver':False,'boss':copy.deepcopy(new_boss)}
preserve_boss_state(existing,unauth)
assert unauth['boss']['key']=='demon','boss replaced without NG+ transition'
print('PASS boss rotates only on NG+ transition')
