"""Subject-world feed, posts, and follows."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modules.student_growth.auth_profile_service import AuthProfileService
from modules.student_growth.models import (
    StudentProfile,
    Subject,
    SubjectFollow,
    SubjectPost,
)
from modules.student_growth.subject_social_schemas import SubjectPostCreate


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class SubjectSocialService:
    def __init__(self, db: Session):
        self.db = db

    def _student_ctx(self, token_payload: dict[str, Any]) -> tuple[Any, StudentProfile]:
        profile = AuthProfileService(self.db).resolve_current_user(token_payload)
        app_user = profile.get("app_user")
        student = profile.get("student_profile")
        if app_user is None:
            raise HTTPException(status_code=403, detail="EduMind profile not linked.")
        if student is None:
            raise HTTPException(status_code=403, detail="Student profile required.")
        if not student.school_id:
            raise HTTPException(
                status_code=400,
                detail="Ask admin to assign your school before using Subject Feed.",
            )
        return app_user, student

    def list_my_subjects(self, token_payload: dict[str, Any]) -> list[Subject]:
        _, student = self._student_ctx(token_payload)
        return (
            self.db.query(Subject)
            .filter(Subject.school_id == student.school_id)
            .order_by(Subject.name.asc())
            .all()
        )

    def _author_name(self, student_id: int) -> str:
        sp = self.db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        return (sp.display_name if sp and sp.display_name else f"Student {student_id}")

    def _serialize_post(
        self,
        post: SubjectPost,
        *,
        followed_ids: set[int],
        me_id: int,
        struggle_topic_ids: Optional[set[int]] = None,
    ) -> dict:
        struggle_topic_ids = struggle_topic_ids or set()
        age_hours = max(
            0.1,
            (_utcnow() - (post.created_at or _utcnow())).total_seconds() / 3600.0,
        )
        from_followed = post.author_student_id in followed_ids
        same_author = post.author_student_id == me_id
        score = 0.0
        if from_followed:
            score += 30
        if same_author:
            score += 5
        if post.topic_id and post.topic_id in struggle_topic_ids:
            score += 15
        score += min(15.0, 15.0 / (age_hours ** 0.35))
        score += min(10.0, (post.like_count or 0) * 0.5)
        is_suggested = not from_followed and not same_author
        return {
            "id": post.id,
            "author_student_id": post.author_student_id,
            "author_display_name": self._author_name(post.author_student_id),
            "school_id": post.school_id,
            "subject_id": post.subject_id,
            "topic_id": post.topic_id,
            "caption": post.caption,
            "media_url": post.media_url,
            "media_type": post.media_type,
            "drive_upload_id": post.drive_upload_id,
            "status": post.status,
            "like_count": post.like_count or 0,
            "created_at": post.created_at,
            "from_followed": from_followed,
            "is_suggested": is_suggested,
            "suggestion_label": "Suggested for you" if is_suggested else None,
            "score": round(score, 2),
        }

    def create_post(self, token_payload: dict[str, Any], payload: SubjectPostCreate) -> dict:
        _, student = self._student_ctx(token_payload)
        subject = (
            self.db.query(Subject)
            .filter(Subject.id == payload.subject_id, Subject.school_id == student.school_id)
            .first()
        )
        if subject is None:
            raise HTTPException(status_code=404, detail="Subject not found for your school.")

        caption = (payload.caption or "").strip() or None
        media_url = (payload.media_url or "").strip() or None
        if not caption and not media_url:
            raise HTTPException(status_code=400, detail="Add a caption or media link.")

        post = SubjectPost(
            author_student_id=student.id,
            school_id=student.school_id,
            subject_id=payload.subject_id,
            topic_id=payload.topic_id,
            caption=caption,
            media_url=media_url,
            media_type=payload.media_type or ("image" if media_url else "text"),
            drive_upload_id=payload.drive_upload_id,
            status="ACTIVE",
            like_count=0,
            created_at=_utcnow(),
        )
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return self._serialize_post(post, followed_ids=set(), me_id=student.id)

    def _suggested_people(
        self,
        *,
        posts: list[SubjectPost],
        me_id: int,
        followed_ids: set[int],
        limit: int = 8,
    ) -> list[dict]:
        stats: dict[int, dict[str, Any]] = defaultdict(
            lambda: {"post_count": 0, "likes": 0, "display_name": ""}
        )
        for post in posts:
            aid = post.author_student_id
            if aid == me_id or aid in followed_ids:
                continue
            stats[aid]["post_count"] += 1
            stats[aid]["likes"] += post.like_count or 0
            if not stats[aid]["display_name"]:
                stats[aid]["display_name"] = self._author_name(aid)

        ranked = sorted(
            stats.items(),
            key=lambda item: (-item[1]["post_count"], -item[1]["likes"], item[0]),
        )
        return [
            {
                "student_id": sid,
                "display_name": data["display_name"] or f"Student {sid}",
                "post_count": data["post_count"],
                "is_following": False,
            }
            for sid, data in ranked[:limit]
        ]

    def _rank_feed_posts(
        self,
        serialized: list[dict],
        *,
        following_count: int,
        limit: int,
        mode: str,
    ) -> tuple[list[dict], str]:
        """Instagram-style mix: followed-heavy first, then suggested fill."""
        followed_posts = [p for p in serialized if p["from_followed"]]
        own_posts = [
            p for p in serialized if not p["from_followed"] and not p["is_suggested"]
        ]
        suggested_posts = [p for p in serialized if p["is_suggested"]]

        key = lambda x: (-x["score"], -x["id"])
        followed_posts.sort(key=key)
        own_posts.sort(key=key)
        suggested_posts.sort(key=key)

        if mode == "following":
            return followed_posts[:limit], "following"

        if mode == "suggested":
            if following_count == 0:
                out = sorted(own_posts + suggested_posts, key=key)[:limit]
            else:
                out = suggested_posts[:limit]
            return out, "suggested"

        if following_count == 0:
            out = sorted(own_posts + suggested_posts, key=key)[:limit]
            return out, "suggested"

        primary = followed_posts + own_posts
        primary.sort(key=key)
        take = primary[:limit]
        remaining = limit - len(take)
        if remaining > 0:
            take = take + suggested_posts[:remaining]

        if followed_posts and suggested_posts:
            resolved = "mixed"
        elif followed_posts or (following_count > 0 and not suggested_posts):
            resolved = "following"
        else:
            resolved = "suggested"
        return take, resolved

    def feed(
        self,
        token_payload: dict[str, Any],
        subject_id: int,
        limit: int = 40,
        mode: str = "all",
    ) -> dict:
        _, student = self._student_ctx(token_payload)
        subject = (
            self.db.query(Subject)
            .filter(Subject.id == subject_id, Subject.school_id == student.school_id)
            .first()
        )
        if subject is None:
            raise HTTPException(status_code=404, detail="Subject not found for your school.")

        mode_norm = (mode or "all").strip().lower()
        if mode_norm not in {"all", "suggested", "following"}:
            mode_norm = "all"

        followed = {
            row.following_student_id
            for row in self.db.query(SubjectFollow)
            .filter(
                SubjectFollow.follower_student_id == student.id,
                SubjectFollow.subject_id == subject_id,
            )
            .all()
        }
        following_count = len(followed)

        posts = (
            self.db.query(SubjectPost)
            .filter(
                SubjectPost.subject_id == subject_id,
                SubjectPost.school_id == student.school_id,
                SubjectPost.status == "ACTIVE",
            )
            .order_by(SubjectPost.created_at.desc())
            .limit(max(limit * 3, 60))
            .all()
        )
        serialized = [
            self._serialize_post(p, followed_ids=followed, me_id=student.id)
            for p in posts
        ]
        ranked, resolved_mode = self._rank_feed_posts(
            serialized,
            following_count=following_count,
            limit=limit,
            mode=mode_norm,
        )
        suggested_people = self._suggested_people(
            posts=posts,
            me_id=student.id,
            followed_ids=followed,
            limit=8,
        )
        return {
            "subject_id": subject_id,
            "following_count": following_count,
            "mode": resolved_mode,
            "posts": ranked,
            "suggested_people": suggested_people,
        }

    def profile(
        self, token_payload: dict[str, Any], student_id: int, subject_id: int
    ) -> dict:
        _, me = self._student_ctx(token_payload)
        target = self.db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if target is None:
            raise HTTPException(status_code=404, detail="Student not found.")
        if target.school_id != me.school_id:
            raise HTTPException(status_code=403, detail="Students must share a school.")

        is_following = (
            self.db.query(SubjectFollow)
            .filter(
                SubjectFollow.follower_student_id == me.id,
                SubjectFollow.following_student_id == student_id,
                SubjectFollow.subject_id == subject_id,
            )
            .first()
            is not None
        )
        posts = (
            self.db.query(SubjectPost)
            .filter(
                SubjectPost.author_student_id == student_id,
                SubjectPost.subject_id == subject_id,
                SubjectPost.status == "ACTIVE",
            )
            .order_by(SubjectPost.created_at.desc())
            .limit(50)
            .all()
        )
        followed = {student_id} if is_following else set()
        return {
            "student_id": student_id,
            "display_name": target.display_name or f"Student {student_id}",
            "school_id": target.school_id,
            "classroom_id": target.classroom_id,
            "subject_id": subject_id,
            "is_following": is_following,
            "follower_count": self.db.query(SubjectFollow)
            .filter(
                SubjectFollow.following_student_id == student_id,
                SubjectFollow.subject_id == subject_id,
            )
            .count(),
            "following_count": self.db.query(SubjectFollow)
            .filter(
                SubjectFollow.follower_student_id == student_id,
                SubjectFollow.subject_id == subject_id,
            )
            .count(),
            "post_count": len(posts),
            "posts": [
                self._serialize_post(p, followed_ids=followed, me_id=me.id) for p in posts
            ],
        }

    def follow(self, token_payload: dict[str, Any], following_student_id: int, subject_id: int) -> dict:
        _, me = self._student_ctx(token_payload)
        if following_student_id == me.id:
            raise HTTPException(status_code=400, detail="You cannot follow yourself.")
        target = self.db.query(StudentProfile).filter(StudentProfile.id == following_student_id).first()
        if target is None or target.school_id != me.school_id:
            raise HTTPException(status_code=404, detail="Student not found in your school.")

        existing = (
            self.db.query(SubjectFollow)
            .filter(
                SubjectFollow.follower_student_id == me.id,
                SubjectFollow.following_student_id == following_student_id,
                SubjectFollow.subject_id == subject_id,
            )
            .first()
        )
        if existing:
            return {
                "id": existing.id,
                "follower_student_id": existing.follower_student_id,
                "following_student_id": existing.following_student_id,
                "subject_id": existing.subject_id,
                "created_at": existing.created_at,
            }

        row = SubjectFollow(
            follower_student_id=me.id,
            following_student_id=following_student_id,
            subject_id=subject_id,
            created_at=_utcnow(),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return {
            "id": row.id,
            "follower_student_id": row.follower_student_id,
            "following_student_id": row.following_student_id,
            "subject_id": row.subject_id,
            "created_at": row.created_at,
        }

    def unfollow(self, token_payload: dict[str, Any], following_student_id: int, subject_id: int) -> dict:
        _, me = self._student_ctx(token_payload)
        row = (
            self.db.query(SubjectFollow)
            .filter(
                SubjectFollow.follower_student_id == me.id,
                SubjectFollow.following_student_id == following_student_id,
                SubjectFollow.subject_id == subject_id,
            )
            .first()
        )
        if row:
            self.db.delete(row)
            self.db.commit()
        return {"ok": True}

    def remove_post(self, token_payload: dict[str, Any], post_id: int, *, as_admin: bool = False) -> dict:
        profile = AuthProfileService(self.db).resolve_current_user(token_payload)
        app_user = profile.get("app_user")
        student = profile.get("student_profile")
        if app_user is None:
            raise HTTPException(status_code=403, detail="EduMind profile not linked.")

        post = self.db.query(SubjectPost).filter(SubjectPost.id == post_id).first()
        if post is None:
            raise HTTPException(status_code=404, detail="Post not found.")

        role = (getattr(app_user, "role", None) or "").upper()
        is_owner = student is not None and post.author_student_id == student.id
        if not (is_owner or role == "ADMIN" or as_admin):
            raise HTTPException(status_code=403, detail="Not allowed to remove this post.")

        post.status = "REMOVED"
        self.db.commit()
        return {"ok": True, "id": post_id}

    def admin_list_posts(self, subject_id: Optional[int] = None, limit: int = 50) -> list[dict]:
        q = self.db.query(SubjectPost).filter(SubjectPost.status == "ACTIVE")
        if subject_id:
            q = q.filter(SubjectPost.subject_id == subject_id)
        posts = q.order_by(SubjectPost.created_at.desc()).limit(limit).all()
        return [
            self._serialize_post(p, followed_ids=set(), me_id=0) for p in posts
        ]
