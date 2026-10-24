Build de [fli-js](https://github.com/punitarani/fli/tree/main/fli-js) 0.0.4 (MIT, commit 881aee5),
compilado con `bun run build` y sin source maps. Se vendoriza porque el paquete
`fli-js` no está en npm, y el publicado como `@punitarani/fli` (0.0.3) devuelve
siempre `null` contra Google Flights. Es ESM; Nest (CommonJS) lo carga con
`require(esm)`, que necesita Node >= 22.12.
