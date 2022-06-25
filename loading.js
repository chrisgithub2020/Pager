const ipc = require("electron").ipcRenderer
const fs = require("fs")

//Loading screen
const local_db = fs.readFile("./resources/user.page", (err, data) => {
  if (err) throw err;
  // console.log(data)
  if (data.byteLength === 0) {
    console.log("No account")
    ipc.send("no-account", data)
  } else {
    
    ipc.on("db_decrypted",(event,data)=>{
      const db_path = "./resources/" + data["active"] + ".page"
      console.log(db_path)

      fs.readFile(db_path, (err, content) => {
        if (err) throw err;
  
        if (content.byteLength === 0) {
          ipc.send("ready-to-go",'')
  
        } else {
          ipc.send("ready-to-go",content)

        }

      })

    })


    ipc.send("database-loaded", data)
  }
})