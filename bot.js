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

const RULES_MSG = `# 🛡️ 마고리 — PRAVIDLA

Vítej na 마고리. Jsme server pro lidi, kteří si chtějí pokecat, zahrát si, koukat na filmy a být součástí pohodového prostředí. Respektuj ostatní a používej selský rozum.

### 1. Žádné drama
Osobní konflikty si řešte mimo veřejné chaty. Nezahlcuj komunitu hádkami, beefem nebo veřejným řešením osobních problémů.

### 2. Spam a reklama
Nespamuj zprávy, emoji, mentiony ani hlasové kanály. Reklamu na vlastní servery, projekty nebo jiné komunity posílej pouze tam, kde je to povolené.

### 3. Nevhodný obsah
Zakázaný je pornografický, extrémně násilný, šokující nebo jinak nevhodný obsah. Platí to pro zprávy, obrázky, videa, odkazy i profilový obsah.

### 4. Osobní údaje
Nesdílej svoje ani cizí osobní údaje. Patří sem například adresa, telefonní číslo, hesla nebo jiné citlivé informace.

### 5. Podvody a škodlivý obsah
Je zakázáno podvádět ostatní členy, vydávat se za někoho jiného, krást účty, posílat škodlivé odkazy nebo se pokoušet někomu poškodit účet či zařízení.

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
Pravidla nejsou vytvořená proto, aby někomu znepříjemňovala pobyt na serveru. Mají zajistit, aby se tu mohli všichni normálně bavit, hrát a komunikovat.

**Buď v pohodě. Respektuj ostatní. A hlavně si to užij. ❤️**`;

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
            .setColor(0x5865F
