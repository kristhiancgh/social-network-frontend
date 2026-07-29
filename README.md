# social-network-frontend

Cliente Angular de la red social: login, perfil, timeline y actualizaciones en vivo —tanto las
publicaciones nuevas como los contadores de likes llegan sin recargar.

Angular 19 · NgRx SignalStore · STOMP sobre WebSocket · componentes standalone

---

## Arranque

El backend tiene que estar corriendo primero:

```bash
cd ../social-network-backend && docker compose up --build
```

Después:

```bash
nvm use          # Node 22, según .nvmrc
npm ci
npm start        # http://localhost:4200
```

Cuentas demo: `jdoe`, `mgarcia`, `lchen`, `arossi`, `kcamilo` — todas con `Password123!`.

> Angular 19 soporta Node `^18.19.1 || ^20.11.1 || ^22.0.0`. Con una versión más nueva funciona
> pero avisa; la imagen Docker compila con `node:22-alpine`, así que el resultado no depende de
> lo que tengas instalado.

---

## Estructura

```
src/app/
├── core/                       singletons: se instancian una vez
│   ├── auth/                   guards/ · models/ · services/ · store/
│   ├── http/interceptors/      token saliente · errores entrantes
│   ├── layout/main-layout/     la cáscara; es dueña de los WebSocket
│   ├── realtime/               models/ · services/
│   ├── models/                 ProblemDetail · PageResponse
│   └── config/                 rutas de API y URLs de WebSocket
│
├── shared/                     sin estado y reutilizable
│   ├── components/             alert/ · avatar/ · spinner/
│   └── pipes/                  relative-time
│
└── features/                   una carpeta por dominio, lazy-loaded
    ├── auth/                   pages/login/
    ├── posts/                  components/ · pages/timeline/
    │                           models/ · services/ · store/
    └── profile/                pages/profile/
                                models/ · services/ · store/
```

Cada feature repite las mismas capas que su equivalente del backend, y cada
componente vive en su carpeta con sus tres archivos (`.ts`, `.html`, `.scss`).

Las importaciones usan alias en vez de rutas relativas:

```ts
import { RealtimeService } from '@core/realtime/services/realtime.service';
```

Contar `../` se rompe en silencio al mover un archivo; el alias describe dónde
vive algo, no dónde está quien lo importa. Se configura en `tsconfig.json`.

Las tres carpetas tienen reglas distintas, y son lo que evita que la app se convierta en un
bloque mutuamente dependiente:

- **`core/`** lo puede inyectar cualquiera; no depende de nadie.
- **`shared/`** no tiene estado: recibe entradas y emite salidas, nunca inyecta un store.
- **`features/`** puede usar `core/` y `shared/`, **nunca otra feature**. Lo que dos features
  necesitan a la vez pertenece a `core/`.

---

## Pantallas

| Ruta | Contenido |
|---|---|
| `/login` | Inicio de sesión, sin cabecera. Las cuentas demo están a un clic |
| `/posts` | Timeline con el botón de like, total en vivo y el editor |
| `/profile` | Nombres, apellidos, fecha de nacimiento y alias, con edición |

El editor no tiene campo de fecha: la pone el servidor dentro de `sp_create_post`. Dejar que
la eligiera el cliente permitiría antedatar una publicación al principio del timeline de todos.

---

## Estado

Tres stores de NgRx SignalStore, con tiempos de vida deliberadamente distintos:

- **`AuthStore`** es singleton de raíz. La cabecera, los guards, el interceptor y las features
  leen las mismas señales; un login en cualquier sitio actualiza todo sin bus de eventos.
- **`ProfileStore` y `PostsStore`** los provee la ruta de su feature, así que se liberan al
  salir de la pantalla en lugar de vivir toda la sesión.

El like es **optimista**: el contador se mueve antes de que responda el servidor, porque un
botón que espera 200 ms se siente roto. Si la petición falla, se revierte.

---

## Tiempo real

`RealtimeService` gestiona las dos conexiones STOMP —`/ws` para los likes y `/ws-posts` para
las publicaciones— y las esconde tras una sola API. Quien la usa solo lee `status`,
`lastLikeEvent` y `lastPostEvent`.

Las conexiones pertenecen a `MainLayoutComponent`, así que duran exactamente lo que la sesión:
un `effect` sigue al token y conecta o desconecta con él.

Los eventos llevan un dato compartido y otro personal. `likeCount` es el total del servidor y
se aplica siempre; `liked` solo afecta al corazón de `actorId`, para que el like de otra
persona no encienda tu botón.

Pruébalo: abre la app en dos navegadores con usuarios distintos, y da un like o publica algo.

---

## Acceso a la API

Todas las rutas son **relativas** (`/api/…`, `/ws`, `/ws-posts`). Nada apunta a un host:
`proxy.conf.json` las reenvía en desarrollo y `nginx.conf` en Docker. Así la misma imagen sirve
para cualquier entorno en vez de quedar atada al host con el que se compiló.

---

## Pruebas y compilación

```bash
npm test -- --watch=false --browsers=ChromeHeadless   # 49 pruebas
npm run build                                         # dist/social-network-frontend/browser
docker build -t social-frontend .                     # imagen nginx, ~50 MB
```

Las pruebas se concentran en los stores, que es donde está la lógica con más probabilidad de
fallar: el like optimista y su reversión, y las reglas de tiempo real.

---

## Nota de seguridad

El JWT se guarda en `localStorage`. Es un compromiso, no un descuido: sobrevive a un refresco,
pero cualquier script de este origen puede leerlo. Lo que acota el daño es que el token no
contiene datos personales, caduca en dos horas y es lo único que se almacena.

Los guards de ruta son comodidad, no seguridad —cualquier guard del navegador se salta desde la
consola—. Quien realmente decide es el JWT que cada servicio valida en toda petición.
