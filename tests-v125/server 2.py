import importlib.util, pathlib, copy
p=pathlib.Path(__file__).resolve().parents[1]/'server.py'
import sys
sys.path.insert(0,str(p.parent))
spec=importlib.util.spec_from_file_location('game_server',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
old={'boss':{'found':[0,1,2,3],'injected':[0,1,2,3],'hp':60},'players':[]}
new=copy.deepcopy(old);new['boss']['fullyRevealed']=True;new['combat']={'isBoss':True};m.preserve_boss_state(old,new);assert new['boss']['fullyRevealed']
next_state=copy.deepcopy(new);next_state['combat']=None;next_state['boss']['fullyRevealed']=False;m.preserve_boss_state(new,next_state);assert next_state['boss']['fullyRevealed']
blocked=copy.deepcopy(old);blocked['boss']['fullyRevealed']=True;m.preserve_boss_state(old,blocked);assert not blocked['boss']['fullyRevealed']
print('PASS: shared boss reveal on combat, persistent after combat, no unrelated reveal')

old={'boss':{'key':'demon','hp':60,'defense':17,'attack':7,'found':[],'injected':[4],'clueOrder':[4,2,0,5,1,3]},'players':[{'masteryPoints':10000,'progressionVersion':2}]}
new=copy.deepcopy(old);new['boss']['found']=[4];new['boss']['clueOrder']=[0,1,2,3,4,5]
m.preserve_boss_state(old,new)
assert new['boss']['found']==[4] and new['boss']['clueOrder']==[4,2,0,5,1,3]
bad=copy.deepcopy(old);bad['boss']['found']=[0];m.preserve_boss_state(old,bad);assert bad['boss']['found']==[]
low=copy.deepcopy(old);low['players']=[];low['boss']['found']=[4];m.preserve_boss_state(old,low);assert low['boss']['found']==[]
print('PASS: shuffled discoveries, immutable order, wrong order rejected, level threshold preserved')
