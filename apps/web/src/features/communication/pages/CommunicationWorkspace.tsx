import { useState } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { StudentSearch } from '../components/StudentSearch';
import { CommunicationCard } from '../components/CommunicationCard';
import { CommunicationTimeline } from '../components/CommunicationTimeline';
import { CallModal } from '../components/CallModal';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { NoteModal } from '../components/NoteModal';
import { AISummaryCard } from '../components/AISummaryCard';
import { useCommunicationList, useCreateNote, useSendWhatsApp } from '../hooks/useCommunication';
import type { Student } from '@schoolos/types';

type ModalType = 'call' | 'whatsapp' | 'note' | null;

interface CommunicationWorkspaceProps {
  /** Pre-select a student (e.g. when navigating from StudentProfile). */
  initialStudent?: Student;
  /** Open a modal immediately after mount. Requires initialStudent. */
  initialAction?: 'call' | 'whatsapp' | 'note';
}

// ── Empty center state ────────────────────────────────────────────────────────

const NoneSelected = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-20 px-8">
    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
      <Users className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
    </div>
    <h3 className="text-base font-bold text-gray-700">No student selected</h3>
    <p className="text-sm text-gray-400 mt-1.5 max-w-xs leading-relaxed">
      Search and select a student on the left to view parent information and start communicating.
    </p>
  </div>
);

// ── Center panel content ──────────────────────────────────────────────────────

interface CenterContentProps {
  student: Student;
  onCall: () => void;
  onWhatsApp: () => void;
  onNote: () => void;
}

const CenterContent = ({ student, onCall, onWhatsApp, onNote }: CenterContentProps) => {
  const { data: communications = [], isLoading } = useCommunicationList(student._id);

  return (
    <div className="flex flex-col gap-5">
      <CommunicationCard
        student={student}
        onCall={onCall}
        onWhatsApp={onWhatsApp}
        onNote={onNote}
      />

      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-bold text-gray-900">Communication History</h3>
          {communications.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {communications.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <CommunicationTimeline communications={communications} />
        )}
      </div>
    </div>
  );
};

// ── Workspace ─────────────────────────────────────────────────────────────────

export const CommunicationWorkspace = ({
  initialStudent,
  initialAction,
}: CommunicationWorkspaceProps = {}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(initialStudent ?? null);
  const [openModal, setOpenModal] = useState<ModalType>(initialAction ?? null);

  const studentId = selectedStudent?._id ?? '';

  const createNote = useCreateNote(studentId);
  const sendWhatsApp = useSendWhatsApp(studentId);

  const closeModal = () => setOpenModal(null);

  const handleWhatsAppSend = async (message: string) => {
    await sendWhatsApp.mutateAsync(message);
    toast.success('Message sent successfully!', {
      description: `WhatsApp sent to ${selectedStudent?.fatherName}`,
    });
    closeModal();
  };

  const handleNoteSave = async (note: string) => {
    await createNote.mutateAsync(note);
    toast.success('Note saved', { description: 'Added to communication history.' });
    closeModal();
  };

  return (
    <>
      {/* ── 3-panel layout ─────────────────────────────────────────────────── */}
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 flex min-h-0">
          {/* Left panel — student search */}
          <aside className="w-72 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-gray-50">
              <h2 className="text-sm font-bold text-gray-900">Students</h2>
              <p className="text-xs text-gray-400 mt-0.5">Select to communicate</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <StudentSearch selectedStudent={selectedStudent} onSelect={setSelectedStudent} />
            </div>
          </aside>

          {/* Center panel — communication */}
          <main className="flex-1 min-w-0 overflow-y-auto bg-[#F5F5F7] px-6 py-6">
            {selectedStudent ? (
              <CenterContent
                student={selectedStudent}
                onCall={() => setOpenModal('call')}
                onWhatsApp={() => setOpenModal('whatsapp')}
                onNote={() => setOpenModal('note')}
              />
            ) : (
              <NoneSelected />
            )}
          </main>

          {/* Right panel — AI assistant */}
          <aside className="w-80 flex-shrink-0 border-l border-gray-100 bg-white flex flex-col overflow-hidden">
            <AISummaryCard
              student={selectedStudent}
              onCall={() => setOpenModal('call')}
              onWhatsApp={() => setOpenModal('whatsapp')}
            />
          </aside>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {openModal === 'call' && selectedStudent && (
        <CallModal student={selectedStudent} onClose={closeModal} />
      )}
      {openModal === 'whatsapp' && selectedStudent && (
        <WhatsAppModal student={selectedStudent} onClose={closeModal} onSend={handleWhatsAppSend} />
      )}
      {openModal === 'note' && selectedStudent && (
        <NoteModal onClose={closeModal} onSave={handleNoteSave} />
      )}
    </>
  );
};
