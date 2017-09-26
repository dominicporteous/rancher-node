//This is the result of lazyness
//Regex made docs and some pseudo function-name-to-sentence stuff

function getMatches(string, regex, index) {
  index = index || [1] // default to the first capturing group
  var matches = []
  var match
  const get = index => match[index]
  while ((match = regex.exec(string)))
    matches.push(index.map(get))
  return matches
}

const magic = /  ([a-z]+)\((.*)\) {.*/gmi

const fs = require("fs")

const client = fs.readFileSync("./lib/client.js").toString()

function splitUp(str) {
  const m = (str.substr(0, 1).toUpperCase() + str.substr(1)).match(/([A-Z][a-z]+)/g)
  let r = []
  let f = true
  let i = 0
  while (f) {
    if (m[i]) r.push(m[i].toLowerCase())
    else f = false
    i++
  }
  return r
}

function isPlural(s) {
  return Array.isArray(s) ? s.map(s => isPlural(s)).filter(e => e)[0] : s.endsWith("s")
}

function caseFix(s, nocase) { //hello => Hello, [hello, world] => Hello World
  return Array.isArray(s) ? s.map(s => caseFix(s, nocase)).join(" ") : nocase ? s.toLowerCase() : s.substr(0, 1).toUpperCase() + s.substr(1).toLowerCase()
}

function desc(op, get, args) {
  switch (get[0]) {
  case "getRegistrationToken":
    return "Gets a one-time registration token"
    break;
  default:
    switch (op) {
    case "get":
      if (isPlural(get)) {
        if (get.length == 1) {
          return "Gets all " + caseFix(get, true)
        } else {
          return "Gets the " + caseFix(get, true) + " of a " + args[0].split("Id")[0]
        }
      } else {
        return "Gets information about a specific " + caseFix(get, true)
      }
      break;
    case "create":
    case "remove":
    case "delete":
    case "update":
    case "start":
    case "purge":
    case "stop":
    case "restart":
    case "add":
      return (caseFix(op) + "s") + " a " + caseFix(get, true)
      break;
    }
  }
}

let fncs = getMatches(client, magic, [1, 2]).slice(1).map(f => [f[0], splitUp(f[0]), f[1].split(", ")]).map(s => {
  return {
    op: s[0],
    args: s[2],
    desc: desc(s[1][0], s[1].slice(1), s[2])
  }
})

const docs = [""]

fncs.map(fnc => {
  docs.push("### `" + fnc.op + "(" + fnc.args.join(", ") + ")`")
  docs.push("")
  docs.push(fnc.desc)
  docs.push("")
})

docs.push("**NOTE: These docs were written by [a script](/gen-docs.js?raw=true)**")
docs.push("")

const readme = fs.readFileSync("./README.md").toString().split("\n")

let show = true
const newreadme = readme.filter(s => {
  if (s == "## API") {
    show = false
    return true
  }
  return show
}).concat(docs)

console.log(newreadme.join("\n"))

fs.writeFileSync("./README.md", new Buffer(newreadme.join("\n")))
