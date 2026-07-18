import { useMemo, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Send, Loader2, BookmarkPlus, Trash2, Inbox, PenSquare, CheckCircle2, Search, X } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { InternalMessagePriority, StaffDirectoryEntry, UserRole } from '@schoolos/types';
import {
  useInternalMessages,
  useMarkMessageRead,
  useSentMessages,
  useMessageTemplates,
  useCreateMessageTemplate,
  useDeleteMessageTemplate,
  useStaffDirectory,
  useSendInternalMessage,
} from '../hooks/useInternalMessages';

const ROLE_OPTIONS: Array<{ label: string; value: UserRole }> = [
  { label: 'All Teachers', value: 'teacher' },
  { label: 'All Accountants', value: 'accountant' },
  { label: 'All Reception', value: 'reception' },
  { label: 'All Admins', value: 'admin' },
];

// Filter chips for the individual-recipient picker — "Management" groups
// admin + principal since neither role has its own staff-directory bucket.
type RecipientFilter = 'all' | 'teacher' | 'accountant' | 'reception' | 'management';
const RECIPIENT_FILTERS: Array<{ label: string; value: RecipientFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Teachers', value: 'teacher' },
  { label: 'Accountant', value: 'accountant' },
  { label: 'Reception', value: 'reception' },
  { label: 'Management', value: 'management' },
];
function matchesRecipientFilter(role: UserRole, filter: RecipientFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'management') return role === 'admin' || role === 'principal';
  return role === filter;
}

