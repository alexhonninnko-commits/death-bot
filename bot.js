const { Client, GatewayIntentBits, PermissionsBitField, ActivityType, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Sledování pro anti-spam
const userMessageTimestamps = new Map();

const RULES_MSG = `# 🛡️ PRAVIDLA SERVERU\n\n` +
`1. **Žádné drama:** Osobní konflikty řešte mimo veřejné chaty.\n` +
`2. **Spam a reklama:** Nespamuj zprávy, emoji ani neposílej neschválenou reklamu.\n` +
`3. **Nevhodný obsah:** Zakázán je pornografický, násilný nebo jinak nevhodný obsah.\n` +
`4. **Osobní údaje:** Nesdílej svoje ani cizí citlivé údaje.\n` +
`5. **Podvody:** Zákaz podvádění, šíření škodlivých odkazů a kradení účtů.\n` +
`6. **Voice chat:** V hlasových kanálech platí stejná pravidla slušnosti.\n` +
`7. **Respektuj moderátory:** Rozhodnutí moderátorů se neřeší veřejnou hádkou.\n` +
`8. **Správné kanály:** Piš věci tam, kam patří.\n` +
`9. **Selský rozum:** Chovej se normálně a neškod komunitě.\n` +
`10. **Neznalost pravidel se nepočítá.**\n\n` +
`**Buď v pohodě, respektuj ostatní a užij si to! ❤️**`;

client.once('ready', () => {
    console.log(`[BOT] Přihlášen jako: ${client.user.tag} (ID: ${client.user.id})`);
    client.user.setStatus('dnd');
    client.user.setActivity('Zabezpečuje server', { type: ActivityType.Watching });
});

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
        } catch (err) {
            console.error("Chyba mazání odkazu:", err);
        }
    }

    const userId = message.author.id;
    const now = Date.now();
    if (!userMessageTimestamps.has(userId)) {
        userMessageTimestamps.set(userId, []);
    }
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
        } catch (err) {
            console.error("Chyba mazání spamu:", err);
        }
    }

    await handleCommands(message);
});

async function handleCommands(message) {
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'setup_roles') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("Na tento příkaz nemáš práva!");
        }

        try {
            // Menu byla odstraněna, posílá se čistě text s pravidly a výzvou k reakci
            const sentMessage = await message.channel.send({
                content: RULES_MSG + "\n\n👇 **Reaguj emoji ✅ pro získání ověřovací role:**"
            });

            await sentMessage.react('✅');
            await message.delete().catch(() => {});
        } catch (err) {
            console.error("Chyba při odesílání pravidel:", err);
            message.channel.send("Nastala chyba při vytváření zprávy s pravidly.");
        }
    }
}

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) {
        try { await reaction.fetch(); } catch (err) { return; }
    }

    if (reaction.emoji.name === '✅') {
        const guild = reaction.message.guild;
        if (!guild) return;
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member) {
            const roleId = '1557065568832458752';
            if (!member.roles.cache.has(roleId)) {
                await member.roles.add(roleId).catch(err => console.error("Chyba při přidávání role:", err));
            }
        }
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) {
        try { await reaction.fetch(); } catch (err) { return; }
    }

    if (reaction.emoji.name === '✅') {
        const guild = reaction.message.guild;
        if (!guild) return;
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member) {
            const roleId = '1557065568832458752';
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId).catch(err => console.error("Chyba při odebrání role:", err));
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
