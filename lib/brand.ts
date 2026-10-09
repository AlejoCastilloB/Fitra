/**
 * Cómo se llaman las cosas.
 *
 * Hay UN nombre propio y nada más:
 *
 *   Fitra — el producto entero. La app, la cuenta, el entrenamiento, las rutinas, la
 *           nutrición, el portal del entrenador. Es lo que aparece en el título del
 *           navegador y bajo el ícono en el teléfono.
 *
 * La IA de nutrición NO tiene nombre propio. Se le dice "tu asistente" o "el asistente",
 * en minúscula, como quien dice "la cámara" o "el buscador": es una parte de Fitra, no
 * un personaje aparte. Antes se llamaba Fitra, igual que el producto, y eso confundía
 * las dos cosas en cada frase.
 *
 * La regla para escribir cualquier texto nuevo: si la frase se puede completar con "…lo
 * hace la app", va Fitra. Si se puede completar con "…se lo cuentas y te responde", va
 * el asistente, sin nombre.
 *
 * Contraejemplos de lo que NO se debe escribir:
 *   "el asistente arma rutinas a tu medida"  -> las rutinas no son cosa del asistente
 *   "quedas dentro del asistente"            -> se entra a Fitra
 *   "Fitra, tu asistente"                    -> vuelve a mezclar el producto con la IA
 *   "Fitra IA", "FitraBot", "el asistente Fitra"
 */
export const PRODUCT_NAME = "Fitra";
/** En minúscula a propósito: es una parte de la app, no un nombre propio. */
export const ASSISTANT_NAME = "el asistente";
