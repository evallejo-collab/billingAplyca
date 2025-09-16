# Habilitar Creación de Usuarios desde la App

Para permitir la creación de usuarios desde la interfaz web, necesitas una de estas opciones:

## Opción A: Supabase Edge Function (Recomendado)

1. Crear una Edge Function que maneje la creación de usuarios
2. La función tendría permisos de administrador para crear usuarios
3. La app llamaría esta función desde el frontend

## Opción B: Service Role Key (Menos seguro)

1. Usar la Service Role Key en lugar de Anon Key
2. Solo para operaciones administrativas
3. Requiere endpoint backend seguro

## Opción C: Invitaciones por Email

1. Usar el sistema de invitaciones de Supabase
2. Enviar invitaciones por email
3. Los usuarios completan el registro

¿Te gustaría que implemente alguna de estas opciones?