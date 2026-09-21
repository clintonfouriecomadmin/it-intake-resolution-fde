-- Sample "messy" tickets mirroring real examples from the M0 discovery
-- interview — used for demoing the extraction and routing behaviour.

insert into tickets (raw_text, submitter, channel, submitted_urgency) values
(
  'Hi, the printer on the 2nd floor has been jamming all morning, super annoying, can someone look at it when they get a chance. Also just realised I can''t get into the ERP system to close out month-end, not sure if related.',
  'finance_user_1',
  'email',
  'low'
),
(
  'wifi broken again!!',
  'office_employee_3',
  'teams',
  'high'
),
(
  'Production line 2 terminal at Site B is frozen, operators cannot log shift data.',
  'site_b_supervisor',
  'walk_up',
  'high'
),
(
  'Got a weird email asking me to reset my password, I think I might have clicked something I shouldn''t have. This was right before I process payroll.',
  'payroll_admin',
  'email',
  'medium'
);
