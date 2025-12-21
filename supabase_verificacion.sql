-- ============================================================================
-- SCRIPT DE VERIFICACIÓN - Base de Datos Supabase
-- ============================================================================
-- Ejecuta este script después de ejecutar supabase_setup_completo.sql
-- para verificar que todo se creó correctamente
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN 1: Tablas Creadas
-- ============================================================================

SELECT 
  '✅ VERIFICACIÓN 1: Tablas' as verificacion,
  table_name as tabla,
  CASE 
    WHEN table_name IN ('users', 'search_history', 'saved_companies', 'plan_features') 
    THEN '✅ Existe'
    ELSE '❌ No encontrada'
  END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'search_history', 'saved_companies', 'plan_features')
ORDER BY table_name;

-- ============================================================================
-- VERIFICACIÓN 2: Políticas RLS
-- ============================================================================

SELECT 
  '✅ VERIFICACIÓN 2: Políticas RLS' as verificacion,
  tablename as tabla,
  policyname as politica,
  cmd as operacion,
  CASE 
    WHEN tablename IS NOT NULL THEN '✅ Activa'
    ELSE '❌ No encontrada'
  END as estado
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFICACIÓN 3: Datos de Plan Features
-- ============================================================================

SELECT 
  '✅ VERIFICACIÓN 3: Plan Features' as verificacion,
  plan,
  COUNT(*) as total_caracteristicas,
  CASE 
    WHEN plan = 'free' AND COUNT(*) = 7 THEN '✅ Correcto (7 características)'
    WHEN plan = 'pro' AND COUNT(*) = 7 THEN '✅ Correcto (7 características)'
    ELSE '⚠️ Verificar cantidad'
  END as estado
FROM public.plan_features 
GROUP BY plan
ORDER BY plan;

-- Mostrar todas las características
SELECT 
  plan,
  feature_key,
  feature_value
FROM public.plan_features 
ORDER BY plan, feature_key;

-- ============================================================================
-- VERIFICACIÓN 4: Trigger y Función
-- ============================================================================

SELECT 
  '✅ VERIFICACIÓN 4: Trigger' as verificacion,
  trigger_name as trigger,
  event_object_table as tabla,
  event_manipulation as evento,
  CASE 
    WHEN trigger_name = 'on_auth_user_created' THEN '✅ Existe'
    ELSE '❌ No encontrado'
  END as estado
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
   OR (event_object_schema = 'auth' AND trigger_name = 'on_auth_user_created');

-- Verificar función
SELECT 
  '✅ VERIFICACIÓN 4: Función' as verificacion,
  routine_name as funcion,
  routine_type as tipo,
  CASE 
    WHEN routine_name = 'handle_new_user' THEN '✅ Existe'
    ELSE '❌ No encontrada'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- ============================================================================
-- VERIFICACIÓN 5: Índices
-- ============================================================================

SELECT 
  '✅ VERIFICACIÓN 5: Índices' as verificacion,
  tablename as tabla,
  indexname as indice,
  CASE 
    WHEN indexname IS NOT NULL THEN '✅ Existe'
    ELSE '❌ No encontrado'
  END as estado
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  indexname LIKE 'idx_search_history%' OR
  indexname LIKE 'idx_saved_companies%' OR
  tablename IN ('users', 'plan_features')
)
ORDER BY tablename, indexname;

-- ============================================================================
-- VERIFICACIÓN 6: Foreign Keys (Relaciones)
-- ============================================================================

SELECT 
  '✅ VERIFICACIÓN 6: Foreign Keys' as verificacion,
  tc.table_name as tabla_origen,
  kcu.column_name as columna,
  ccu.table_name AS tabla_referenciada,
  ccu.column_name AS columna_referenciada,
  '✅ Relación correcta' as estado
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- VERIFICACIÓN 7: Row Level Security Habilitado
-- ============================================================================

SELECT 
  '✅ VERIFICACIÓN 7: RLS Habilitado' as verificacion,
  schemaname,
  tablename,
  rowsecurity as rls_habilitado,
  CASE 
    WHEN rowsecurity = true THEN '✅ Habilitado'
    ELSE '❌ Deshabilitado'
  END as estado
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'search_history', 'saved_companies', 'plan_features')
ORDER BY tablename;

-- ============================================================================
-- VERIFICACIÓN 8: Datos de Ejemplo (si existen usuarios)
-- ============================================================================

SELECT 
  '✅ VERIFICACIÓN 8: Usuarios Existentes' as verificacion,
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN plan = 'free' THEN 1 END) as usuarios_free,
  COUNT(CASE WHEN plan = 'pro' THEN 1 END) as usuarios_pro,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Hay usuarios registrados'
    ELSE 'ℹ️ No hay usuarios aún (normal si acabas de crear la BD)'
  END as estado
FROM public.users;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$
DECLARE
  tablas_count INTEGER;
  politicas_count INTEGER;
  plan_features_count INTEGER;
  trigger_exists BOOLEAN;
  funcion_exists BOOLEAN;
  rls_habilitado_count INTEGER;
BEGIN
  -- Contar tablas
  SELECT COUNT(*) INTO tablas_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('users', 'search_history', 'saved_companies', 'plan_features');
  
  -- Contar políticas
  SELECT COUNT(*) INTO politicas_count
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  -- Contar plan features
  SELECT COUNT(*) INTO plan_features_count
  FROM public.plan_features;
  
  -- Verificar trigger
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  -- Verificar función
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' 
    AND routine_name = 'handle_new_user'
  ) INTO funcion_exists;
  
  -- Contar tablas con RLS habilitado
  SELECT COUNT(*) INTO rls_habilitado_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('users', 'search_history', 'saved_companies', 'plan_features')
  AND rowsecurity = true;
  
  -- Mostrar resumen
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RESUMEN DE VERIFICACIÓN';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Tablas creadas: % / 4', tablas_count;
  RAISE NOTICE 'Políticas RLS: %', politicas_count;
  RAISE NOTICE 'Características de planes: % / 14', plan_features_count;
  RAISE NOTICE 'Trigger creado: %', CASE WHEN trigger_exists THEN '✅ Sí' ELSE '❌ No' END;
  RAISE NOTICE 'Función creada: %', CASE WHEN funcion_exists THEN '✅ Sí' ELSE '❌ No' END;
  RAISE NOTICE 'RLS habilitado en tablas: % / 4', rls_habilitado_count;
  RAISE NOTICE '';
  
  IF tablas_count = 4 AND plan_features_count = 14 AND trigger_exists AND funcion_exists AND rls_habilitado_count = 4 THEN
    RAISE NOTICE '✅ ¡TODO ESTÁ CORRECTO! La base de datos está lista para usar.';
  ELSE
    RAISE NOTICE '⚠️ Hay algunos problemas. Revisa los resultados anteriores.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
