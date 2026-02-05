-- Migración: Asegurar persistencia de pagos
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
ALTER TABLE public.payments ALTER COLUMN user_id DROP NOT NULL;

-- Re-crear FK con SET NULL
DO $$ 
DECLARE 
    constraint_name TEXT;
BEGIN 
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'public.payments'::regclass AND contype = 'f';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.payments DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
