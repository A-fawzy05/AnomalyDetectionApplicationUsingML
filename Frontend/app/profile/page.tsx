'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import organizationService, { OrgMembership } from '../../services/organization.service';
import {
  Plus,
  KeyRound,
  Database,
  LogOut,
  Sun,
  Moon,
  Eye,
  EyeOff,
  X,
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
type ModalType = 'create' | 'join' | 'selectOrg' | null;

interface FormMessage {
  type: 'success' | 'error' | '';
  text: string;
}

// ─── Main Page ────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [orgs, setOrgs] = useState<OrgMembership[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  // Fetch user organizations on mount
  useEffect(() => {
    fetchOrgs();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchOrgs() {
    try {
      setOrgsLoading(true);
      const res = await organizationService.getMyOrgs();
      setOrgs(res.data);
    } catch {
      // Silently handle — user may have no orgs yet
      setOrgs([]);
    } finally {
      setOrgsLoading(false);
    }
  }

  function handleLogout() {
    logout();
    router.push('/auth');
  }

  function handleDataEntry() {
    if (orgs.length === 0) return;
    // Always require org selection before proceeding to data entry
    setActiveModal('selectOrg');
  }

  async function handleDeleteOrg(orgId: string) {
    if (!window.confirm("Are you sure you want to delete this organization? This action cannot be undone.")) return;
    
    try {
      await organizationService.deleteOrg(orgId);
      // Refresh organizations
      fetchOrgs();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete organization");
    }
  }

  function handleOrgCreated() {
    setActiveModal(null);
    fetchOrgs();
  }

  function handleOrgJoined() {
    setActiveModal(null);
    fetchOrgs();
  }

  const hasOrgs = orgs.length > 0;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-bg-primary' : 'bg-gray-50'}`}>
      {/* ─── Navigation Header ─── */}
      <header className={`sticky top-0 z-30 border-b transition-colors duration-200 ${
        isDark
          ? 'bg-bg-primary border-border-primary'
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/Home')}>
            <div className="w-7 h-7 bg-nobel-gold rounded-full flex items-center justify-center text-white font-bold text-sm">P</div>
            <span className={`font-semibold text-sm tracking-wide ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>
              P2P Insight
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-md transition-colors duration-150 ${
                isDark
                  ? 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors duration-150 ${
                  isDark
                    ? 'hover:bg-bg-secondary text-text-primary'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isDark
                    ? 'bg-surface-elevated text-text-primary'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{user?.fullName}</span>
                <ChevronDown size={14} className={isDark ? 'text-text-secondary' : 'text-gray-400'} />
              </button>

              {dropdownOpen && (
                <div className={`absolute right-0 mt-1 w-48 py-1 rounded-md border shadow-sm z-40 ${
                  isDark
                    ? 'bg-bg-secondary border-border-primary'
                    : 'bg-white border-gray-200'
                }`}>
                  <div className={`px-3 py-2 border-b text-xs ${
                    isDark ? 'border-border-primary text-text-secondary' : 'border-gray-100 text-gray-500'
                  }`}>
                    {user?.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors duration-150 ${
                      isDark
                        ? 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Greeting */}
        <h2 className={`text-2xl font-semibold mb-8 ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>
          Welcome back, {user?.fullName || 'User'}
        </h2>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Create Organization */}
          <button
            onClick={() => setActiveModal('create')}
            className={`group text-left p-6 rounded-lg border transition-colors duration-150 cursor-pointer ${
              isDark
                ? 'bg-bg-secondary border-border-primary hover:border-nobel-gold/60'
                : 'bg-white border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className={`mb-4 ${isDark ? 'text-text-secondary group-hover:text-nobel-gold' : 'text-gray-400 group-hover:text-gray-700'} transition-colors duration-150`}>
              <Plus size={20} strokeWidth={1.5} />
            </div>
            <h3 className={`text-base font-semibold mb-1 ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>
              Create an Organization
            </h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-text-secondary' : 'text-gray-500'}`}>
              Set up a new workspace and invite your team with a join password.
            </p>
          </button>

          {/* Card 2: Join Organization */}
          <button
            onClick={() => setActiveModal('join')}
            className={`group text-left p-6 rounded-lg border transition-colors duration-150 cursor-pointer ${
              isDark
                ? 'bg-bg-secondary border-border-primary hover:border-nobel-gold/60'
                : 'bg-white border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className={`mb-4 ${isDark ? 'text-text-secondary group-hover:text-nobel-gold' : 'text-gray-400 group-hover:text-gray-700'} transition-colors duration-150`}>
              <KeyRound size={20} strokeWidth={1.5} />
            </div>
            <h3 className={`text-base font-semibold mb-1 ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>
              Join an Organization
            </h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-text-secondary' : 'text-gray-500'}`}>
              Enter an organization name and join password to become a member.
            </p>
          </button>

          {/* Card 3: Data Entry Portal */}
          <div className="relative">
            <button
              onClick={handleDataEntry}
              disabled={!hasOrgs}
              className={`group text-left p-6 rounded-lg border transition-colors duration-150 w-full ${
                hasOrgs
                  ? isDark
                    ? 'bg-bg-secondary border-border-primary hover:border-nobel-gold/60 cursor-pointer'
                    : 'bg-white border-gray-200 hover:border-gray-400 cursor-pointer'
                  : isDark
                    ? 'bg-bg-secondary/50 border-border-primary/50 cursor-not-allowed opacity-50'
                    : 'bg-gray-50 border-gray-200/50 cursor-not-allowed opacity-50'
              }`}
            >
              <div className={`mb-4 ${
                hasOrgs
                  ? isDark
                    ? 'text-text-secondary group-hover:text-nobel-gold'
                    : 'text-gray-400 group-hover:text-gray-700'
                  : isDark
                    ? 'text-text-secondary'
                    : 'text-gray-300'
              } transition-colors duration-150`}>
                <Database size={20} strokeWidth={1.5} />
              </div>
              <h3 className={`text-base font-semibold mb-1 ${
                hasOrgs
                  ? isDark ? 'text-text-primary' : 'text-gray-900'
                  : isDark ? 'text-text-secondary' : 'text-gray-400'
              }`}>
                Data Entry Portal
              </h3>
              <p className={`text-sm leading-relaxed ${
                hasOrgs
                  ? isDark ? 'text-text-secondary' : 'text-gray-500'
                  : isDark ? 'text-text-secondary/60' : 'text-gray-400'
              }`}>
                {hasOrgs
                  ? `Access your workspace to upload and manage datasets.`
                  : 'Join or create an organization first to begin data entry.'
                }
              </p>
            </button>
            {!hasOrgs && !orgsLoading && (
              <div className={`mt-2 flex items-center gap-1.5 text-xs ${
                isDark ? 'text-text-secondary' : 'text-gray-400'
              }`}>
                <AlertCircle size={12} />
                <span>No organization membership found</span>
              </div>
            )}
          </div>
        </div>

        {/* Organization list */}
        {orgs.length > 0 && (
          <div className="mt-10">
            <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-text-secondary' : 'text-gray-500'}`}>
              Your organizations
            </h3>
            <div className={`rounded-lg border overflow-hidden ${
              isDark ? 'border-border-primary' : 'border-gray-200'
            }`}>
              {orgs.map((org, idx) => (
                <div
                  key={org.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    idx > 0
                      ? isDark ? 'border-t border-border-primary' : 'border-t border-gray-100'
                      : ''
                  } ${isDark ? 'bg-bg-secondary' : 'bg-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold ${
                      isDark
                        ? 'bg-surface-elevated text-text-primary'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>
                        {org.name}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-text-secondary' : 'text-gray-500'}`}>
                        {org.memberCount} member{org.memberCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      org.role === 'admin'
                        ? isDark
                          ? 'border-nobel-gold/30 text-nobel-gold bg-nobel-gold/5'
                          : 'border-amber-200 text-amber-700 bg-amber-50'
                        : isDark
                          ? 'border-border-primary text-text-secondary'
                          : 'border-gray-200 text-gray-500'
                    }`}>
                      {org.role}
                    </span>
                    
                    {org.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteOrg(org.id)}
                        className={`p-1.5 rounded transition-colors duration-150 ${
                          isDark 
                            ? 'text-text-secondary hover:text-red-400 hover:bg-red-400/10' 
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title="Delete Organization"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ─── Modals ─── */}
      {activeModal === 'create' && (
        <CreateOrgModal
          isDark={isDark}
          onClose={() => setActiveModal(null)}
          onSuccess={handleOrgCreated}
        />
      )}
      {activeModal === 'join' && (
        <JoinOrgModal
          isDark={isDark}
          onClose={() => setActiveModal(null)}
          onSuccess={handleOrgJoined}
        />
      )}
      {activeModal === 'selectOrg' && (
        <SelectOrgModal
          isDark={isDark}
          orgs={orgs}
          onClose={() => setActiveModal(null)}
          onSelect={(orgId) => {
            setActiveModal(null);
            router.push(`/profile/data-entry?org=${orgId}`);
          }}
        />
      )}
    </div>
  );
}


// ─── Create Organization Modal ────────────────────────────────
function CreateOrgModal({
  isDark,
  onClose,
  onSuccess,
}: {
  isDark: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<FormMessage>({ type: '', text: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (joinPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      const res = await organizationService.create({ name, joinPassword, confirmPassword });
      setMessage({ type: 'success', text: res.message });
      setTimeout(onSuccess, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell isDark={isDark} onClose={onClose} title="Create an Organization">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField isDark={isDark} label="Organization Name">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Alpha Team"
            className={inputClass(isDark)}
            required
          />
        </FormField>

        <FormField isDark={isDark} label="Set Join Password">
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={joinPassword}
              onChange={e => setJoinPassword(e.target.value)}
              placeholder="Password for others to join"
              className={inputClass(isDark, true)}
              required
              minLength={4}
            />
            <PasswordToggle isDark={isDark} show={showPass} onToggle={() => setShowPass(!showPass)} />
          </div>
        </FormField>

        <FormField isDark={isDark} label="Confirm Password">
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter join password"
              className={inputClass(isDark, true)}
              required
            />
            <PasswordToggle isDark={isDark} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
          </div>
        </FormField>

        <MessageBanner message={message} isDark={isDark} />

        <button
          type="submit"
          disabled={loading}
          className={submitBtnClass(isDark)}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {loading ? 'Creating…' : 'Initialize Organization'}
        </button>
      </form>
    </ModalShell>
  );
}


// ─── Join Organization Modal ──────────────────────────────────
function JoinOrgModal({
  isDark,
  onClose,
  onSuccess,
}: {
  isDark: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<FormMessage>({ type: '', text: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);
    try {
      const res = await organizationService.join({ name, joinPassword });
      setMessage({ type: 'success', text: res.message });
      setTimeout(onSuccess, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell isDark={isDark} onClose={onClose} title="Join an Organization">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField isDark={isDark} label="Organization Name">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter organization name"
            className={inputClass(isDark)}
            required
          />
        </FormField>

        <FormField isDark={isDark} label="Join Password">
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={joinPassword}
              onChange={e => setJoinPassword(e.target.value)}
              placeholder="Enter the password provided by admin"
              className={inputClass(isDark, true)}
              required
            />
            <PasswordToggle isDark={isDark} show={showPass} onToggle={() => setShowPass(!showPass)} />
          </div>
        </FormField>

        <MessageBanner message={message} isDark={isDark} />

        <button
          type="submit"
          disabled={loading}
          className={submitBtnClass(isDark)}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {loading ? 'Joining…' : 'Request Access'}
        </button>
      </form>
    </ModalShell>
  );
}


// ─── Select Organization Modal ────────────────────────────────
function SelectOrgModal({
  isDark,
  orgs,
  onClose,
  onSelect,
}: {
  isDark: boolean;
  orgs: OrgMembership[];
  onClose: () => void;
  onSelect: (orgId: string) => void;
}) {
  return (
    <ModalShell isDark={isDark} onClose={onClose} title="Select Organization">
      <p className={`text-sm mb-4 ${isDark ? 'text-text-secondary' : 'text-gray-500'}`}>
        Choose an organization to continue.
      </p>
      <div className="space-y-2">
        {orgs.map(org => (
          <button
            key={org.id}
            onClick={() => onSelect(org.id)}
            className={`w-full text-left px-4 py-3 rounded-md border flex items-center justify-between transition-colors duration-150 ${
              isDark
                ? 'border-border-primary hover:border-nobel-gold/60 bg-bg-primary'
                : 'border-gray-200 hover:border-gray-400 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold ${
                isDark ? 'bg-surface-elevated text-text-primary' : 'bg-gray-200 text-gray-700'
              }`}>
                {org.name.charAt(0).toUpperCase()}
              </div>
              <span className={`text-sm font-medium ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>
                {org.name}
              </span>
            </div>
            <ChevronDown size={14} className={`-rotate-90 ${isDark ? 'text-text-secondary' : 'text-gray-400'}`} />
          </button>
        ))}
      </div>
    </ModalShell>
  );
}


// ─── Shared Components ────────────────────────────────────────

function ModalShell({
  isDark,
  onClose,
  title,
  children,
}: {
  isDark: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md rounded-lg border p-6 shadow-sm ${
          isDark
            ? 'bg-bg-secondary border-border-primary'
            : 'bg-white border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-text-primary' : 'text-gray-900'}`}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors duration-150 ${
              isDark
                ? 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({
  isDark,
  label,
  children,
}: {
  isDark: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${
        isDark ? 'text-text-primary' : 'text-gray-700'
      }`}>
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordToggle({
  isDark,
  show,
  onToggle,
}: {
  isDark: boolean;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150 ${
        isDark ? 'text-text-secondary hover:text-nobel-gold' : 'text-gray-400 hover:text-gray-700'
      }`}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

function MessageBanner({ message, isDark }: { message: FormMessage; isDark: boolean }) {
  if (!message.text) return null;
  const isSuccess = message.type === 'success';
  return (
    <div className={`px-3 py-2.5 rounded-md text-sm border ${
      isSuccess
        ? isDark
          ? 'bg-green-500/10 text-green-400 border-green-500/20'
          : 'bg-green-50 text-green-700 border-green-200'
        : isDark
          ? 'bg-red-500/10 text-red-400 border-red-500/20'
          : 'bg-red-50 text-red-700 border-red-200'
    }`}>
      {message.text}
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────

function inputClass(isDark: boolean, hasEyeIcon = false) {
  const pr = hasEyeIcon ? 'pr-10' : 'pr-3';
  return `w-full pl-3 ${pr} py-2.5 rounded-md border text-sm outline-none transition-colors duration-150 ${
    isDark
      ? 'bg-bg-primary border-border-primary text-text-primary placeholder-text-secondary focus:border-nobel-gold'
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:bg-white'
  }`;
}

function submitBtnClass(isDark: boolean) {
  return `w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2 ${
    isDark
      ? 'bg-nobel-gold text-bg-primary hover:bg-yellow-500'
      : 'bg-gray-900 text-white hover:bg-gray-800'
  }`;
}
