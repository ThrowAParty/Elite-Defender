// init project
const express = require("express");
var bodyParser = require("body-parser");
const https = require("https");
const app = express();
const { Client, MessageEmbed } = require("discord.js");
const { NONAME } = require("dns");
let client = new Client();

//// IMPORTANT VVV
let token = process.env.SECRET; //Your token goes in key.env (Discord bot)
let prefix = ";";
//let rolename = "Staff"; // role allowed to run the more critical commands

async function startApp() {
  var promise = client.login(token);
  console.log("Starting...");
  promise.catch(function (error) {
    console.error("Discord bot login | " + error);
    process.exit(1);
  });
}

startApp();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

let numbers = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣"];

const Invalid = new MessageEmbed()
  .setColor("#eb4034")
  .setDescription("Invalid user");

var toBan = [];

function byUID(method, usr, message) {
  const Emb = new MessageEmbed()
    .setColor("#fff200")
    //.setTitle(request.headers.username + "'s Data")
    // .setTitle("Attempt")
    //.setAuthor('Roblox Error','')
    .setDescription("Attempting to " + method + " UserID " + usr + "...")
    .setTimestamp()
    .setFooter("Elite Defender");
  message.edit(Emb);

  https
    .get("https://api.roblox.com/users/" + usr, (res) => {
      let data = "";
      res.on("data", (d) => {
        data += d;
      });

      res.on("end", () => {
        if (res.statusCode == 200) {
          toBan.push({
            method: method,
            username: JSON.parse(data).Username,
            value: usr,
            cid: message.channel.id,
            mid: message.id,
          });
        } else {
          message.edit(Invalid);
        }
      });
    })

    .on("error", (error) => {
      console.error("RBLX API (UID) | " + error);
    });
}

function byUser(method, usr, message) {
  const Emb = new MessageEmbed()
    .setColor("#fff200")
    //.setTitle(request.headers.username + "'s Data")
    // .setTitle("Attempt")
    //.setAuthor('Roblox Error','')
    .setDescription("Attempting to " + method + " username " + usr + "...")
    .setTimestamp()
    .setFooter("Elite Defender");
  message.edit(Emb);
  https
    .get(
      "https://api.roblox.com/users/get-by-username?username=" + usr,
      (res) => {
        let data = "";
        res.on("data", (d) => {
          data += d;
        });

        res.on("end", () => {
          if (JSON.parse(data).Id != undefined) {
            toBan.push({
              method: method,
              value: JSON.parse(data).Id,
              username: JSON.parse(data).Username,
              cid: message.channel.id,
              mid: message.id,
            });

            setTimeout(() => {
              if (message.deleted) return;

              //check to see if the message has been edited
              if (message.embeds.length > 0) {
                return;
              };
              
              message.edit(new MessageEmbed()
                .setColor("#eb4034")
                .setDescription("Error: Server took too long to respond or did not respond at all")
              );
            }, 20000);
          } else message.edit(Invalid)
        });
      }
    )

    .on("error", (error) => {
      console.error("RBLX API (Username) | " + error);
    });
}

const TookTooLong = new MessageEmbed()
  .setColor("#eb4034")
  .setDescription("You took too long to respond!");

async function determineType(method, message, BotMsg, args) {
  if (isNaN(Number(args[1]))) {
    byUser(method, args[1], BotMsg);
  } else {
    const Emb = new MessageEmbed()
      .setColor("#ea00ff")
      //.setTitle(request.headers.username + "'s Data")
      .setTitle("Is this a UserID or a Username?")
      //.setAuthor('Roblox Error','')
      .setDescription("Please react with the number that matches the answer.")
      .addField(
        numbers[0] + ": Username",
        "This is a players username in game."
      )
      .addField(
        numbers[1] + ": UserID",
        "This is the players UserId connect with the account."
      )
      .setTimestamp()
      .setFooter("Elite Defender");
    BotMsg.edit(Emb);
    try {
      await BotMsg.react(numbers[0]);
      await BotMsg.react(numbers[1]);
    } catch (error) {
      console.error("One of the emojis failed to react.");
    }
    const filter = (reaction, user) => {
      return (
        numbers.includes(reaction.emoji.name) && user.id === message.author.id
      );
    };
    BotMsg.awaitReactions(filter, { max: 1, time: 30000, errors: ["time"] })
      .then((collected) => {
        const reaction = collected.first();
        const ind = numbers.findIndex(function (n) {
          return n == reaction.emoji.name;
        });
        BotMsg.reactions
          .removeAll()
          .catch((error) =>
            console.error("Failed to clear reactions: ", error)
          );
        if (ind == 0) {
          byUser(method, args[1], BotMsg);
        } else if (ind == 1) {
          byUID(method, args[1], BotMsg);
        } else {
          BotMsg.edit("Something went wrong");
        } //
      })
      .catch((collected) => {
        BotMsg.edit(TookTooLong);
        BotMsg.reactions
          .removeAll()
          .catch((error) =>
            console.error("Failed to clear reactions: ", error)
          );
      });
  }
}

