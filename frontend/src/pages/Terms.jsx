import { Link } from 'react-router-dom'

const Terms = () => (
  <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-10">
    <article className="mx-auto max-w-2xl space-y-5">
      <p className="text-sm text-gray-300">
        <Link to="/login" className="text-blue-300 underline hover:text-blue-200">
          Back to login
        </Link>
      </p>
      <h1 className="text-3xl font-bold text-white">Terms of use (pilot)</h1>
      <p className="text-gray-300 text-sm leading-relaxed">
        These are plain-language pilot terms for EduMind in India (en-IN). They are placeholders
        and will be replaced with a formal agreement before wider rollout.
      </p>
      <h2 className="text-xl font-semibold text-white">Using EduMind</h2>
      <p className="text-gray-300 text-sm leading-relaxed">
        EduMind helps schools support student learning. Use it only for lawful school and learning
        purposes. Do not share login details or upload content you do not have permission to use.
      </p>
      <h2 className="text-xl font-semibold text-white">Accounts</h2>
      <p className="text-gray-300 text-sm leading-relaxed">
        Keep your password or OTP secure. Parents, guardians, or authorised school staff should
        create or approve accounts for minors where that applies.
      </p>
      <h2 className="text-xl font-semibold text-white">Pilot limits</h2>
      <p className="text-gray-300 text-sm leading-relaxed">
        Features may change, pause, or reset during the pilot. EduMind is provided as-is for
        evaluation with participating schools.
      </p>
      <h2 className="text-xl font-semibold text-white">Questions</h2>
      <p className="text-gray-300 text-sm leading-relaxed">
        For help, contact your school admin or EduMind support through the channels shared with
        your school.
      </p>
      <p className="text-gray-400 text-sm">Last updated: 10 Sep 2026 (pilot draft).</p>
    </article>
  </div>
)

export default Terms
