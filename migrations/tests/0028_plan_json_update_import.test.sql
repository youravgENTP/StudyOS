-- Run after loading migration 0028 in the same transaction. This script creates
-- isolated rows, exercises both modes, and is intended to be rolled back.

select set_config('request.jwt.claims', jsonb_build_object('sub', (select user_id from private.app_owners limit 1))::text, true);

do $$
declare
  owner_id text := auth.user_id();
  project_id uuid; workstream_id uuid; section_id uuid; task_id uuid; omitted_task_id uuid; fallback_task_id uuid; event_id uuid;
  foreign_project_id uuid; foreign_workstream_id uuid; foreign_task_id uuid;
  payload jsonb; result jsonb; failed boolean := false; invalid_mode_failed boolean := false;
  base_project jsonb; base_workstream jsonb; base_section jsonb;
begin
  insert into public.projects(user_id,title,category,due_date,status,position) values(owner_id,'__import_v2_project__','study','2099-12-31','not_started',9000) returning id into project_id;
  insert into public.workstreams(user_id,project_id,title,category,due_date,status,position) values(owner_id,project_id,'__import_v2_workstream__','study','2099-12-31','not_started',9000) returning id into workstream_id;
  insert into public.sections(user_id,workstream_id,title,status,position) values(owner_id,workstream_id,'__import_v2_section__','not_started',9000) returning id into section_id;
  insert into public.tasks(user_id,project_id,workstream_id,section_id,title,category,due_date,status,position) values(owner_id,project_id,workstream_id,section_id,'Original task','study','2099-10-01','not_started',0) returning id into task_id;
  insert into public.tasks(user_id,project_id,workstream_id,section_id,title,category,due_date,status,position) values(owner_id,project_id,workstream_id,section_id,'Omitted task','study','2099-10-02','not_started',1) returning id into omitted_task_id;
  insert into public.tasks(user_id,project_id,workstream_id,section_id,title,category,due_date,status,position) values(owner_id,project_id,workstream_id,section_id,'Fallback task','study','2099-10-03','not_started',2) returning id into fallback_task_id;
  insert into public.events(user_id,title,category,all_day,start_date,end_date,is_major,display_style) values(owner_id,'Movable event','personal',true,'2099-10-01','2099-10-01',false,'compact') returning id into event_id;

  insert into public.projects(user_id,title,category,due_date,status,position) values('__foreign_import_test__','__foreign_project__','study','2099-12-31','not_started',0) returning id into foreign_project_id;
  insert into public.workstreams(user_id,project_id,title,category,due_date,status,position) values('__foreign_import_test__',foreign_project_id,'__foreign_workstream__','study','2099-12-31','not_started',0) returning id into foreign_workstream_id;
  insert into public.tasks(user_id,project_id,workstream_id,title,category,due_date,status,position) values('__foreign_import_test__',foreign_project_id,foreign_workstream_id,'Foreign task','study','2099-10-01','not_started',0) returning id into foreign_task_id;

  base_section := jsonb_build_object('id',section_id,'title','__import_v2_section__','description',null,'startDate',null,'dueDate',null,'status','not_started','position',9000,
    'tasks',jsonb_build_array(jsonb_build_object('id',task_id,'title','Renamed task','description','updated','category','study','startDate','2099-10-04','dueDate','2099-10-04','status','done','isDday',true,'position',0,'showOnCalendar',false,'isDeadline',true)));
  base_workstream := jsonb_build_object('id',workstream_id,'title','__import_v2_workstream__','description',null,'category','study','startDate',null,'dueDate','2099-12-31','status','not_started','isDday',false,'position',9000,'subject',null,'showOnCalendar',true,'sections',jsonb_build_array(base_section),'tasks','[]'::jsonb);
  base_project := jsonb_build_object('id',project_id,'title','__import_v2_project__','description',null,'category','study','startDate',null,'dueDate','2099-12-31','status','not_started','isDday',false,'position',9000,'workstreams',jsonb_build_array(base_workstream),'tasks','[]'::jsonb);
  payload := jsonb_build_object('format','studyos-plan','version',1,'exportedAt',now(),'catalog',jsonb_build_object('categories','[]'::jsonb,'subjects','[]'::jsonb,'scheduleSubcategories','[]'::jsonb),
    'tasks',jsonb_build_object('projects',jsonb_build_array(base_project)),
    'schedules',jsonb_build_object('events',jsonb_build_array(jsonb_build_object('id',event_id,'title','Movable event','category','personal','subject',null,'subcategory',null,'allDay',true,'startDate','2099-10-05','startTime',null,'endDate','2099-10-05','endTime',null,'isMajor',true,'displayStyle','bar'))));

  begin perform public.import_studyos_plan_v2(payload,'replace'); exception when others then invalid_mode_failed := true; end;
  if not invalid_mode_failed then raise exception 'unsupported import mode was accepted'; end if;

  result := public.import_studyos_plan_v2(payload,'merge');
  if (select due_date <> '2099-10-01'::date or title <> 'Original task' from public.tasks where id=task_id) then raise exception 'merge mode changed an existing task'; end if;
  if (select count(*) <> 1 from public.tasks where user_id=owner_id and id=task_id) then raise exception 'merge mode duplicated an ID-matched task'; end if;
  if (result->'unchanged'->>'tasks')::integer <> 1 then raise exception 'merge result did not count unchanged task'; end if;

  base_section := jsonb_set(base_section,'{tasks}',jsonb_build_array(
    jsonb_build_object('id',task_id,'title','Renamed task','description','updated','category','study','startDate','2099-10-04','dueDate','2099-10-04','status','done','isDday',true,'position',0,'showOnCalendar',false,'isDeadline',true),
    jsonb_build_object('title','Fallback task','description',null,'category','study','startDate',null,'dueDate','2099-10-09','status','not_started','isDday',false,'position',2,'showOnCalendar',true,'isDeadline',false),
    jsonb_build_object('title','New task','description',null,'category','study','startDate',null,'dueDate','2099-10-10','status','not_started','isDday',false,'position',3,'showOnCalendar',true,'isDeadline',false),
    jsonb_build_object('id',foreign_task_id,'title','Foreign task','description',null,'category','study','startDate',null,'dueDate','2099-10-11','status','not_started','isDday',false,'position',4,'showOnCalendar',true,'isDeadline',false)
  ));
  base_workstream := jsonb_set(base_workstream,'{sections}',jsonb_build_array(base_section));
  base_project := jsonb_set(base_project,'{workstreams}',jsonb_build_array(base_workstream));
  payload := jsonb_set(payload,'{tasks,projects}',jsonb_build_array(base_project));
  result := public.import_studyos_plan_v2(payload,'update');

  if not exists(select 1 from public.tasks where id=task_id and title='Renamed task' and start_date='2099-10-04' and due_date='2099-10-04' and status='done' and completed_at is not null) then raise exception 'ID task update or completed_at failed'; end if;
  if not exists(select 1 from public.tasks where id=fallback_task_id and due_date='2099-10-09') then raise exception 'fallback task date update failed'; end if;
  if (select count(*) <> 1 from public.tasks where id=fallback_task_id) then raise exception 'fallback task was duplicated'; end if;
  if not exists(select 1 from public.tasks where user_id=owner_id and title='New task') then raise exception 'new task was not inserted'; end if;
  if not exists(select 1 from public.tasks where user_id=owner_id and title='Foreign task') then raise exception 'foreign ID did not fall back to an owner-scoped insert'; end if;
  if not exists(select 1 from public.tasks where id=foreign_task_id and user_id='__foreign_import_test__' and title='Foreign task' and due_date='2099-10-01') then raise exception 'foreign-owned task was changed'; end if;
  if not exists(select 1 from public.tasks where id=omitted_task_id and title='Omitted task' and due_date='2099-10-02') then raise exception 'omitted task was changed'; end if;
  if not exists(select 1 from public.events where id=event_id and start_date='2099-10-05' and is_major and display_style='bar') then raise exception 'event date/time update failed'; end if;

  result := public.import_studyos_plan_v2(payload,'update');
  if (result->'inserted'->>'tasks')::integer <> 0 or (result->'updated'->>'tasks')::integer <> 0 or (result->'unchanged'->>'tasks')::integer <> 4 then raise exception 'repeated update import is not idempotent: %',result; end if;

  base_section := jsonb_set(base_section,'{tasks,0,status}','"not_started"'::jsonb);
  base_workstream := jsonb_set(base_workstream,'{sections}',jsonb_build_array(base_section));
  base_project := jsonb_set(base_project,'{workstreams}',jsonb_build_array(base_workstream));
  payload := jsonb_set(payload,'{tasks,projects}',jsonb_build_array(base_project));
  perform public.import_studyos_plan_v2(payload,'update');
  if (select completed_at is not null from public.tasks where id=task_id) then raise exception 'completed_at was not cleared for non-done status'; end if;

  begin
    perform public.import_studyos_plan_v2(jsonb_build_object('format','studyos-plan','version',1,'exportedAt',now(),
      'catalog',jsonb_build_object('categories','[]'::jsonb,'subjects','[]'::jsonb,'scheduleSubcategories','[]'::jsonb),
      'tasks',jsonb_build_object('projects',jsonb_build_array(jsonb_build_object('title','__must_rollback__','description',null,'category','study','startDate',null,'dueDate','2099-12-31','status','not_started','isDday',false,'position',9999,'workstreams','[]'::jsonb,'tasks','[]'::jsonb))),
      'schedules',jsonb_build_object('events',jsonb_build_array(jsonb_build_object('title','Invalid event','category','personal','subject',null,'subcategory',null,'allDay',false,'startDate','2099-10-10','startTime','12:00','endDate','2099-10-10','endTime','11:00','isMajor',false,'displayStyle','compact')))),'update');
  exception when others then failed := true;
  end;
  if not failed then raise exception 'late import failure was not raised'; end if;
  if exists(select 1 from public.projects where user_id=owner_id and title='__must_rollback__') then raise exception 'late failure did not roll back earlier insert'; end if;
end;
$$;
