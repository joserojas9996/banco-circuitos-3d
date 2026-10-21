# Banco de Circuitos 3D

Laboratorio 3D de circuitos con piezas de broche (kit tipo Snap Circuits Jr.), con acceso por administrador o por PIN temporal.
Se publica gratis con **GitHub Pages** y usa **Firebase (plan Spark, gratuito)** solo para el login y los PIN.

## Cómo funciona el acceso

- **Administrador:** entra con correo y contraseña y debe tener un documento `admins/<UID>`. No se desconecta por el límite de 60 minutos.
- **PIN:** 8 caracteres. Vale **5 minutos** desde su creación y **puede utilizarse por múltiples invitados** mientras esté vigente. No se elimina al utilizarlo.
- **Invitado:** cada persona recibe su propia sesión de **60 minutos** desde que introduce un PIN válido. Al terminar, la página se recarga y pide acceso de nuevo. Si el navegador estuvo suspendido, se verifica al regresar.
- **Reglas:** Firestore comprueba la vigencia del PIN y la sesión usando la hora del servidor. Revocar un PIN impide nuevos ingresos, pero no elimina sesiones ya emitidas.

## Puesta en marcha (una sola vez)

1. **Crea el proyecto.** En <https://console.firebase.google.com> crea un proyecto (no actives Google Analytics si no lo necesitas). Se queda en el plan Spark, que no pide tarjeta.
2. **Activa los accesos.** Authentication → Sign-in method → activa **Correo electrónico/contraseña** y **Anónimo**.
3. **Crea al administrador.** Authentication → Users → Add user, con su correo y contraseña. Copia el **UID** de ese usuario.
4. **Crea la base de datos.** Firestore Database → Create database (modo producción, la región más cercana).
5. **Publica las reglas.** Pestaña Rules → pega el contenido de `firestore.rules` → Publish.
6. **Marca al administrador.** En Firestore crea la colección `admins` con un documento cuyo **ID sea el UID** del paso 3 y un campo cualquiera (por ejemplo `rol: "admin"`). Sin este documento nadie es administrador.
7. **Copia la configuración.** Project settings → Your apps → Web (`</>`) → copia el objeto `firebaseConfig` en `js/firebase-config.js`.
8. **Autoriza el dominio.** Authentication → Settings → Authorized domains → agrega `TU_USUARIO.github.io`.
9. **Sube el repositorio a GitHub** (público) y activa **Settings → Pages → Deploy from a branch → `main` / `(root)`**. La dirección será `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`.
10. **Recomendado:** en Google Cloud Console → APIs y servicios → Credenciales, restringe la clave de API de la app Web a los referentes `https://TU_USUARIO.github.io/*`.

## Uso

- El administrador abre la dirección, entra con su correo y contraseña, pulsa **PIN de acceso → Generar PIN nuevo** y comparte el código.
- Quien recibe el PIN abre la misma dirección, elige **Tengo un PIN** y lo escribe.
- En iPad: abre la dirección en Safari y usa Compartir → **Añadir a pantalla de inicio** para tenerlo como app a pantalla completa. Requiere internet.

## Límites que conviene conocer

- El repositorio es público, así que **el código del simulador es visible** para cualquiera. El acceso controla el flujo normal de la aplicación, pero no oculta el código ni impide que alguien ejecute una copia local.
- Como todo el código corre en el navegador, alguien con conocimientos técnicos podría saltarse la pantalla de acceso modificando su copia. Lo que sí hacen cumplir las reglas del servidor es que cada PIN valga 5 minutos y solo se acepte durante sus 5 minutos de vigencia.
- El PIN tiene ocho caracteres aleatorios; no es un sustituto de controles adicionales contra abuso o intentos automatizados. Los PIN vencidos se limpian cuando el administrador abre el panel.
- Los límites del plan gratuito de Firebase pueden cambiar; revisa la página de precios de Firebase antes de publicar.

## Probar en tu computadora

```
python3 -m http.server 8000
```

Abre <http://localhost:8000> (`localhost` ya está autorizado en Firebase).

## Archivos

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | Pantalla de acceso, laboratorio y panel de PIN |
| `css/app.css` | Estilos |
| `js/auth.js` | Login, PIN multiusuario, sesión individual de 1 hora y reinicio automático |
| `js/firebase-config.js` | Datos de tu proyecto de Firebase (tú los completas) |
| `js/simulador.js` | Simulador de circuitos y escena 3D |
| `js/three.min.js` | Three.js r128 (licencia MIT), incluido para no depender de otro servidor |
| `firestore.rules` | Reglas de seguridad de Firestore |

## Avisos de seguridad y pruebas

- Publica `firestore.rules` en Firebase; subirlo a GitHub **no** lo activa.
- La clave de configuración web de Firebase aún es un marcador de posición: completa `js/firebase-config.js` antes de probar.
- Crea el documento `admins/<UID>` manualmente desde Firebase Console.
- Prueba con dos navegadores: ambos deben entrar con el mismo PIN dentro de cinco minutos y caducar 60 minutos después de sus respectivos ingresos.
- El simulador (`js/simulador.js` y `js/three.min.js`) se descarga públicamente desde GitHub Pages; **no se puede garantizar que usuarios técnicos no lo utilicen sin autorización**. Para protección real del contenido se requiere alojarlo detrás de un servidor que valide la sesión.
- Los PIN compartidos pueden circular entre personas; considera límites de intentos, App Check y monitorización de uso antes de difusión amplia.
