/**
 * La escala del diseño: espaciado, tipografía, radios y zonas de toque.
 *
 * Hasta ahora cada pantalla elegía sus números a ojo. Contando sobre app/ y components/
 * salían 20 tamaños de letra distintos —con granularidad de medio píxel: 12 y 12.5
 * conviviendo— y 21 radios de borde. Nadie nota la diferencia de medio píxel; el problema
 * es que tampoco se podía cambiar: subir el tamaño de letra de toda la app eran cientos
 * de ediciones.
 *
 * Esto no es un rediseño. Los valores son los que ya predominaban en el código, agrupados
 * en una escala corta. Lo nuevo es que ahora hay un sitio donde cambiarlos.
 */

/** Espaciado. Múltiplos de 2 hasta 8, de 4 en adelante. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

/**
 * Tamaños de letra. Cinco escalones y ya.
 *
 * `micro` es para etiquetas en mayúsculas debajo de un número, donde el texto es una
 * pista y no contenido. Nada por debajo de 11 px se usa para algo que haya que leer.
 */
export const fontSize = {
  micro: 10.5,
  caption: 11.5,
  body: 13,
  subtitle: 14.5,
  title: 17,
  display: 22,
} as const;

/** Radios de borde. */
export const radius = {
  sm: 9,
  md: 11,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

/**
 * El mínimo que puede medir algo que se toca con el dedo.
 *
 * Apple recomienda 44×44 px. La app tenía controles de 18, 22 y 26 px —incluido el check
 * de "serie hecha", que se toca decenas de veces por entrenamiento, de pie y con las manos
 * sudadas—. Lo que se agranda es la ZONA DE TOQUE, no el dibujo: el icono sigue midiendo
 * lo que medía, con el área alrededor haciéndose tocable.
 */
export const MIN_TOUCH_SIZE = 44;

/**
 * Estilos para que un control pequeño tenga una zona de toque de 44 px sin cambiar de
 * tamaño visual ni empujar lo que tiene al lado.
 *
 * El pseudo-elemento no cabe en un objeto de estilos en línea, así que se hace con un
 * contenedor de posición relativa y un ::after; la clase vive en globals.css.
 */
export function touchTarget(visualSize: number): React.CSSProperties {
  return {
    position: "relative",
    width: visualSize,
    height: visualSize,
    // Sin esto, el área extendida de un control tapa al de al lado y roba sus toques.
    touchAction: "manipulation",
  };
}
