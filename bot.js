const { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder, ActivityType, Partials, EmbedBuilder } = require('discord.js');

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

const RULES_MSG = `# 🛡️️ 마고리 — PRAVIDLA

Vítej v NLKomunity. Jsme komunita pro lidi, kteří si chtějí pokecat, zahrát si a být součástí pohodového prostředí. Respektuj ostatní a používej selský rozum.

### 1. Žádné drama
Osobní konflikty si řešte mimo veřejné chaty. Nezahlcuj komunitu hádkami, beefem nebo veřejným řešením osobních problémů.

### 2. Spam a reklama
Nespamuj zprávy, emoji, mentiony ani hlasové kanály. Reklamu na vlastní servery, projekty nebo jiné komunity posílej pouze tam, kde je to povolené.

### 3. Nevhodný obsah
Zakázaný je pornografický, extrémně násilný, šokující nebo jinak nevhodný obsah. Platí to pro zprávy, obrázky, videa, odkazy i profilový obsah.

### 4. Osobní údaje
Nesdílej svoje ani cizí osobní údaje. Patří sem například adresa, telefonní číslo, hesla nebo jiné citlivé informace.

### 5. Podvody a škodlivý obsah
Je zakázáno podvádět ostatní členy, vydávat se za někoho jiného, krást účty, posílat škodlivé odkazy nebo se pokusit někomu poškodit účet či zařízení.

### 6. Voice chat
V hlasových kanálech platí stejná pravidla jako v textových. Neobtěžuj ostatní, nepouštěj úmyslně extrémně hlasité zvuky a respektuj ostatní členy.

### 7. Respektuj moderátory
Moderátoři jsou tu od toho, aby udržovali pořádek. Pokud máš problém s rozhodnutím moderátora, řeš ho v soukromí a slušně, ne veřejnou hádkou.

### 8. Využívej správné kanály
Piš věci tam, kam patří. Pomáhá to udržet server přehledný a příjemný pro všechny.

### 9. Selský rozum
Ne všechno se dá napsat do pravidel. Pokud něco očividně škodí komunitě nebo ostatním členům, nedělej to.

### 10. Neznalost pravidel se nepočítá 
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
Pravidla nejsou vytvořená proto, že někomu znepříjemňují pobyt na serveru. Mají zajistit, aby se tu mohli všichni normálně bavit, hrát a komunikovat.

**Buď v pohodě. Respektuj ostatní. A hlavně si to užij. ❤️**`;

client.once('ready', () => {
    console.log(`[BOT] Přihlášen jako: ${client.user.tag} (ID: ${client.user.id})`);

    // --- NASTAVENÍ PROFILU BOTA PŘI SPUŠTĚNÍ ---
    client.user.setStatus('dnd');
    client.user.setActivity('Zabezpečuje server a mnoho dalšího', { type: ActivityType.Watching });
});

// --- VÍTÁNÍ NOVÝCH ČLENŮ ---
client.on('guildMemberAdd', async (member) => {
    try {
        // Hledá textový kanál podle jména, které používáš ve struktuře serveru
        const channel = member.guild.channels.cache.find(ch => ch.name === '👋・vítáme-tě' && ch.isTextBased());
        if (!channel) return;

        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x5865F2) // Modrý postranní proužek jako na obrázku
            .setDescription(`👋 **Nový člen na serveru!**\n\nVítej ${member}! Podívej se na pravidla a potvrď je, poté budeš moci prozkoumávat komunitu, jak se ti jen zachce.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true })); // Zobrazí avatar nového uživatele (nebo lze nahradit vlastní URL obrázku)

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

    // 1. Anti-Link
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

    // 2. Anti-Spam
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
            const warning = await message.channel.send(`${message.author}, přestň spamovat!`);
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
            // Menu pro barvy
            const rowColor = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_color_role')
                    .setPlaceholder
