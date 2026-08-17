import React from 'react';
import { X, Video, Calendar, Clock, User, AlertCircle, FileText, CheckCircle2, RefreshCw } from 'lucide-react';

export default function ConsultationDetailsModal({ consultation, onClose, onRefresh }) {
  if (!consultation) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Accepted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Scheduled':
      case 'Rescheduled':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'In Progress':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse';
      case 'Completed':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Cancelled':
        return 'bg-stone-100 text-stone-700 border-stone-300';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  const isJoinable = ['Scheduled', 'In Progress', 'Rescheduled'].includes(consultation.status) && consultation.meeting_link;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-teal-900 text-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6 text-emerald-300" />
            <div>
              <h3 className="font-semibold text-lg">Telemedicine Consultation Details</h3>
              <p className="text-xs text-emerald-200">ID #{consultation.consultation_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Status & Actions Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Status</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(consultation.status)}`}>
                {consultation.status}
              </span>
            </div>

            {isJoinable && (
              <a
                href={consultation.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all transform hover:-translate-y-0.5"
              >
                <Video className="w-4 h-4" />
                Join Video Consultation
              </a>
            )}
          </div>

          {/* Consultation Participants & Schedule Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/60">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold mb-2">
                <User className="w-4 h-4 text-emerald-700" />
                <span>Doctor & Patient</span>
              </div>
              <p className="text-sm font-medium text-stone-900">Dr. {consultation.doctor_name}</p>
              <p className="text-xs text-stone-500 mb-2">{consultation.doctor_specialization || 'Palliative Specialist'}</p>
              
              <p className="text-sm font-medium text-stone-900">Patient: {consultation.patient_name}</p>
              <p className="text-xs text-stone-500">Reg ID: {consultation.patient_registration_id}</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/60">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold mb-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>Schedule Info</span>
              </div>
              {consultation.scheduled_date ? (
                <>
                  <p className="text-sm font-medium text-stone-900">
                    Date: {consultation.scheduled_date}
                  </p>
                  <p className="text-xs text-stone-600 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    Time: {consultation.scheduled_start_time} - {consultation.scheduled_end_time}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-stone-900">
                    Requested Date: {consultation.requested_date}
                  </p>
                  <p className="text-xs text-stone-600 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    Requested Time: {consultation.requested_time}
                  </p>
                </>
              )}
              <span className={`mt-2 inline-block text-[11px] font-bold px-2 py-0.5 rounded ${consultation.priority === 'Urgent' ? 'bg-amber-100 text-amber-900' : consultation.priority === 'Emergency' ? 'bg-rose-100 text-rose-900' : 'bg-stone-100 text-stone-700'}`}>
                Priority: {consultation.priority}
              </span>
            </div>
          </div>

          {/* Reason & Symptoms */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Reason for Consultation</h4>
              <p className="text-sm text-stone-800 bg-stone-50 p-3 rounded-lg border border-stone-200 font-medium">
                {consultation.reason || 'N/A'}
              </p>
            </div>

            {consultation.symptoms && (
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Symptoms / Brief Description</h4>
                <p className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200">
                  {consultation.symptoms}
                </p>
              </div>
            )}

            {consultation.patient_notes && (
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Additional Patient Notes</h4>
                <p className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200 italic">
                  "{consultation.patient_notes}"
                </p>
              </div>
            )}
          </div>

          {/* Rejection Reason display */}
          {consultation.status === 'Rejected' && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-900">Consultation Request Rejected</h4>
                <p className="text-xs text-rose-800 mt-1 font-medium">
                  Reason: {consultation.rejection_reason || 'No specific reason provided.'}
                </p>
              </div>
            </div>
          )}

          {/* Clinical Notes (If Completed) */}
          {consultation.consultation_notes && consultation.consultation_notes.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-stone-200">
              <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                Doctor Consultation Notes
              </h4>
              {consultation.consultation_notes.map((note) => (
                <div key={note.note_id} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-sm space-y-2">
                  {note.symptoms_discussed && (
                    <div>
                      <strong className="text-emerald-900 text-xs uppercase block">Symptoms Discussed:</strong>
                      <span className="text-stone-800">{note.symptoms_discussed}</span>
                    </div>
                  )}
                  {note.clinical_observations && (
                    <div>
                      <strong className="text-emerald-900 text-xs uppercase block">Clinical Observations:</strong>
                      <span className="text-stone-800">{note.clinical_observations}</span>
                    </div>
                  )}
                  {note.advice && (
                    <div>
                      <strong className="text-emerald-900 text-xs uppercase block">Advice & Instructions:</strong>
                      <span className="text-stone-800">{note.advice}</span>
                    </div>
                  )}
                  {note.notes && (
                    <div>
                      <strong className="text-emerald-900 text-xs uppercase block">Additional Notes:</strong>
                      <span className="text-stone-800">{note.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Follow-up Information */}
          {consultation.followups && consultation.followups.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-stone-200">
              <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-700" />
                Scheduled Follow-up Consultations
              </h4>
              {consultation.followups.map((fu) => (
                <div key={fu.followup_id} className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-indigo-900">{fu.followup_date} at {fu.followup_time}</span>
                    <p className="text-stone-600 mt-0.5">{fu.reason}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-200 text-indigo-900 font-semibold">{fu.status}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-sm transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
