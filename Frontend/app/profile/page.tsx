'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import teamService, { TeamMembership, Subteam, saveSubteamContext } from '../../services/team.service';
import {
  Plus,
  KeyRound,
  LogOut,
  Sun,
  Moon,
  Eye,
  EyeOff,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  Phone,
  LayoutDashboard,
  Users,
} from 'lucide-react';

type ModalType = 'create' | 'join' | 'telegram' | null;
interface FormMessage { type: 'success' | 'error' | ''; text: string; }

export default function ProfilePage() {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [newSubteamInputs, setNewSubteamInputs] = useState<Record<string, string>>({});
  const [subteamCreating, setSubteamCreating] = useState<Record<string, boolean>>({});
  const [subteamError, setSubteamError] = useState<Record<string, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => { fetchTeams(); }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function fetchTeams() {
    try {
      setTeamsLoading(true);
      const res = await teamService.getMyTeams();
      setTeams(res.data);
    } catch { setTeams([]); }
    finally { setTeamsLoading(false); }
  }

  function toggleTeamExpand(teamId: string) {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  }

  async function handleDeleteTeam(teamId: string) {
    if (!window.confirm('Delete this team? This cannot be undone.')) return;
    try {
      await teamService.deleteTeam(teamId);
      fetchTeams();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to delete team'); }
  }

  async function handleCreateSubteam(teamId: string) {
    const name = (newSubteamInputs[teamId] || '').trim();
    if (!name) return;
    setSubteamCreating(prev => ({ ...prev, [teamId]: true }));
    setSubteamError(prev => ({ ...prev, [teamId]: '' }));
    try {
      await teamService.createSubteam(teamId, name);
      setNewSubteamInputs(prev => ({ ...prev, [teamId]: '' }));
      fetchTeams();
    } catch (err) {
      setSubteamError(prev => ({ ...prev, [teamId]: err instanceof Error ? err.message : 'Failed' }));
    } finally {
      setSubteamCreating(prev => ({ ...prev, [teamId]: false }));
    }
  }

  async function handleDeleteSubteam(teamId: string, subId: string) {
    if (!window.confirm('Delete this subteam and its dashboard data?')) return;
    try {
      await teamService.deleteSubteam(teamId, subId);
      fetchTeams();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to delete subteam'); }
  }

  function handleOpenDashboard(team: TeamMembership, sub: Subteam) {
    saveSubteamContext({
      teamId: team.id,
      teamName: team.name,
      subteamId: sub.id,
      subteamName: sub.name,
      fastApiRunId: sub.fastApiRunId,
      djangoEventLogId: sub.djangoEventLogId,
      teamRole: team.role,
    });
    router.push('/Home/Dashboard/Anomaly-detection-Dashboard');
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-bg-primary' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 border-b transition-colors duration-200 ${isDark ? 'bg-bg-primary border-border-primary' : 'bg-white border-gray-200'}`}>
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/Home')}>
            <div className="w-7 h-7 bg-nobel-gold rounded-full flex items-center justify-center text-white font-bold text-sm">P</div>
            <span className={`font-semibold text-sm tracking-wide ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>P2P Insight</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className={`p-2 rounded-md transition-colors ${isDark ? 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-bg-secondary text-text-primary' : 'hover:bg-gray-100 text-gray-900'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${isDark ? 'bg-surface-elevated text-text-primary' : 'bg-gray-200 text-gray-700'}`}>
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{user?.fullName}</span>
                <ChevronDown size={14} className={isDark ? 'text-text-secondary' : 'text-gray-400'} />
              </button>
              {dropdownOpen && (
                <div className={`absolute right-0 mt-1 w-48 py-1 rounded-md border shadow-sm z-40 ${isDark ? 'bg-bg-secondary border-border-primary' : 'bg-white border-gray-200'}`}>
                  <div className={`px-3 py-2 border-b text-xs ${isDark ? 'border-border-primary text-text-secondary' : 'border-gray-100 text-gray-500'}`}>{user?.email}</div>
                  <button onClick={() => { setDropdownOpen(false); setActiveModal('telegram'); }} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${isDark ? 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                    <Phone size={14} /> Link Telegram
                  </button>
                  <button onClick={() => { logout(); router.push('/auth'); }} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${isDark ? 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1200px] mx-auto px-6 py-10">
        <h2 className={`text-2xl font-semibold mb-8 ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>
          Welcome back, {user?.fullName || 'User'}
        </h2>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          <button onClick={() => setActiveModal('create')} className={`group text-left p-6 rounded-lg border transition-colors ${isDark ? 'bg-bg-secondary border-border-primary hover:border-nobel-gold/60' : 'bg-white border-gray-200 hover:border-gray-400'}`}>
            <div className={`mb-4 transition-colors ${isDark ? 'text-text-secondary group-hover:text-nobel-gold' : 'text-gray-400 group-hover:text-gray-700'}`}><Plus size={20} strokeWidth={1.5} /></div>
            <h3 className={`text-base font-semibold mb-1 ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>Create a Team</h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-text-secondary' : 'text-gray-500'}`}>Set up a new team workspace and invite members with a join password.</p>
          </button>
          <button onClick={() => setActiveModal('join')} className={`group text-left p-6 rounded-lg border transition-colors ${isDark ? 'bg-bg-secondary border-border-primary hover:border-nobel-gold/60' : 'bg-white border-gray-200 hover:border-gray-400'}`}>
            <div className={`mb-4 transition-colors ${isDark ? 'text-text-secondary group-hover:text-nobel-gold' : 'text-gray-400 group-hover:text-gray-700'}`}><KeyRound size={20} strokeWidth={1.5} /></div>
            <h3 className={`text-base font-semibold mb-1 ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>Join a Team</h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-text-secondary' : 'text-gray-500'}`}>Enter a team name and join password to become a member.</p>
          </button>
        </div>

        {/* Teams List */}
        {teamsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Loading teams…</div>
        ) : teams.length === 0 ? (
          <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-text-secondary' : 'text-gray-400'}`}>
            <AlertCircle size={14} /> No teams yet — create or join one above
          </div>
        ) : (
          <div>
            <p className={`text-sm font-medium mb-3 ${isDark ? 'text-text-secondary' : 'text-gray-500'}`}>Your teams</p>
            <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-border-primary' : 'border-gray-200'}`}>
              {teams.map((team, idx) => {
                const isExpanded = !!expandedTeams[team.id];
                const isAdmin = team.role === 'admin';
                return (
                  <div key={team.id} className={idx > 0 ? (isDark ? 'border-t border-border-primary' : 'border-t border-gray-100') : ''}>
                    {/* Team row */}
                    <div className={`flex items-center justify-between px-4 py-3 ${isDark ? 'bg-bg-secondary' : 'bg-white'}`}>
                      <button className="flex items-center gap-3 flex-1 text-left" onClick={() => toggleTeamExpand(team.id)}>
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold ${isDark ? 'bg-surface-elevated text-text-primary' : 'bg-gray-100 text-gray-700'}`}>
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>{team.name}</p>
                          <p className={`text-xs ${isDark ? 'text-text-secondary' : 'text-gray-500'}`}>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''} · {team.subteams.length} subteam{team.subteams.length !== 1 ? 's' : ''}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded border ${isAdmin ? (isDark ? 'border-nobel-gold/30 text-nobel-gold bg-nobel-gold/5' : 'border-amber-200 text-amber-700 bg-amber-50') : (isDark ? 'border-border-primary text-text-secondary' : 'border-gray-200 text-gray-500')}`}>
                          {team.role}
                        </span>
                        <button onClick={() => toggleTeamExpand(team.id)} className={`p-1 rounded transition-colors ${isDark ? 'text-text-secondary hover:text-text-primary' : 'text-gray-400 hover:text-gray-700'}`}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDeleteTeam(team.id)} className={`p-1.5 rounded transition-colors ${isDark ? 'text-text-secondary hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`} title="Delete team">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subteams panel */}
                    {isExpanded && (
                      <div className={`px-4 pb-3 ${isDark ? 'bg-bg-primary/40' : 'bg-gray-50'}`}>
                        {team.subteams.length === 0 && !isAdmin && (
                          <p className={`text-xs py-2 ${isDark ? 'text-text-secondary' : 'text-gray-400'}`}>No subteams yet.</p>
                        )}
                        {team.subteams.map(sub => (
                          <div key={sub.id} className={`flex items-center justify-between py-2 border-b last:border-0 ${isDark ? 'border-border-primary/50' : 'border-gray-200/70'}`}>
                            <div className="flex items-center gap-2">
                              <Users size={14} className={isDark ? 'text-text-secondary' : 'text-gray-400'} />
                              <span className={`text-sm ${isDark ? 'text-text-primary' : 'text-gray-800'}`}>{sub.name}</span>
                              {sub.fastApiRunId && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                  data
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleOpenDashboard(team, sub)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${isDark ? 'bg-nobel-gold text-bg-primary hover:bg-yellow-500' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                                <LayoutDashboard size={12} /> Open
                              </button>
                              {isAdmin && (
                                <button onClick={() => handleDeleteSubteam(team.id, sub.id)} className={`p-1 rounded transition-colors ${isDark ? 'text-text-secondary hover:text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`} title="Delete subteam">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Create subteam — admin only */}
                        {isAdmin && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={newSubteamInputs[team.id] || ''}
                              onChange={e => setNewSubteamInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') handleCreateSubteam(team.id); }}
                              placeholder="New subteam name"
                              className={`flex-1 pl-2.5 pr-2 py-1.5 rounded border text-xs outline-none transition-colors ${isDark ? 'bg-bg-primary border-border-primary text-text-primary placeholder-text-secondary focus:border-nobel-gold' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'}`}
                            />
                            <button
                              onClick={() => handleCreateSubteam(team.id)}
                              disabled={subteamCreating[team.id] || !newSubteamInputs[team.id]?.trim()}
                              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${isDark ? 'bg-nobel-gold text-bg-primary hover:bg-yellow-500' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                            >
                              {subteamCreating[team.id] ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            </button>
                          </div>
                        )}
                        {subteamError[team.id] && (
                          <p className="mt-1 text-xs text-red-500">{subteamError[team.id]}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {activeModal === 'create' && (
        <CreateTeamModal isDark={isDark} onClose={() => setActiveModal(null)} onSuccess={() => { setActiveModal(null); fetchTeams(); }} />
      )}
      {activeModal === 'join' && (
        <JoinTeamModal isDark={isDark} onClose={() => setActiveModal(null)} onSuccess={() => { setActiveModal(null); fetchTeams(); }} />
      )}
      {activeModal === 'telegram' && (
        <TelegramModal isDark={isDark} token={token} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}

// ─── Create Team Modal ────────────────────────────────────────────────────────
function CreateTeamModal({ isDark, onClose, onSuccess }: { isDark: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<FormMessage>({ type: '', text: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    if (joinPassword !== confirmPassword) { setMsg({ type: 'error', text: 'Passwords do not match' }); return; }
    setLoading(true);
    try {
      const res = await teamService.create({ name, joinPassword, confirmPassword });
      setMsg({ type: 'success', text: res.message });
      setTimeout(onSuccess, 1000);
    } catch (err) { setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' }); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell isDark={isDark} onClose={onClose} title="Create a Team">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField isDark={isDark} label="Team Name">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Procurement Alpha" className={inputClass(isDark)} required />
        </FormField>
        <FormField isDark={isDark} label="Set Join Password">
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} value={joinPassword} onChange={e => setJoinPassword(e.target.value)} placeholder="Password for others to join" className={inputClass(isDark, true)} required minLength={4} />
            <PasswordToggle isDark={isDark} show={showPass} onToggle={() => setShowPass(!showPass)} />
          </div>
        </FormField>
        <FormField isDark={isDark} label="Confirm Password">
          <div className="relative">
            <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter join password" className={inputClass(isDark, true)} required />
            <PasswordToggle isDark={isDark} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
          </div>
        </FormField>
        <MessageBanner message={msg} isDark={isDark} />
        <button type="submit" disabled={loading} className={submitBtnClass(isDark)}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {loading ? 'Creating…' : 'Create Team'}
        </button>
      </form>
    </ModalShell>
  );
}

// ─── Join Team Modal ───────────────────────────────────────────────────────────
function JoinTeamModal({ isDark, onClose, onSuccess }: { isDark: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<FormMessage>({ type: '', text: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setLoading(true);
    try {
      const res = await teamService.join({ name, joinPassword });
      setMsg({ type: 'success', text: res.message });
      setTimeout(onSuccess, 1000);
    } catch (err) { setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' }); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell isDark={isDark} onClose={onClose} title="Join a Team">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField isDark={isDark} label="Team Name">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter team name" className={inputClass(isDark)} required />
        </FormField>
        <FormField isDark={isDark} label="Join Password">
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} value={joinPassword} onChange={e => setJoinPassword(e.target.value)} placeholder="Password provided by admin" className={inputClass(isDark, true)} required />
            <PasswordToggle isDark={isDark} show={showPass} onToggle={() => setShowPass(!showPass)} />
          </div>
        </FormField>
        <MessageBanner message={msg} isDark={isDark} />
        <button type="submit" disabled={loading} className={submitBtnClass(isDark)}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {loading ? 'Joining…' : 'Request Access'}
        </button>
      </form>
    </ModalShell>
  );
}

// ─── Telegram Modal ───────────────────────────────────────────────────────────
function TelegramModal({ isDark, token, onClose }: { isDark: boolean; token: string | null; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<FormMessage>({ type: '', text: '' });

  const phoneValid = /^\+?[0-9]{7,15}$/.test(phone);
  const chatIdValid = /^[0-9]{5,15}$/.test(chatId.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    if (!token) { setMsg({ type: 'error', text: 'Not authenticated. Please sign in again.' }); return; }
    if (!phoneValid) { setMsg({ type: 'error', text: 'Invalid phone number. Use 7–15 digits, optional leading +.' }); return; }
    if (!chatIdValid) { setMsg({ type: 'error', text: 'Invalid chat ID. Must be a numeric ID from @userinfobot.' }); return; }
    setLoading(true);
    try {
      const res = await fetch('https://amrfawzy26.app.n8n.cloud/webhook/register-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, telegramPhone: phone, telegramChatId: chatId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
      setMsg({ type: 'success', text: data?.message || 'Telegram account linked successfully.' });
      setTimeout(onClose, 2200);
    } catch (err) { setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' }); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell isDark={isDark} onClose={onClose} title="Link Telegram">
      <div className={`mb-4 px-3 py-3 rounded-md border text-sm ${isDark ? 'bg-bg-primary border-border-primary' : 'bg-gray-50 border-gray-200'}`}>
        <p className={`font-medium mb-1.5 ${isDark ? 'text-text-primary' : 'text-gray-800'}`}>How to get your Chat ID</p>
        <ol className={`space-y-1 text-xs list-decimal list-inside ${isDark ? 'text-text-secondary' : 'text-gray-500'}`}>
          <li>Open Telegram and search <span className={`font-mono px-1 rounded ${isDark ? 'bg-surface-elevated text-text-primary' : 'bg-gray-200 text-gray-800'}`}>@p2p_insight_bot</span>, send <span className={`font-mono px-1 rounded ${isDark ? 'bg-surface-elevated text-text-primary' : 'bg-gray-200 text-gray-800'}`}>/start</span></li>
          <li>Then search <span className={`font-mono px-1 rounded ${isDark ? 'bg-surface-elevated text-text-primary' : 'bg-gray-200 text-gray-800'}`}>@userinfobot</span> and send it any message</li>
          <li>Copy the numeric <span className={`font-mono px-1 rounded ${isDark ? 'bg-surface-elevated text-text-primary' : 'bg-gray-200 text-gray-800'}`}>Id:</span> it replies with</li>
        </ol>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField isDark={isDark} label="Phone Number">
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value.trim())} placeholder="+201234567890" className={inputClass(isDark)} required />
          <p className={`mt-1 text-xs ${isDark ? 'text-text-secondary' : 'text-gray-400'}`}>Include country code, e.g. +20 for Egypt</p>
        </FormField>
        <FormField isDark={isDark} label="Chat ID">
          <input type="text" value={chatId} onChange={e => setChatId(e.target.value.trim())} placeholder="e.g. 123456789" className={inputClass(isDark)} required />
          <p className={`mt-1 text-xs ${isDark ? 'text-text-secondary' : 'text-gray-400'}`}>Numeric ID from @userinfobot — not your username</p>
        </FormField>
        <MessageBanner message={msg} isDark={isDark} />
        <button type="submit" disabled={loading || !phone} className={submitBtnClass(isDark)}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
          {loading ? 'Linking…' : 'Link Number'}
        </button>
      </form>
    </ModalShell>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────
function ModalShell({ isDark, onClose, title, children }: { isDark: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className={`relative w-full max-w-md rounded-lg border p-6 shadow-sm ${isDark ? 'bg-bg-secondary border-border-primary' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>{title}</h3>
          <button onClick={onClose} className={`p-1 rounded transition-colors ${isDark ? 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ isDark, label, children }: { isDark: boolean; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-text-primary' : 'text-gray-700'}`}>{label}</label>
      {children}
    </div>
  );
}

function PasswordToggle({ isDark, show, onToggle }: { isDark: boolean; show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-text-secondary hover:text-nobel-gold' : 'text-gray-400 hover:text-gray-700'}`}>
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

function MessageBanner({ message, isDark }: { message: FormMessage; isDark: boolean }) {
  if (!message.text) return null;
  const ok = message.type === 'success';
  return (
    <div className={`px-3 py-2.5 rounded-md text-sm border ${ok ? (isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-700 border-green-200') : (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200')}`}>
      {message.text}
    </div>
  );
}

function inputClass(isDark: boolean, hasEye = false) {
  return `w-full pl-3 ${hasEye ? 'pr-10' : 'pr-3'} py-2.5 rounded-md border text-sm outline-none transition-colors ${isDark ? 'bg-bg-primary border-border-primary text-text-primary placeholder-text-secondary focus:border-nobel-gold' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:bg-white'}`;
}

function submitBtnClass(isDark: boolean) {
  return `w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 ${isDark ? 'bg-nobel-gold text-bg-primary hover:bg-yellow-500' : 'bg-gray-900 text-white hover:bg-gray-800'}`;
}
