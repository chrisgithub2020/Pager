/// Main process of the application
// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')

const ipc = require("electron").ipcMain
const dialog = require("electron").dialog

// Custom modules
const socket_functions = require("./socket_io")
const local_db_io = require("./write_to_json")

// Loadiing and decrypting Database
const safe_storage = require("electron").safeStorage
const fs = require("fs")
var users_db_object = {}
var active_user_db_object = {}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 1000,
    webPreferences: {
      // preload: "./renderer.js",
      enableremotemodule: true,
      nodeIntegration: true,
      contextIsolation: false,
    }
  })


  var start_page = "./src/loading.html"
  var main_page = "./src/index.html"
  var signUp_page = "./src/sign-up.html"


  // When loading is Completed
  ipc.on("database-loaded", (event, db) => {
    users_db_object = JSON.parse(safe_storage.decryptString(db))
    // users_db_object = db


    // Sending request to change online status
    socket_functions.change_online_status(users_db_object)


    event.sender.send("db_decrypted", users_db_object)

    // * Loading the index the html page when there is an account
    ipc.on("ready-to-go", async (event, direction) => {
      await mainWindow.loadFile(main_page)
      console.log(typeof direction)
      if (typeof (direction) === "string") {
        event.sender.send("no-contact", true)


        /// ! Recieving messages
        socket_functions.socket.on("receive_message", (msg) => {
          console.log('this message', msg, 'has been recieved')

          event.sender.send("message", msg)
        })

      } else {
        active_user_db_object = JSON.parse(safe_storage.decryptString(direction))
        event.sender.send("add_contact_card", active_user_db_object)


        /// ! Recieving messages
        socket_functions.socket.on("receive_message", (msg) => {
          console.log('this message', msg, 'has been recieved')

          event.sender.send("message", msg)
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
app.on("will-finish-launching", (event) => {
  socket_functions.connect_to_server(users_db_object)
  socket_functions.socket.on("receive_txt_message", async (blah, msg) => {
    console.log(blah, msg)

  })


})

// ! Allowing the user to choose a profile picture
ipc.on("choose_profile_pic", async (event) => {

  const files = await dialog.showOpenDialog({ properties: ["openFile"] })
  console.log(files["filePaths"])

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
ipc.on("reg-user", async (event, details) => {
  console.log(details)
  socket_functions.send_registration_details(details)
  socket_functions.socket.on("reg_details_recieved", (account_info) => {
    event.sender.send("reg_details_recieved", account_info)
  })
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
ipc.on("sign-up-complete", (event, param) => {
  param = JSON.parse(param)
  if (Object.keys(users_db_object).length === 0) {

    data = {}
    param["account_database"] = param["_id"]["$oid"]
    data["active"] = param["_id"]["$oid"]
    data[param["_id"]["$oid"]] = param

    data = JSON.stringify(data)
    data = safe_storage.encryptString(data)

    local_db_io.save_new_user(data)
    local_db_io.create_user_database(param["_id"]["$oid"])

  } else {
    /// When user is adding an account
    param["account_database"] = param["_id"]["$oid"]
    users_db_object["active"] = param["_id"]["$oid"]
    users_db_object[param["_id"]["$oid"]] = param

    local_db_io.save_new_user(safe_storage.encryptString(JSON.stringify(users_db_object)))
    local_db_io.create_user_database(param["_id"]["$oid"])
  }

  app.relaunch()
  app.quit()
})


//Signing IN
ipc.on("sign-in", (event, detatls) => {
  console.log(detatls)
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
  socket_functions.socket.on("save_contact_details", (contact_info) => {
    if (typeof contact_info === "object") {
      active_user_db_object[contact_info[0]["user_saving_name"]] = { "name": contact_info[0]["name"], "email": contact_info[0]["email"], "last_seen": contact_info[0]["last_seen"], "profile_picture": contact_info[0]["profile_picture"] }
      event.sender.send("contact_exists", contact_info)
      event.sender.send("unknown_contact_exists", contact_info)
    }
  })
})

ipc.on("save_contact", async (event, contact) => {
  contact = contact[0]
  

  active_user_db_object[contact["user_saving_name"]] = { "name": contact["name"], "email": contact["email"], "last_seen": contact["last_seen"], "profile_picture": contact["profile_picture"] }

  local_db_io.save_contact(users_db_object["active"], safe_storage.encryptString(JSON.stringify(active_user_db_object)))
})


/// Sending Message
ipc.on("send_text_message", async (event, message) => {
  console.log(message)
  message = JSON.parse(message)
  socket_functions.send_text_message(message)

  /// Saving the message
  if ("messages" in active_user_db_object[message["name"]]) {
    active_user_db_object[message["name"]]["messages"].push(message)
  } else {
    active_user_db_object[message["name"]]["messages"] = [message]
  }
  db_to_save = safe_storage.encryptString(JSON.stringify(active_user_db_object))
  await local_db_io.save_contact(users_db_object["active"], db_to_save)


})



/// Log in
ipc.on("log_in_to_account", async (event, db) => {
  db = JSON.parse(db)
  console.log(db)

  await local_db_io.save_new_user(safe_storage.encryptString(JSON.stringify(db)))
  app.relaunch()
  app.quit()
})

