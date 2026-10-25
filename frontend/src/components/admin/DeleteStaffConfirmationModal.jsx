import React, { useEffect } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

/**
 * Reusable Confirmation Modal for Deleting Doctor or Nurse accounts in KarunaGrid.
 * Matches KarunaGrid's muted olive, cream, and soft neutral design system.
 */
export default function DeleteStaffConfirmationModal({
  isOpen,
  staffType = 'Doctor', // 'Doctor' | 'Nurse'
  staffMember,
  isDeleting = false,
  onConfirm,
  onClose,
}) {
  // Close on Escape key press if not actively submitting
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !staffMember) return null;

  const staffTypeLower = staffType.toLowerCase();
  const rawStaffName = staffMember.name || 'Staff Member';
  const cleanStaffName = staffTypeLower === 'nurse' ? rawStaffName.replace(/^nurse\s+/i, '').trim() : rawStaffName;
  const specialization = staffMember.details?.specialization || staffMember.specialization;
  const serviceArea = staffMember.details?.service_area || staffMember.service_area;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        // Close when clicking backdrop outside modal content
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-staff-title"
      aria-describedby="delete-staff-description"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e9e2d5] animate-in zoom-in-95 duration-150 relative text-[#1e1b14]">
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-[#7b776c] hover:bg-[#f4ede0] hover:text-[#1e1b14] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
          <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
        </div>

        {/* Headings & Explanatory Copy */}
        <div className="text-center space-y-1">
          <h3 id="delete-staff-title" className="font-extrabold text-base text-[#1e1b14]">
            Delete {staffType}?
          </h3>
          <p id="delete-staff-description" className="text-xs text-[#7b776c] leading-relaxed">
            Are you sure you want to delete this {staffTypeLower}? This action may permanently remove their account and associated access.
          </p>
        </div>

        {/* Staff Member Identification Card */}
        <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#f0eae0] space-y-1 text-left text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[#1e1b14] text-sm">
              {cleanStaffName}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#f4ede0] text-[#645e45] border border-[#e2d8c7]">
              {staffType}
            </span>
          </div>
          <p className="text-[#7b776c] font-medium break-all">
            {staffMember.email}
          </p>
          {specialization && (
            <p className="text-[11px] text-[#7b776c] pt-0.5">
              <span className="font-semibold text-[#1e1b14]">Specialization:</span> {specialization}
            </p>
          )}
          {serviceArea && (
            <p className="text-[11px] text-[#7b776c]">
              <span className="font-semibold text-[#1e1b14]">Service Area:</span> {serviceArea}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#f2ece1]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-[#e9e2d5] bg-white hover:bg-[#faf7f0] text-[#4a473d] text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Delete {staffType}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
