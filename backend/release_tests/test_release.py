"""Integration checks against real routes and an isolated database; no live student data."""
import os
from datetime import datetime, timedelta
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from core.database import Base, get_db
from core.auth import get_current_supabase_user
from core.learning_time import school_date
from modules.student_growth import models as m
from modules.student_growth import learning_log_controller, revision_controller, habit_controller, setup_controller, peer_learning_controller, teacher_dashboard_controller, parent_dashboard_controller, dev_seed_controller, user_controller, school_admin_controller, auth_controller

@pytest.fixture
def env():
    engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session=sessionmaker(bind=engine)
    with Session() as db:
        db.add_all([m.School(id=1,name='School A'),m.School(id=2,name='School B'),
            m.Classroom(id=1,school_id=1,name='A'),m.Classroom(id=2,school_id=2,name='B'),
            m.Subject(id=1,school_id=1,name='Math'),m.Subject(id=2,school_id=2,name='Science'),
            m.Topic(id=1,subject_id=1,name='Fractions'),m.Topic(id=2,subject_id=2,name='Light')])
        for i,role in [(1,'STUDENT'),(2,'STUDENT'),(3,'STUDENT'),(4,'TEACHER'),(5,'PARENT'),(6,'ADMIN')]:
            db.add(m.AppUser(id=i,full_name=f'Person {i}',email=f'user{i}@example.com',supabase_user_id=f'auth-{i}',role=role,status='ACTIVE'))
        db.add_all([m.StudentProfile(id=1,user_id=1,school_id=1,classroom_id=1,display_name='One'),m.StudentProfile(id=2,user_id=2,school_id=1,classroom_id=1,display_name='Two'),m.StudentProfile(id=3,user_id=3,school_id=2,classroom_id=2,display_name='Three'),m.TeacherProfile(id=1,user_id=4,school_id=1,display_name='Teacher'),m.TeacherClassroom(teacher_profile_id=1,classroom_id=1,status='ACTIVE'),m.ParentProfile(id=1,user_id=5,display_name='Parent'),m.ParentStudentLink(parent_profile_id=1,student_profile_id=1,status='ACTIVE')])
        db.commit()
    app=FastAPI()
    for module in [learning_log_controller,revision_controller,habit_controller,setup_controller,peer_learning_controller,teacher_dashboard_controller,parent_dashboard_controller,dev_seed_controller,user_controller,school_admin_controller,auth_controller]:
        app.include_router(module.router)
    def database():
        with Session() as db: yield db
    app.dependency_overrides[get_db]=database
    actor={'id':1}
    def authenticate(): return {'sub':f"auth-{actor['id']}",'email':f"user{actor['id']}@example.com"}
    app.dependency_overrides[get_current_supabase_user]=authenticate
    with TestClient(app) as client: yield client,actor,Session,app
    engine.dispose()

def log_payload(student=1):
    return dict(student_id=student,school_id=1,classroom_id=1,subject_id=1,topic_id=1,taught_today='Fractions',understood='One half',not_understood='Equivalent fractions')

def save(client, key='request-0001', student=1):
    return client.post('/api/v1/learning-logs',json=log_payload(student),headers={'Idempotency-Key':key})

def test_anonymous_access_denied(env):
    client,_,_,app=env
    app.dependency_overrides.pop(get_current_supabase_user)
    for path in ['/api/v1/learning-logs/student/1','/api/v1/revisions/student/1','/api/v1/users','/api/v1/schools']:
        assert client.get(path).status_code==401

def test_identity_and_cross_student_writes(env):
    client,actor,_,_=env
    assert save(client,student=2).status_code==403
    assert client.get('/api/v1/learning-logs/student/2').status_code==403
    result=save(client)
    assert result.status_code==200, result.text
    task=result.json()['revision_tasks'][0]['id']
    actor['id']=2
    assert client.patch(f'/api/v1/revisions/{task}/complete',json={}).status_code==403
    assert client.get(f'/api/v1/revisions/{task}/attempts').status_code==403
    assert client.get('/api/v1/habits/student/2/summary').status_code==200

def test_retries_are_atomic_and_idempotent(env):
    client,_,Session,_=env
    first=save(client); second=save(client)
    assert first.status_code==second.status_code==200
    assert first.json()['id']==second.json()['id']
    with Session() as db:
        assert db.query(m.LearningLog).count()==1
        assert db.query(m.RevisionTask).count()==5
        assert db.query(m.RewardEvent).count()==2
    payload=log_payload();payload['understood']='Changed'
    assert client.post('/api/v1/learning-logs',json=payload,headers={'Idempotency-Key':'request-0001'}).status_code==409

