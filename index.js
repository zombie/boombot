
const { Client } = require('irc');
const { config } = require('./package');

const CARDS = require('./cards');
const { GameTag, PlayReq, CardType, Rarity } = require('./enums');

const { log, error } = global.console;
const [B, I, U, C, N] = '\x02\x1d\x1f\x03\x0f';

// title-case enum names
function title(name = '') {
  return name.length < 4 ? name : name[0] + name.slice(1).toLowerCase();
}

// "html" to irc voodoo
function markup(_, tag, $, value) {
  const irc = { b: B, i: I, $: U + value + N };
  return irc[tag || $] || ' ';
}

// parse blizzard "html"
function parse(str = '') {
  return str.replace(/<\/?(b|i)>|(\$)(\d+)|\n|\[x\]/g, markup);
}

// paginate results, chunks of 3
function paginate(query, cards) {
  if (cards.length === 1) return cards[0].str;
  const first = (query === paginate.query) ? paginate.first : 0;
  const page = cards.sort((a, b) => b.order - a.order).slice(first, first + 3);
  const result = page.map((c, n) => `(${first + n + 1}/${cards.length}) ${c.str}`);
  paginate.query = (first + 3 < cards.length) ? query : '\n';
  paginate.first = first + 3;
  return result.join('\n');
}

// crate a text search, tag comparator or flag filter
function filter(_, text, q, tag, op, val, not, flag) {
  const fuzzy = new RegExp((text || '').replace(/ +/g, '.+'), 'i');
  const ops = { '>': a => a > val, '<': a => a < val, '=': a => a === +val };
  if (flag) return c => !!not ^ c.flags.includes(flag.toUpperCase());
  if (tag) return c => ops[op](c[tag]);
  return c => fuzzy.test(c.text);
}

// !find by card text, comparators or keywords, play reqs..
function find(query) {
  const regex = '"([^"]+)("|$)|(\\w+) ?([>=<]) ?(\\d+)|(!)?(\\w+)';
  const parts = query.match(new RegExp(regex, 'g')) || [];
  const filters = parts.map(p => filter(...p.match(regex)));
  const result = CARDS.filter(c => filters.every(f => f(c)));
  return paginate(query, result);
}

// !card by name or id
function card(query) {
  const exact = new RegExp(`^${query}$`, 'i');
  const fuzzy = new RegExp(query.replace(/ +/g, '.*'), 'i');
  const one = CARDS.filter(c => exact.test(c.id) || exact.test(c.name));
  const result = one.length ? one : CARDS.filter(c => fuzzy.test(c.name));
  return paginate(query, result);
}

// !tag, !playreq enums
function enums(query) {
  const keys = Object.keys(this);
  const regex = new RegExp(query.trim(), 'i');
  const result = keys.filter(k => k.match(regex) || this[k] === +query);
  return result.map(k => `${k} = ${this[k]}`).join(', ').slice(0, 900);
}

// !boombot flavor
function cookie() {
  const cookies = CARDS.filter(c => c.flavor);
  return I + parse(cookies[Math.random() * cookies.length | 0].flavor);
}

// check for commands, respond
function message(from, to, line) {
  const tag = enums.bind(GameTag);
  const playreq = enums.bind(PlayReq);
  const cmds = { card, find, tag, playreq, [this.nick]: cookie };
  Object.keys(cmds).forEach(key => {
    const command = cmds[key];
    const regex = `(!${key}\d?|^${key}:) ?(.*)$`;
    const match = line.toLowerCase().match(regex);
    if (!match) return;
    try {
      log(from || to, '!', key, match[2]);
      this.say(to, command(match[2]) || `${I}no results `);
    } catch (e) {
      error(e);
    }
  });
}

// exit to restart
function kick(_, nick) {
  if (nick === config.nick) process.exit(0);
}

// init, connect
function main() {
  const color = [C + 12, C + 6, C + 7];
  for (const c of CARDS) {
    const rarity = Rarity[c.rarity] | 0;
    const type = title(c.race || c.type);
    const clazz = c.playerClass || 'NEUTRAL';
    c.str = [B, color[rarity - 3], c.name, N, '  ']
      .concat('[', B, c.id, N, ' ', title(c.set), ']')
      .concat('[', title(clazz), ' ', B, type, N, ']')
      .concat('[', 'cost' in c ? `${c.cost}  mana` : '')
      .concat('attack' in c ? `, ${c.attack}/` : '', c.durability)
      .concat(c.health, c.type === 'HERO' ? ' HP] ' : ']:  ')
      .concat(parse(c.text), '   ', I, parse(c.flavor))
      .join('');
    c.flags = [].concat(c.mechanics)
      .concat(Object.keys(c.playRequirements || {}))
      .concat(c.type, c.set, c.rarity, c.race, clazz);
    c.order = 100 * !!c.collectible + 10 * rarity - CardType[c.type];
  }

  const bot = new Client(config.host, config.nick, config);
  bot.addListener('pm', message.bind(bot, 0));
  bot.addListener('message#', message);
  bot.addListener('error', error);
  bot.addListener('kick', kick);
}

main();