export const MessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCompose = user?.role === 'principal' || user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const [tab, setTab] = useState<'inbox' | 'compose'>('inbox');

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 lg:pb-6">
      {isTeacher && (
        <button
          onClick={() => navigate('/teacher')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-3 -ml-1 p-1"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      <div className="flex items-center gap-3 mb-1">
        <Mail className="w-6 h-6 text-[#5B21B6]" />
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {canCompose ? 'Send messages to staff and view your inbox.' : 'Messages from your school administration.'}
      </p>

      {canCompose && (
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setTab('inbox')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors flex items-center gap-1.5 ${
              tab === 'inbox' ? 'bg-[#5B21B6] text-white border-[#5B21B6]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" /> Inbox
          </button>
          <button
            onClick={() => setTab('compose')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors flex items-center gap-1.5 ${
              tab === 'compose' ? 'bg-[#5B21B6] text-white border-[#5B21B6]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <PenSquare className="w-3.5 h-3.5" /> Compose
          </button>
        </div>
      )}

      {tab === 'inbox' || !canCompose ? <InboxPanel /> : <ComposePanel />}
    </div>
  );
};

function InboxPanel() {
  const { data, isLoading } = useInternalMessages();
  const markRead = useMarkMessageRead();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!data || data.messages.length === 0) {
    return <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-sm text-gray-400">No messages yet.</div>;
  }

  return (
    <div className="space-y-2">
      {data.messages.map((m) => (
        <div
          key={m._id}
          onClick={() => !m.isRead && markRead.mutate(m._id)}
          className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors ${
            m.isRead ? 'border-gray-100' : 'border-blue-200 bg-blue-50/30'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {m.priority === 'high' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600 border border-red-100">
                    High Priority
                  </span>
                )}
                <h3 className="font-bold text-gray-900 text-sm truncate">{m.subject}</h3>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{m.body}</p>
              <p className="text-xs text-gray-400 mt-1.5">From {m.senderName} · {new Date(m.createdAt).toLocaleString()}</p>
            </div>
            {m.priority === 'high' && m.acknowledgedAt && (
              <span title="Acknowledged" className="flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ComposePanel() {
  const { data: staff } = useStaffDirectory();
  const { data: templates } = useMessageTemplates();
  const { data: sent } = useSentMessages();
  const sendMessage = useSendInternalMessage();
  const createTemplate = useCreateMessageTemplate();
  const deleteTemplate = useDeleteMessageTemplate();

  const [recipientMode, setRecipientMode] = useState<'individual' | 'role'>('individual');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('teacher');
  const [staffSearchOpen, setStaffSearchOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<InternalMessagePriority>('normal');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function applyTemplate(id: string) {
    const t = templates?.find((t) => t._id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    setPriority(t.priority);
  }

  function toggleUser(id: string) {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const filteredStaff = useMemo<StaffDirectoryEntry[]>(() => {
    const q = staffSearch.trim().toLowerCase();
    return (staff ?? []).filter((s) =>
      matchesRecipientFilter(s.role, recipientFilter) && (!q || s.name.toLowerCase().includes(q)));
  }, [staff, staffSearch, recipientFilter]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!subject.trim() || !body.trim()) {
      setError('Subject and message body are required.');
      return;
    }
    if (recipientMode === 'individual' && selectedUserIds.length === 0) {
      setError('Select at least one recipient.');
      return;
    }

    try {
      if (saveAsTemplate && templateTitle.trim()) {
        await createTemplate.mutateAsync({ title: templateTitle.trim(), subject: subject.trim(), body: body.trim(), priority });
      }
      const result = await sendMessage.mutateAsync({
        recipientUserIds: recipientMode === 'individual' ? selectedUserIds : undefined,
        recipientRole: recipientMode === 'role' ? selectedRole : undefined,
        subject: subject.trim(),
        body: body.trim(),
        priority,
      });
      setSuccess(`Message sent to ${result.sent} recipient${result.sent !== 1 ? 's' : ''}.`);
      setSubject('');
      setBody('');
      setPriority('normal');
      setSelectedUserIds([]);
      setSaveAsTemplate(false);
      setTemplateTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        {templates && templates.length > 0 && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Use a Template</label>
            <select
              onChange={(e) => e.target.value && applyTemplate(e.target.value)}
              defaultValue=""
              className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
            >
              <option value="">Select a saved template…</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>{t.title}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Recipients</label>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setRecipientMode('individual')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${recipientMode === 'individual' ? 'bg-[#5B21B6] text-white border-[#5B21B6]' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              Select Staff
            </button>
            <button
              type="button"
              onClick={() => setRecipientMode('role')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${recipientMode === 'role' ? 'bg-[#5B21B6] text-white border-[#5B21B6]' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              By Role
            </button>
            {recipientMode === 'individual' && (
              <button
                type="button"
                onClick={() => setStaffSearchOpen((v) => !v)}
                className={`ml-auto p-1.5 rounded-full border transition-colors ${staffSearchOpen ? 'bg-[#A855F7]/10 border-[#A855F7]/25 text-[#5B21B6]' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'}`}
                title="Search recipients"
                aria-label="Search recipients"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {recipientMode === 'individual' ? (
            <div className="space-y-2">
              {staffSearchOpen && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    autoFocus
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search by name…"
                    className="w-full h-9 pl-9 pr-8 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
                  />
                  {staffSearch && (
                    <button
                      type="button"
                      onClick={() => setStaffSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {RECIPIENT_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setRecipientFilter(f.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      recipientFilter === f.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1">
                {filteredStaff.map((s) => (
                  <label key={s._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={selectedUserIds.includes(s._id)} onChange={() => toggleUser(s._id)} className="rounded" />
                    <span className="font-medium text-gray-800">{s.name}</span>
                    <span className="text-xs text-gray-400 capitalize">({s.role})</span>
                  </label>
                ))}
                {!filteredStaff.length && <p className="text-xs text-gray-400 px-2 py-1">No staff found.</p>}
              </div>
            </div>
          ) : (
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Subject</label>
          <input
            value={subject} onChange={(e) => setSubject(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
            placeholder="Message subject"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Message</label>
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)} rows={5}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
            placeholder="Write your message…"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Priority</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPriority('normal')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border ${priority === 'normal' ? 'bg-[#5B21B6] text-white border-[#5B21B6]' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setPriority('high')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border ${priority === 'high' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              High Priority
            </button>
          </div>
          {priority === 'high' && (
            <p className="text-xs text-red-500 mt-1.5">Recipients will see a blocking screen requiring acknowledgment.</p>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} className="rounded" />
            Save this as a reusable template
          </label>
          {saveAsTemplate && (
            <input
              value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)}
              className="w-full h-10 mt-2 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#A855F7]"
              placeholder="Template name"
            />
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-sm font-medium text-emerald-700">{success}</p>
          </div>
        )}

        <button
          type="submit" disabled={sendMessage.isPending}
          className="w-full h-12 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-base font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Message
        </button>
      </form>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
            <BookmarkPlus className="w-4 h-4 text-gray-400" /> Saved Templates
          </h3>
          {!templates?.length ? (
            <p className="text-xs text-gray-400">No templates saved yet.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t._id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-700 truncate">{t.title}</span>
                  <button onClick={() => deleteTemplate.mutate(t._id)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Recently Sent</h3>
          {!sent?.length ? (
            <p className="text-xs text-gray-400">Nothing sent yet.</p>
          ) : (
            <div className="space-y-3">
              {sent.slice(0, 8).map((m) => (
                <div key={m._id} className="text-sm">
                  <p className="font-semibold text-gray-800 truncate">{m.subject}</p>
                  <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
