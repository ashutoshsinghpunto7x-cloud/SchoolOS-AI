import { useRef, useState } from 'react';
import { Camera, Contact2, Loader2, Check } from 'lucide-react';
import type { Visitor, VisitorIdProofType } from '@schoolos/types';
import { useUploadVisitorPhoto, useUploadVisitorIdProof } from '../hooks/useVisitors';

interface VisitorPhotoIdCellProps {
  visitor: Visitor;
}

// `capture="environment"` opens the back camera directly on a phone/tablet
// at the front desk — the primary capture path per the SRD's mobile notes —
// while still falling back to a normal file picker on desktop.
export function VisitorPhotoIdCell({ visitor }: VisitorPhotoIdCellProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const [idProofType, setIdProofType] = useState<VisitorIdProofType>('aadhaar');
  const uploadPhoto = useUploadVisitorPhoto();
  const uploadIdProof = useUploadVisitorIdProof();

  return (
    <div className="flex items-center gap-1.5">
      {visitor.photoUrl ? (
        <img src={visitor.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-100" />
      ) : (
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={uploadPhoto.isPending}
          title="Capture photo"
          className="w-7 h-7 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-orange-400 hover:text-orange-600 disabled:opacity-50"
        >
          {uploadPhoto.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
        </button>
      )}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadPhoto.mutate({ id: visitor._id, file });
          e.target.value = '';
        }}
      />

      {visitor.idProofUrl ? (
        <span title={`ID proof saved (${visitor.idProofType})`} className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center text-green-600">
          <Check className="w-3.5 h-3.5" />
        </span>
      ) : (
        <div className="relative group">
          <button
            type="button"
            onClick={() => idInputRef.current?.click()}
            disabled={uploadIdProof.isPending}
            title="Upload ID proof"
            className="w-6 h-6 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-orange-400 hover:text-orange-600 disabled:opacity-50"
          >
            {uploadIdProof.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Contact2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      {!visitor.idProofUrl && (
        <select
          value={idProofType}
          onChange={(e) => setIdProofType(e.target.value as VisitorIdProofType)}
          className="hidden sm:block h-6 text-[10px] rounded border border-gray-200 text-gray-500 px-1"
          title="ID proof type"
        >
          <option value="aadhaar">Aadhaar</option>
          <option value="driving_license">DL</option>
          <option value="voter_id">Voter ID</option>
          <option value="passport">Passport</option>
          <option value="other">Other</option>
        </select>
      )}
      <input
        ref={idInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadIdProof.mutate({ id: visitor._id, idProofType, file });
          e.target.value = '';
        }}
      />
    </div>
  );
}
