// Local-only browser review of the production Hardcore death flow; all writes stay in memory.
const frame = document.querySelector('iframe');
const start = document.querySelector('#start');
const kill = document.querySelector('#kill');
const failures = document.querySelector('#failures');
const status = document.querySelector('#status');
const diagnostics = document.querySelector('#diagnostics');
const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
let scene = null, starting = false, ready = false, remainingFailures = 0, attempts = 0;
let saves = [], lastLog = '', routes = [];
function snapshot() {
  const game = frame.contentWindow?.__phaserGame;
  const modal = scene?._hardcoreRuntime?.modal;
  const view = modal?.deathView;
  return {
    active: game?.scene.getScenes(true).map(s => s.sys.settings.key) || [],
    gameState: scene?.gameState, ready, attempts, saved: saves.length,
    exhausted: scene?._hardcoreRuntime?.system?.state?.exhausted,
    lives: scene?._hardcoreRuntime?.system?.state?.livesRemaining,
    deaths: scene?._hardcoreRuntime?.system?.state?.deaths,
    deathInProgress: scene?._hardcoreDeathInProgress,
    blocked: scene?._saveWritesBlocked, lifeSaveInProgress: scene?._hardcoreLifeStateSaveInProgress,
    modalVisible: modal?.isVisible, modalMode: modal?.mode, modalReady: view?.ready,
    retryVisible: view?.retryButton?.visible, menuVisible: view?.menuButton?.visible,
    status: view?.status?.text, detail: view?.detail?.text,
    memorials: scene?.hardcoreMemorialStore?.getForSlot?.(3)?.length,
    savedHardcore: saves.at(-1)?.hardcoreModeData,
  };
}
function configure(s) {
  const memory = new Map();
  s.gameSaveCoordinator.discardPending();
  s.gameSaveCoordinator.ports.write = async data => {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 250));
    if (remainingFailures > 0) { remainingFailures--; return false; }
    saves.push(JSON.parse(JSON.stringify(data)));
    return true;
  };
  s.hardcoreMemorialStore.storage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  };
  s._hardcoreRuntime.system.selectMode('hardcore');
  s._hardcoreRuntime.system.arm('death-review');
  s.hardcoreModeData = s._hardcoreRuntime.system.getSaveData();
  s._saveWritesBlocked = false;
  s.playerController.fillGemPower();
  scene = s; ready = true; starting = false;
}
start.addEventListener('click', () => {
  if (!local) return;
  const game = frame.contentWindow.__phaserGame;
  const menu = ['MainMenuScene', 'StartMenuScene'].find(key => game?.scene.isActive(key));
  if (!menu || starting) return;
  scene = null; ready = false; starting = true; attempts = 0; saves = [];
  remainingFailures = Number(failures.value);
  game.scene.getScene(menu).scene.start('WorldLoadScene', {
    saveSlot: 3, worldIdentity: 'hardcore-death-review-20260907',
    isNewSave: true, tutorialChoice: 'no',
    hardcoreModeData: { mode: 'hardcore', armed: true },
  });
});
kill.addEventListener('click', () => {
  if (!local || !ready || !scene || scene._hardcoreDeathInProgress) return;
  const amount = scene.playerController.getGemPowerExact();
  scene.playerController.consumeGemPower(amount, { source: 'cave-hazard' });
});
setInterval(() => {
  if (!local) { status.textContent = 'Review is restricted to localhost.'; return; }
  const game = frame.contentWindow?.__phaserGame;
  const playing = game?.scene.isActive('PlayScene');
  const s = playing ? game.scene.getScene('PlayScene') : null;
  if (starting && s?.gameState === 'playing' && s.playerController && s._hardcoreRuntime
      && frame.contentWindow.__jkdE2E) configure(s);
  start.disabled = starting || !['MainMenuScene', 'StartMenuScene'].some(key => game?.scene.isActive(key));
  kill.disabled = !ready || !playing || scene?._hardcoreDeathInProgress === true;
  const state = snapshot();
  status.textContent = state.active.join(', ') + ' | attempts ' + attempts
    + ' | saved ' + saves.length + (state.status ? ' | ' + state.status : '');
  diagnostics.textContent = JSON.stringify(state, null, 2);
  const log = JSON.stringify({ active: state.active, attempts, saved: saves.length,
    mode: state.modalMode, ready: state.modalReady, blocked: state.blocked });
  if (log !== lastLog) { console.info('[HardcoreDeathQA] ' + log); lastLog = log; }
}, 250);
window.addEventListener('beforeunload', () => { if (scene) scene._saveWritesBlocked = true; });

