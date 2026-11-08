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
