// src/database/models/index.js

import { model } from 'mongoose'
import { UserSchema } from './user.js'
import { GroupSchema } from './group.js'
import { ContactSchema } from './contact.js'
import { StateSchema } from './state.js'
import { GroupActivitySchema } from './groupact.js'
import { CodeSchema } from './code.js'
import { CommandSchema } from './command.js'
import { ModSchema } from './mod.js'
import { BotSchema } from './bot.js' // ← ADD

export const User = model('User', UserSchema)
export const Group = model('Group', GroupSchema)
export const Contact = model('Contact', ContactSchema)
export const Code = model('Code', CodeSchema)
export const State = model('State', StateSchema)
export const GroupActivity = model('GroupActivity', GroupActivitySchema)
export const Command = model('CommandSchema', CommandSchema)
export const Mod = model('Mod', ModSchema)
export const Bot = model('Bot', BotSchema) // ← ADD
