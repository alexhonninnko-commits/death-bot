const { Client, GatewayIntentBits, PermissionsBitField, ActivityType, Partials, AuditLogEvent, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const userMessageTimestamps = new Map();
const LOG_CHANNEL_ID = '1552794840025010227';

// Seznam rolí pro ověření přes reakci
const ROLE_IDS = ['1557065568832458752', '1557420636178092102'];

const RULES_PART_1 = `# 🛡️ 마고리 — PRAVIDLA

Vítej na 마고리. Jsme server pro lidi, kteří si chtějí pokecat, zahrát si, koukat na filmy a být součástí pohodového prostředí. Respektuj ostatní a používej selský rozum.

### Žádné drama
Osobní konflikty si řešte mimo veřejné chaty. Nezahlcuj komunitu hádkami, beefem nebo veřejným řešením osobních problémů.

### Spam a reklama
Nespamuj zprávy, emoji, mentiony ani hlasové kanály. Reklamu na vlastní servery, projekty nebo jiné komunity posílej pouze tam, kde je to povolené.

### Nevhodný obsah
Zakázaný je pornografický, extrémně násilný, šokující nebo jinak nevhodný obsah. Platí to pro zprávy, obrázky, videa, odkazy i profilový obsah.

### Osobní údaje
Nesdílej svoje ani cizí osobní údaje. Patří sem například adresa, telefonní číslo, hesla nebo jiné citlivé informace.

### Podvody a škodlivý obsah
Je zakázáno podvádět ostatní členy, vydávat se za někoho jiného, krást účty, posílat škodlivé odkazy nebo se pokoušet někomu poškodit účet či zařízení.`;

const RULES_PART_2 = `### Voice chat
V hlasových kanálech platí stejná pravidla jako v textových. Neobtěžuj ostatní, nepouštěj úmyslně extrémně hlasité zvuky a respektuj ostatní členy.

### Respektuj moderátory
Moderátoři jsou tu od toho, aby udržovali pořádek. Pokud máš problém s rozhodnutím moderátora, řeš ho v soukromí a slušně, ne veřejnou hádkou.

### Využívej správné kanály
Piš věci tam, kam patří. Pomáhá to udržet server přehledný a příjemný pro všechny.

### Selský rozum
Ne všechno se dá napsat do pravidel. Pokud něco očividně škodí komunitě nebo ostatním členům, nedělej to.

### Neznalost pravidel se nepočítá 
Pravidla se můžou změnit neustále

---

## ⚠️ TRESTY
Porušení pravidel může podle situace vést k:
- upozornění
- timeoutu
- odstranění zpráv
- kicku
- dočasnému banu
- permanentnímu banu

Trest se může lišit podle závažnosti a opakování přestupku.

## 📌 DŮLEŽITÉ
Pravidla nejsou vytvořená proto, aby někomu znepříjemňovala pobyt na serveru. Mají zajistit, aby se tu mohli všichni normálně bavit, hrát a komunikovat.

**Buď v pohodě. Respektuj ostatní. A hlavně si to užij. ❤️**`;

client.once('ready', () => {
    console.log(`[BOT] Přihlášen jako: ${client.user.tag}`);
    client.user.setStatus('dnd');
    client.user.setActivity('Zabezpečuje server', { type: ActivityType.Watching });
});

async function sendLog(guild, embed) {
    try {
        const channel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error("Chyba při odesílání logu:", err);
    }
}

// Uvítací zpráva
client.on('guildMemberAdd', async (member) => {
    try {
        const channel = member.guild.channels.cache.find(ch => ch.name === '👋・vítáme-tě' && ch.isTextBased());
        if (!channel) return;

        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(`👋 **Nový člen na serveru!**\n\nVítej ${member}! Podívej se na pravidla a potvrď je.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

        await channel.send({ embeds: [welcomeEmbed] });
    } catch (err) {
        console.error("Chyba při odesílání uvítací zprávy:", err);
    }
});

// === LOGY ===

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    if (addedRoles.size === 0) return;

    setTimeout(async () => {
        try {
            const fetchedLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate });
            const log = fetchedLogs.entries.first();
            let executor = log ? log.executor : { tag: "Neznámý", id: newMember.guild.ownerId };

            for (const role of addedRoles.values()) {
                const dangerousPermissions = [
                    PermissionsBitField.Flags.Administrator,
                    PermissionsBitField.Flags.ManageRoles,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.BanMembers,
                    PermissionsBitField.Flags.KickMembers,
                    PermissionsBitField.Flags.ManageGuild
                ];

                const hasDangerous = dangerousPermissions.some(perm => role.permissions.has(perm));

                const embed = new EmbedBuilder()
                    .setColor(hasDangerous ? 0xED4245 : 0x57F287)
                    .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL?.() })
                    .setTitle("👤 Role Given")
                    .setDescription(`The <@&${role.id}> role was given to <@${newMember.id}>`)
                    .addFields({ name: "Given by:", value: `<@${executor.id}>`, inline: false })
                    .setFooter({ text: `ID: ${newMember.id}` })
                    .setTimestamp();

                if (hasDangerous) {
                    embed.addFields({ name: "WARNING!", value: "```diff\n- Dangerous permissions granted\n```", inline: false });
                }

                await sendLog(newMember.guild, embed);
            }
        } catch (err) {
            console.error("Chyba logu rolí:", err);
        }
    }, 1000);
});

client.on('guildBanAdd', async (ban) => {
    setTimeout(async () => {
        try {
            const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
            const log = fetchedLogs.entries.first();
            let executor = log ? log.executor : { tag: "Neznámý", id: ban.user.id };

            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL?.() })
                .setTitle("🔨 Ban Given")
                .setDescription(`Uživatel **${ban.user.tag}** byl zabanován.`)
                .addFields({ name: "Given by:", value: `<@${executor.id}>`, inline: false })
                .setFooter({ text: `ID: ${ban.user.id}` })
                .setTimestamp();

            await sendLog(ban.guild, embed);
        } catch (err) {
            console.error("Chyba logu banu:", err);
        }
    }, 1000);
});

client.on('guildMemberRemove', async (member) => {
    setTimeout(async () => {
        try {
            const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
            const log = fetchedLogs.entries.first();
            if (!log || log.target.id !== member.id) return;

            let executor = log.executor;

            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL?.() })
                .setTitle("👢 Kick Given")
                .setDescription(`Uživatel **${member.user.tag}** byl vyhozen ze serveru.`)
                .addFields({ name: "Given by:", value: `<@${executor.id}>`, inline: false })
                .setFooter({ text: `ID: ${member.id}` })
                .setTimestamp();

            await sendLog(member.guild, embed);
        } catch (err) {
            console.error("Chyba logu kicku:", err);
        }
    }, 1000);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
        if (newMember.communicationDisabledUntilTimestamp) {
            setTimeout(async () => {
                try {
                    const fetchedLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUpdate });
                    const log = fetchedLogs.entries.first();
                    let executor = log ? log.executor : { tag: "Neznámý", id: newMember.id };

                    const embed = new EmbedBuilder()
                        .setColor(0xFEE75C)
                        .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL?.() })
                        .setTitle("⏱️ Timeout Given")
                        .setDescription(`Uživatel **${newMember.user.tag}** dostal timeout.`)
                        .addFields({ name: "Given by:", value: `<@${executor.id}>`, inline: false })
                        .setFooter({ text: `ID: ${newMember.id}` })
                        .setTimestamp();

                    await sendLog(newMember.guild, embed);
                } catch (err) {
                    console.error("Chyba logu timeoutu:", err);
                }
            }, 1000);
        }
    }
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;
    setTimeout(async () => {
        try {
            const fetchedLogs = await newChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate });
            const log = fetchedLogs.entries.first();
            let executor = log ? log.executor : { tag: "Neznámý", id: newChannel.id };

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL?.() })
                .setTitle("📝 Channel Updated")
                .setDescription(`Kanál **${newChannel.name}** byl upraven.`)
                .addFields({ name: "Updated by:", value: `<@${executor.id}>`, inline: false })
                .setFooter({ text: `ID: ${newChannel.id}` })
                .setTimestamp();

            await sendLog(newChannel.guild, embed);
        } catch (err) {
            console.error("Chyba logu kanálu:", err);
        }
    }, 1000);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const user = newState.member.user;
    const guild = newState.guild;

    let actionText = "";
    if (!oldState.channelId && newState.channelId) {
        actionText = `se připojil do VC **${newState.channel.name}**`;
    } else if (oldState.channelId && !newState.channelId) {
        actionText = `opustil VC **${oldState.channel.name}**`;
    } else if (oldState.channelId !== newState.channelId) {
        actionText = `přestoupil z VC **${oldState.channel.name}** do **${newState.channel.name}**`;
    } else {
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setTitle("🔊 Voice Activity")
        .setDescription(`Uživatel **${user.tag}** ${actionText}`)
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();

    await sendLog(guild, embed);
});

// === OCHRANA & PŘÍKAZY ===

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await handleCommands(message);
        return;
    }

    const contentLower = message.content.toLowerCase();
    if (contentLower.includes("http://") || contentLower.includes("https://") || contentLower.includes("discord.gg/")) {
        try {
            await message.delete();
            const warning = await message.channel.send(`${message.author}, posílání odkazů je zakázáno!`);
            setTimeout(() => warning.delete().catch(() => {}), 5000);
            return;
        } catch (err) {}
    }

    const userId = message.author.id;
    const now = Date.now();
    if (!userMessageTimestamps.has(userId)) userMessageTimestamps.set(userId, []);
    let timestamps = userMessageTimestamps.get(userId);
    timestamps.push(now);
    timestamps = timestamps.filter(t => now - t <= 5000);
    userMessageTimestamps.set(userId, timestamps);

    if (timestamps.length > 5) {
        try {
            await message.delete();
            const warning = await message.channel.send(`${message.author}, přestaň spamovat!`);
            setTimeout(() => warning.delete().catch(() => {}), 5000);
            return;
        } catch (err) {}
    }

    await handleCommands(message);
});

async function handleCommands(message) {
    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'setup_roles') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        try {
            await message.channel.send({ content: RULES_PART_1 });
            const secondMessage = await message.channel.send({
                content: RULES_PART_2 + "\n\n👇 **Reaguj emoji ✅ pro získání ověřovacích rolí:**"
            });
            await secondMessage.react('✅');
            await message.delete().catch(() => {});
        } catch (err) {
            console.error("Chyba setup_roles:", err);
        }
    }
}

// === REAKCE (Ověřování rolí) ===

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch (err) { return; } }

    if (reaction.emoji.name === '✅') {
        const guild = reaction.message.guild;
        if (!guild) return;
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member) {
            for (const roleId of ROLE_IDS) {
                if (!member.roles.cache.has(roleId)) {
                    await member.roles.add(roleId).catch(() => {});
                }
            }
        }
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch (err) { return; } }

    if (reaction.emoji.name === '✅') {
        const guild = reaction.message.guild;
        if (!guild) return;
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member) {
            for (const roleId of ROLE_IDS) {
                if (member.roles.cache.has(roleId)) {
                    await member.roles.remove(roleId).catch(() => {});
                }
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
