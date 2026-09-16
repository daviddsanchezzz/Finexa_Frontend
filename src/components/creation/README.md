# Creation design system

`CreationFlow` es el shell único para crear recursos. Cada módulo conserva su estado,
validación y submit; el shell solo controla presentación y navegación entre pasos.

`EditingForm` es el shell complementario para edición: una sola página con secciones,
los mismos campos, comportamiento de teclado y footer fijo del sistema de creación.

## Reglas del shell

- Primer paso: `×` cancela la creación.
- Pasos posteriores: `‹` vuelve al paso anterior sin perder datos.
- Más de un paso: muestra `Paso X de Y` y progreso lineal.
- Un solo paso: no muestra texto ni barra de progreso.
- Pasos intermedios: CTA `Continuar`.
- Último paso: CTA `Crear {recurso}`.
- El CTA permanece fijo y el contenido dispone de espacio inferior suficiente para
  desplazarse completamente por encima del footer.
- La edición no usa `CreationFlow`; reutiliza los mismos campos en una pantalla con
  secciones y CTA `Guardar cambios`.

## Elección de controles

- 2–3 opciones mutuamente excluyentes: `FormSegmentedControl`.
- 4–8 opciones visuales: `FormOptionCard` en grid.
- Muchas opciones: `FormSelect` que abre una sheet.
- Booleano: `FormToggle`.
- Moneda: `FormCurrencyPicker`.
- Fecha: `FormDateField`.
- Categoría (selección única desde una sheet): `FormCategoryPicker`.
- Cartera(s), con soporte multi-selección y "Todas": `FormAccountPicker`.
- Broker o frecuencia u otro dominio nuevo: picker compartido específico,
  creado al migrar el primer módulo que lo necesite.

## Campos y validación

- Solo los campos obligatorios muestran `*`; nunca se escribe “opcional”.
- Los errores son inline y aparecen tras interacción o intento de continuar.
- No se crean primitives configurables sin un caso real de uso.
- Los módulos construyen sus propios steps; no existe un formulario monolítico.
