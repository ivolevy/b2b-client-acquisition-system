# INGENIERÍA DE PRECIOS Y COSTOS (Desglose Detallado)

Este documento justifica matemáticamente cada decisión de precios, créditos y automatización.

---

## 1. LA UNIDAD ATÓMICA: EL CRÉDITO
**Aquí está la clave para no confundirse:**

*   **Tu Costo (Lo que pagas a Google):** ~$0.03 USD por **LEAD** (Empresa con teléfono/web).
*   **Tu Precio (Lo que cobras al usuario):**
    *   1 Lead = **5 Créditos**.
    *   En el Plan Starter ($26/1000 créditos), cada crédito vale **$0.026 USD**.
    *   Por tanto, tú cobras por ese lead: 5 * $0.026 = **$0.13 USD**.

**LA CUENTA FINAL (Por cada Lead de Google):**
1.  Tú cobras: **$0.13**
2.  Tú pagas: **$0.03**
3.  **GANANCIA**: **$0.10 USD (Margen del 333%)**.
    *   *No estás perdiendo, estás triplicando tu inversión.*

### Costo de Materia Prima (Google Places API)
*   **Petición "Nearby Search"**: Para encontrar empresas. Costo: Bajo.
*   **Petición "Place Details"**: Para obtener teléfono y web. Costo: **~$0.02 - $0.03 USD** por empresa.
*   **Promedio Ponderado**: Asumimos un costo de riesgo de **$0.03 USD** por lead verificado.

### Nuestra Moneda (1 Lead Google = 5 Créditos)
*   **Por esto usamos 5 créditos y no 1.** El multiplicador x5 es lo que genera tu margen de ganancia.

---

## 2. ANÁLISIS DE PLANES (JUSTIFICACIÓN MATEMÁTICA)

### � PLAN STARTER ($26 USD)
¿Por qué $26 y 1,000 créditos?

1.  **Matemática del Usuario (Valor percibido)**
    *   1,000 Créditos = **200 Leads Verificados de Google**.
    *   Si el usuario tiene una tasa de cierre del 5%, de 200 leads saca **10 clientes**.
    *   Si cobra $300 por cliente, gana $3,000.
    *   **ROI para el usuario**: Paga $26, gana $3,000. Es una oferta "No-Brainer".

2.  **Nue### Estrategia de Precios (Suscripción Mensual)

| Plan | Precio Global (USD) | Precio Local Base (USD) | Precio ARS (Estimado Blue $1485) | Créditos |
| :--- | :--- | :--- | :--- | :--- |
| **Starter** | $26 | **$20** | ~$29.700 | 1,000 |
| **Growth** | $49 | **$40** | ~$59.400 | 3,000 |
| **Scale** | $149 | **$120** | ~$178.200 | 10,000 |

*   **Moneda Base:** USD.
*   **Conversión ARS:** Se usa el valor de **Venta del Dólar Blue** en tiempo real (API Bluelytics) **SIN recargo extra**.
*   **Lógica Local:** Se definieron precios base diferenciados para Argentina ($20/$40/$120) para mantener competitividad local.
*   **Descuento Anual:** 20% en todos los planes.s fijos con pocos usuarios.

###  PLAN GROWTH ($49 USD)
¿Por qué $49 y 3,000 créditos?

1.  **Incentivo de Upgrade**
    *   En Starter: 1000 créditos por $26 -> **$0.026** por crédito.
    *   En Growth: 3000 créditos por $49 -> **$0.016** por crédito.
    *   **Justificación:** El usuario recibe un **38% de descuento** en el costo del dato al subir de plan. Esto incentiva fuertemente pagar los $49.

2.  **Nuestra Rentabilidad**
    *   Costo Variable Máx: 3000 * $0.005 = **-$15.00**
    *   Costo Pasarela: **-$2.45**
    *   **UTILIDAD BRUTA:** $49 - $17.45 = **$31.55**.
    *   **Conclusión:** Ganamos más dinero nominal ($31 vs $19) aunque el margen porcentual baje (64% vs 75%). Nos conviene vender este plan.

### 🥇 PLAN SCALE ($149 USD)
¿Por qué $149 y 10,000 créditos?

1.  **Justificación**
    *   Precio por crédito: **$0.0149**. El más barato del mercado.
    *   Para agencias que necesitan volumen (2,000 leads/mes).
    *   **Nuestra ganancia:** ~$90 USD limpios por mes de un solo cliente.

---

## 3. AUTOMATIZACIÓN (POR QUÉ ES OBLIGATORIA)

