/**
 * Cómo se llaman las cosas.
 *
 * Son DOS nombres y no son intercambiables:
 *
 *   FitTrack — el producto. La app, la cuenta, el entrenamiento, las rutinas, el portal
 *              del entrenador. Es lo que aparece en el título del navegador y bajo el
 *              ícono en el teléfono.
 *
 *   Fitra    — el asistente de nutrición. Analiza fotos de comida, calcula calorías y
 *              macros, y sugiere recetas. Como Siri dentro de un iPhone: vive dentro de
 *              FitTrack, no es FitTrack.
 *
 * La regla para escribir cualquier texto nuevo: si la frase se puede completar con "…lo
 * hace la app", va FitTrack. Si se puede completar con "…se lo cuentas y te responde",
 * va Fitra. En caso de duda, FitTrack — el asistente es la parte pequeña.
 *
 * Contraejemplos de lo que NO se debe escribir:
 *   "Fitra arma rutinas a tu medida"        -> las rutinas no son cosa del asistente
 *   "quedas dentro de Fitra"                -> se entra a FitTrack, no al asistente
 *   "FitTrack · Fitra"                      -> los dos juntos no dicen nada
 */
export const PRODUCT_NAME = "FitTrack";
export const ASSISTANT_NAME = "Fitra";
