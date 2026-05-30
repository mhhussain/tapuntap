import { icon } from '../utils.js';

const SHORTCUTS = [
  { keys: 'N', action: 'Next player / end turn' },
  { keys: 'L', action: 'Toggle game log' },
  { keys: 'S', action: 'Open scry panel' },
  { keys: 'T', action: 'Create token' },
  { keys: 'Esc', action: 'Close modal / deselect' },
];

export function renderSettings(container) {
  container.innerHTML = `
    <div class="topbar">
      <div class="topbar-title">Settings</div>
      <span class="topbar-sub">Preferences</span>
    </div>
    <div class="settings-body">
      <div class="settings-inner">

        <div class="settings-group">
          <div class="settings-group-title">Appearance</div>
          <div class="settings-row" style="border-radius:8px 8px 0 0;border-top:1px solid var(--line-1)">
            <div class="settings-row-label">
              <div class="settings-row-title">Card density</div>
              <div class="settings-row-desc">Compact mode shows smaller cards on the battlefield.</div>
            </div>
            <select class="input" id="density-select" style="width:160px">
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          <div class="settings-row" style="border-radius:0 0 8px 8px">
            <div class="settings-row-label">
              <div class="settings-row-title">Show summoning sickness</div>
              <div class="settings-row-desc">Dim creatures that entered the battlefield this turn.</div>
            </div>
            <button class="toggle-btn" id="toggle-sick" style="background:var(--accent);border-color:var(--accent)">
              <span class="toggle-knob" style="left:17px;background:oklch(0.18 0.015 250)"></span>
            </button>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Data</div>
          <div class="settings-row" style="border-radius:8px 8px 0 0;border-top:1px solid var(--line-1)">
            <div class="settings-row-label">
              <div class="settings-row-title">Card data source</div>
              <div class="settings-row-desc">Card information and images are fetched from Scryfall API.</div>
            </div>
            <span style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--fg-3)">
              <span class="tag tag-good">Connected</span>
              Scryfall API
            </span>
          </div>
          <div class="settings-row" style="border-radius:0 0 8px 8px">
            <div class="settings-row-label">
              <div class="settings-row-title">Local data</div>
              <div class="settings-row-desc">Card data cached in <code style="font-size:11px;background:var(--bg-3);padding:1px 5px;border-radius:3px">data/cards/</code> on the server.</div>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Keyboard shortcuts</div>
          ${SHORTCUTS.map((s, i) => `
            <div class="shortcut-row" style="${i === 0 ? 'border-top:1px solid var(--line-1);border-radius:8px 8px 0 0' : ''}${i === SHORTCUTS.length - 1 ? 'border-radius:0 0 8px 8px' : ''}">
              <span style="flex:1;font-size:13px;color:var(--fg-2)">${s.action}</span>
              <span class="kbd" style="padding:2px 8px">${s.keys}</span>
            </div>
          `).join('')}
        </div>

      </div>
    </div>
  `;

  const densitySel = container.querySelector('#density-select');
  densitySel.value = document.documentElement.getAttribute('data-density') || 'comfortable';
  densitySel.addEventListener('change', () => {
    document.documentElement.setAttribute('data-density', densitySel.value);
  });

  const toggleSick = container.querySelector('#toggle-sick');
  let sickOn = true;
  toggleSick.addEventListener('click', () => {
    sickOn = !sickOn;
    toggleSick.style.background = sickOn ? 'var(--accent)' : 'var(--bg-3)';
    toggleSick.style.borderColor = sickOn ? 'var(--accent)' : 'var(--line-2)';
    toggleSick.querySelector('.toggle-knob').style.left = sickOn ? '17px' : '1px';
    toggleSick.querySelector('.toggle-knob').style.background = sickOn ? 'oklch(0.18 0.015 250)' : 'var(--fg-3)';
  });
}
