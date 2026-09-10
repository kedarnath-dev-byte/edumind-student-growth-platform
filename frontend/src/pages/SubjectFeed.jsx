/**
 * Subject worlds — pick a subject, scroll feed, follow peers, post media/text.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import api from '../services/api'

const SubjectFeed = () => {
  const { getAccessToken, profile } = useAuth()
  const studentId = profile?.student_profile?.id
  const [params, setParams] = useSearchParams()
  const subjectId = params.get('subject') || ''

  const [subjects, setSubjects] = useState([])
  const [feed, setFeed] = useState([])
  const [profileView, setProfileView] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [caption, setCaption] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState('image')

  const authHeaders = useCallback(() => {
    const token = getAccessToken() || localStorage.getItem('edumind_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [getAccessToken])

  const loadSubjects = useCallback(async () => {
    const res = await api.get('/api/v1/subject-social/subjects', {
      headers: authHeaders(),
      timeout: 90000,
    })
    setSubjects(res.data || [])
  }, [authHeaders])

  const loadFeed = useCallback(async (sid) => {
    if (!sid) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/v1/subject-social/feed', {
        params: { subject_id: sid },
        headers: authHeaders(),
        timeout: 90000,
      })
      setFeed(res.data || [])
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => {
    loadSubjects().catch((err) => {
      setError(err.response?.data?.detail || 'Could not load subjects')
    })
  }, [loadSubjects])

  useEffect(() => {
    if (subjectId) {
      setProfileView(null)
      loadFeed(subjectId)
    }
  }, [subjectId, loadFeed])

  const selectedSubject = useMemo(
    () => subjects.find((s) => String(s.id) === String(subjectId)),
    [subjects, subjectId],
  )

  const openSubject = (id) => {
    setParams({ subject: String(id) })
  }

  const createPost = async (e) => {
    e.preventDefault()
    if (!subjectId) return
    setError('')
    setInfo('')
    try {
      await api.post(
        '/api/v1/subject-social/posts',
        {
          subject_id: Number(subjectId),
          caption: caption.trim() || null,
          media_url: mediaUrl.trim() || null,
          media_type: mediaUrl.trim() ? mediaType : 'text',
        },
        { headers: authHeaders(), timeout: 90000 },
      )
      setCaption('')
      setMediaUrl('')
      setInfo('Posted to subject feed')
      await loadFeed(subjectId)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to post')
    }
  }

  const openProfile = async (authorId) => {
    if (!subjectId) return
    setError('')
    try {
      const res = await api.get(`/api/v1/subject-social/profiles/${authorId}`, {
        params: { subject_id: subjectId },
        headers: authHeaders(),
        timeout: 90000,
      })
      setProfileView(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to open profile')
    }
  }

  const toggleFollow = async () => {
    if (!profileView || !subjectId) return
    try {
      if (profileView.is_following) {
        await api.delete('/api/v1/subject-social/follows', {
          params: {
            following_student_id: profileView.student_id,
            subject_id: subjectId,
          },
          headers: authHeaders(),
          timeout: 90000,
        })
      } else {
        await api.post(
          '/api/v1/subject-social/follows',
          {
            following_student_id: profileView.student_id,
            subject_id: Number(subjectId),
          },
          { headers: authHeaders(), timeout: 90000 },
        )
      }
      await openProfile(profileView.student_id)
      await loadFeed(subjectId)
    } catch (err) {
      setError(err.response?.data?.detail || 'Follow failed')
    }
  }

  const removePost = async (postId) => {
    if (!window.confirm('Remove this post?')) return
    try {
      await api.delete(`/api/v1/subject-social/posts/${postId}`, {
        headers: authHeaders(),
        timeout: 90000,
      })
      await loadFeed(subjectId)
      if (profileView) await openProfile(profileView.student_id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not remove post')
    }
  }

  return (
    <div className="max-w-xl mx-auto pb-16">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">Subject Worlds</h1>
        <p className="text-gray-400 text-sm mt-1">
          Pick a subject. Scroll classmates’ posts. Follow people you learn from.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/30 text-blue-100 text-sm px-4 py-3 rounded-lg">
          {info}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        {subjects.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => openSubject(s.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border ${
              String(s.id) === String(subjectId)
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-900 border-gray-700 text-gray-300'
            }`}
          >
            {s.name}
          </button>
        ))}
        {subjects.length === 0 && (
          <p className="text-sm text-gray-500">No subjects yet — ask admin to add curriculum.</p>
        )}
      </div>

      {!subjectId && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-400 text-sm">
          Choose a subject to open its Instagram-style feed.
        </div>
      )}

      {subjectId && !profileView && (
        <>
          <form onSubmit={createPost} className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5 space-y-3">
            <p className="text-white font-semibold text-sm">
              Post to {selectedSubject?.name || 'subject'}
            </p>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Share a note, tip, or what you learned…"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm"
            />
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="Optional image/video link (Drive / URL)"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm"
            />
            {mediaUrl && (
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm"
            >
              Share
            </button>
            <p className="text-xs text-gray-500">
              Tip: upload in{' '}
              <Link to="/student-upload-proof" className="text-blue-400">Upload Proof</Link>
              , copy the Drive link, paste here.
            </p>
          </form>

          {loading && <p className="text-gray-500 text-sm mb-3">Loading feed…</p>}
          <div className="space-y-4">
            {feed.map((post) => (
              <article key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openProfile(post.author_student_id)}
                    className="text-left"
                  >
                    <p className="text-white text-sm font-semibold">
                      {post.author_display_name}
                      {post.from_followed && (
                        <span className="ml-2 text-xs text-blue-300 font-normal">Following</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">score {post.score}</p>
                  </button>
                  {(studentId === post.author_student_id) && (
                    <button
                      type="button"
                      onClick={() => removePost(post.id)}
                      className="text-xs text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {post.media_url && post.media_type === 'image' && (
                  <img src={post.media_url} alt="" className="w-full max-h-96 object-cover bg-black" />
                )}
                {post.media_url && post.media_type === 'video' && (
                  <video src={post.media_url} controls className="w-full max-h-96 bg-black" />
                )}
                {post.caption && (
                  <p className="px-4 py-3 text-sm text-gray-200 whitespace-pre-wrap">{post.caption}</p>
                )}
              </article>
            ))}
            {!loading && feed.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">
                No posts yet. Be the first to share in this subject.
              </p>
            )}
          </div>
        </>
      )}

      {profileView && (
        <div>
          <button
            type="button"
            onClick={() => setProfileView(null)}
            className="text-sm text-blue-400 mb-4"
          >
            ← Back to {selectedSubject?.name || 'feed'}
          </button>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
            <h2 className="text-xl font-bold text-white">{profileView.display_name}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {profileView.post_count} posts · {profileView.follower_count} followers · {profileView.following_count} following
              {' '}in this subject
            </p>
            {studentId !== profileView.student_id && (
              <button
                type="button"
                onClick={toggleFollow}
                className={`mt-4 px-4 py-2 rounded-lg text-sm font-semibold ${
                  profileView.is_following
                    ? 'bg-gray-800 text-gray-200 border border-gray-700'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {profileView.is_following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <div className="space-y-4">
            {(profileView.posts || []).map((post) => (
              <article key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                {post.media_url && post.media_type === 'image' && (
                  <img src={post.media_url} alt="" className="w-full rounded-lg mb-3 max-h-80 object-cover" />
                )}
                {post.caption && <p className="text-sm text-gray-200 whitespace-pre-wrap">{post.caption}</p>}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SubjectFeed
