import { Link } from 'react-router-dom'

const Privacy = () => (
  <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-10">
    <article className="mx-auto max-w-2xl space-y-5">
      <p className="text-sm text-gray-300">
        <Link to="/login" className="text-blue-300 underline hover:text-blue-200">
          Back to login
        </Link>
      </p>
      <h1 className="text-3xl font-bold text-white">Privacy notice (pilot)</h1>
      <p className="text-gray-300 text-sm leading-relaxed">
        This is a short placeholder for the EduMind school learning-support pilot in India (en-IN).
        It is not final legal advice. Schools and families should treat it as interim guidance until
        a formal policy is published.
      </p>
      <h2 className="text-xl font-semibold text-white">What we collect</h2>
      <p className="text-gray-300 text-sm leading-relaxed">
        Account details such as name, email, phone (when provided), school linkage, and learning
        activity needed to run the product (for example progress, uploads, and support messages).
      </p>
      <h2 className="text-xl font-semibold text-white">Why we use it</h2>
      <p className="text-gray-300 text-sm leading-relaxed">
        To create accounts, support classroom learning, keep the service secure, and improve the
        pilot with school feedback. We do not sell student data.
      </p>
      <h2 className="text-xl font-semibold text-white">Who can see it</h2>
      <p className="text-gray-300 text-sm leading-relaxed">
        Access is limited to the signed-in user, authorised school staff/admins, and EduMind
        operators who need it to run or fix the service.
      </p>
      <h2 className="text-xl font-semibold text-white">Minors and consent</h2>
      <p className="text-gray-300 text-sm leading-relaxed">
        Where an account may belong to a minor, a parent/guardian or authorised school staff
        should approve registration. Contact your school admin if you need a correction or deletion
        request during the pilot.
      </p>
      <p className="text-gray-400 text-sm">Last updated: 10 Sep 2026 (pilot draft).</p>
    </article>
  </div>
)

export default Privacy
