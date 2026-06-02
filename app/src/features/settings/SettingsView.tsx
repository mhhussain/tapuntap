import { useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";

export function SettingsView() {
  const { user, signOutUser } = useAuth();
  const [density, setDensity] = useState(localStorage.getItem("density") || "comfortable");

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
    localStorage.setItem("density", density);
  }, [density]);

  return (
    <>
      <div className="topbar"><div className="topbar-title">Settings</div></div>
      <div className="settings-body"><div className="settings-inner">
        <div className="settings-group">
          <div className="settings-group-title">Appearance</div>
          <div className="settings-row">
            <div className="settings-row-label">
              <div className="settings-row-title">Card density</div>
              <div className="settings-row-desc">Compact shows smaller cards on the battlefield.</div>
            </div>
            <select className="input" style={{ width: 160 }} value={density} onChange={(e) => setDensity(e.target.value)}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>
        </div>
        <div className="settings-group">
          <div className="settings-group-title">Data</div>
          <div className="settings-row">
            <div className="settings-row-label">
              <div className="settings-row-title">Card data source</div>
              <div className="settings-row-desc">Cards and images are fetched from the Scryfall API and cached in Firestore.</div>
            </div>
            <span className="tag tag-good">Scryfall</span>
          </div>
        </div>
        <div className="settings-group">
          <div className="settings-group-title">Account</div>
          <div className="settings-row">
            <div className="settings-row-label">
              <div className="settings-row-title">Signed in as</div>
              <div className="settings-row-desc">{user?.email || user?.displayName}</div>
            </div>
            <button className="btn btn-secondary" onClick={() => signOutUser()}>Sign out</button>
          </div>
        </div>
      </div></div>
    </>
  );
}
