# Bóveda de documentos de perfil — Diseño

## Contexto

Este es el primer sub-proyecto de un rediseño más amplio de la pestaña **Logística** dentro del detalle de un viaje (`TripDetailScreen`). El rediseño completo incluye, en orden:

1. **Bóveda de documentos de perfil** (este documento) — pasaporte/DNI del usuario, reutilizables entre viajes.
2. Pantalla "Logística — vista general" del viaje (stats, próximo vuelo, accesos rápidos).
3. Pantalla "Documentos" del viaje (checklist del viaje + requisitos del destino).
4. Motor de "requisitos del destino": dado el país emisor del pasaporte del usuario (nacionalidad) y el país destino del viaje, determinar requisitos de pasaporte/visado/vacunas, y cruzarlo con la caducidad del pasaporte guardado para lanzar alertas.
5. Reservas / Contactos / Checklist del viaje — pendientes de mockup, se diseñarán aparte.

Los sub-proyectos 2-5 dependen de los datos que se guardan aquí (en particular, el país emisor y la caducidad del pasaporte son la base del motor de requisitos del punto 4). Este documento cubre **solo** el punto 1.

## Alcance

- Tipos de documento soportados: **Pasaporte** y **DNI/carnet de identidad**. Ampliable después (carnet de conducir, tarjeta sanitaria, etc.) sin cambios estructurales.
- Como máximo un documento activo por tipo y usuario (sin soporte para doble nacionalidad/varios pasaportes en esta iteración).
- Campos: tipo, país emisor, número de documento (opcional), fecha de caducidad (opcional).
- **Sin foto/escaneo del documento** en esta iteración — es PII sensible y requeriría un bucket privado de Supabase Storage con URLs firmadas (el bucket `documents` actual es público, usado para portadas de viajes/alojamientos, y no es apto para esto). Se deja como posible iteración futura, fuera de este spec.

## Modelo de datos (Prisma, backend)

```prisma
model UserDocument {
  id             Int       @id @default(autoincrement())
  userId         Int
  type           String    // "passport" | "dni"
  country        String    // país emisor, ISO2 (ES, FR...)
  documentNumber String?
  expiryDate     DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type])
}
```

- `@@unique([userId, type])`: un documento nuevo del mismo tipo actualiza (upsert) el existente en vez de duplicarlo.
- `country` es obligatorio — es el campo que los sub-proyectos futuros usarán como "nacionalidad" del usuario para el motor de requisitos del destino; no se añade un campo `nationality` aparte en `User`.
- `expiryDate` es opcional: el DNI puede no tener caducidad indicada (igual que en el mock de referencia).
- Se añade la relación inversa `documents UserDocument[]` en `model User`.

## API (backend, NestJS)

Todas protegidas por el guard JWT global existente (sin `@Public()`), igual que `/users/me/pinned-finance-tab`.

- `GET /users/me/documents` → `UserDocument[]` (0-2 items).
- `PUT /users/me/documents/:type` → upsert del documento de ese `type`. Body: `{ country: string; documentNumber?: string; expiryDate?: string }`. `type` restringido a `passport | dni` vía DTO con `@IsEnum`.
- `DELETE /users/me/documents/:type` → elimina el documento de ese tipo si existe.

`PUT` (no `POST`/`PATCH` separados) porque semánticamente el cliente siempre envía "este es el estado completo de mi pasaporte", coherente con el upsert único-por-tipo.

## Lógica de estado (frontend, derivada — no se persiste en BD)

A partir de `expiryDate`:

| Condición | Estado | Color |
|---|---|---|
| Sin `expiryDate` | "Sin caducidad indicada" | Gris |
| `expiryDate` a más de 6 meses vista | "Vigente" | Verde |
| `expiryDate` entre 0 y 6 meses vista | "Caduca pronto" | Ámbar |
| `expiryDate` ya pasada | "Caducado" | Rojo |

El umbral de 6 meses es el estándar habitual de aeropuertos/aduanas para exigir vigencia mínima de pasaporte, y es el que el motor de requisitos del destino (sub-proyecto 4) reutilizará para las alertas por viaje.

## Frontend

- Nueva entrada en `ProfileScreen` (`src/screens/Mobile/profile/ProfileScreen.tsx`), sección **"Perfil"** (donde ya vive "Cuenta"): **"Mis documentos"** → navega a `MyDocumentsScreen`.
- `MyDocumentsScreen`: lista de 2 filas fijas (Pasaporte, DNI), mismo patrón visual que `FinancesSettingsScreen` (icono + título + subtítulo). A la derecha: pill de estado si el documento existe, o "+ Añadir" si no.
- Tocar una fila abre un formulario (país, nº documento opcional, fecha de caducidad opcional) con "Guardar" (`PUT`) y "Eliminar" (`DELETE`, solo si ya existe).
- Persistencia vía `react-query`: hook `useUserDocuments()` con el mismo patrón cache-first ya usado en `usePinnedFinanceModule` (`src/hooks/usePinnedFinanceModule.ts`), para que Logística pueda leer estos datos más adelante sin refetch constante.

## Fuera de alcance (explícitamente, para esta iteración)

- Foto/escaneo del documento.
- Más de un documento por tipo (doble nacionalidad).
- Otros tipos de documento (carnet de conducir, tarjeta sanitaria...).
- El motor de requisitos del destino y su integración con Logística (sub-proyecto 4, spec aparte).
- Pantallas de Logística, Documentos del viaje, Reservas, Contactos, Checklist (sub-proyectos 2, 3, 5 — specs aparte).