/*
RANKS:

0 - regular users
standard commands

1 - "premium users"
some more fun commands
imange manip?
  
2 - moderators
kick, ban, etc.

3 - admins


4 - head admins
updating settings

5 - devs / hos
debug commands

6 - me
override to all permissions, regardless of rank

*/

function getMemberRank(member) {
  if (member.id == "319304595421659138") {
    return 6;
  } else if (member.roles.cache.find((r) => r.name === "Developer")) {
    return 5;
  } else if (member.roles.cache.find((r) => r.name === "Head Admin")) {
    return 4;
  } else if (member.roles.cache.find((r) => r.name === "Admin")) {
    return 3;
  } else if (member.roles.cache.find((r) => r.name === "Moderator")) {
    return 2;
  } else if (member.roles.cache.find((r) => (r.name === "Active Member" || r.name === "Tester"))) {
    return 1;
  }

  return 0;
}

const commands = {
  // MISC COMMANDS
  // help
  help: {
    description: "Shows a list of commands.",
    usage: "help",
    category: "misc",
    aliases: ["commands", "cmds"],
    cooldown: 5,
    rank: 0,
    run: async (message, args) => {
      const embed = new MessageEmbed()
        .setColor("#eb4034")
        .setTitle("Information")
        .setDescription(
          "This is a bot created by <@!319304595421659138> for the service of moderating and managing the Calamitous Productions server and games.\n\n"
          //"To get more information about the bot, you can run the command `help`. or just ask an admin."
        )
        .addField("Prefix", prefix)
        .addField("Commands", "`" + Object.keys(commands).join("`, `") + "`")
        .setTimestamp()
        .setFooter("Elite Defender");
      message.channel.send(embed);
    },
  },

  // ping
  ping: {
    desc: "Pings the bot's response time",
    usage: "ping",
    aliases: ["pong"],
    category: "misc",
    rank: 0,
    run: async (message, args) => {
      await message.reply("Pong! Took " + client.ws.ping + "ms to reply.");
    },
  },

  // fetch servers
  fetch: {
    desc: "Fetch all servers the bot is active in",
    usage: "fetch",
    aliases: ["fetch", "getservers", "gs"],
    category: "misc",
    cooldown: 5,
    rank: 0,
    run: async (message, args) => {
      // send an embed with the names of all servers the bot is in
      const Emb = new MessageEmbed()
        .setColor("#fff200")
        .setTitle("Server List")
        .setDescription(
          "Bot is currently active in " +
          client.guilds.cache.size +
          " servers.\n\n" +
          client.guilds.cache.map((guild) => guild.name).join("\n")
        )
        .setTimestamp()
        .setFooter("Elite Defender");
      message.channel.send(Emb);
    },
  },

  echo: {
    desc: "Echo's the message",
    usage: "echo [channel] [message]",
    aliases: ["say","speak","repeat"],
    category: "misc",
    cooldown: 5,
    rank: 2,
    run: async (message, args) => {
      if (args.length < 2) {
        message.channel.send("Please enter a message to echo.");
      } else {
        const channel = message.mentions.channels.first();

        if (channel) {
          channel.send(args.slice(2).join(" "));
        } else {
          message.channel.send(args.slice(1).join(" "));
        }
      }
    }
  },

  // moderation commands
  // TODO: add rank checks that prevent kicking / banning of staff
  // kick
  kick: {
    desc: "Kicks a user from the server",
    usage: "kick [user] [reason]",
    aliases: ["k"],
    category: "moderation",
    cooldown: 5,
    rank: 2,
    run: async (message, args) => {
      if (args.length == 1) {
        message.channel.send("Please provide a user to kick.\n\nExample: `Kick @User`");
      } else {
        if (message.guild.me.hasPermission("KICK_MEMBERS")) {
          const user = message.mentions.users.first();
          const reason = (args.slice(1).join(" ") || "No reason provided.");

          if (user) {
            const member = message.guild.member(user);

            if (member) {
              member
                .kick(reason)
                .then(() => { message.channel.send(user.tag + " has been kicked for: " + reason) })
                .catch((error) => {
                  console.error(error);
                  message.channel.send("Unable to kick " + user.tag + "; " + error);
                });
            } else
              message.channel.send("Could not find user " + user.tag + ".");
          } else message.channel.send("Could not find user " + user.tag + ".");
        } else message.channel.send("Could not kick member: No permission.");
      }
    },
  },

  // ban
  ban: {
    desc: "Bans a user from the server",
    usage: "kick [user] [reason]",
    aliases: ["b", "banish", "begone"],
    category: "moderation",
    cooldown: 5,
    rank: 2,
    run: async (message, args) => {
      if (args.length == 1) {
        message.channel.send("Please provide a user to ban.\n\nExample: `Ban @User`");
      } else {
        if (message.guild.me.hasPermission("BAN_MEMBERS")) {
          const user = message.mentions.users.first();
          const reason = (args.slice(1).join(" ") || "No reason provided.");

          if (user) {
            const member = message.guild.member(user);

            if (member) {
              member
                .ban(reason)
                .then(() => message.channel.send(user.tag + " has been banned for: " + reason))
                .catch((error) => {
                  console.error(error);
                  message.channel.send("Could not ban " + user.tag + ":\n\n" + error);
                });
            } else message.channel.send("Could not find user " + user.tag + ".");
          } else message.channel.send("Could not find user " + user.tag + ".");
        } else message.channel.send("Could not ban member: No permission.");
      }
    },
  },

  // roblox commands
  // rblx ban
  rblxban: {
    desc: "Bans a user from the game",
    usage: "rblxban [user] [reason]",
    aliases: ["rb", "rblxbanish", "rblxbegone"],
    category: "moderation",
    cooldown: 5,
    rank: 2,
    run: async (message, args) => {
      var Emb = new MessageEmbed()
        .setColor("#eb4034")
        .setDescription("Working...");

      var BotMsg = await message.channel.send(
        "<@" + message.author.id + ">",
        Emb
      );

      determineType("Ban", message, BotMsg, args);
    },
  },

  // rblx unban
  rblxunban: {
    name: "rblxunban",
    desc: "Unbans a user from the game",
    usage: "rblxunban [user] [reason]",
    aliases: ["ru", "rblxunbanish", "rblxunbegone"],
    category: "moderation",
    cooldown: 5,
    rank: 2,
    run: async (message, args) => {
      var Emb = new MessageEmbed()
        .setColor("#eb4034")
        .setDescription("Working...");

      var BotMsg = await message.channel.send(
        "<@" + message.author.id + ">",
        Emb
      );

      determineType("Unban", message, BotMsg, args);
    },
  },

  // rblx kick
  rblxkick: {
    name: "rblxkick",
    desc: "Kicks a user from the game",
    usage: "rblxkick [user] [reason]",
    aliases: ["rk", "rblxkickbegone"],
    category: "moderation",
    cooldown: 5,
    rank: 2,
    run: async (message, args) => {
      var Emb = new MessageEmbed()
        .setColor("#eb4034")
        .setDescription("Working...");

      var BotMsg = await message.channel.send(
        "<@" + message.author.id + ">",
        Emb
      );

      determineType("Kick", message, BotMsg, args);
    },
  },

  // debug and trolling
  // code execution
  eval: {
    desc: "Executes the code given",
    usage: "eval [code]",
    aliases: ["e"],
    category: "debug",
    cooldown: 5,
    rank: 6,
    run: async (message, args) => {
      if (args.length == 1) {
        message.channel.send("Please provide code to execute.\n\nExample: `eval console.log(\"Hello World!\")`");
      } else {
        const code = args.slice(1).join(" ");
        const evaled = eval(code);

        const embed = new MessageEmbed()
          .setColor("#eb4034")
          .setTitle("Evaluation")
          .setDescription(`Output: \`\`\`${evaled}\`\`\``)

          .setFooter("Elite Defender")
          .setTimestamp();
        message.channel.send(embed);
      };
    },
  },
}

