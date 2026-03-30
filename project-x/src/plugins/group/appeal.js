import { plugin } from '../../utils/plugin.js'
import { findUser, removeFromWallet, clearWarns } from '../../database/db.js'

plugin(
    {
        name: 'appeal',
        category: 'group',
        isGroup: true,
        description: {
            content: 'Pay ₹50000 to clear one temporary warning type.',
            usage: '<type_number>',
            example: '1'
        }
    },
    async (_, M, { args }) => {
        const typeId = parseInt(args[0])
        if (isNaN(typeId)) {
            return M.reply('❌ Please specify the Warning Type number you wish to appeal.')
        }

        const user = await findUser(M.sender.id, 'wallet warnings')
        const groupWarn = user?.warnings?.find((w) => w.groupId === M.from)
        const targetWarn = groupWarn?.types.find((t) => t.typeId === typeId)

        if (!targetWarn) {
            return M.reply('❌ You do not have an active warning of that type.')
        }
        if (targetWarn.isPermanent) {
            return M.reply('🚫 Appeals Denied: Permanent warnings can only be removed by a admin.')
        }
        if (user.wallet - 50000 < 0) {
            return M.reply('💰 Insufficient Funds: You need ₹50000 in your wallet to process an appeal.')
        }

        await removeFromWallet(M.sender.id, 5000)
        await clearWarns(M.sender.id, M.from, typeId)

        return M.reply(
            `✅ *APPEAL GRANTED*\n\n$5000 has been deducted. Warning Type ${typeId} has been cleared from your record.`
        )
    }
)
