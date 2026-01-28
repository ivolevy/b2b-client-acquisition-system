# Sistema de Facturación y Suscripciones (Billing Plan)

## 1. Visión General del Modelo
El sistema utiliza un **Modelo Híbrido** para equilibrar la calidad de datos y los costos operativos:
-   **Google Maps Platform (GMP)**: Datos de alta calidad, costo variable alto.
-   **Scraping/OSM**: Datos de respaldo, costo bajo.

Para gestionar esto de manera rentable, implementaremos un **Sistema de Créditos**.

---

## 2. Estrategia de Precios y Créditos

### El Sistema de Créditos
Los créditos actúan como la moneda interna de la plataforma, permitiendo atribuir costos diferentes a acciones diferentes.

| Acción | Costo en Créditos | Justificación |
| :--- | :--- | :--- |
| **Búsqueda Básica (Scraper)** | 1 Crédito / lead | Bajo costo de obtención. |
| **Búsqueda Premium (Google API)** | 5 Créditos / lead | Costo directo de API de Google ($0.017 - $0.03 / req). |
| **Enriquecimiento de Email** | 10 Créditos / lead | Alto valor, requiere validación externa o procesos costosos. |
| **Exportar Datos** | 0.5 Créditos / registro | Incentiva el uso dentro de la plataforma. |

### Niveles de Suscripción (Tiers)

#### **1. Plan Gratuito (Trial)**
*   **Precio:** $0 / mes
*   **Créditos:** 50 (Única vez)
*   **Funcionalidades:**
    *   Acceso básico al buscador (solo Scraper).
    *   Sin exportación.
    *   Límite de 1 búsqueda diaria.

#### **2. Plan Starter (Emprendedor)**
*   **Precio Estimado:** $29 USD / mes
*   **Créditos Mensuales:** 1,000
*   **Funcionalidades:**
    *   Acceso a Google Places API (Límite mensual).
    *   Exportación CSV.
    *   Soporte por email.

#### **3. Plan Pro (Agencia)**
*   **Precio Estimado:** $79 USD / mes
*   **Créditos Mensuales:** 5,000
*   **Funcionalidades:**
    *   Prioridad en búsquedas.
    *   Enriquecimiento de datos (Emails, Redes Sociales).
    *   API Access (Rate limited).
    *   Soporte prioritario.

#### **4. Enterprise**
*   **Precio:** Personalizado
*   **Créditos:** Ilimitados / A medida
*   **Funcionalidades:**
    *   Instancia dedicada.
    *   Integraciones CRM personalizadas.

---

## 3. Arquitectura Técnica

### Pasarelas de Pago (Payment Gateways)
Se integrarán dos proveedores principales para cubrir LATAM y el mercado global:
1.  **MercadoPago**: Principal para Argentina y LATAM (Cobro en moneda local).
2.  **PayPal / Stripe**: Para clientes internacionales (Cobro en USD).

### Esquema de Base de Datos (Supabase)

#### Tabla `subscriptions`
```sql
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  status text check (status in ('active', 'past_due', 'canceled', 'trial')),
  tier_id text not null, -- 'starter', 'pro', etc.
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  payment_provider text, -- 'mercadopago', 'stripe'
  subscription_external_id text -- ID en MP/Stripe
);
```

#### Tabla `credits_ledger` (Historial y Balance)
```sql
create table credits_ledger (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  amount int not null, -- Positivo (carga) o Negativo (uso)
  description text, -- 'Búsqueda GMP', 'Recarga Mensual'
  created_at timestamp with time zone default now()
);

-- Vista para balance rápido
create view user_credit_balance as
select user_id, sum(amount) as balance
from credits_ledger
group by user_id;
```

### Seguridad y Validaciones
1.  **Webhooks**:
    *   Endpoints dedicados para recibir notificaciones de pago (API Route `/api/webhooks/mercadopago`).
    *   Verificación de firma (Signature verification) para evitar fraudes.
2.  **Rate Limiting**:
    *   Evitar el abuso de la API de Google mediante límites estrictos por usuario basados en su plan.
    *   Implementado en el backend (Edge Functions o Middleware).
3.  **Idempotencia**:
    *   Asegurar que los eventos de pago no se procesen dos veces (usando `event_id` en la base de datos).

---

## 4. Gestión de Costos y Rentabilidad
Para asegurar que el sistema sea rentable:
*   **Caching Agresivo**: Guardar resultados de Google Places en nuestra BD. Si otro usuario busca lo mismo, servir desde la BD costo $0.
*   **Límites Duros**: Si un usuario agota sus créditos, el servicio se detiene inmediatamente hasta la recarga o renovación.
*   **Monitoreo**: Alertas automáticas si el consumo de la API de Google excede un umbral diario.
