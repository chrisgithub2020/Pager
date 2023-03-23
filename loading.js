const ipc = require("electron").ipcRenderer
const fs = require("fs")
const os = require("os")
const homeDir = os.homedir()
var emojis_obj = {}
var direction = ''


//Loading screen
const local_db = fs.readFile(homeDir + "\\.pager\\resources\\user.page", (err, data) => {
  if (err) throw err;
  // console.log(data)
  if (data.byteLength === 0) {
    console.log("No account")
    ipc.send("no-account", data)
  } else {
    fs.readFile(homeDir + "\\.pager\\resources\\emojis.json", "utf-8", (err, data) => {
      if (err) throw err;
      emojis_obj = { "keys": Object.keys(JSON.parse(data)), "object": JSON.parse(data) }
    })
    // fs.exists(homeDir + "\\.pager\\resources\\emojis.json", (exists) => {
    //   if (exists) {

    //     fs.readFile(homeDir + "\\.pager\\resources\\emojis.json", "utf-8", (err, data) => {
    //       if (err) throw err;
    //       emojis_obj = { "keys": Object.keys(JSON.parse(data)), "object": JSON.parse(data) }
    //     })
    //   }
    // })

    ipc.on("db_decrypted", (event, data) => {
      const db_path = homeDir + "\\.pager\\resources\\" + data["active"] + ".page"
      console.log(db_path)

      fs.readFile(db_path, (err, content) => {
        if (err) throw err;

        if (content.byteLength === 0) {
          direction = ''

        } else {
          direction = content

        }



        ipc.send("ready-to-go", { "emojis": emojis_obj, "direction": direction })
      })

    })


    ipc.send("database-loaded", data)

  }


})
