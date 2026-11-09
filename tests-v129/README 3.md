# v0.6.129 smoke tests

Run from the project root:

```bash
python3 -m unittest discover -s tests-v129 -p 'test_*.py' -v
python3 -m py_compile server.py network_storage.py
node --check app.js && node --check solo-saves.js && node --check network-lobby.js && node --check sw.js && node --check update-client.js
python3 asset_manifest.py
```

Additional HTTP integration checks done on a temporary server with a private SQLite path: create room, join second player, select heroes, start, initialize game, check presence, stop process, restart, resume authenticated room, and read retained game revision/state.

Browser UI was exercised in headless Chromium using in-memory DOM and a mocked IndexedDB layer (choose slot, write, load). That is **not** a substitute for checking real IndexedDB, Service Worker, Safari or Android touch scrolling on devices. Chrome's network-navigation policy blocked opening `localhost` in the automated test environment.
