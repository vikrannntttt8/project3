import { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import {
  getAuthConfig,
  saveAuthConfig,
  extractSapisid,
  parseAndValidateOAuthJson,
  testSyncConnection,
} from '../../utils/authSync.js';

export default function SettingsModal({ isOpen, onClose }) {
  const { liked, playlists, customAlbums } = usePlayer();
  const [audioQuality, setAudioQuality] = useState(() => localStorage.getItem('pulse_audio_quality') || 'high');
  const [normalizeAudio, setNormalizeAudio] = useState(() => localStorage.getItem('pulse_normalize_audio') !== 'false');

  // ── Auth & InnerTube Sync state ──────────────────────────────────
  const [authConfig, setAuthConfig] = useState(getAuthConfig);
  const [authTab, setAuthTab] = useState(() => getAuthConfig().mode || 'sapisid'); // 'sapisid' | 'oauth'
  const [sapisidInput, setSapisidInput] = useState(() => getAuthConfig().sapisid || '');
  const [oauthJsonInput, setOauthJsonInput] = useState(() => getAuthConfig().oauthJson || '');
  const [jsonError, setJsonError] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [saveToast, setSaveToast] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const cfg = getAuthConfig();
      setAuthConfig(cfg);
      setAuthTab(cfg.mode || 'sapisid');
      setSapisidInput(cfg.sapisid || '');
      setOauthJsonInput(cfg.oauthJson || '');
      setJsonError('');
      setTestResult(null);
    }
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleQualityChange = (val) => {
    setAudioQuality(val);
    localStorage.setItem('pulse_audio_quality', val);
  };

  const handleNormalizeToggle = () => {
    const next = !normalizeAudio;
    setNormalizeAudio(next);
    localStorage.setItem('pulse_normalize_audio', String(next));
  };

  // Save Auth Credentials
  const handleSaveAuth = () => {
    setJsonError('');
    setTestResult(null);

    let updatedConfig = { ...authConfig, mode: authTab };

    if (authTab === 'sapisid') {
      const cleaned = sapisidInput.trim();
      const extracted = extractSapisid(cleaned);
      updatedConfig = {
        ...updatedConfig,
        sapisid: extracted,
        status: extracted ? 'unconfigured' : 'unconfigured',
        errorMessage: '',
      };
    } else {
      // Validate OAuth JSON payload
      try {
        const validated = parseAndValidateOAuthJson(oauthJsonInput);
        updatedConfig = {
          ...updatedConfig,
          oauthJson: oauthJsonInput.trim(),
          oauthData: validated,
          status: 'unconfigured',
          errorMessage: '',
        };
      } catch (err) {
        setJsonError(err.message);
        return;
      }
    }

    saveAuthConfig(updatedConfig);
    setAuthConfig(updatedConfig);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  // Test Sync Action
  const handleTestSync = async () => {
    // First save any current inputs
    handleSaveAuth();

    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await testSyncConnection();
      setTestResult(res);
      setAuthConfig(getAuthConfig());
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Verification failed' });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen bg-[#09090B]/95 backdrop-blur-2xl flex flex-col overflow-hidden animate-page-slide">
      {/* ── Full-Screen Header with Navigation & Close ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 sm:px-12 py-5 border-b border-white/10 bg-[#09090B]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors text-label-md"
            title="Go back"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-violet/20 border border-brand-violet/30 flex items-center justify-center text-brand-violet">
              <span className="material-symbols-outlined text-[22px]">settings</span>
            </div>
            <div>
              <h1 className="text-headline-sm sm:text-headline-md font-bold text-white tracking-tight">
                Settings & Parity Sync
              </h1>
              <p className="text-body-sm text-outline hidden sm:block">
                Configure audio engines, InnerTube authentication, and account sync
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
          title="Close Settings"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </header>

      {/* ── Scrollable Settings Body ── */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-12 py-8 max-w-4xl mx-auto w-full space-y-8 scroll-smooth">
        {/* Save confirmation toast */}
        {saveToast && (
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-label-md flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Auth credentials saved to local encrypted vault.</span>
          </div>
        )}

        {/* ── SECTION 1: InnerTube & Account Sync (Module 2 Parity) ── */}
        <section className="p-6 rounded-3xl glass-panel border border-white/10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-brand-violet text-[24px]">sync_alt</span>
                <h2 className="text-headline-sm font-bold text-white">InnerTube & Account Sync</h2>
              </div>
              <p className="text-body-sm text-outline">
                Dual SAPISID cookie and OAuth JSON credential injection for personal playlist sync & full YT Music parity
              </p>
            </div>

            {/* Live Connection Status Badge */}
            <div className="flex-shrink-0">
              {authConfig.status === 'connected' ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-label-sm font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Connected / Sync Active
                </span>
              ) : authConfig.status === 'expired' ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-label-sm font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Session Expired (401)
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-label-sm font-medium bg-white/10 text-white/70 border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                  Unverified / Standalone
                </span>
              )}
            </div>
          </div>

          {/* Multi-Tab Selector */}
          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/10 max-w-md">
            <button
              type="button"
              onClick={() => { setAuthTab('sapisid'); setJsonError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-label-md font-semibold transition-all ${
                authTab === 'sapisid'
                  ? 'bg-brand-violet text-white shadow-lg shadow-brand-violet/20'
                  : 'text-outline hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">cookie</span>
              <span>Cookie / SAPISID</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthTab('oauth'); setJsonError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-label-md font-semibold transition-all ${
                authTab === 'oauth'
                  ? 'bg-brand-cyan text-black shadow-lg shadow-brand-cyan/20'
                  : 'text-outline hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">key</span>
              <span>OAuth JSON Blob</span>
            </button>
          </div>

          {/* Tab A: Cookie / SAPISID */}
          {authTab === 'sapisid' && (
            <div className="space-y-3">
              <label className="text-label-md uppercase tracking-wider text-outline font-semibold block">
                SAPISID String or Raw Cookie Header
              </label>
              <p className="text-body-sm text-outline">
                Paste your <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">SAPISID</code> token or your full YouTube cookie string. Pulse Music dynamically computes the <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">SAPISIDHASH</code> web signature for authenticated requests.
              </p>
              <input
                type="password"
                value={sapisidInput}
                onChange={(e) => setSapisidInput(e.target.value)}
                placeholder="Paste SAPISID token or cookie string..."
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white placeholder-outline text-body-md focus:outline-none focus:border-brand-violet/70 focus:ring-1 focus:ring-brand-violet/70 transition-all font-mono"
              />
            </div>
          )}

          {/* Tab B: OAuth JSON Blob */}
          {authTab === 'oauth' && (
            <div className="space-y-3">
              <label className="text-label-md uppercase tracking-wider text-outline font-semibold block">
                OAuth 2.0 Credentials JSON Payload
              </label>
              <p className="text-body-sm text-outline">
                Paste your InnerTube OAuth JSON blob containing at least <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">access_token</code> (and optionally <code className="text-white bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">refresh_token</code>).
              </p>
              <textarea
                rows={4}
                value={oauthJsonInput}
                onChange={(e) => {
                  setOauthJsonInput(e.target.value);
                  setJsonError('');
                }}
                placeholder='{&#10;  "access_token": "ya29....",&#10;  "refresh_token": "1//...",&#10;  "token_type": "Bearer"&#10;}'
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white placeholder-outline text-body-sm focus:outline-none focus:border-brand-cyan/70 focus:ring-1 focus:ring-brand-cyan/70 transition-all font-mono"
              />
              {jsonError && (
                <p className="text-body-sm text-brand-pink flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{jsonError}</span>
                </p>
              )}
            </div>
          )}

          {/* Actions: Save Credentials + Test Sync */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveAuth}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-label-md border border-white/10 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>Save Configuration</span>
            </button>

            <button
              type="button"
              onClick={handleTestSync}
              disabled={testLoading}
              className="px-5 py-2.5 rounded-xl bg-brand-violet hover:bg-brand-violet/90 text-white font-semibold text-label-md shadow-lg shadow-brand-violet/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {testLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">network_check</span>
                  <span>Test Sync Connection</span>
                </>
              )}
            </button>
          </div>

          {/* Test feedback alert */}
          {testResult && (
            <div className={`p-4 rounded-2xl border text-body-sm flex items-center gap-3 animate-fade-in ${
              testResult.success
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}>
              <span className="material-symbols-outlined text-[22px] flex-shrink-0">
                {testResult.success ? 'verified' : 'warning'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{testResult.success ? 'Connection Verified' : 'Sync Ping Failed'}</p>
                <p className="text-white/80 text-xs mt-0.5">{testResult.message}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── SECTION 2: YouTube Audio Engine & Stream Parity ── */}
        <section className="p-6 rounded-3xl glass-panel border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
            <span className="material-symbols-outlined text-brand-violet text-[24px]">music_note</span>
            <div>
              <h2 className="text-headline-sm font-bold text-white">Playback & Audio Engine</h2>
              <p className="text-body-sm text-outline">Bulletproof YouTube IFrame Audio Streaming (Zero 30s Caps)</p>
            </div>
          </div>

          {/* Audio Engine Notice */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <span className="material-symbols-outlined text-brand-violet text-[24px] flex-shrink-0 mt-0.5">verified_user</span>
            <div className="space-y-1">
              <p className="text-label-lg font-semibold text-white">Native YouTube IFrame Audio Engine</p>
              <p className="text-body-sm text-outline">
                Direct embedded YouTube engine eliminates CORS failures, Invidious/Piped server downtimes, and 30-second preview caps. Full-length music streaming parity guaranteed.
              </p>
            </div>
          </div>

          {/* Playback Quality */}
          <div className="space-y-2">
            <label className="text-label-md uppercase tracking-wider text-outline font-semibold block">
              Audio Bitrate Parity
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'high', title: 'Maximum Quality', desc: 'Opus / 320kbps Parity' },
                { id: 'medium', title: 'Standard Quality', desc: '160kbps AAC/WebM' },
                { id: 'data-saver', title: 'Data Saver', desc: '96kbps Low Bandwidth' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleQualityChange(opt.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    audioQuality === opt.id
                      ? 'bg-brand-violet/20 border-brand-violet text-white shadow-lg shadow-brand-violet/10 font-semibold'
                      : 'bg-white/5 border-white/10 text-outline hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <p className="text-label-md font-semibold text-white">{opt.title}</p>
                  <p className="text-body-xs text-outline mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Normalization Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex flex-col">
              <span className="text-label-lg font-semibold text-white">Audio Loudness Normalization</span>
              <span className="text-body-sm text-outline">Prevents sudden volume spikes across different YouTube audio sources</span>
            </div>
            <button
              type="button"
              onClick={handleNormalizeToggle}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                normalizeAudio ? 'bg-brand-violet' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  normalizeAudio ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* ── SECTION 3: Storage & Persistence ── */}
        <section className="p-6 rounded-3xl glass-panel border border-white/10 shadow-2xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
            <span className="material-symbols-outlined text-brand-pink text-[24px]">database</span>
            <div>
              <h2 className="text-headline-sm font-bold text-white">Storage & Local Persistence</h2>
              <p className="text-body-sm text-outline">Encrypted browser-side cache and playlists</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-label-md text-outline">Liked Tracks</p>
                <p className="text-headline-sm font-bold text-white mt-1">{liked.length}</p>
              </div>
              <span className="material-symbols-outlined text-brand-pink text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                favorite
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-label-md text-outline">Playlists & Custom Albums</p>
                <p className="text-headline-sm font-bold text-white mt-1">
                  {playlists.length + (customAlbums?.length || 0)}
                </p>
              </div>
              <span className="material-symbols-outlined text-brand-cyan text-[28px]">
                queue_music
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 flex items-center justify-between px-6 sm:px-12 py-4 border-t border-white/10 bg-[#09090B]/80 backdrop-blur-md">
        <span className="text-label-sm text-outline font-mono">Pulse Music Parity Engine · v3.0</span>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-full bg-white text-black font-bold text-label-md hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
          Done
        </button>
      </footer>
    </div>
  );
}
