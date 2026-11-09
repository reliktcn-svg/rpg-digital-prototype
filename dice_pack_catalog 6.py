"""Read-only discovery of independent dice packs. Re-scanned on every request."""
from pathlib import Path
import re

def dice_pack_catalog(root):
    base = Path(root) / 'assets' / 'dice' / 'packs'
    manifests = []
    if base.is_dir():
        for folder in sorted(base.iterdir(), key=lambda p: p.name):
            if (not folder.is_symlink() and folder.is_dir()
                    and re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,63}', folder.name)
                    and (folder / 'pack.json').is_file()
                    and not (folder / 'pack.json').is_symlink()):
                manifests.append('assets/dice/packs/' + folder.name + '/pack.json')
    return {'format': 'rpg-dice-catalog-v1', 'packs': manifests}
