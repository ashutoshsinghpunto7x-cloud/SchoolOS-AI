import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldQuestion, Loader2, CheckCircle2 } from 'lucide-react';
import { useSubmitRecoveryRequest } from '../hooks/useRecovery';

export const RecoverAccountPage = () => {
  const { mutateAsync, isPending } = useSubmitRecoveryRequest();
  const [schoolId, setSchoolId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!schoolId.trim() || !employeeId.trim() || !email.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      await mutateAsync({ schoolId: schoolId.trim(), employeeId: employeeId.trim(), email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit recovery request.');
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/60 p-8">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Request Sent</h1>
              <p className="text-sm text-gray-500">
                Your recovery request has been sent to your school administrator. You will be able to log in once your request is approved.
              </p>
              <Link to="/login" className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-blue-600 hover:underline">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                  <ShieldQuestion className="w-6 h-6 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Recover Your Account</h1>
                <p className="text-sm text-gray-500 mt-2">
                  Forgot both your password and PIN? Submit a recovery request to your school administrator.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="schoolId" className="block text-sm font-bold text-gray-700 mb-1.5">School ID</label>
                  <input
                    id="schoolId" type="text" required value={schoolId} onChange={(e) => setSchoolId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. SCH-001"
                  />
                </div>
                <div>
                  <label htmlFor="employeeId" className="block text-sm font-bold text-gray-700 mb-1.5">Employee / Staff ID</label>
                  <input
                    id="employeeId" type="text" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. EMP-045"
                  />
                </div>
                <div>
                  <label htmlFor="recoveryEmail" className="block text-sm font-bold text-gray-700 mb-1.5">Registered Email</label>
                  <input
                    id="recoveryEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@school.com"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                    <p className="text-sm font-medium text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit" disabled={isPending}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-base font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Recovery Request'}
                </button>

                <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700">
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