El usuario mencionó: *"¿Es mejor manual o automático?"*.
**Respuesta: DEBE ser Automático.**

### El Costo Oculto de lo Manual
Si un pago de $26 falla y tú tienes que:
1.  Darle de baja manual en la BD (5 min).
2.  Mandar un mail reclamando (5 min).
3.  Revisar si pagó (5 min).
4.  Reactivarlo (5 min).
**Total: 20 minutos de trabajo.**
*   Si tu hora vale $50, gastaste **$16 en gestión manual**.
*   Te comiste casi toda la ganancia del mes ($19.70).
*   **Conclusión:** Gestionar cobros manualmente hace que el negocio no sea escalable.

### Lógica de "Soft Disable" (Implementación)
Para no ser agresivos ("Baneo"), usamos una lógica suave:
1.  **Trigger:** Webhook de Stripe/MP dice `payment_failed`.
2.  **Acción DB:** Campo `status` pasa a `past_due`.
3.  **UX:** El usuario puede entrar, ver sus leads viejos, pero el botón "Buscar" está grisado.
4.  **Mensaje:** "Tu suscripción venció. Actualiza pago para reactivar búsqueda."
5.  **Resultado:** El usuario se autogestiona. Costo para ti: $0.

---

## 4. GESTIÓN DE RECARGAS (PACKS)
¿Por qué venta de unidades sueltas?

*   Si un usuario necesita 50 créditos más para terminar el día, no va a pagar $49 por el plan siguiente.
*   Le vendemos un "Minipack" de $10.
---

## 5. CÓMO FUNCIONA EL SISTEMA (Simple)

### Suscripción vs. Créditos
Hay dos reglas de oro para entender si un usuario puede usar el sistema:

1.  **¿Pagó el mes? (Estado de Cuenta)**
    *   **Al día**: Puede usar todo.
    *   **Vencido**: Si el pago falló, la cuenta se **congela**. No puede buscar nada hasta que regularice (aunque le sobren créditos).

2.  **¿Tiene saldo? (Créditos)**
    *   **Tiene saldo**: Busca y revela datos normalmente.
    *   **Saldo 0**: La cuenta sigue activa (puede entrar y ver historial), pero no puede revelar *nuevos* contactos.
    *   **Solución**: Compra un "Pack de Recargas" o espera al mes siguiente.

---

### Tecnología de Pagos y Comisiones

Elegimos lo mejor para cada región y detallamos sus costos:

#### �🇷 Mercado Local (Argentina): **Pesos (ARS)**
*   **Método**: MercadoPago (Suscripción).
*   **Objetivo**: Estabilidad para el usuario final. El usuario paga un precio fijo en su moneda.
*   **Gestión Interna**: Los ingresos en Pesos se **convierten a USD en la instancia de reporte** para evaluar la ganancia real del negocio frente a los costos (Google API).

#### 🌍 Mercado Global: **Dólares (USD)**
*   **Método**: Stripe / PayPal.
*   **Moneda de Referencia**: USD.
*   **Consolidación**: Al final del día, el negocio busca tener un balance neto dolarizado ("Dolarización en instancia final").

### Rentabilidad: Factores Clave (Bonus)

Tus números reales van a ser **MEJORES** que los de arriba por dos razones:

#### 1. El Bono de Google ($200 USD Gratis)
Google Cloud te regala $200 USD de crédito todos los meses.
*   Esto cubre el costo API de tus primeros **~40 Clientes Starter**.
*   **Significado**: Hasta que no tengas 40 clientes, **tu costo de API es $0**. Todo el ingreso es ganancia pura (menos comisión pasarela).

#### 2. Tasa de Uso (No todos gastan todo)
El cálculo de arriba es el "Peor Caso" (consumen al 100%).
*   La realidad es que muchos usuarios consumen el 40-60% de sus créditos.
*   Si un usuario Starter solo gasta 500 créditos (en vez de 1000), tu costo baja a la mitad ($2.50) y tu ganancia sube a **$22.45**.

---

### Estrategia de Precios (Suscripción Mensual)

| Plan | Precio Global (USD) | Precio Local (ARS) | Créditos |
| :--- | :--- | :--- | :--- |
| **Starter** | $26 | **$ 29.700** | 1,000 |
| **Growth** | $49 | **$ 59.400** | 3,000 |
| **Scale** | $149 | **$ 178.200** | 10,000 |

*   **Lógica de Conversión**: El precio en ARS es fijo para el usuario, pero nosotros lo trackeamos como "USD Equivalente" en el panel financiero al tipo de cambio actual.
