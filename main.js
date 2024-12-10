/// Main process of the application
// Modules to control application life and create native browser window
const { app, BrowserWindow, desktopCapturer } = require('electron')
const ipc = require("electron").ipcMain
const dialog = require("electron").dialog
const { Blob } = require("buffer")
const detect = require("detect-file-type")
const mime = require("mime-types")
const mutag = require('mutag');
const crypto = require("crypto");
const os = require("os")
const homeDir = os.homedir()


// Custom modules
var socket_functions = null

const local_db_io = require("./write_to_json")
const use_media_devices = require("./use_media")

// Loadiing and decrypting Database
const safe_storage = require("electron").safeStorage
const fs = require("fs")
const path = require('path')
const { electron, off } = require('process')
var users_db_object = {}
var active_user_db_object = {}
let mainWindow = ''

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1015, //used to be 1005
    height: 700,
    minWidth: 1005,
    // autoHideMenuBar:true,
    webPreferences: {
      enableremotemodule: false,
      nodeIntegration: true,
      contextIsolation: false,
    }
  })
  mainWindow.webContents.openDevTools()


  var start_page = "./src/loading.html"
  var main_page = "./src/index.html"
  var signUp_page = "./src/sign-up.html"


  // When loading is Completed
  ipc.on("database-loaded", (event, db) => {
    users_db_object = JSON.parse(safe_storage.decryptString(db))
    // users_db_object = db


    


    event.sender.send("db_decrypted", users_db_object)

    // * Loading the index the html page when there is an account
    ipc.on("ready-to-go", async (event, data) => {
      const emojis_obj = data["emojis"]
      var emojis_html = ''
      for (var i = 0; i <= emojis_obj["keys"].length; i++) {
        var emoji_id = emojis_obj["keys"][i]
        var emoji = emojis_obj["object"][emojis_obj["keys"][i]]
        var emoji_btn = `<a class="emoji-btn" id="${emoji_id}">${emoji}</a>`
        emojis_html += emoji_btn
      }


      await mainWindow.loadFile(main_page)

      if (Object.keys(users_db_object).length > 0) {

        console.log("Connecting to server now!")
        socket_functions = require("./socket_io")
        // Sending request to change online status
        console.log(users_db_object)
        socket_functions.change_online_status(users_db_object)
  
        socket_functions.socket.on("recieve_message", (message) => {
          console.log(message)
          ipc.on("save_message", (event, name, msg) => {
            if (msg === null){
              msg = message
            }
  
            /// Saving the message
            if ("messages" in active_user_db_object[name]) {
              active_user_db_object[name]["messages"].push(msg)
            } else {
              active_user_db_object[name]["messages"] = [msg]
            }
            event.sender.send("update_db", active_user_db_object)
            db_to_save = safe_storage.encryptString(JSON.stringify(active_user_db_object))
            local_db_io.save_contact(users_db_object["active"], db_to_save)
          })
  
          event.sender.send("message", message)
        })
  
        socket_functions.socket.on("added_to_clique", (clique_data) => {
          console.log(clique_data)
          active_user_db_object[clique_data["name"]] = { "type": "clique", "name": clique_data["name"], "link": clique_data["link"], "members": clique_data["members"], "profile_picture": clique_data["profile_pic"], "description": clique_data["description"], "admin": clique_data["admins"], "settings": clique_data["settings"] }
  
          local_db_io.save_contact(users_db_object["active"], safe_storage.encryptString(JSON.stringify(active_user_db_object)))
  
          event.sender.send("update_db", active_user_db_object)
  
          event.sender.send("added_to_clique", clique_data)
        })
  
        socket_functions.ready_to_receive_saved_messages(102)
        socket_functions.socket.on("server_saved_messages", (messages) => {
          console.log(messages)
        })
        socket_functions.socket.on("rtc-offer",(offer)=>{
          console.log(offer, "our call beginning");
          event.sender.send("rtc-offer",offer)
        })
        socket_functions.socket.on("icecandidate", (cand) => {
          console.log(cand)
          event.sender.send("icecandidate", cand)
        })
    
        
      }
      


      if (typeof (data["direction"]) === "string") {
        event.sender.send("no-contact", true)



      } else {
        active_user_db_object = JSON.parse(safe_storage.decryptString(data["direction"]))
        // event.sender.send("display_utility_on_startup", { "db": active_user_db_object})
        event.sender.send("display_utility_on_startup", { "db": active_user_db_object, "emoji": emojis_html })

        /// ! Recieving calls
        socket_functions.socket.on("incomingCall",(call_data)=>{
          event.sender.send("startAudioCall",call_data)
        })


      }
    })

  })

  ipc.on("send_user_info", (event) => {
    event.sender.send("user_info", users_db_object)
  })



  // * Incase there is no account
  ipc.on("no-account", (event, data) => {
    start_page = - "./src/sign-up.html"
    mainWindow.loadFile(signUp_page)
  })

  // * Log Out
  ipc.on("log-out", async (event, new_db) => {
    new_db = JSON.parse(new_db)

    if (Object.keys(new_db).length < 2) {
      console.log("choose account")
      await mainWindow.loadFile("./src/sign-up.html")
    } if (Object.keys(new_db).length >= 2) {
      console.log("create new account")
      await mainWindow.loadFile("./src/choose_account.html")
      event.sender.send("choose_acc", new_db)
    }
  })

  // * Add account
  ipc.on("add_account", (event, confirmation) => {
    console.log(Object.keys(users_db_object))
    if (confirmation === true) {
      mainWindow.loadFile(signUp_page)
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile(start_page)

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}



// initialization and is ready to create browser windows.
app.whenReady().then(() => {

  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ! Connect to server immediately app starts
app.on("will-finish-launching", () => {
  console.log(users_db_object)

  

})


// ! Allowing user to choos image to send to chat
ipc.on("open-file", async (event) => {
  let file = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"], filters: { extensions: ["*"], name: "All files" } })
  let result = mime.lookup(file["filePaths"][0])
  let file_info = { "path": file["filePaths"][0], "data_abt_file": result }
  if (file["canceled"] === false){
    if (file_info.data_abt_file.includes("audio")){
      await fs.readFile(file.filePaths[0], async (err, data) => {
        let tags = await mutag.fetch(data)
        //get all tags
        file_info["cover"] = tags["APIC"]
        let name = await crypto.randomUUID()
        file_info["albumCover"] = name+".jpg"
        await fs.writeFile(homeDir + "\\.pager\\resources\\albumCovers\\"+name+".jpg", file_info["cover"], (err) => {
          if (err) throw err;
          console.log(`Saved ${name}.jpg`);
        });
        event.sender.send("file-chosen", file_info)
        console.log(typeof file_info)

        

      });
    } else {
      event.sender.send("file-chosen", file_info)
      console.log(typeof file_info)

    }
  }
  

})


// ! Allowing the user to choose a profile picture
ipc.on("choose_profile_pic", async (event) => {

  const files = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"], filters: { extensions: ["png", "jpg"], name: "Image" } })

  if (files['filePaths'].length > 0) {
    event.sender.send("change_picture", files["filePaths"][0])
  }
})

// * THIS DISPLAYS MESSAGES TO A USER THE CODE DEPENDS ON THE MESSAGE EVERY MESSAGE HAS A SPECIAL CODE
// * REFER TO `message_codes.json` for more info
ipc.on("show_message_to_user", async (event, code) => {
  let warning_message_detail = ""

  warning_messageBox_options = {
    type: "warning",
    buttons: ["Ok"],
    message: "One required field is empty",
    detail: warning_message_detail,
  };
  if (code === 50) {
    warning_message_detail = "Username is incorrect";
    await dialog.showMessageBox(null, warning_messageBox_options);
  }
  if (code === 101) {
    warning_message_detail = "This is an incorrect email";
    await dialog.showMessageBox(null, warning_messageBox_options);
  }

  if (code === 105) {
    warning_message_detail = "This password is not strong";
    await dialog.showMessageBox(null, warning_messageBox_options);
  }
})


// Registration
/// Sending registration details
ipc.on("reg-user", (event, details) => {

  // xhr.open('POST', "http://127.0.0.1:8000/register_user");
  // xhr.setRequestHeader('Content-Type', 'application/json');


  // xhr.onload = function() {
  //   console.log("Request complete")
  //   if (xhr.status === 200) {
  //     console.log(xhr.responseText);
  //   } else {
  //     console.log('Error:', xhr.statusText);
  //   }
  // };

  // xhr.onerror = function() {
  //   console.log("Network error,Please try again")
  // }
  // xhr.send(JSON.stringify(details));
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(details)
  };

  fetch('http://127.0.0.1:8000/register_user', options)
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));



  // console.log(details,"sending details to server")
  // socket_functions.send_registration_details(details)

  // socket_functions.socket.on("reg_details_recieved", (account_info) => {
  //   event.sender.send("reg_details_recieved", account_info)
  // })
})

///Sending verification code
ipc.on("send_verification_code", (event, code) => {
  code = JSON.parse(code)
  socket_functions.send_verification_code(code)
  socket_functions.socket.on("verification_success", (results) => {
    event.sender.send("verification_success", results)
  })
})

///Restarting app after sign up(It also saves the new account)
ipc.on("sign-up-complete", async (event, param) => {
  console.log(param)
  if (Object.keys(users_db_object).length === 0) {

    data = {}
    param["account_database"] = param["_id"]["$oid"]
    data["active"] = param["_id"]["$oid"]
    data[param["_id"]["$oid"]] = param

    data = safe_storage.encryptString(JSON.stringify(data))
    console.log(data)

    await local_db_io.save_new_user(data)
    await local_db_io.create_user_database(param["_id"]["$oid"])

  } else {
    /// When user is adding an account
    param["account_database"] = param["_id"]["$oid"]
    users_db_object["active"] = param["_id"]["$oid"]
    users_db_object[param["_id"]["$oid"]] = param

    await local_db_io.save_new_user(safe_storage.encryptString(JSON.stringify(users_db_object)))
    await local_db_io.create_user_database(param["_id"]["$oid"])
    console.log("have data")
  }

  app.relaunch()
  app.quit()
})


//Signing IN
ipc.on("sign-in", (event, detatls) => {
  socket_functions.send_sign_in_details(detatls)
  socket_functions.socket.on("sign-check-complete", (response) => {
    if (response != false) {
      event.sender.send("sign-details-correct", response)
    }
  })
})

// Adding contact
/// Processing add contact signal
ipc.on("verify_contact", (event, contact_details) => {

  /// Sending contact detail to server for verification
  contact_details = JSON.parse(contact_details)
  socket_functions.verify_contact_details(contact_details)

  /// Recieving verification reponse
  socket_functions.socket.on("verify_acc_contact", (contact_info) => {
    if (typeof contact_info === "object") {
      active_user_db_object[contact_info["user_saving_name"]] = { "name": contact_info["name"], "email": contact_info["email"], "last_seen": contact_info["last_seen"], "profile_picture": contact_info["profile_pic"] }
      console.log(active_user_db_object)
      event.sender.send("contact_exists", contact_info)
    }
  })
})

ipc.on("save_contact", async (event, contact_data) => {
  const contact = JSON.parse(contact_data)

  if (Object.keys(active_user_db_object).includes("unsaved")) {
    active_user_db_object[contact["user_saving_name"]] = { "type": "contact", "name": contact["name"], "email": contact["email"], "last_seen": contact["last_seen"], "profile_picture": contact["profile_picture"], "unsaved": true }

    local_db_io.save_contact(users_db_object["active"], safe_storage.encryptString(JSON.stringify(active_user_db_object)))
  } else {

    active_user_db_object[contact["user_saving_name"]] = { "type": "contact", "name": contact["name"], "email": contact["email"], "last_seen": contact["last_seen"], "profile_picture": contact["profile_pic"] }


    local_db_io.save_contact(users_db_object["active"], safe_storage.encryptString(JSON.stringify(active_user_db_object)))
  }
})

ipc.on("save_contact_in_runtime", (event, db) => {
  active_user_db_object[db["name"]] = { "type": "contact", "name": db["name"], "email": db["email"], "last_seen": db["last_seen"], "profile_picture": db["profile_pic"] }
  local_db_io.save_contact(users_db_object["active"], safe_storage.encryptString(JSON.stringify(active_user_db_object)))

  ipc.on("save_message_new_contact", (event, name, message) => {


    active_user_db_object[name]["messages"] = [message]

    event.sender.send("update_db", active_user_db_object)
    db_to_save = safe_storage.encryptString(JSON.stringify(active_user_db_object))
    local_db_io.save_contact(users_db_object["active"], db_to_save)
  })

})


/// Sending Message
ipc.on("send_text_message", (event, message) => {
  socket_functions.send_text_message(message)

  /// Saving the message
  if (Object.keys(active_user_db_object[message["name"]]).includes("messages")) {
    active_user_db_object[message["name"]]["messages"].push(message)
  } else {
    active_user_db_object[message["name"]]["messages"] = [message]
  }
  db_to_save = safe_storage.encryptString(JSON.stringify(active_user_db_object))
  local_db_io.save_contact(users_db_object["active"], db_to_save)


})



/// Log in
ipc.on("log_in_to_account", async (event, db) => {
  db = JSON.parse(db)
  console.log(db)

  await local_db_io.save_new_user(safe_storage.encryptString(JSON.stringify(db)))
  app.relaunch()
  app.quit()
})

ipc.on("get_info", (event, filter) => {
  console.log("Getting info ",filter)
  socket_functions.getInfo(JSON.parse(filter))
  socket_functions.socket.on("verify_acc", (info) => {
    info["profile_picture"] = info["profile_pic"]
    info["type"] = "contact"
    event.sender.send("info_received", info)
  })
})


ipc.on("create-clique", (event, clique_obj) => {
  socket_functions.send_clique_info_to_create(clique_obj)
  socket_functions.socket.on("creation-done", (obj) => {
    console.log(obj)
    active_user_db_object[obj["link"]] = { "type": "clique", "name": obj["name"], "link": obj["link"], "description": obj["about"], "profile_picture": obj["profile_pic"], "admins": obj["admins"], "members": obj["members"], "settings": obj["settings"] }

    local_db_io.save_contact(users_db_object["active"], safe_storage.encryptString(JSON.stringify(active_user_db_object)))
  })
})

ipc.on("audio-recording", (event, audio_chunks, id) => {
  local_db_io.save_audio_message(audio_chunks, id)
  console.log(audio_chunks)
})

// Tells the server to add me to the rooms of the cliques i have joined
ipc.on("enter_clique_rooms", (event, list_of_cliques) => {
  //`list_of_cliques` is the list of all the names of cliques i have joined
  socket_functions.enter_clique_rooms(list_of_cliques)
})


ipc.on("send-media", (event, data) => {

  socket_functions.send_media(data)

  /// Saving the message
  if ("messages" in active_user_db_object[data["name"]]) {
    active_user_db_object[data["name"]]["messages"].push(data)
  } else {
    active_user_db_object[data["name"]]["messages"] = [data]
  }
  db_to_save = safe_storage.encryptString(JSON.stringify(active_user_db_object))
  local_db_io.save_contact(users_db_object["active"], db_to_save)

})

ipc.on("send_clique_message", (event, clique_message) => {
  socket_functions.send_clique_message(clique_message)
})

ipc.on("send-ice-cand", (event, data) => {
  console.log("ice")
  socket_functions.send_ice_cand(JSON.parse(data))

})


ipc.on("send-offer", (event, offer) => {
  socket_functions.send_offer(JSON.parse(offer))

  socket_functions.socket.on("rtc-answer", (offer) => {
    console.log("Offer answer has come in")
    event.sender.send("rtc-answer", offer)
  })
})



ipc.on("answer", (event, answer) => {
  socket_functions.send_answer(answer)
})

ipc.on("start_audioCall",(event, audioCall) => {
  socket_functions.start_audioCall(audioCall)

  socket_functions.socket.on("audioCallStarted",(call_room)=>{
    event.sender.send("continue_with_audioCall",call_room)
  })
})



// ipc.on("voice_call_audio_data",(event, voice_call_data)=>{
//   voice_call_data = json.parse(voice_call_data)

//   socket_functions.socket.on("recieve_call_data",(data)=>{
//     event.sender.send("recieve_call_data",data);
//   })
// })