/**
 * Subject worlds — pick a subject, scroll feed, follow peers, post media/text.
 * Primary compose path: camera / gallery upload (Instagram-style), not paste URL.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import InlineMedia from '../components/InlineMedia'
import MediaCapture from '../components/MediaCapture'
import api from '../services/api'
import driveUploadService from '../services/driveUploadService'
import muxUploadService, { COMING_ONLINE as MUX_COMING_ONLINE } from '../services/muxUploadService'
import ShortsPlayer from '../components/ShortsPlayer'
import {
  extractDriveFileId,
  mediaTypeFromUrl,
  urlsFromDriveUpload,
} from '../utils/driveMediaHelpers'


function relativeTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return d.toLocaleDateString()
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const SubjectFeed = () => {
  const { getAccessToken, profile } = useAuth()
  const studentProfile = profile?.student_profile || null
  const studentId = studentProfile?.id
  const [params, setParams] = useSearchParams()
  const subjectId = params.get('subject') || ''

  const [subjects, setSubjects] = useState([])
  const [feed, setFeed] = useState([])
  const [followingCount, setFollowingCount] = useState(0)
  const [feedMode, setFeedMode] = useState('suggested')
  const [suggestedPeople, setSuggestedPeople] = useState([])
  const [followingIds, setFollowingIds] = useState(() => new Set())
  const [profileView, setProfileView] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [caption, setCaption] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [muxConfigured, setMuxConfigured] = useState(null)
  const [shortsOpen, setShortsOpen] = useState(false)
  const [mediaMeta, setMediaMeta] = useState(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState('image')
  const [uploadProgress, setUploadProgress] = useState(0)

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
      const data = res.data
      // Tolerate legacy array briefly while backend rolls out
      if (Array.isArray(data)) {
        setFeed(data)
        setFollowingCount(0)
        setFeedMode('suggested')
        setSuggestedPeople([])
      } else {
        setFeed(data?.posts || [])
        setFollowingCount(data?.following_count ?? 0)
        setFeedMode(data?.mode || 'suggested')
        setSuggestedPeople(data?.suggested_people || [])
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => {
    let alive = true
    muxUploadService.getStatus()
      .then((s) => { if (alive) setMuxConfigured(!!s?.configured) })
      .catch(() => { if (alive) setMuxConfigured(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    loadSubjects().catch((err) => {
      setError(err.response?.data?.detail || 'Could not load subjects')
    })
  }, [loadSubjects])

  useEffect(() => {
    if (subjectId) {
      setProfileView(null)
      setFollowingIds(new Set())
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

  const clearMedia = () => {
    setMediaFile(null)
    setMediaMeta(null)
  }

  const createPost = async (e) => {
    e.preventDefault()
    if (!subjectId) return
    setError('')
    setInfo('')
    setPosting(true)
    setUploadProgress(0)

    try {
      let finalMediaUrl = null
      let finalMediaType = 'text'
      let driveUploadId = null
      let viewUrl = null

      let muxMeta = null
      if (mediaFile) {
        const token = getAccessToken() || localStorage.getItem('edumind_token')
        if (!token) throw new Error('Please log in to upload media.')
        finalMediaType = mediaMeta?.mediaType || (String(mediaFile.type || '').startsWith('video/') ? 'video' : 'image')
        if (finalMediaType === 'video') {
          if (muxConfigured === false) throw new Error(MUX_COMING_ONLINE)
          setInfo('Uploading Short to Mux…')
          try {
            muxMeta = await muxUploadService.uploadSelfieVideo(mediaFile, token, {
              purpose: 'subject_post',
              onProgress: setUploadProgress,
              onStatus: (m) => setInfo(m),
            })
          } catch (muxErr) {
            if (muxErr.code === 'MUX_UNAVAILABLE' || /coming online/i.test(muxErr.message || '')) {
              throw new Error(MUX_COMING_ONLINE)
            }
            throw muxErr
          }
          finalMediaUrl = muxMeta.playback_url
          if (!finalMediaUrl) throw new Error('Mux upload finished but no playback URL was returned.')
        } else {
          // Photos: keep temporary Drive path (Cloudflare Images later)
          const uploaded = await driveUploadService.upload(
            mediaFile,
            'proof',
            token,
            setUploadProgress,
          )
          const urls = urlsFromDriveUpload(uploaded)
          finalMediaUrl = urls.playbackUrl || urls.viewUrl
          viewUrl = urls.viewUrl
          driveUploadId = uploaded.id || null
          if (!finalMediaUrl) {
            throw new Error('Photo upload succeeded but no media link was returned.')
          }
        }
      } else if (mediaUrl.trim()) {
        finalMediaUrl = mediaUrl.trim()
        finalMediaType = mediaType || mediaTypeFromUrl(finalMediaUrl) || 'image'
      }

      await api.post(
        '/api/v1/subject-social/posts',
        {
          subject_id: Number(subjectId),
          caption: caption.trim() || null,
          media_url: finalMediaUrl,
          media_type: finalMediaUrl ? finalMediaType : 'text',
          drive_upload_id: driveUploadId,
          mux_asset_id: muxMeta?.asset_id || null,
          mux_playback_id: muxMeta?.playback_id || null,
          mux_upload_id: muxMeta?.upload_id || null,
          video_duration_seconds: muxMeta?.duration_seconds || null,
        },
        { headers: authHeaders(), timeout: 90000 },
      )
      setCaption('')
      setMediaUrl('')
      clearMedia()
      setAdvancedOpen(false)
      setInfo('Posted to subject feed')
      await loadFeed(subjectId)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to post')
    } finally {
      setPosting(false)
      setUploadProgress(0)
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


  const followStudent = async (targetId) => {
    if (!subjectId || !targetId || targetId === studentId) return
    setError('')
    try {
      await api.post(
        '/api/v1/subject-social/follows',
        {
          following_student_id: targetId,
          subject_id: Number(subjectId),
        },
        { headers: authHeaders(), timeout: 90000 },
      )
      setFollowingIds((prev) => new Set([...prev, targetId]))
      setInfo('Following')
      await loadFeed(subjectId)
      if (profileView?.student_id === targetId) {
        await openProfile(targetId)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Follow failed')
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

  const renderPostMedia = (post) => {
    const muxSrc = post.mux_playback_id
      ? `https://stream.mux.com/${post.mux_playback_id}.m3u8`
      : null
    const src = muxSrc || post.media_url
    if (!src || post.media_type === 'text') return null
    const driveId = extractDriveFileId(post.media_url || '')
    const viewUrl = driveId
      ? `https://drive.google.com/file/d/${driveId}/view`
      : post.media_url
    return (
      <InlineMedia
        src={src}
        viewUrl={viewUrl || src}
        mediaType={post.media_type || (muxSrc ? 'video' : 'image')}
      />
    )
  }

  return (
    <div className="max-w-xl mx-auto pb-16">

      {!studentProfile?.school_id && (
        <div className="mb-5 bg-amber-500/10 border border-amber-500/30 text-amber-100 rounded-xl p-4">
          <p className="font-semibold text-sm">Subject Worlds needs your school · स्कूल असाइनमेंट ज़रूरी</p>
          <p className="text-xs mt-1 text-amber-100/80">
            Your profile has no school yet, so the feed looks empty. Ask admin to assign school (pilot school 8 is fine).
            Courage notes stay private and never appear here.
          </p>
          <Link to="/profile-status" className="inline-block mt-3 text-sm text-blue-300 hover:text-blue-200">
            Check profile status →
          </Link>
        </div>
      )}

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
          <p className="text-xs text-gray-400 mb-3 px-1">
            {followingCount === 0
              ? 'Suggested for you · classmates in this subject'
              : 'Following + suggested'}
            {feedMode === 'mixed' && followingCount > 0 ? ' · mixed' : ''}
          </p>

          {suggestedPeople.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-white mb-2 px-1">Suggested people</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {suggestedPeople.map((person) => {
                  const already =
                    person.is_following || followingIds.has(person.student_id)
                  return (
                    <div
                      key={person.student_id}
                      className="shrink-0 w-28 bg-gray-900 border border-gray-800 rounded-xl p-3 text-center"
                    >
                      <button
                        type="button"
                        onClick={() => openProfile(person.student_id)}
                        className="mx-auto mb-2 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm"
                        aria-label={`Open ${person.display_name}`}
                      >
                        {initials(person.display_name)}
                      </button>
                      <p className="text-xs text-white font-medium truncate mb-2">
                        {person.display_name}
                      </p>
                      <button
                        type="button"
                        disabled={already}
                        onClick={() => followStudent(person.student_id)}
                        className={`w-full text-xs font-semibold py-1.5 rounded-lg ${
                          already
                            ? 'bg-gray-800 text-gray-400 border border-gray-700'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}
                      >
                        {already ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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

            {muxConfigured === false && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100 text-xs">
                Video uploads coming online — Shorts video posts unlock once Mux is configured. Photos still work.
              </div>
            )}
            <MediaCapture
              mode="both"
              label="Camera or gallery"
              disabled={posting}
              onCaptured={(file, meta) => {
                setMediaFile(file)
                setMediaMeta(meta)
                setMediaUrl('')
              }}
              onCleared={clearMedia}
            />

            {posting && uploadProgress > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Uploading…</span>
                  <span className="text-blue-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <details
              className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2"
              open={advancedOpen}
              onToggle={(e) => setAdvancedOpen(e.target.open)}
            >
              <summary className="text-xs text-gray-400 cursor-pointer select-none">
                Advanced — paste media URL instead
              </summary>
              <div className="mt-3 space-y-2">
                <input
                  value={mediaUrl}
                  onChange={(e) => {
                    setMediaUrl(e.target.value)
                    if (e.target.value.trim()) clearMedia()
                  }}
                  placeholder="Optional image/video link (Drive / URL)"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm"
                />
                {mediaUrl && (
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg text-white px-3 py-2 text-sm"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                )}
              </div>
            </details>

            <button
              type="submit"
              disabled={posting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm"
            >
              {posting ? 'Sharing…' : 'Share'}
            </button>
          </form>

          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShortsOpen(true)}
              className="text-xs font-semibold px-3 py-2 rounded-full bg-blue-600 text-white"
            >
              Watch Shorts
            </button>
          </div>

          {loading && <p className="text-gray-500 text-sm mb-3">Loading feed…</p>}
          <div className="space-y-4">
            {feed.map((post) => {
              const showSuggested =
                post.is_suggested || Boolean(post.suggestion_label)
              const canFollowAuthor =
                studentId !== post.author_student_id &&
                !post.from_followed &&
                !followingIds.has(post.author_student_id)
              return (
              <article key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 gap-2">
                  <button
                    type="button"
                    onClick={() => openProfile(post.author_student_id)}
                    className="text-left min-w-0"
                  >
                    <p className="text-white text-sm font-semibold flex flex-wrap items-center gap-2">
                      <span className="truncate">{post.author_display_name}</span>
                      {post.from_followed && (
                        <span className="text-xs text-blue-300 font-normal">Following</span>
                      )}
                      {showSuggested && (
                        <span className="text-[10px] uppercase tracking-wide bg-purple-500/20 text-purple-200 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                          {post.suggestion_label || 'Suggested for you'}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{relativeTime(post.created_at)}</p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {canFollowAuthor && (
                      <button
                        type="button"
                        onClick={() => followStudent(post.author_student_id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                      >
                        Follow
                      </button>
                    )}
                    {studentId === post.author_student_id && (
                      <button
                        type="button"
                        onClick={() => removePost(post.id)}
                        className="text-xs text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {renderPostMedia(post)}
                {post.caption && (
                  <p className="px-4 py-3 text-sm text-gray-200 whitespace-pre-wrap">{post.caption}</p>
                )}
              </article>
              )
            })}
            {!loading && feed.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">
                No posts in this subject yet — be first, or check back after classmates post.
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
              <article key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {renderPostMedia(post)}
                {post.caption && (
                  <p className="px-4 py-3 text-sm text-gray-200 whitespace-pre-wrap">{post.caption}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
      {shortsOpen && (
        <ShortsPlayer
          items={(Array.isArray(feed) ? feed : []).filter(
            (p) => p.media_type === 'video' || p.mux_playback_id,
          )}
          onClose={() => setShortsOpen(false)}
        />
      )}
    </div>
  )
}

export default SubjectFeed
