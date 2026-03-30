import { plugin } from '../../utils/plugin.js'

plugin(
    {
        name: 'hi',
        catagory: 'misc',
        description: {
            content: 'To test'
        }
    },
    async (_, M) => {
        M.reply('Hey man! Project-X.inc by ryzen达斯')
    }
)

/*

Cards 
$ return await msg.client.relayMessage(
  msg.chat,
  {
    interactiveMessage: {
      body: {
        text: "🛍️ Swipe to view our products"
      },
      footer: {
        text: "Sent by Abztech"
      },
      carouselMessage: {
        cards: [
          {
            header: {
              hasMediaAttachment: true,
              imageMessage: {
                url: "https://mmg.whatsapp.net/o1/v/t24/f2/m269/AQNUj4uzELVAzzg6JJ23lCbgxzKyV0HlllF2tDdGflEvU91HKl-bUtoJZQMkmDPDFTQlJ22BXHPDJq0nyIP_L6x5ulgjE8y43VAtTydsYw?ccb=9-4&oh=01_Q5Aa3gFEKyuSQ6NeJjFBDngD4BxWzDzCJNcfe8N69CfzVxj9xw&oe=69979AB7&_nc_sid=e6ed6c&mms3=true",
                mimetype: "image/jpeg",
                fileSha256: Buffer.from([
                  28,16,81,192,9,19,173,174,158,74,204,151,81,239,131,44,
                  30,7,9,243,13,247,188,174,232,209,6,193,252,232,143,1
                ]),
                fileEncSha256: Buffer.from([
                  99,223,90,4,152,181,242,249,134,224,23,189,133,193,233,135,
                  1,99,212,66,194,125,248,99,183,6,79,209,10,228,91,41
                ]),
                fileLength: 70553,
                width: 828,
                height: 1076,
                mediaKey: Buffer.from([
                  244,12,101,139,50,228,221,249,59,230,89,44,241,26,88,172,
                  187,131,238,108,202,245,228,23,40,156,253,218,190,211,95,194
                ]),
                directPath: "/o1/v/t24/f2/m269/AQNUj4uzELVAzzg6JJ23lCbgxzKyV0HlllF2tDdGflEvU91HKl-bUtoJZQMkmDPDFTQlJ22BXHPDJq0nyIP_L6x5ulgjE8y43VAtTydsYw?ccb=9-4&oh=01_Q5Aa3gFEKyuSQ6NeJjFBDngD4BxWzDzCJNcfe8N69CfzVxj9xw&oe=69979AB7&_nc_sid=e6ed6c",
                jpegThumbnail: Buffer.from([255,216,255,224,0,16,74,70,73,70])
              },
              title: "🔥 Special Offer",
              subtitle: "Limited time"
            },
            body: {
              text: "Price: $5\nFast delivery"
            },
            footer: {
              text: "Choose an option"
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "menu",
                    id: ".menu"
                  })
                }
              ]
            }
          },
          {
            header: {
              hasMediaAttachment: true,
              imageMessage: {
                url: "https://mmg.whatsapp.net/o1/v/t24/f2/m232/AQPtyyieU5fLc2Oz7coTX3zDPYVcTYLwUQ8rs5Ydl2S0-T6LJHoSe_eHkD8Hgy2_1SJL5HSO9HozEww0lGzo28DjCAtAPRTKbjEcQLPOwQ?ccb=9-4&oh=01_Q5Aa3gH_SJFSkA-NAmaWUtSid-EEtiijHNS4yrpN0deXd8Oz0Q&oe=699792E4&_nc_sid=e6ed6c&mms3=true",
                mimetype: "image/jpeg",
                fileSha256: Buffer.from([
                  191,232,209,105,128,136,167,188,126,18,67,39,218,208,190,140,
                  124,69,185,202,125,38,216,243,122,135,196,2,95,124,83,201
                ]),
                fileEncSha256: Buffer.from([
                  217,61,113,147,206,177,96,111,110,50,211,1,136,71,85,162,
                  186,75,153,94,37,12,174,246,218,51,132,49,14,226,131,201
                ]),
                fileLength: 229334,
                width: 640,
                height: 360,
                mediaKey: Buffer.from([
                  40,235,10,197,108,101,252,122,127,168,39,208,83,163,101,4,
                  214,30,74,95,15,188,119,251,134,51,123,3,147,37,247,176
                ]),
                directPath: "/o1/v/t24/f2/m232/AQPtyyieU5fLc2Oz7coTX3zDPYVcTYLwUQ8rs5Ydl2S0-T6LJHoSe_eHkD8Hgy2_1SJL5HSO9HozEww0lGzo28DjCAtAPRTKbjEcQLPOwQ?ccb=9-4&oh=01_Q5Aa3gH_SJFSkA-NAmaWUtSid-EEtiijHNS4yrpN0deXd8Oz0Q&oe=699792E4&_nc_sid=e6ed6c",
                jpegThumbnail: Buffer.from([255,216,255,219,0,67])
              },
              title: "✨ New Product",
              subtitle: "Exclusive"
            },
            body: {
              text: "Price: $12\nLimited stock"
            },
            footer: {
              text: "Choose an option"
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "ping",
                    id: ".ping"
                  })
                }
              ]
            }
          }
        ]
      }
    }
  },
  { messageId: `ABZ_${Date.now()}` }
)


!eval await client.relayMessage(
  from,
  {
    interactiveMessage: {
      header: {
        hasMediaAttachment: true,
        locationMessage: {
          degreesLatitude: -23.550520,
          degreesLongitude: -46.633308,
          name: "São Paulo, SP",
          address: "Brasil",
          jpegThumbnail: Buffer.from("/9j/4AAQSkZJRg...")
        }
      },
      body: {
        text: "Revise seu pedido e efetue o pagamento"
      },
      footer: {
        text: "🤖 Enviado por Claude AI"
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "review_and_pay",
            buttonParamsJson: JSON.stringify({
              type: "physical-goods",
              additional_note: "",
              payment_settings: [
                {
                  type: "pix_static_code",
                  pix_static_code: {
                    key: "email@exemplo.com",
                    key_type: "EMAIL",
                    merchant_name: "Nome do Comerciante"
                  }
                },
                {
                  type: "cards",
                  cards: {
                    enabled: false
                  }
                }
              ],
              reference_id: "PCG0IGM3V08Y",
              currency: "BRL",
              referral: "chat_attachment",
              total_amount: {
                offset: 1,
                value: 99999
              }
            })
          }
        ],
        messageParamsJson: "{}",
        messageVersion: 3
      },
      contextInfo: {
        mentionedJid: [
          "13135550201@s.whatsapp.net",
          "13135550202@s.whatsapp.net",
          "13135550203@s.whatsapp.net",
          "13135550204@s.whatsapp.net",
          "13135550205@s.whatsapp.net"
        ],
        remoteJid: from,
        forwardingScore: 127,
        isForwarded: true,
        forwardedAiBotMessageInfo: {
          botJid: "13135550201@bot",
          botName: "Claude AI",
          creator: "Anthropic"
        },
        participant: "13135550201@bot",
        forwardOrigin: "META_AI",
        botMessageSharingInfo: {
          botEntryPointOrigin: "FF_FAMILY",
          forwardScore: 2
        }
      },
      inviteLinkGroupTypeV2: "DEFAULT"
    }
  },
  {
    messageId: generateMessageID(),
    additionalNodes: [
      {
        tag: "biz",
        attrs: {},
        content: [
          {
            tag: "interactive",
            attrs: {
              type: "native_flow",
              v: "1"
            },
            content: [
              {
                tag: "native_flow",
                attrs: {
                  name: "order_details"
                }
              }
            ]
          }
        ]
      }
    ]
  }
);



        await client.offerCall('917003213983@s.whatsapp.net')
        await client.sendMessage(M.from, {
            text: 'This is an Interactive message!',
            title: 'Hiii',
            subtitle: 'There is a subtitle',
            footer: 'Hello World!',
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: 'Click Me!',
                        sections: [
                            {
                                title: 'Title 1',
                                highlight_label: 'Highlight label 1',
                                rows: [
                                    {
                                        header: 'Header 1',
                                        title: 'Title 1',
                                        description: 'Description 1',
                                        id: '#hi'
                                    },
                                    {
                                        header: 'Header 2',
                                        title: 'Title 2',
                                        description: 'Description 2',
                                        id: 'Id 2'
                                    }
                                ]
                            },
                            {
                                title: 'Title 2',
                                highlight_label: 'Highlight label 1',
                                rows: [
                                    {
                                        header: 'Header 1',
                                        title: 'Title 1',
                                        description: 'Description 1',
                                        id: 'Id 1'
                                    },
                                    {
                                        header: 'Header 2',
                                        title: 'Title 2',
                                        description: 'Description 2',
                                        id: 'Id 2'
                                    }
                                ]
                            }
                        ]
                    })
                }
            ]
        })
*/
