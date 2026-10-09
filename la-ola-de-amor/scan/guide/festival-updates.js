'use strict';
// Guest-safe editorial board. Edit both languages and change revision for each new edition.
// Dates are source-supported publication dates; no posting time has been invented.
// This editorial board has no CMS, push subscription or notification backend.
const FESTIVAL_UPDATES = [
  {
    id:'day-two', revision:'2026-10-08-polish03', publishedAt:'2026-10-08', priority:'confirmed',
    audience:{en:'Festival guests',es:'Invitados del Festival'},
    title:{en:'Tornaboda · Saturday, together',es:'Tornaboda · Un sábado juntos'},
    body:{en:'Saturday, October 17 · 12:00 PM–5:00 PM · La Tijera, the same property as the wedding. A relaxed pool-day gathering and La Taquiza. After 5 PM, we’ll see where the night takes us.',es:'Sábado 17 de octubre · 12:00 PM–5:00 PM · La Tijera, la misma propiedad de la boda. Un encuentro relajado con ambiente de alberca y La Taquiza. Después de las 5 PM, veremos a dónde nos lleva la noche.'},
    route:'tornaboda'
  },
  {
    id:'tacos', revision:'2026-10-08-2', publishedAt:'2026-10-08', priority:'pending',
    audience:{en:'Day 2 information',es:'Información del Día 2'},
    title:{en:'Tacos · Serving details to follow',es:'Tacos · Detalles del servicio próximamente'},
    body:{en:'Tacos are expected on Saturday afternoon. The vendor and exact two-hour serving window are still being confirmed. Check here for the confirmed details before planning around a food-service window.',es:'Se esperan tacos el sábado por la tarde. El proveedor y el horario exacto de dos horas de servicio siguen por confirmar. Consulta aquí los detalles confirmados antes de organizarte en torno a un horario de comida.'},
    route:'tornaboda'
  },
  {
    id:'pool-play', revision:'2026-10-08-1', publishedAt:'2026-10-08', priority:'pending',
    audience:{en:'Day 2 information',es:'Información del Día 2'},
    title:{en:'Pool & play · Arrangements in progress',es:'Alberca y juegos · Preparativos en curso'},
    body:{en:'Pool access and inflatable soccer at the front are planned; pool readiness and soccer setup are still being confirmed. Racquetball is a possibility, with access to be confirmed.',es:'Se planea acceso a las albercas y fútbol inflable al frente; la preparación de las albercas y el montaje del fútbol siguen por confirmar. El racquetbol es una posibilidad, con acceso por confirmar.'},
    route:'tornaboda'
  }
];
