# Acceso remoto seguro (Opción 1: Tailscale)

Esta guía habilita acceso remoto al servidor sin abrir puertos públicos ni usar sudo, ejecutando Tailscale en modo userspace (rootless) bajo el usuario `restaurante`.

Requisitos:
- El servidor tiene salida a Internet (HTTP/HTTPS) al menos de forma temporal.
- Puedes iniciar sesión como `restaurante` por SSH o localmente.

## 1) Instalar Tailscale (rootless)

- En el servidor, como el usuario de la app:

```
./scripts/tailscale/install.sh
```

Esto instala `tailscale` y `tailscaled` en `~/.local/bin`.

## 2) Iniciar y vincular el nodo

- Arranca el daemon en userspace y realiza `up` (pedirá abrir una URL para autorizar):

```
./scripts/tailscale/up.sh --hostname=pos-restaurante
```

- Si tienes una clave de registro (opcional), puedes usarla para evitar abrir el navegador:

```
TS_AUTHKEY=tskey-xxxxxxxx ./scripts/tailscale/up.sh --hostname=pos-restaurante
```

Tras autorizar, obtén la IP de Tailscale del nodo:

```
~/.local/bin/tailscale --socket "$HOME/.local/run/tailscaled.socket" ip -4
```

## 3) Probar acceso remoto

Desde tu equipo administrador (también con Tailscale instalado y logueado en la misma red):

```
ssh restaurante@<IP_TAILSCALE> -p 22
```

Sugerencia: con `--ssh=true` en `tailscale up`, puedes incluso hacer `ssh <hostname.tailnet>` sin IP si resuelve vía MagicDNS.

## 4) Autoarranque al reiniciar (sin sudo)

Añade una línea @reboot al crontab del usuario para iniciar `tailscaled` y recuperar el enlace:

```
crontab -e
# Añadir
@reboot sleep 10 && "$HOME/.local/bin/tailscaled" \
  --state="$HOME/.local/share/tailscale/tailscaled.state" \
  --socket="$HOME/.local/run/tailscaled.socket" \
  --port=41641 --tun=userspace-networking \
  >>"$HOME/.local/state/tailscaled.log" 2>&1 &
```

Opcional: crea un pequeño script que haga `tailscale up` si detecta que no está registrado (puedes reutilizar `scripts/tailscale/start.sh`).

## 5) Parar o consultar estado

- Ver estado: `~/.local/bin/tailscale --socket "$HOME/.local/run/tailscaled.socket" status`
- Parar: `./scripts/tailscale/stop.sh`

## 6) Seguridad y buenas prácticas

- Mantén el usuario `restaurante` con una contraseña fuerte y claves SSH.
- Revoca el nodo en el panel de Tailscale si lo pierdes.
- Deshabilita `--ssh=true` si no necesitas proxy SSH de Tailscale.
- Registra el hostname en `up.sh` para reconocerlo en el panel.

## Troubleshooting

- Si `up.sh` no muestra URL de login: revisa el log en `~/.local/state/tailscaled.log`.
- Si el binario no aparece en PATH, cierra y reabre la sesión o exporta `PATH="$HOME/.local/bin:$PATH"`.
- Firewalls salientes estrictos pueden bloquear. Permite HTTPS hacia `pkgs.tailscale.com` y `controlplane.tailscale.com` temporalmente.