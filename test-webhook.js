const payload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1234567890",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "1234567890",
              "phone_number_id": "1234567890"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Maria da Silva"
                },
                "wa_id": "5511999999999"
              }
            ],
            "messages": [
              {
                "from": "5511999999999",
                "id": "wamid.HBgLNTUxMTk5OTk5OTk5FQIAERgSRTIxRjg2Rjc5Mjk2MkJFQTBEAA==",
                "timestamp": "1659365538",
                "text": {
                  "body": "Olá, preciso agendar uma consulta com o posto."
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
};

console.log("Enviando requisição POST para http://localhost:3000/api/webhook/whatsapp ...");

fetch('http://localhost:3000/api/webhook/whatsapp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload)
})
.then(res => {
  console.log(`Status de resposta do Webhook: ${res.status}`);
  return res.text();
})
.then(text => console.log('Resposta:', text))
.catch(err => console.error('Erro na requisição:', err));
