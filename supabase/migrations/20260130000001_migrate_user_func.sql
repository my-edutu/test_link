CREATE OR REPLACE FUNCTION migrate_clerk_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id text;
  old_profile_id text;
BEGIN
  -- Get the current Clerk User ID from the JWT
  current_user_id := auth.jwt() ->> 'sub';

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Logic to handle cases where user_email might be NULL (unlikely via Clerk but possible in calls)
  IF user_email IS NULL THEN
    RETURN false;
  END IF;

  -- Check if there is ALREADY a profile for the current Clerk ID
  PERFORM 1 FROM profiles WHERE id = current_user_id;
  IF FOUND THEN
    -- User already has a profile with the correct ID. No migration needed.
    RETURN false;
  END IF;

  -- Find existing profile by email, ensuring we don't pick up a profile that already somehow matches (handled above)
  -- We assume email is unique-ish enough for this migration. 
  -- If multiple profiles share an email (bad state), we pick the one that looks like a UUID or just the first one?
  -- ideally profiles.email is unique. It's not enforced in schema but effectively unique for auth.
  
  -- We also want to skip if the found profile check is finding the current user (already handled, but safety check)
  SELECT id INTO old_profile_id
  FROM profiles
  WHERE email = user_email
  LIMIT 1;

  -- If profile exists and ID is different, update it
  IF old_profile_id IS NOT NULL AND old_profile_id != current_user_id THEN
    -- Update the profile ID. Because of ON UPDATE CASCADE, this updates all child tables!
    UPDATE profiles
    SET id = current_user_id
    WHERE id = old_profile_id;
    
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