function isCommand(command, message) {
  var command = command.toLowerCase();
  var content = message.content.toLowerCase();
  return content.startsWith(prefix + command);
}

client.on("message", async (message) => {
  if (message.author.bot) return;

  const args = message.content.slice(prefix.length).split(" ");

  if (isCommand(args[0], message)) {
    let foundCommand = null
    let commandName = null

    for (const [key, command] of Object.entries(commands)) {
      if (key === args[0] || command.aliases.includes(args[0])) {
        foundCommand = command;
        commandName = key;
        break;
      };
    };

    if (foundCommand) {
      // TODO: logging commands in a specific channel
      console.log("Member " + message.author.tag + " tried to run command " + commandName);

      if (foundCommand.rank <= getMemberRank(message.member)) {
        foundCommand.run(message, args);
      } else { message.channel.send("You do not have permission to use this command") };
    };
  };

  if (message.mentions.users.has(client.user.id)) {
    if (message.channel.name === "bot-commands") {
      commands.help.run(message, args);
    } else {
      var Emb = new MessageEmbed()
        .setColor("#eb4034")
        .setTitle("Elite Defender")
        .setDescription(
          "The current prefix is `" + prefix + "`.\n\n" +
          "To get more information about the bot, you can run the command `help` or mention the bot from #bot-connabds."
        )
        .setFooter("Elite Defender")
        .setTimestamp();
      
      message.channel.send(Emb);
    };
  };

  // TODO: swear filter
  
});

