REVOKE ALL ON FUNCTION public.we_start_session(uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.we_complete_task(uuid, uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.we_touch_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.we_start_session(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.we_complete_task(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;