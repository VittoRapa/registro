# Documentazione API

La documentazione delle API REST del Registro Elettronico è generata automaticamente a partire dal codice tramite specifica **OpenAPI 3.1** e **Swagger UI**.

## Accesso Locale
Quando il backend è in esecuzione, la documentazione interattiva è accessibile al seguente percorso:

- **Swagger UI**: [http://localhost:4000/docs](http://localhost:4000/docs)
- **Specifiche OpenAPI JSON**: [http://localhost:4000/docs-json](http://localhost:4000/docs-json)

## Formato di Risposta degli Errori
Tutti gli errori restituiti dal backend seguono rigorosamente la specifica **RFC 9457 (Problem Details for HTTP APIs)** con `Content-Type: application/problem+json`:

```json
{
  "type": "https://registro.local/errors/400",
  "title": "Bad Request",
  "status": 400,
  "detail": "Errore di validazione dei dati inviati.",
  "instance": "/api/v1/auth/login",
  "timestamp": "2026-10-12T12:00:00.000Z",
  "errors": {
    "email": ["Formato email non valido"]
  }
}
```
