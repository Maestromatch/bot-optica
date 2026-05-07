---
name: product-ideation-brainstorm
description: |
  Ejecuta una fase de lluvia de ideas estructurada como Product Owner para diseño de sistemas.
  Usar cuando el usuario solicite:
  (1) Identificar claves de éxito para un nuevo producto o sistema
  (2) Analizar diferenciadores competitivos de una idea de software
  (3) Generar el primer artefacto de diseño (descripción, valor añadido, funciones)
  (4) Realizar brainstorming para definir ventajas competitivas de un sistema
  (5) Documentar la visión inicial de un producto digital
  (6) Investigar mercado y competidores usando búsqueda web
  Incluye capacidad de búsqueda en internet para benchmark y análisis competitivo.
  No usar para diseño técnico profundo (arquitectura, código, infraestructura).
---

# Product Ideation Brainstorm

Skill de ideación que guía la fase inicial de diseño de un sistema, identificando claves de éxito diferenciadas y generando el primer artefacto de documentación.

## Tabla de Contenidos

1. [Objetivo](#objetivo)
2. [Herramientas de Investigación](#herramientas-de-investigación)
3. [Entradas del Skill](#entradas-del-skill)
4. [Flujo de Trabajo](#flujo-de-trabajo)
5. [Reglas de Calidad](#reglas-de-calidad)
6. [Formato de Salida](#formato-de-salida)
7. [Plantillas de Salida](#plantillas-de-salida)

---

## Objetivo

Facilitar una lluvia de ideas estructurada como Product Owner para extraer claves de éxito accionables que diferencien el sistema frente a competidores, eliminando redundancias y produciendo un documento Markdown formal como **Artefacto #1** del diseño.

---

## Herramientas de Investigación

### Búsqueda Web (fetch_webpage)

Este skill utiliza la herramienta `fetch_webpage` para investigación de mercado y análisis competitivo.

**Cuándo usar búsqueda web:**

| Escenario | Acción |
|-----------|--------|
| Usuario menciona competidores | Buscar información sobre esos competidores específicos |
| Usuario no conoce competidores | Buscar "[tipo de software] competitors" o "[problema] solutions" |
| Validar tendencias de mercado | Buscar tendencias actuales en el sector |
| Identificar features estándar | Buscar características comunes en soluciones similares |
| Benchmarking de precios | Buscar modelos de monetización en el sector |

**Queries de búsqueda recomendados:**

```markdown
# Para identificar competidores
"[idea_base] competitors 2024"
"[problema] software solutions"
"best [tipo_sistema] tools"
"alternatives to [competidor_conocido]"

# Para análisis de features
"[competidor] features"
"[competidor] vs [competidor] comparison"
"[tipo_sistema] must-have features"

# Para tendencias de mercado
"[industria] software trends 2024"
"[problema] market size"
"[tipo_sistema] user expectations"
```

**Reglas de uso:**

1. **Siempre preguntar primero** si el usuario desea investigación web antes de ejecutarla.
2. **Máximo 3-5 búsquedas** por sesión para no sobrecargar.
3. **Citar fuentes** de la información encontrada.
4. **Distinguir claramente** entre información del usuario vs información de web.
5. **No reemplazar** la información del usuario con hallazgos web; complementar.

---

## Entradas del Skill

### Requeridas (Obligatorias)

| Campo | Descripción | Validación |
|-------|-------------|------------|
| `idea_base` | Descripción del sistema que el usuario desea diseñar (2-8 líneas) | No vacío; mínimo 50 caracteres |
| `publico_objetivo` | Usuarios finales, segmento o perfil al que se dirige | No vacío |
| `problema_necesidad` | Problema específico que el sistema resuelve | No vacío |
| `contexto_uso` | Plataforma/entorno de uso (web, móvil, empresarial, educativo, etc.) | Al menos una opción |

### Opcionales

| Campo | Descripción |
|-------|-------------|
| `competidores_conocidos` | Lista de competidores o soluciones existentes en el mercado |
| `diferenciadores_deseados` | Características que el usuario considera prioritarias para destacar |
| `restricciones` | Limitaciones de tiempo, presupuesto, normativa, tecnología, etc. |
| `referencias_mercado` | Enlaces, documentos o benchmarks proporcionados por el usuario |

---

## Flujo de Trabajo

```
1. RECOLECTAR información → preguntas obligatorias al usuario
2. VALIDAR entradas requeridas completas
3. INVESTIGAR mercado → búsqueda web de competidores y tendencias (con permiso)
4. IDEAR claves de éxito por categorías
5. DEDUPLICAR y unificar claves redundantes
6. CLASIFICAR como críticas o deseables
7. GENERAR Artefacto #1 en Markdown
```

### Paso 1: Recolección de Información (BLOQUEANTE)

**Objetivo:** Obtener toda la información necesaria antes de iniciar la ideación.

**Preguntas obligatorias al usuario:**

```markdown
1. "Describe tu idea base del sistema (2-8 líneas): ¿Qué es? ¿Qué hace?"
2. "¿Quién es tu público objetivo? (usuarios finales, empresas, sector específico)"
3. "¿Qué problema o necesidad específica resuelve este sistema?"
4. "¿En qué contexto se usará? (web, móvil, empresarial, educativo, otro)"
```

**Preguntas opcionales:**

```markdown
5. "¿Conoces competidores o soluciones similares en el mercado?" (opcional)
6. "¿Hay diferenciadores específicos que consideres prioritarios?" (opcional)
7. "¿Existen restricciones de tiempo, presupuesto o normativa?" (opcional)
```

**Validación:** No continuar al Paso 2 hasta que las 4 entradas requeridas estén completas.

---

### Paso 2: Investigación de Mercado (OPCIONAL - requiere confirmación)

**Objetivo:** Enriquecer el contexto con información de mercado real mediante búsqueda web.

**Activación:** Preguntar al usuario:

```markdown
"¿Deseas que investigue en internet información sobre competidores, tendencias de mercado 
o características comunes en soluciones similares? Esto puede enriquecer el análisis."
```

**Si el usuario acepta:**

1. **Identificar competidores** (si no los proporcionó el usuario):
   - Buscar: `"[tipo de sistema] competitors"`, `"[problema] software solutions"`
   - Usar `fetch_webpage` para obtener información de sitios relevantes

2. **Analizar features de competidores conocidos:**
   - Buscar: `"[competidor] features"`, `"[competidor] pricing"`
   - Documentar características principales encontradas

3. **Investigar tendencias del sector:**
   - Buscar: `"[industria] trends [año actual]"`, `"[tipo_sistema] best practices"`
   - Identificar patrones emergentes

**Formato de hallazgos:**

```markdown
### Hallazgos de Investigación Web

#### Competidores Identificados
| Competidor | URL | Características Principales | Fuente |
|------------|-----|----------------------------|--------|
| [Nombre] | [URL] | [Features clave] | [Fecha consulta] |

#### Tendencias de Mercado
- [Tendencia 1] - Fuente: [URL]
- [Tendencia 2] - Fuente: [URL]

#### Features Estándar del Sector
- [Feature 1] - Presente en: [Competidores]
- [Feature 2] - Presente en: [Competidores]
```

**Si el usuario rechaza:** Continuar al Paso 3 usando solo la información proporcionada.

**Salida:** Objeto `investigacion_mercado` (puede estar vacío si el usuario no autorizó).

---

### Paso 3: Ideación y Generación de Claves de Éxito

**Objetivo:** Generar lista exhaustiva de claves de éxito basadas en la información proporcionada y la investigación web (si se autorizó).

**Categorías de claves de éxito:**

| Categoría | Aplica cuando... |
|-----------|------------------|
| **UX / Experiencia** | Siempre |
| **Funcionalidad y Workflows** | Siempre |
| **Datos / Analítica** | El sistema maneja datos o métricas |
| **Integraciones / Ecosistema** | Hay mención de terceros o conectividad |
| **Seguridad / Privacidad / Compliance** | Datos sensibles, normativa o sector regulado |
| **Performance / Escalabilidad / Disponibilidad** | Contexto empresarial, alto volumen o SLA implícito |
| **Operación / Soporte / Observabilidad** | Contexto empresarial o producto de largo plazo |
| **Go-to-Market / Distribución / Monetización** | El usuario menciona modelo de negocio o mercado |

**Reglas:**
- Solo incluir categorías relevantes al contexto proporcionado.
- No inventar claves que no se deriven del contexto del usuario o investigación web autorizada.
- Si la información es insuficiente para una categoría, omitirla o preguntar.
- **Integrar hallazgos web:** Si existe `investigacion_mercado`, usar para identificar gaps y oportunidades de diferenciación.
- **Marcar origen:** Distinguir claves derivadas de input del usuario vs hallazgos de investigación web.

**Salida:** Lista `claves_brutas` (puede contener duplicados).

---

### Paso 4: Deduplicación y Unificación

**Objetivo:** Eliminar redundancias y consolidar claves equivalentes.

**Acciones:**
1. Comparar cada par de claves de `claves_brutas`.
2. Identificar claves que:
   - Usen sinónimos pero representen el mismo concepto.
   - Se solapen parcialmente (una contiene a la otra).
   - Estén expresadas diferente pero tengan el mismo impacto.
3. Unificar: conservar redacción más clara y accionable.
4. Fusionar descripciones si aportan matices complementarios.

**Salida:** Lista `claves_finales` sin duplicados.

---

### Paso 5: Clasificación

**Objetivo:** Etiquetar cada clave según su criticidad.

| Clasificación | Criterio |
|---------------|----------|
| **Crítica** | Imprescindible para el funcionamiento o diferenciación mínima viable |
| **Deseable** | Aporta valor pero no bloquea el lanzamiento |

---

### Paso 6: Generación del Artefacto #1

**Objetivo:** Producir documento Markdown formal con índice y anclas.

**Estructura obligatoria:**

```markdown
## Índice
- [1. Descripción del Software](#1-descripción-del-software)
- [2. Análisis de Mercado](#2-análisis-de-mercado) *(si se realizó investigación web)*
- [3. Valor Añadido y Ventajas Competitivas](#3-valor-añadido-y-ventajas-competitivas)
- [4. Funciones Principales](#4-funciones-principales)
- [Referencias](#referencias) *(si se usó investigación web)*
```

**Reglas:**
- Sección 2 (Análisis de Mercado) solo se incluye si se autorizó investigación web.
- Sección 3 debe basarse explícitamente en `claves_finales`.
- Sección 4 deriva funciones del análisis, no inventa.
- Sección Referencias obligatoria si se usó información de internet.
- No incluir información que el usuario no haya proporcionado o que no provenga de investigación autorizada.

---

## Reglas de Calidad

### Checklist Obligatorio

| # | Regla | Verificación |
|---|-------|--------------|
| 1 | **Idea base obligatoria** | No iniciar Paso 2 sin `idea_base` completa |
| 2 | **Entradas requeridas completas** | Las 4 entradas obligatorias deben existir antes de idear |
| 3 | **No inventar información** | Cada clave debe trazarse a un dato proporcionado por el usuario o investigación web autorizada |
| 4 | **Claves en formato lista** | Salida de Paso 3 y Paso 4 siempre como lista, no prosa |
| 5 | **Deduplicación ejecutada** | Paso 4 obligatorio; `claves_finales` ≤ `claves_brutas` |
| 6 | **Clasificación Crítica/Deseable** | Toda clave debe estar clasificada |
| 7 | **Categorías relevantes** | Solo incluir categorías que apliquen al contexto |
| 8 | **Markdown con índice** | Artefacto #1 debe tener índice con anclas funcionales |
| 9 | **Sección 2 = claves_finales** | Ventajas competitivas derivadas exclusivamente de la lista deduplicada |
| 10 | **Idioma español** | Todo el contenido generado debe estar en español |
| 11 | **Investigación web autorizada** | Solo ejecutar búsqueda web si el usuario lo autoriza explícitamente |
| 12 | **Citar fuentes web** | Toda información de internet debe incluir URL y fecha de consulta |
| 13 | **Distinguir origen de datos** | Marcar claramente qué información viene del usuario vs investigación web |

### Validaciones Críticas

```
✗ PROHIBIDO: Continuar sin las 4 entradas requeridas
✗ PROHIBIDO: Inventar competidores no mencionados (buscar en web si autorizado)
✗ PROHIBIDO: Asumir tecnologías no especificadas
✗ PROHIBIDO: Incluir categorías no relevantes al contexto
✗ PROHIBIDO: Dejar claves sin clasificar (crítica/deseable)
✗ PROHIBIDO: Omitir el paso de deduplicación
✗ PROHIBIDO: Ejecutar búsqueda web sin autorización del usuario
✗ PROHIBIDO: Usar información web sin citar la fuente
✗ PROHIBIDO: Mezclar datos del usuario con datos web sin distinción clara
```

---

## Formato de Salida

El skill debe entregar **dos salidas** en este orden:

### Salida A: Claves de Éxito (Lista)

Tabla estructurada con todas las claves identificadas, clasificadas y justificadas.

### Salida B: Artefacto #1

Documento Markdown completo con:
1. Descripción del Software
2. Valor Añadido y Ventajas Competitivas
3. Funciones Principales

---

## Plantillas de Salida

### Plantilla A: Claves de Éxito

```markdown
## Claves de Éxito Identificadas

### Críticas

| # | Categoría | Clave de Éxito | Origen | Justificación |
|---|-----------|----------------|--------|---------------|
| 1 | [Categoría] | [Nombre de la clave] | Usuario / Web | [Por qué es crítica, basado en contexto] |
| 2 | ... | ... | ... | ... |

### Deseables

| # | Categoría | Clave de Éxito | Origen | Justificación |
|---|-----------|----------------|--------|---------------|
| 1 | [Categoría] | [Nombre de la clave] | Usuario / Web | [Por qué es deseable, basado en contexto] |
| 2 | ... | ... | ... | ... |

**Total claves:** [N] críticas, [M] deseables  
**Duplicados eliminados:** [X]  
**Fuentes web consultadas:** [Y] (si aplica)
```

---

### Plantilla B: Artefacto #1

```markdown
# [Nombre del Sistema]

> Artefacto #1 - Diseño Inicial  
> Fecha: [YYYY-MM-DD]  
> Versión: 1.0

---

## Índice

- [1. Descripción del Software](#1-descripción-del-software)
- [2. Análisis de Mercado](#2-análisis-de-mercado) *(si se realizó investigación web)*
- [3. Valor Añadido y Ventajas Competitivas](#3-valor-añadido-y-ventajas-competitivas)
  - [3.1 Ventajas Críticas](#31-ventajas-críticas)
  - [3.2 Ventajas Deseables](#32-ventajas-deseables)
- [4. Funciones Principales](#4-funciones-principales)
- [Referencias](#referencias) *(si se usó investigación web)*

---

## 1. Descripción del Software

**¿Qué es?**  
[Descripción concisa del sistema basada en `idea_base`]

**¿Para quién?**  
[Público objetivo]

**¿En qué contexto?**  
[Contexto de uso]

**Problema que resuelve:**  
[Problema/necesidad identificada]

---

## 2. Análisis de Mercado

> *Sección incluida solo si se autorizó investigación web*

### 2.1 Competidores Identificados

| Competidor | Fortalezas | Debilidades | Oportunidad de diferenciación |
|------------|-----------|-------------|-------------------------------|
| [Nombre 1] | [Fortalezas] | [Debilidades] | [¿Cómo podemos superarlo?] |
| [Nombre 2] | [Fortalezas] | [Debilidades] | [¿Cómo podemos superarlo?] |

### 2.2 Tendencias del Sector

- **[Tendencia 1]:** [Descripción y cómo aprovecharla]
- **[Tendencia 2]:** [Descripción y cómo aprovecharla]

### 2.3 Features Estándar del Mercado

- [Feature 1] - Presente en [N] de [M] competidores
- [Feature 2] - Presente en [N] de [M] competidores

---

## 3. Valor Añadido y Ventajas Competitivas

### 3.1 Ventajas Críticas

1. **[Nombre de clave crítica 1]**  
   [Descripción de cómo esta clave aporta valor diferencial]

2. **[Nombre de clave crítica 2]**  
   [Descripción de cómo esta clave aporta valor diferencial]

### 3.2 Ventajas Deseables

1. **[Nombre de clave deseable 1]**  
   [Descripción de cómo esta clave aporta valor adicional]

2. **[Nombre de clave deseable 2]**  
   [Descripción de cómo esta clave aporta valor adicional]

---

## 4. Funciones Principales

### 4.1 [Nombre de función 1]

[Descripción de alto nivel: qué hace, para qué sirve]

### 4.2 [Nombre de función 2]

[Descripción de alto nivel: qué hace, para qué sirve]

### 4.3 [Nombre de función N]

[Descripción de alto nivel: qué hace, para qué sirve]

---

## Referencias

> *Sección incluida solo si se usó investigación web*

| # | Fuente | URL | Fecha de consulta |
|---|--------|-----|-------------------|
| 1 | [Nombre del sitio] | [URL] | [YYYY-MM-DD] |
| 2 | [Nombre del sitio] | [URL] | [YYYY-MM-DD] |

---

*Documento generado en fase de ideación. Sujeto a refinamiento en fases posteriores.*
```

---

## Notas de Implementación

- **Trazabilidad:** Mantener mapeo interno entre `claves_finales` y secciones del Artefacto #1.
- **Iteración:** Si el usuario proporciona más contexto después del Paso 1, volver a ejecutar desde Paso 2.
- **Extensibilidad:** Este skill puede encadenarse con skills de diseño técnico (casos de uso, arquitectura) que consuman el Artefacto #1.
- **Idioma:** Todo el contenido debe generarse en español.
- **Herramienta web:** Usar `fetch_webpage` para investigación de mercado. Siempre solicitar permiso antes de ejecutar.
- **Límites de búsqueda:** Máximo 3-5 búsquedas web por sesión para mantener eficiencia.
- **Citación:** Toda información obtenida de internet debe incluir URL y fecha de consulta en la sección Referencias.
