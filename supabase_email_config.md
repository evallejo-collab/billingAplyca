# Configuración de Email Templates en Supabase

Para que las invitaciones funcionen automáticamente, necesitas configurar los email templates en Supabase:

## Paso 1: Configurar URL de confirmación

1. **Ve al Dashboard de Supabase** → Settings → Authentication
2. **En "Site URL"** pon: `http://localhost:3000` (para desarrollo)
3. **En "Additional Redirect URLs"** agrega: `http://localhost:3000/auth/callback`

## Paso 2: Configurar Email Templates

1. **Ve a Authentication** → **Email Templates**
2. **Selecciona "Confirm signup"**
3. **Asegúrate que esté habilitado**
4. **El template debería verse así:**

```html
<h2>Confirma tu cuenta</h2>
<p>Has sido invitado a unirte al sistema de facturación de Aplyca.</p>
<p>Haz clic en el enlace de abajo para confirmar tu cuenta:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar cuenta</a></p>
<p>O copia y pega esta URL en tu navegador:</p>
<p>{{ .ConfirmationURL }}</p>
```

## Paso 3: Configurar SMTP (Opcional)

Para producción, configura un proveedor de email como SendGrid, Mailgun, etc. en:
**Settings** → **Authentication** → **SMTP Settings**

## Paso 4: Verificar configuración

Una vez configurado, las invitaciones deberían:
1. Crear usuario automáticamente
2. Enviar email de confirmación
3. El usuario confirma y accede con rol correcto

¿Necesitas ayuda con alguno de estos pasos?