def test_failure_rolls_back_entire_log(env,monkeypatch):
    from modules.student_growth.learning_log_service import LearningLogService
    client,_,Session,_=env
    def fail(*args): raise RuntimeError('injected failure')
    monkeypatch.setattr(LearningLogService,'_create_learning_log_rewards',fail)
    assert save(client).status_code==500
    with Session() as db:
        assert db.query(m.LearningLog).count()==0
        assert db.query(m.RevisionTask).count()==0

def test_school_scope_and_disabled_user(env):
    client,actor,Session,_=env
    data=log_payload();data.update(school_id=2,subject_id=2,topic_id=2)
    assert client.post('/api/v1/learning-logs',json=data,headers={'Idempotency-Key':'request-0002'}).status_code==403
    assert [x['id'] for x in client.get('/api/v1/schools').json()]==[1]
    assert client.get('/api/v1/subjects/school/2').status_code==403
    with Session() as db:
        db.get(m.AppUser,1).status='INACTIVE';db.commit()
    assert client.get('/api/v1/habits/student/1/summary').status_code==403

def test_teacher_parent_memberships(env):
    client,actor,_,_=env
    actor['id']=4
    assert client.get('/api/v1/teacher-dashboard/classroom/1/summary').status_code==200
    assert client.get('/api/v1/teacher-dashboard/classroom/2/summary').status_code==403
    actor['id']=5
    assert client.get('/api/v1/parent-dashboard/student/1/summary').status_code==200
    assert client.get('/api/v1/parent-dashboard/student/2/summary').status_code==403
    assert save(client).status_code==403

def test_peer_scope_cannot_be_overridden(env):
    client,_,Session,_=env
    with Session() as db:
        db.add_all([m.PeerHelpRequest(requester_student_id=2,school_id=1,classroom_id=1,subject_id=1,topic_id=1,message='Visible'),m.PeerHelpRequest(requester_student_id=3,school_id=2,classroom_id=2,subject_id=2,topic_id=2,message='Private')]);db.commit()
    response=client.get('/api/v1/peer-learning/requests/open?school_id=2&classroom_id=2')
    assert response.status_code==200,response.text
    assert [x['message'] for x in response.json()]==['Visible']
    assert client.get('/api/v1/peer-learning/topic/2/circle').json()['open_requests_count']==0
    assert client.post('/api/v1/peer-learning/requests/2/accept',json={'helper_student_id':1}).status_code==403

def test_admin_enrollment_and_seed_disabled(env):
    client,actor,Session,_=env
    data={'full_name':'New student','email':'new@example.com','role':'STUDENT','school_id':1,'classroom_id':1}
    assert client.post('/api/v1/school-admin/enroll',json=data).status_code==403
    actor['id']=6
    assert client.post('/api/v1/dev/seed-demo-data').status_code==404
    assert client.post('/api/v1/school-admin/enroll',json=data).status_code==201
    assert client.post('/api/v1/school-admin/enroll',json=data).status_code==409
    with Session() as db: assert db.query(m.AppUser).filter_by(email='new@example.com').count()==1
    data.update(email='bad@example.com',classroom_id=2)
    assert client.post('/api/v1/school-admin/enroll',json=data).status_code==422

def test_cannot_link_someone_elses_identity(env):
    client,_,_,_=env
    assert client.post('/api/v1/auth/link-current-user',json={'app_user_id':6}).status_code==403

def test_revision_lock_and_repeat_completion(env):
    client,_,Session,_=env
    task=save(client).json()['revision_tasks'][0]['id']
    assert client.patch(f'/api/v1/revisions/{task}/complete',json={}).status_code==400
    with Session() as db:
        db.get(m.RevisionTask,task).due_at=datetime.utcnow()-timedelta(days=1);db.commit()
    for _ in range(2): assert client.patch(f'/api/v1/revisions/{task}/complete',json={'revision_text_summary':'I recall half means one of two equal parts.'}).status_code==200
    with Session() as db:
        assert db.query(m.RevisionAttempt).count()==1
        assert db.query(m.RewardEvent).filter_by(event_type='REVISION_COMPLETED').count()==1

def test_school_midnight():
    assert str(school_date(datetime(2026,9,8,18,29)))=='2026-09-08'
    assert str(school_date(datetime(2026,9,8,18,30)))=='2026-09-09'