// website api & interface
app.use(express.static("public"));

app.get("/", async function (request, response) {
  if (request.headers.username != undefined) {
    const channel = await client.channels.cache.get(request.headers.cid);

    channel.messages
      .fetch(request.headers.mid)

      .then((msg) => {
        if (request.headers.rblxerror == undefined) {
          const Emb = new MessageEmbed()
            .setColor("#00ff44")
            .setTitle(request.headers.method + " successful. ")
            .addField("Username", request.headers.username)
            .addField("UserID", request.headers.value)
            //.addField('Inline field title', 'Some value here', true)
            //.setImage('https://www.roblox.com/Thumbs/Avatar.ashx?x=100&y=100&userId='+request.headers.uid)
            .setTimestamp()
            .setFooter("Elite Defender");
          if (msg.author != undefined) {
            msg.edit(Emb);
          } else {
            channel.send(Emb);
          }
        } else {
          const Emb = new MessageEmbed()
            .setColor("#eb4034")
            .setTitle(request.headers.method + " failed. ")
            .addField("Username", request.headers.username)
            .addField("UserID", request.headers.value)
            .addField("Rblx-Error", request.headers.rblxerror)
            //.addField('Inline field title', 'Some value here', true)
            //.setImage('https://www.roblox.com/Thumbs/Avatar.ashx?x=100&y=100&userId='+request.headers.uid)
            .setTimestamp()
            .setFooter("Elite Defender");
          if (msg.author != undefined) {
            msg.edit(Emb);
          } else {
            channel.send(Emb);
          }
        }
      })

      .catch((err) => console.log(err));
  }

  response.send(toBan[0]);
  toBan.shift();
});

// listen for requests & Keep bot alive
let listener = app.listen(process.env.PORT, function () {
  //setInterval(() => { // Used to work sometime ago
  //    http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
  //}, 280000);
  console.log(
    "Not that it matters but your app is listening on port " +
    listener.address().port
  );
});

client.on("error", console.error);
