INSERT INTO public.achievements (name, description, icon, xp_reward, condition)
VALUES ('Code Practice Complete', 'Complete all code practice activities', '💻', 300, 'all_code_activities')
ON CONFLICT (name) DO NOTHING;
