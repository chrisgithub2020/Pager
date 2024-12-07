const ipc = require("electron").ipcRenderer
const fs = require("fs")
const os = require("os")


const homeDir = os.homedir()
var emojis_obj = {}
var direction = ''

const Config = {
  HOST_URL: `http://localhost:8000`
}
//Loading screen
const local_db = fs.readFile(homeDir + "\\.pager\\resources\\user.page", (err, data) => {
  if (err) throw err;
  // console.log(data)
  if (data.byteLength === 0) {
    console.log("No account")

    fs.exists(homeDir + "\\.pager\\resources\\emojis.json", (emojis_exist) => {
      if (!emojis_exist) {
        console.log("asking for emoji")

        fetch(`${Config.HOST_URL}/get_emoji`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

          .then(async (response) => {
            // Handle the server response
            if (response) {

              let media_blob = await response.blob()
              // Create a FileReader object
              const reader = new FileReader();

              // Set up a callback for when the FileReader has loaded the contents of the Blob
              reader.onload = (event) => {
                // Access the ArrayBuffer containing the contents of the Blob
                const arrayBuffer = event.target.result;

                // Create a Buffer object from the ArrayBuffer
                const buffer = Buffer.from(arrayBuffer);

                // Now you can use the 'buffer' object as needed, e.g. save to disk using fs.writeFile() in Node.js
                // ...
                fs.writeFileSync(homeDir + "//.pager//resources//emojis.json", buffer);

              };

              // Read the contents of the Blob as an ArrayBuffer
              reader.readAsArrayBuffer(media_blob);
            }
          })

      }
    })

    fs.exists(homeDir + "\\.pager\\resources\\default_profile_pic.jpg", (pic_exist) => {
      if (!pic_exist) {
        console.log("asking for image")
        fetch(`${Config.HOST_URL}/get_default_profile_pic`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
          .then(async (response) => {
            // Handle the server response
            if (response) {
              let media_blob = await response.blob()
              // Create a FileReader object
              const reader = new FileReader();

              // Set up a callback for when the FileReader has loaded the contents of the Blob
              reader.onload = (event) => {
                // Access the ArrayBuffer containing the contents of the Blob
                const arrayBuffer = event.target.result;

                // Create a Buffer object from the ArrayBuffer
                const buffer = Buffer.from(arrayBuffer);

                // Now you can use the 'buffer' object as needed, e.g. save to disk using fs.writeFile() in Node.js
                // ...
                fs.writeFileSync(homeDir + "//.pager//resources//default_profile_pic.jpg", buffer);

              };

              // Read the contents of the Blob as an ArrayBuffer
              reader.readAsArrayBuffer(media_blob);
            }
          })

      }
    })
    ipc.send("no-account", data)

  } else {
    fs.exists(homeDir + "\\.pager\\resources\\emojis.json", (emojis_exist) => {
      if (!emojis_exist) {
        console.log("asking for emoji")

        fetch(`${Config.HOST_URL}/get_emoji`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
          .then(async (response) => {
            // Handle the server response
            if (response) {
              let media_blob = await response.blob()
              // Create a FileReader object
              const reader = new FileReader();

              // Set up a callback for when the FileReader has loaded the contents of the Blob
              reader.onload = (event) => {
                // Access the ArrayBuffer containing the contents of the Blob
                const arrayBuffer = event.target.result;

                // Create a Buffer object from the ArrayBuffer
                const buffer = Buffer.from(arrayBuffer);

                // Now you can use the 'buffer' object as needed, e.g. save to disk using fs.writeFile() in Node.js
                // ...
                fs.writeFileSync(homeDir + "//.pager//resources//emojis.json", buffer);

              };

              // Read the contents of the Blob as an ArrayBuffer
              reader.readAsArrayBuffer(media_blob);
            }
          })

      }
    })
    fs.exists(homeDir + "\\.pager\\resources\\default_profile_pic.jpg", (pic_exist) => {
      if (!pic_exist) {
        console.log("asking for image")
        fetch(`${Config.HOST_URL}/get_default_profile_pic`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
          .then(async (response) => {
            // Handle the server response
            if (response) {
              let media_blob = await response.blob()
              // Create a FileReader object
              const reader = new FileReader();

              // Set up a callback for when the FileReader has loaded the contents of the Blob
              reader.onload = (event) => {
                // Access the ArrayBuffer containing the contents of the Blob
                const arrayBuffer = event.target.result;

                // Create a Buffer object from the ArrayBuffer
                const buffer = Buffer.from(arrayBuffer);

                // Now you can use the 'buffer' object as needed, e.g. save to disk using fs.writeFile() in Node.js
                // ...
                fs.writeFileSync(homeDir + "//.pager//resources//default_profile_pic.jpg", buffer);

              };

              // Read the contents of the Blob as an ArrayBuffer
              reader.readAsArrayBuffer(media_blob);
            }
          })

      }
    })
    fs.readFile(homeDir + "//.pager//resources//emojis.json", "utf-8", (err, data) => {
      if (err) throw err;
      emojis_obj = { "keys": Object.keys(JSON.parse(data)), "object": JSON.parse(data) }
    })

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
