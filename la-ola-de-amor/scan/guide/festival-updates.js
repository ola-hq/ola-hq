'use strict';
// Guest-safe editorial board. Edit both languages and change revision for each new edition.
// Dates are source-supported publication dates; no posting time has been invented.
// This editorial board has no CMS, push subscription or notification backend.
const FESTIVAL_UPDATES = [
  {
    id:'one-week', revision:'2026-10-09-la-platica', publishedAt:'2026-10-09', priority:'confirmed',
    audience:{en:'Our people · Our festival',es:'Nuestra gente · Nuestro festival'},
    title:{en:'One week to La Ola · La Plática is here',es:'Falta una semana · Ya llegó La Plática'},
    body:{en:'Bri + Jon · Our People · Our Festival. One week until Friday, October 16! Our guest message wall is open: leave a little love, share a hello, and check Festival Updates for confirmed plans. Messages appear for everyone as soon as they are posted.',es:'Bri + Jon · Our People · Our Festival. ¡Falta una semana para el viernes 16 de octubre! La Plática ya está abierta: deja un poquito de amor, manda un saludo y consulta las actualizaciones para ver los planes confirmados. Los mensajes aparecen para todos al enviarlos.'},
    route:'updates'
  },
  {
    id:'day-two', revision:'2026-10-09-qualified-r5', publishedAt:'2026-10-08', priority:'confirmed',
    audience:{en:'Festival guests',es:'Invitados del Festival'},
    title:{en:'Tornaboda · Saturday, together',es:'Tornaboda · Un sábado juntos'},
    body:{"en": "Saturday, October 17 · 12:00 PM–5:00 PM · La Tijera, the same property as the wedding. One more relaxed afternoon together. Food plans and swimming access are still being confirmed. After 5 PM, we’ll see where the night takes us.", "es": "Sábado 17 de octubre · 12:00 PM–5:00 PM · La Tijera, la misma propiedad de la boda. Una tarde más para convivir. Los planes de comida y el acceso para nadar siguen por confirmar. Después de las 5 PM, veremos a dónde nos lleva la noche."},
    route:'tornaboda'
  },
  {
    id:'tacos', revision:'2026-10-09-qualified-r5', publishedAt:'2026-10-08', priority:'pending',
    audience:{en:'Day 2 information',es:'Información del Día 2'},
    title:{en:'Tacos · Serving details to follow',es:'Tacos · Detalles del servicio próximamente'},
    body:{"en": "Tacos are planned for Saturday afternoon. The vendor and serving time are still being confirmed. Check here for confirmed details before planning around a food-service window.", "es": "Se planean tacos para el sábado por la tarde. El proveedor y el horario de servicio siguen por confirmar. Consulta aquí los detalles confirmados antes de organizarte en torno a un horario de comida."},
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
