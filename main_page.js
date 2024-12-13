const ipc = require("electron").ipcRenderer;
const DesktopCapture = require("electron").desktopCapturer;
const crypto = require("crypto");
const { desktopCapturer } = require("electron");
const fs = require("fs");
// const constants = require("./constants.js")
const path = require("path");
const http = require("http");
const os = require("os");
// const {Config} = require("./config.js")
const homeDir = os.homedir();
const {
  LocalFileData,
  getFileObjectFromLocalPath,
} = require("get-file-object-from-local-path");
const allow_member_to_send_msg_checkBox = document.getElementById(
  "allow-members-send-message"
);
const allow_only_admins_to_send_msg_checkBox = document.getElementById(
  "allow-only-admins-send-message"
);
const allow_only_admins_to_change_profile_pic = document.getElementById(
  "allow-only-admins-change-profile-pic"
);
const allow_members_to_change_profile_pic = document.getElementById(
  "allow-members-change-profile-pic"
);
const audio_for_call_element = document.getElementById("callRemoteStreamAudio");
let send_audio_message_play_pause = null;
let audio_playing = false;
let clique_list = []; // List of all cliques in db
const go_back_btns = document.getElementsByClassName("go-back");
var localStream = null;
var remoteStream = null;
var call_ongoing = false;
let layout = document.getElementById(".");
var ICE_Candidate = null;

//When a user clicks a chat and want to start communicating
let chat_to_perform_action = null;
var no_contact = false;

// const PeerJs = new Peer()

// Calling
const stun_server = {
  iceCandidatePoolSize: 10,
};

const setServer = async () => {
  const response = await fetch(
    "https://pager-turn.metered.live/api/v1/turn/credentials?apiKey=dd6b2d9cb3ce9160addbf47f9017e320e1ed"
  );
  const iceServers = await response.json();
  stun_server.iceServers = iceServers;
};
setServer();
// var pc = null;

const Config = {
  HOST_URL: `https://9c08-154-161-146-6.ngrok-free.app`,
};

// var message = { "uuid": crypto.randomUUID(), "time": Date(), "type": "txt", "message": document.getElementById("message-area").value, "from": user_obj[user_obj["active"]]["email"], "to": "", "name": panel_name }
function TextMessage(
  type = "txt",
  uuid = crypto.randomUUID(),
  time = Date(),
  message,
  from = user_obj[user_obj["active"]]["email"],
  to,
  name
) {
  this.uuid = uuid;
  this.time = time;
  this.type = type;
  this.message = message;
  this.from = from;
  this.to = to;
  this.name = name;
}
// var message = { "uuid": crypto.randomUUID(), "time": Date(), "type": "txt", "path": '', "from": user_obj[user_obj["active"]]["email"], "to": account_db[panel_name]["email"], "name": panel_name }
function MediaMessage(
  type,
  uuid = crypto.randomUUID(),
  time = Date(),
  from = user_obj[user_obj["active"]]["email"],
  to,
  name,
  path,
  mediaURL,
  albumCover = "music.png"
) {
  this.uuid = uuid;
  this.time = time;
  this.type = type;
  this.path = path;
  this.from = from;
  this.to = to;
  this.name = name;
  this.mediaURL = mediaURL;
  this.albumCover = albumCover;
}

const Call = {
  pc: new RTCPeerConnection(stun_server),
  calltype: null,
  localStream: null,
  remoteStream: null,
  constraint: null,
  callee_email: null,

  start: () => {
    console.log("Call starting");

    if (Call.calltype === "audio") {
      Call.constraint = { audio: true, video: false };
    } else if (Call.calltype === "video") {
      Call.constraint = { audio: true, video: true };
    }
    return navigator.mediaDevices
      .getUserMedia(Call.constraint)
      .then((stream) => {
        Call.localStream = stream;
        Call.remoteStream = new MediaStream();

        if (Call.calltype === "video"){
          document.getElementById("localStream-video").srcObject = stream
        }

        stream.getTracks().forEach((track) => {
          Call.pc.addTrack(track, stream);
        });
      })
      .then(() => {
        Call.initiate_connection();
      });
  },

  initiate_connection: async () => {
    console.log("Initiating Call");
    var offerOptions = null;
    if (Call.calltype == "audio") {
      offerOptions = {
        offerToReceiveAudio: true, // Request to receive audio from the remote peer
        offerToReceiveVideo: false, // Do not request to receive video
      };
    } else {
      offerOptions = {
        offerToReceiveAudio: true, // Request to receive audio from the remote peer
        offerToReceiveVideo: true, // Do not request to receive video
      };
    }
    console.log(offerOptions, "my offer");

    const offer = await Call.pc.createOffer(offerOptions);
    Call.pc.setLocalDescription(offer);

    const offer_obj = {
      offer: offer,
      email: Call.callee_email,
      calltype: Call.calltype,
      sid: "gTRy8fTbQP3Vmh5bAAB8",
    };

    ipc.send("send-offer", JSON.stringify(offer_obj));

    ipc.on("rtc-answer", (event, answer) => {
      Call.pc.setRemoteDescription(answer["answer"]);
      if (ICE_Candidate) {
        Call.pc.addIceCandidate(new RTCIceCandidate(ICE_Candidate));
      }
    });

    const dataChannel = Call.pc.createDataChannel()
    document.getElementById("answer-end-call").addEventListener("click", (event, answer) => {
      if (call_ongoing){
        dataChannel.send("im done")
      }
    })
    dataChannel.addEventListener("message", (event) => {
      const message = event.data
      console.log("data channel message ", message)
      // call_ongoing = false;
    })
  },
};

Call.pc.ondatachannel((event) => {
  const dataChannel = event.channel

  dataChannel.onopen(() => {
    console.log("opened")
  })

  dataChannel.onmessage = (event) => {
    console.log("message ", event.data)
  }
})

ipc.on("rtc-offer", async (event, offer) => {
  if (panel_visibility != true) {
    show_send_message_panel(contact_email_and_saved_name[offer["email"]]);
  }
  Call.callee_email = offer["email"];
  Call.calltype = offer.calltype;
  const answer_end_call_button = document.getElementById("answer-end-call")
  answer_end_call_button.style.background = "#6fbf79"

  $("#chat").hide();
  $("#call").show();
  if (offer.calltype === "audio") {
    Call.constraint = { audio: true, video: false };
  } else if (offer.calltype === "video") {
    Call.constraint = { audio: true, video: true };
  }
  
  answer_end_call_button
    .addEventListener("click", (event) => {
      return navigator.mediaDevices
        .getUserMedia(Call.constraint)
        .then((stream) => {
          Call.localStream = stream;
          Call.remoteStream = new MediaStream();

          if (Call.calltype === "video"){
            document.getElementById("localStream-video").srcObject = stream
          }

          stream.getTracks().forEach((track) => {
            Call.pc.addTrack(track, stream);
          });
        })
        .then(async () => {
          if (!call_ongoing) {
            Call.pc.setRemoteDescription(offer["offer"]);
            Call.pc.addIceCandidate(new RTCIceCandidate(ICE_Candidate));
            let answer = await Call.pc.createAnswer();
            Call.pc.setLocalDescription(answer);
            let ans = {
              sdp: answer.sdp,
              type: answer.type,
            };
            let sendAnswer = { answer: ans, email: offer["email"] };
            ipc.send("answer", sendAnswer);
            answer_end_call_button.style.background = "#e05b5d"
          } else {
            Call.pc.close();
            call_ongoing == false;
          }
        });
    });
});

Call.pc.ontrack = (event) => {
  console.log("caller", event);
  if (Call.calltype === "audio") {
    audio_for_call_element.srcObject = event.streams[0];
  } else {
    document.getElementById("remoteStream-video").srcObject = event.streams[0]
  }
};

Call.pc.addEventListener("iceconnectionstatechange", () => {
  console.log(Call.pc.iceConnectionState);
});


Call.pc.onicecandidate = (event) => {
  if (event.candidate) {
    const cand_data = {
      cand: event.candidate,
      email: Call.callee_email,
    };
    ipc.send("send-ice-cand", JSON.stringify(cand_data));
  }
};

const handleIceCand = () => {
  switch (Call.pc.iceGatheringState) {
    case "new":
      console.log("new");
    case "complete":
      break;
    case "gathering":
      break;
  }
};

ipc.on("icecandidate", (event, candidate) => {
  ICE_Candidate = candidate;
  console.log("ice recieved", candidate);
  if (Call.pc.remoteDescription) {
    Call.pc.addIceCandidate(candidate);
  }
});

var recording_audio = false;
var voice_callBTN;
let voice_call_media;
var video_callBTN;

var incomingCall;

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var turnReady;

// Switching between audio and send message button
var buttons_container = "";
var timeout_id = 0;

var show_attachment_menu = false;

var send_message_btn = document.createElement("button");
send_message_btn.setAttribute("id", "send-message");
send_message_btn.setAttribute("class", "btn send");
send_message_btn.setAttribute("type", "button");
send_message_btn.innerHTML = `<i class="material-icons">send</i>`;
var send_audio_btn = "";

//Gallery
const gallery_div = document.getElementById("gallery-div");

/// Displaying html
var contacts_container = document.getElementById("contacts-container");
var contact_container_for_clique_members_choosing = document.getElementById(
  "contacts-container-for-clique"
);
var settings_profile_photo = document.getElementsByClassName(
  "settings-profile-photo"
);

// Showing messages element
var show_message = "";

/// Account db
var account_db = {};
var user_obj = {};

/// Displaying accounts
var accounts_card_collapsible = document.getElementById(
  "show-accounts-collapsible"
);

/// Received Messages
var unread_msg = {};
var last_recieved_message = "";
var panel_visibility = {};
var message_hint_element = {};

/// Displaying chat card
var chats_container = document.getElementById("chats");
var list_chat = document.getElementById("list-chat");
var verify_displayed_chat_card_email_list = []; //! contains list of emails of contacts that are displayed as recent chats,used to verify message from contact
var contact_email_and_saved_name = {}; // contains the email of every contact mapping to the saved name. Used to verify if that contact has a messages field in DB

/// *  Adding Contact variables
var add_contact_fields = document.querySelectorAll(
  "#participant, #contactName, #message"
);
var add_contact_button_html =
  "<button onclick='save_contact()' type='button' class='btn button w-100' id='create-contact-button'>Add Contact</button>";
var verify_contact_button = document.getElementById("verify-contact-button");
var contact_avatar = document.getElementsByClassName("contacts-avatar");
let add_contact_obj = {};

// * Creating new clique
var new_clique_fields = document.querySelectorAll(
  "#cliqueName, #cliqueLink, #cliqueAbout"
);
var creating_clique_members = [];

// When a user clicks a contact and wants to perform an action on the contact
let contact_to_perform_action = ""; // ! the name of a comtact as saved
document
  .getElementById("message-contact")
  .addEventListener("click", start_messaging_from_contacts);

// Log Out
document.getElementById("log-out").addEventListener("click", () => {
  user_obj["active"] = "";
  console.log(user_obj["active"]);
  ipc.send("log-out", JSON.stringify(user_obj));
});

// * Showing create contact modal if user has no contact
ipc.on("no-contact", (event) => {
  console.log("no-contact");
  no_contact = true;
  $("#startnewchat").modal("show");
});

// Update db in runtime if an changes occurs in main process
ipc.on("update_db", (event, db) => {
  account_db = db;
});

/// Alerts the main process to send the user info
ipc.send("send_user_info", true);

//Incoming call
ipc.on("incoming_call", (event, call_id, call_accessories) => {});
// ! Message area context menu
var msg_area_context_menu = document.createElement("div");
msg_area_context_menu.setAttribute("id", "msg-area-context-menu");
msg_area_context_menu.setAttribute("class", "context-menu");

const msg_area_context_menu_content = `<div class="item">Undo</div>
                                       <div class="item item-break">Redo</div>
                                       
                                       <div class="item">Copy</div>
                                       <div class="item">Copy</div>
                                       <div class="item">Paste</div>
                                       <div class="item">Delete</div>
                                       <div class="item item item-break">Select All</div>
                                       
                                       <div class="item">Formatting</div>
                                       <div class="item">Grammar Check</div>
                                       `;

msg_area_context_menu.innerHTML = msg_area_context_menu_content;
// ! *******************************************************

// ! Message context menu
var msg_context_menu = document.createElement("div");
msg_context_menu.setAttribute("id", "msg-context-menu");
msg_context_menu.setAttribute("class", "context-menu");

const msg_context_menu_content = `<div class="item">reply</div>
                                  <div class="item">copy</div>
                                  <div class="item">paste</div>`;

msg_context_menu.innerHTML = msg_context_menu_content;
// ! ***************************************************

// ! Emojis container
var emoji_container = document.createElement("div");
emoji_container.setAttribute("id", "emoji-container");
const emoji_container_content = `<div id="emoji-top">
                                    <div class="idea"></div>
                                    <div id="emoji-tabs">
                                        <button class="btn emoji-tab-button">Emojis</button>
                                        <button class="btn emoji-tab-button">Stickers</button>
                                    </div>
                                </div>
                                <div class="tab-pane fade active show" id="emoji-div"></div>`;
emoji_container.innerHTML = emoji_container_content;
// ! *********************************************

const settings_go_back_btn = document.createElement("a");
settings_go_back_btn.setAttribute("class", "btn");
settings_go_back_btn.innerHTML = `<i class="material-icons">arrow_back</i>`;

const insert_go_back_btn = () => {
  document
    .getElementById(",,")
    .insertAdjacentElement("afterbegin", settings_go_back_btn);
};
settings_go_back_btn.addEventListener("click", (event) => {
  document.getElementById(
    "settingsModal"
  ).innerHTML = `<div class="modal-dialog modal-dialog-centered" role="figure">
                                                                <div class="requests tab-content">
                                                                    <div class="tab-pane fade active show" id="mainSettingsPage">
                                                                        <div class="title">
                                                                            <h1>Settings</h1>
                                                                            <div id="settings-toolbar">
                                                                                <div class="dropdown">
                                                                                    <button type="button" class="btn more-account-options" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="material-icons">more_vert</i></button>
                                                                                    <div class="dropdown-menu dropdown-menu-right">
                                                                                        <button id="add-account" class="dropdown-item connect" name="1"><i class="material-icons">add</i>Add account</button>
                                                                                        <button id="log-out" class="dropdown-item connect" name="1"><i class="material-icons">exit_to_app</i>Log out</button>
                                                                                    </div>
                                                                                </div>
                                                                                <button type="button" class="btn" data-dismiss="modal" aria-label="Close"><i class="material-icons">close</i></button>

                                                                            </div>
                                                                        </div>
                                                                        <div class="search contacts-search">
                                                                            <form class="form-inline position-relative">
                                                                                <button type="button" class="btn btn-link loop contacts-search"><i class="material-icons">search</i></button>
                                                                                <input type="search" class="form-control" id="people" placeholder="Search for people...">
                                                                            </form>
                                                                        </div>
                                                                        <div class="settings-content">
                                                                            <div class="active-account">
                                                                                <img id="setting-profile-picture" src="dist/img/avatars/avatar-female-1.jpg" alt="" class="settings-profile-photo">
                                                                                <div id="active-account-name-and-status">
                                                                                    <h6 id="username">Username</h6>
                                                                                    <tbody>Online</tbody>
                                                                                </div>
                                                                            </div>
                                                                            <div class="settings-category">

                                                                                <a href="#editProfile" data-toggle="tab" class="btn setting-btn"><i class="material-icons setting-material-icon">info</i>Edit Profile</a>
                                                                                <a href="#notification" onclick="insert_go_back_btn()" data-toggle="tab" class="btn setting-btn"><i class="material-icons setting-material-icon">notifications_none</i>Notification</a>
                                                                                <a class="btn setting-btn"><i class="material-icons setting-material-icon">colorize</i>Appearance</a>
                                                                                <a class="btn setting-btn"><i class="material-icons setting-material-icon">chat_bubble_outline</i>Chat Settings</a>
                                                                                <a class="btn setting-btn"><i class="material-icons setting-material-icon">lock_outline</i>Privacy & Security</a>
                                                                            </div>
                                                                            <div class="settings-category no-bottom-border">
                                                                                <button class="btn setting-btn"><i class="material-icons setting-material-icon">help</i>Help</button>
                                                                                <button class="btn setting-btn"><i class="material-icons setting-material-icon">info</i>About</button>
                                                                            </div>
                                                                            
                                                                        </div>
                                                                    </div>
                                                                    <div class="tab-pane fade" id="editProfile">
                                                                        <div class="title">
                                                                            <h1>Edit Profile</h1>
                                                                            <button type="button" class="btn" data-dismiss="modal" aria-label="Close"><i class="material-icons">close</i></button>
                                                                        </div>
                                                                        <div class="set-profile-photo-area">
                                                                            <img src="dist/img/avatars/avatar-female-1.jpg" alt="Profile Photo" class="settings-profile-photo center-profile-photo">
                                                                            <button type="button" class="btn change-profile-photo" id="change-profile-photo-user">Change Profile Photo</button>									
                                                                        </div>
                                                                        <div class="edit-profile">
                                                                            <div class="edit-profile-option">
                                                                                <a href="" class="edit-profile-btn"><i class="material-icons edit-profile-material-icon">account_circle</i></a>
                                                                                <div id="edit-profile-name">
                                                                                    <h6>Username</h6>
                                                                                    <tbody>Name</tbody>
                                                                                </div>
                                                                            </div>
                                                                            <div class="edit-profile-option border-bottom">
                                                                                <a href="" class="edit-profile-btn"><i class="material-icons edit-profile-material-icon">account_circle</i></a>
                                                                                <div id="edit-profile-name">
                                                                                    <h6>Contact</h6>
                                                                                    <tbody>Phone or Email</tbody>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div class="tab-pane fade" id="notification">
                                                                        <div id=",," class="title">
                                                                            <h1>Notification</h1>
                                                                            <button type="button" class="btn" data-dismiss="modal" aria-label="Close"><i class="material-icons">close</i></button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>`;
});

/// Adding contact functions
function get_values() {
  $("#create-contact-button-div")
    .html(
      '<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Loading...'
    )
    .addClass("disabled");
  add_contact_fields.forEach((value, key, parent) => {
    let field_name = value.getAttribute("name");
    if (field_name === "participant") {
      const contact_email = value.value;
      add_contact_obj["email"] = contact_email;
    }

    if (field_name === "contactName") {
      const contact_name = value.value;
      add_contact_obj["name"] = contact_name;
    }

    if (field_name === "first_message") {
      const first_message = value.value;
      add_contact_obj["first_message"] = first_message;
      add_contact_obj["request_type"] = "add_contact";
    }
  });
  console.log(add_contact_obj);
  ipc.send("verify_contact", JSON.stringify(add_contact_obj));

  ipc.on("contact_exists", (event, contact) => {
    $("#create-contact-button-div").html(add_contact_button_html);
    add_contact_obj = contact;
    add_contact_obj["profile_picture"] = contact["profile_pic"];
  });
}

function save_contact() {
  console.log(JSON.stringify(add_contact_obj));
  add_contact_obj["type"] = "contact";
  $("#startnewchat").modal("hide");
  $("#create-contact-button-div")
    .html(
      '<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Loading...'
    )
    .addClass("disabled");
  ipc.send("save_contact", JSON.stringify(add_contact_obj));
  no_contact = false;
  update_utility_in_runtime(add_contact_obj);
}

verify_contact_button.addEventListener("click", get_values);

// * Uses the user info to display information about the user
ipc.on("user_info", (event, user_db) => {
  user_obj = user_db;
  console.log("user_info");

  const profile_pic = document.getElementById("profile_photo");
  const username = document.getElementById("username");
  const settings_profile_picture = document.getElementById(
    "setting-profile-picture"
  );
  if (user_db[user_db["active"]]["profile_pic"] != "") {
    profile_pic.src = `data:image/png;base64,${
      user_db[user_db["active"]]["profile_pic"]
    }`;
    settings_profile_picture.src = `data:image/png;base64,${
      user_db[user_db["active"]]["profile_pic"]
    }`;
    Array.from(settings_profile_photo).forEach((val, ind, arr) => {
      val.src = `data:image/png;base64,${
        user_db[user_db["active"]]["profile_pic"]
      }`;
    });
  } else {
    profile_pic.src = homeDir + "//.pager//resources//default_profile_pic.jpg";
    settings_profile_picture.src =
      homeDir + "//.pager//resources//default_profile_pic.jpg";
    Array.from(settings_profile_photo).forEach((val, ind, arr) => {
      val.src = homeDir + "//.pager//resources//default_profile_pic.jpg";
    });
  }
  username.innerText = user_db[user_db["active"]]["name"];
  document.getElementById("show-accounts-on-sidenav").innerText =
    user_db[user_db["active"]]["name"];

  db_keys = Object.keys(user_db);

  db_keys.forEach((value, index, array) => {
    if (value != "active") {
      let pic;
      if (user_db[value]["profile_pic"] === "") {
        pic = homeDir + "//.pager//resources//default_profile_pic.jpg";
      } else {
        pic = `data:image/png;base64,${user_db[value]["profile_pic"]}`;
      }
      var html_snippet = `<a style="border-top: 1px solid #1f2a35; text-align:left;" class="btn other-accounts" id="${user_db[value]["name"]}-acc-options">
                                    <span><img src="${pic}" alt="" id="log-account-pic"></span>
                                    ${user_db[value]["name"]}
                                </a>`;
      accounts_card_collapsible.insertAdjacentHTML("afterbegin", html_snippet);

      // document.getElementById(user_obj[value]["name"]).addEventListener("click",()=>{
      //     user_obj["active"] = value
      //     ipc.send("log_in_to_account",JSON.stringify(user_obj))
      // })
    }
  });
});

const update_utility_in_runtime = (obj) => {
  let image_path;
  var path_to_img = obj["profile_picture"];
  var contact_name = obj["user_saving_name"];

  if (path_to_img === "") {
    console.log("homedir");
    image_path = homeDir + "//.pager//resources//default_profile_pic.jpg";
  } else {
    image_path = `data:image/png;base64,${path_to_img}`;
  }

  var contact_card = `<a class='active-account contacts-avatar padding-y-7px' id="${contact_name}-contact-card" data-toggle="tab" href="#contactInfo">
                            <img src="${image_path}" alt="" class='settings-profile-photo' id="base64image">
                            <div id='active-account-name-and-status'>
                                <h6>${contact_name}</h6>
                                Online
                            </div>
                        </a>`;
  contacts_container.insertAdjacentHTML("afterend", contact_card);
  if (obj["type"] === "clique") {
    clique_list.push(obj["name"]);
    // Alerts the main process to tell the server to add me to the rooms of the cliques i have joined
    ipc.send("enter_clique_rooms", clique_list);
  }
  document
    .getElementById(`${contact_name}-contact-card`)
    .addEventListener("click", () => {
      contact_to_perform_action = contact_name;
      contact_pic.src = `data:image/png;base64,${account_db[contact_to_perform_action]["profile_picture"]}`;
    });
};

ipc.on("added_to_clique", (event, clique_data) => {
  console.log(clique_data, "this is the clique data");
  insert_chat_card(clique_data["name"], "You were added");
});

/// Adds the contact card (html)
/// Also add chat card
ipc.on("display_utility_on_startup", async (event, data) => {
  console.log(account_db);

  contacts = data["db"];
  account_db = contacts;
  emoji_container.lastChild.innerHTML = data["emoji"];

  const keys = Object.keys(contacts);
  const contacts_container_children = contacts_container.children;
  if (contacts_container_children.length === 0) {
    keys.forEach((value, index, number) => {
      if (contacts[value]["type"] === "contact") {
        var path_to_img = contacts[value]["profile_picture"];
        var contact_name = value;
        let image_path;
        if (path_to_img === "") {
          console.log("homedir");
          image_path = homeDir + "//.pager//resources//default_profile_pic.jpg";
        } else {
          image_path = `data:image/png;base64,${path_to_img}`;
        }
        var contact_card = `<a class='active-account contacts-avatar padding-y-7px' id="${contact_name}-contact-card" data-toggle="tab" href="#contactInfo">
                                        <img src="${image_path}" alt="" class='settings-profile-photo' id="base64image">
                                        <div id='active-account-name-and-status'>
                                            <h6>${contact_name}</h6>
                                            Online
                                        </div>
                                    </a>`;
        contacts_container.insertAdjacentHTML("afterend", contact_card);
        contact_email_and_saved_name[account_db[value]["email"]] = value;
        if (contacts[value]["type"] === "clique") {
          clique_list.push(value);
        }
        document
          .getElementById(`${contact_name}-contact-card`)
          .addEventListener("click", () => {
            contact_to_perform_action = contact_name;
            contact_pic.src = `data:image/png;base64,${account_db[contact_to_perform_action]["profile_picture"]}`;
          });
      }
    });

    // Alerts the main process to tell the server to add me to the rooms of the cliques i have joined
    ipc.send("enter_clique_rooms", clique_list);
  }
  if (chats_container.children.length === 0) {
    keys.forEach((value, index, number) => {
      console.log(contacts[value]);
      if (contacts[value]["type"] === "clique") {
        clique_list.push(contacts[value]["name"]);

        if ("messages" in account_db[value]) {
          insert_chat_card(
            value,
            account_db[value]["messages"][
              account_db[value]["messages"].length - 1
            ]
          );
        } else {
          insert_chat_card(value, { message: "You were added" });
        }
      } else if (contacts[value]["type"] === "contact") {
        if ("messages" in contacts[value]) {
          if (contacts[value]["messages"].length > 0) {
            insert_chat_card(
              value,
              account_db[value]["messages"][
                account_db[value]["messages"].length - 1
              ]["message"]
            );
          }
        }
      }
    });
  }

  const contact_container_for_clique_members_choosing_children =
    contact_container_for_clique_members_choosing.children;
  if (contact_container_for_clique_members_choosing_children.length === 0) {
    keys.forEach((value, index, number) => {
      var path_to_img = contacts[value]["profile_picture"];
      var contact_name = value;
      var image_path = `data:image/png;base64,${path_to_img}`;
      var contact_card = `<a class='active-account contacts-avatar padding-y-7px' id="${contact_name}-clique-contact-card" data-toggle="tab" href="#contactInfo">
                                    <img src="${image_path}" alt="" class='settings-profile-photo' id="base64image">
                                    <div id='active-account-name-and-status'>
                                        <h6>${contact_name}</h6>
                                        Online
                                    </div>
                                </a>`;
      contact_container_for_clique_members_choosing.insertAdjacentHTML(
        "beforeend",
        contact_card
      );
      document
        .getElementById(`${contact_name}-clique-contact-card`)
        .addEventListener("click", () => {
          const show_selected_contacts = document.getElementById(
            "show-chosen-contacts"
          );
          var contact_display_html = `<div class="chosen-contact">
                                                <span class="close-badge"><i class="material-icons">close</i></span>
                                                <img src="${image_path}" alt="" class='settings-profile-photo chosen-contact-profile-photo'>
                                            </div>`;
          creating_clique_members.push(account_db[contact_name]["email"]);
          show_selected_contacts.insertAdjacentHTML(
            "beforeend",
            contact_display_html
          );
        });
    });
  }
});

function start_messaging_from_contacts() {
  if (verify_displayed_chat_card_email_list.length > 0) {
    verify_displayed_chat_card_email_list.forEach((v, n, a) => {
      if (v === account_db[contact_to_perform_action]["email"]) {
        show_send_message_panel(contact_to_perform_action);
      } else {
        if ("messages" in account_db[contact_to_perform_action]) {
          insert_chat_card(
            contact_to_perform_action,
            account_db[contact_to_perform_action]["messages"][
              account_db[contact_to_perform_action]["messages"].length - 1
            ]
          );
        } else {
          insert_chat_card(contact_to_perform_action, "");
        }
        show_send_message_panel(contact_to_perform_action);
      }
    });
  } else {
    if ("messages" in account_db[contact_to_perform_action]) {
      insert_chat_card(
        contact_to_perform_action,
        account_db[contact_to_perform_action]["messages"][
          account_db[contact_to_perform_action]["messages"].length - 1
        ]
      );
    } else {
      insert_chat_card(contact_to_perform_action, "");
    }
    show_send_message_panel(contact_to_perform_action);
  }
}

// Add account
document.getElementById("add-account").addEventListener("click", () => {
  ipc.send("add_account", true);
});

// ! Whenever a messag is received
ipc.on("message", (event, msg) => {
  if (no_contact) {
    if (msg["from"] in unread_msg) {
      unread_msg[msg["from"]].push(msg);
    } else {
      unread_msg[msg["from"]] = [msg];
    }

    /// Getting details of unknown contact
    info = JSON.stringify({
      email: msg["from"],
      request_type: "message_from_unknown_source",
    });
    ipc.send("get_info", info);

    ipc.on("info_received", (event, db) => {
      console.log("original db ", db);

      account_db[db["name"]] = db;
      contact_email_and_saved_name[db["email"]] = db["name"];

      ipc.send("save_contact_in_runtime", db);
      db["user_saving_name"] = db["name"];

      ipc.send("save_message_new_contact", db["name"], msg); // uses this because by the time the request is sent to the main save message the contact is not saved yet
      no_contact = false;

      update_utility_in_runtime(db);
      if (!verify_displayed_chat_card_email_list.includes(msg["from"])) {
        insert_chat_card(db["name"], msg["message"]);
        verify_displayed_chat_card_email_list.push(msg["from"]);
      }
    });
  } else {
    if (
      !account_db[contact_email_and_saved_name[msg["from"]]] &&
      !account_db[contact_email_and_saved_name[msg["to"]]]
    ) {
      // Meaning contact does not exist

      /// Getting details of unknown contact
      info = JSON.stringify({
        email: msg["from"],
        request_type: "message_from_unknown_source",
      });
      ipc.send("get_info", info);

      ipc.on("info_received", (event, db) => {
        account_db[db["name"]] = db;
        contact_email_and_saved_name[db["email"]] = db["name"];

        ipc.send("save_contact_in_runtime", db);
        db["user_saving_name"] = db["name"];

        ipc.send("save_message_new_contact", db["name"], msg); // uses this because by the time the request is sent to the main save message the contact is not saved yet
        no_contact = false;

        update_utility_in_runtime(db);
        if (!verify_displayed_chat_card_email_list.includes(msg["from"])) {
          insert_chat_card(db["name"], msg["message"]);
          verify_displayed_chat_card_email_list.push(msg["from"]);
        }
      });
    }

    // * displaying a message when a message is received from the the chat if not from the chat it is stored in the unread messages
    // Checking whether it openend
    if (panel_visibility["visibility"] === true) {
      // Checking whether the message received is from the chat
      if (
        panel_visibility["panel_name"] ===
        contact_email_and_saved_name[msg["from"]]
      ) {
        if (
          "messages" in account_db[contact_email_and_saved_name[msg["from"]]]
        ) {
          msg["read"] = true;

          account_db[contact_email_and_saved_name[msg["from"]]][
            "messages"
          ].push(msg);
          console.log(account_db);
        } else {
          msg["read"] = true;
          account_db[contact_email_and_saved_name[msg["from"]]]["messages"] = [
            msg,
          ];
          console.log(account_db);
        }
        insert_message("other", msg, "", msg["type"]);
      } else {
        if (!verify_displayed_chat_card_email_list.includes(msg["from"])) {
          insert_chat_card(
            contact_email_and_saved_name[msg["from"]],
            msg["message"]
          );
        }
        if (msg["from"] in unread_msg) {
          unread_msg[msg["from"]].push(msg);
        } else {
          unread_msg[msg["from"]] = [msg];
        }
        show_number_of_unread_messages(
          contact_email_and_saved_name[msg["from"]],
          unread_msg[msg["from"]].length
        );
        update_message_hint_on_chatCard(
          contact_email_and_saved_name[msg["from"]],
          msg,
          message_hint_element
        );

        if (
          "messages" in account_db[contact_email_and_saved_name[msg["from"]]]
        ) {
          msg["read"] = false;

          account_db[contact_email_and_saved_name[msg["from"]]][
            "messages"
          ].push(msg);
          console.log(account_db);
        } else {
          msg["read"] = false;
          console.log(account_db);

          account_db[contact_email_and_saved_name[msg["from"]]]["messages"] = [
            msg,
          ];
        }
      }
      ipc.send("save_message", contact_email_and_saved_name[msg["from"]], msg);
    } else {
      console.log("MESSAGE: Going to else");
      if (!verify_displayed_chat_card_email_list.includes(msg["from"])) {
        console.log("user chat card is not inserted");
        insert_chat_card(
          contact_email_and_saved_name[msg["from"]],
          msg["message"]
        );
      }
      if (msg["from"] in unread_msg) {
        unread_msg[msg["from"]].push(msg);
      } else {
        unread_msg[msg["from"]] = [msg];
      }
      show_number_of_unread_messages(
        contact_email_and_saved_name[msg["from"]],
        unread_msg[msg["from"]].length
      );
      update_message_hint_on_chatCard(
        contact_email_and_saved_name[msg["from"]],
        msg,
        message_hint_element
      );

      if ("messages" in account_db[contact_email_and_saved_name[msg["from"]]]) {
        console.log("This contact exists");
        msg["read"] = false;
        account_db[contact_email_and_saved_name[msg["from"]]]["messages"].push(
          msg
        );
        console.log(account_db);

        console.log("this is the message list of the contact", msg);
      } else {
        msg["read"] = false;
        console.log(
          "Contact does not exist",
          contact_email_and_saved_name[msg["from"]]
        );
        account_db[contact_email_and_saved_name[msg["from"]]]["messages"] = [
          msg,
        ];
        console.log(account_db);

        console.log(
          "this is the message list of the contact",
          account_db[contact_email_and_saved_name[msg["from"]]]["messages"]
        );
      }
      ipc.send("save_message", contact_email_and_saved_name[msg["from"]], msg);
    }
  }

  if (msg["type"] != "txt") {
    fetch(`${Config.HOST_URL}/file/${msg["mediaURL"]}`, {
      method: "GET",
    })
      .then(async (response) => {
        // Handle the server response
        if (response) {
          let media_blob = await response.blob();
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
            fs.writeFileSync(
              homeDir + "//.pager//resources//media_messages//" + msg["path"],
              buffer
            );
          };

          // Read the contents of the Blob as an ArrayBuffer
          reader.readAsArrayBuffer(media_blob);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }
});

const insert_chat_card = async (card_name, msg) => {
  let image_path;
  if (account_db[card_name]["profile_picture"] === "") {
    image_path = homeDir + "//.pager//resources//default_profile_pic.jpg";
  } else {
    image_path = `data:image/png;base64,${account_db[card_name]["profile_picture"]}`;
  }
  if (card_name === "unknown") {
    var chat_card = `<a href="#list-chat" class="filterDiscussions all unread single" id="${card_name}" data-toggle="list" role="tab">
                            <img class="avatar-md" src="" data-toggle="tooltip" data-placement="top" title="Mildred" alt="avatar">
                            <div class="" id="${card_name}-unread-messages">
                            </div>
                            <div class="data">
                                <h5>${card_name}</h5>
                                <span>Thu</span>
                                <p>Unfortunately your session today has been cancelled!</p>
                            </div>
                        </a>`;
  } else {
    var chat_card = `<a href="#list-chat" class="filterDiscussions all unread single" id="${card_name}" data-toggle="list" role="tab">
                            <img class="avatar-md" src="${image_path}" data-toggle="tooltip" data-placement="top" title="Mildred" alt="avatar">
                            <div class="new" id="${card_name}-unread-messages">
                            </div>
                            <div class="data" id="${card_name}-card-details">
                                <h5>${card_name}</h5>
                                <span>Thursday</span>
                                
                            </div>
                        </a>`;
  }
  message_hint_element[card_name] = document.createElement("div");
  message_hint_element[card_name].innerText = msg;
  chats_container.insertAdjacentHTML("afterbegin", chat_card);
  verify_displayed_chat_card_email_list.push(account_db[card_name]["email"]);
  document
    .getElementById(card_name + "-card-details")
    .appendChild(message_hint_element[card_name]);

  document.getElementById(card_name).addEventListener("click", (event) => {
    console.log("Chat card of " + card_name + " clicked");
    show_send_message_panel(card_name, account_db);
    chat_to_perform_action = account_db[card_name]["email"];
  });
};

const show_send_message_panel = (panel_name, messages) => {
  console.log("call panel name", panel_name, contact_email_and_saved_name);
  let image_path;
  if (account_db[panel_name]["profile_picture"] === "") {
    image_path = homeDir + "//.pager//resources//default_profile_pic.jpg";
  } else {
    image_path = `data:image/png;base64,${account_db[panel_name]["profile_picture"]}`;
  }
  var panel_html = `<div class="chat" id="chat">
                    <div class="top">
                        <div class="container">
                            <div class="col-md-12">
                                <div class="inside chat-name">
                                    <a href="#"><img class="avatar-md" src="${image_path}" data-toggle="tooltip" data-placement="top" title="Keith" alt="avatar"></a>
                                    <div class="data" id="chat-info">
                                        <h5>${panel_name}</h5>
                                        <span>Active now</span>
                                    </div>
                                    <button class="btn connect d-md-block d-none"><i class="material-icons md-30">search</i></button>

                                    <div class="dropdown">
                                        <button class="btn" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="material-icons md-30">more_vert</i></button>
                                        <div class="dropdown-menu dropdown-menu-right">
                                            <button id="voice-call" class="dropdown-item connect" name="1"><i class="material-icons">phone_in_talk</i>Voice Call</button>
                                            <button id="video-call" class="dropdown-item connect" name="1"><i class="material-icons">videocam</i>Video Call</button>
                                            <button class="dropdown-item"><i class="material-icons">clear</i>Clear History</button>
                                            <button class="dropdown-item"><i class="material-icons">block</i>Block Contact</button>
                                            <button class="dropdown-item"><i class="material-icons">delete</i>Delete Contact</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="content" id="content">
                        <div class="container">
                            <div class="col-md-12" id="show_messages">

                            </div>
                        </div>
                    </div>
                    <div id="attachment-container">
                        <div id="first-row">
                            <button id="start-camera" class="btn attachment-button"><i class="material-icons">photo_camera</i></button>
                            <button id="gallery-btn" class="btn attachment-button"><i class="material-icons">photo</i></button>
                            <button id="send-document" class="btn attachment-button"><i class="material-icons">insert_drive_file</i></button>
                        </div>
                        <div id="second-row">
                            <button id="start-mic" class="btn attachment-button"><i class="material-icons">music_note</i></button>
                            <button id="start-camera" class="btn attachment-button"><i class="material-icons">movie</i></button>
                            <button id="other-attachment" class="btn attachment-button"><i class="material-icons">more_horiz</i></button>
                        </div>
                    </div>
                    <div class="container">
                        <div class="col-md-12">
                            <div class="bottom" id="msg-area-div">
                                <form id="buttons-container" class="position-relative w-100">
                                    <div class="container">
                                        <textarea oninput="change_audio_message_btn_id(this)" class="form-control msg-area-target-dark" id="message-area" placeholder="Start typing for reply..." rows="1"></textarea>
                                        
                                    </div>
                                    <button class="btn emoticons" id="insert_emoji"><i class="material-icons">insert_emoticon</i></button>
                                    <button id="send-audio" type="button" class="btn send"><i class="material-icons">mic</i></button>
                                    <button class="btn send" type="button" id="open-attachment-menu"><i class="material-icons">attach_file</i></button>
                                </form> 
                            </div>
                        </div>
                    </div>
                </div>
                <div class="call" id="call">
                  <div style="height: 30%; width: 35%;">
                                                <video class="video" src="" id="remoteStream-video" autoplay playsinline></video>
                                            </div>
                    <video class="video" muted id="localStream-video" autoplay playsinline></video>
                    
                    <div class="content">
                        <div class="container">
                            <div class="col-md-12">
                                <div class="inside" id="call-inside">
                                    <div class="panel">
                                        <div class="participant" id="call-connecting">
                                            <span>Connecting</span>
                                        </div>							
                                        <div class="options" id="call-options">
                                            <button class="btn option"><i class="material-icons md-30">mic</i></button>
                                            <button class="btn option"><i class="material-icons md-30">videocam</i></button>
                                            <button id="answer-end-call" class="btn option call-end"><i id="call-answer-end-btn" class="material-icons md-30">call_end</i></button>
                                            <button class="btn option"><i class="material-icons md-30">person_add</i></button>
                                            <button class="btn option"><i class="material-icons md-30">volume_up</i></button>
                                        </div>
                                        <button class="btn back" name="1"><i class="material-icons md-24">chat</i></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
  list_chat.innerHTML = panel_html;
  send_audio_btn = document.getElementById("send-audio");
  buttons_container = document.getElementById("buttons-container");
  //// TODO:: Add p2p_connection_data field to data base

  voice_callBTN = document.getElementById("voice-call");
  voice_callBTN.addEventListener("click", (event) => {
    ipc.send("start_audioCall", account_db[panel_name]["email"]);
    event.stopPropagation();
    Call.calltype = "audio";
    Call.callee_email = account_db[panel_name]["email"];
    Call.start();
  });

  video_callBTN = document.getElementById("video-call");
  video_callBTN.addEventListener("click", (event) => {
    Call.calltype = "video"
    Call.callee_email = account_db[panel_name]["email"]
    Call.start()

  });

  $("#contactsModal").modal("hide");
  $(".connect").click(() => {
    // $("#chatInfo").modal("hide")
    $("#chat").hide();
    $("#call").show();
  });
  panel_visibility["visibility"] = true;
  panel_visibility["panel_name"] = panel_name;
  $(".back").click(() => {
    $("#call").hide();
    $("#chat").show();
  });
  document.getElementById("message-area").focus();
  show_message = document.getElementById("show_messages");

  // ! Showing message in case user sends one
  send_message_btn.addEventListener("click", () => {
    console.log(panel_name);
    var message = new TextMessage();
    message.message = document.getElementById("message-area").value;
    message.name = panel_name;
    // var message = { "uuid": crypto.randomUUID(), "time": Date(), "type": "txt", "message": document.getElementById("message-area").value, "from": user_obj[user_obj["active"]]["email"], "to": "", "name": panel_name }
    if (clique_list.includes(panel_name)) {
      message.to = panel_name;
      ipc.send("send_clique_message", message);
    } else {
      message.to = account_db[panel_name]["email"];

      ipc.send("send_text_message", message);

      insert_message("me", message, "", message["type"]);
    }

    document.getElementById("message-area").value = "";
    update_message_hint_on_chatCard(
      contact_email_and_saved_name[message["to"]],
      message,
      message_hint_element
    );
  });
  // ! *******************************

  // ! Showing emoji and hiding emoji
  // * showinf
  document
    .getElementById("msg-area-div")
    .insertAdjacentElement("afterbegin", emoji_container);

  document
    .getElementById("insert_emoji")
    .addEventListener("mouseover", (event) => {
      emoji_container.style.bottom = 70 + "px";
      emoji_container.style.left =
        document.getElementById("sidebar").clientWidth + 15 + "px";
      emoji_container.style.transform = "scale(1)";
      emoji_container.style.transition = "transform 300ms ease-in-out";
    });
  // * hiding
  document
    .getElementById("insert_emoji")
    .addEventListener("mouseout", (event) => {
      console.log(event.clientX)
      emoji_container.style.transform = "scale(0)";
      emoji_container.style.transition = "transition 300ms ease-in-out";
    });
  // ! ************************

  document.getElementById("chat-info").addEventListener("click", (event) => {
    $("#chatInfo").modal("show");
    if (account_db[panel_name]["unsaved"] === true) {
      document.getElementById("saved-name").innerText = "Unsaved contact";
      document.getElementById("show-chat-email").innerText =
        account_db[panel_name]["email"];
      document.getElementById("chat-contact").innerText =
        "No contact was found";
    }
  });

  // * Showing attachment menu
  /// Attachment menu Container
  var attachment_container = document.getElementById("attachment-container");
  const close_menu = () => {
    attachment_container.style.bottom = 70 + "px";
    attachment_container.style.left =
      document.getElementById(".").clientWidth - 275 + "px";
    attachment_container.style.transform = "scale(0)";
    attachment_container.style.transition = "transform 300ms ease-in-out";
    show_attachment_menu = false;
  };
  document
    .getElementById("open-attachment-menu")
    .addEventListener("click", (event) => {
      if (show_attachment_menu === false) {
        attachment_container.style.bottom = 70 + "px";
        attachment_container.style.left =
          document.getElementById(".").clientWidth - 275 + "px";
        attachment_container.style.transform = "scale(1)";
        attachment_container.style.transition = "transform 300ms ease-in-out";
        show_attachment_menu = true;
      } else {
        close_menu();
      }
    });

  // * Adding functionality to attachment buttons
  // * Showing gallery div
  const gallery_btn = document.getElementById("gallery-btn");

  gallery_btn.addEventListener("click", () => {
    layout.style.filter = "blur(8px)";
    close_menu();
    gallery_div.style.display = "block";
  });

  // * Closing gallery div
  const close_gallry_btn = document.getElementById("close-gallery-button");
  close_gallry_btn.addEventListener("click", () => {
    layout.style.filter = "blur(0px)";
    gallery_div.style.display = "none";
  });
  /////// This part deal with sending of media files
  // * Opening other
  const other_attachment_btn = document.getElementById("other-attachment");
  other_attachment_btn.addEventListener("click", (event) => {
    close_menu();

    ipc.send("open-file", 1);
  });
  // ! *****************************************************
  let mediaMessage = new MediaMessage();
  ipc.on("file-chosen", (event, data) => {
    mediaMessage.uuid = crypto.randomUUID();
    mediaMessage.time = Date();
    if (data["data_abt_file"].includes("video")) {
      mediaMessage.type = "video";
      mediaMessage.path = data["path"];
      document.getElementById(
        "show-file-details"
      ).innerHTML = `<label class="title-label">${data["path"][0].replace(
        /^.*[\\\/]/,
        ""
      )}</label>
                                                                    <video controls width="250" id="sending-video-ele">                
                                                                        <source src="${
                                                                          data[
                                                                            "path"
                                                                          ]
                                                                        }" type="${
        data["data_abt_file"]["mime"]
      }">
                                                                    </video>`;
    }

    if (data["data_abt_file"].includes("image")) {
      mediaMessage.type = "image";
      mediaMessage.path = data["path"];
      document.getElementById(
        "show-file-details"
      ).innerHTML = `<img id="sending-image-ele" src="${data["path"]}" alt="">`;
    }

    if (data["data_abt_file"].includes("audio")) {
      mediaMessage.type = "audio";
      mediaMessage.path = data["path"];
      let blob = new Blob([data["cover"]], { type: "image/jpeg" });
      let album_cover = URL.createObjectURL(blob);
      mediaMessage.albumCover = data["albumCover"];
      document.getElementById(
        "show-file-details"
      ).innerHTML = `<div class="custom-audio-div">
                                                                        <div class="audio-image" style="background-image: url(${album_cover}); background-size:100% 100%">

                                                                        </div>
                                                                        <div class="audio-controls-div">
                                                                            <div class="audio-progress">
                                                                                <div class="progress" style="height: 3px;">
                                                                                    <div class="progress-bar" style="width: 0%" role="progressbar" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100"></div>
                                                                                </div>
                                                                            </div>
                                                                            <div class="flex-justify-content">
                                                                                <button type="button" onClick="moveForward2sec()" class="btn"><i class="material-icons">replay</i></button>
                                                                                <button id="send-audio-message-play-pause" type="button" onClick="play_pause_audio('abt_send_msg','')" class="btn"><i class="material-icons">play_arrow</i></button>
                                                                                <button type="button" onClick="moveBack2sec()" class="btn" ><i class="material-icons">forward_5</i></button>
                                                                            </div>
                                                                        </div>
                                                                        <audio id="main-audio">
                                                                            <source src="${data["path"]}">
                                                                        </audio>
                                                                      </div>`;
      send_audio_message_play_pause = document.getElementById(
        "send-audio-message-play-pause"
      );

      document
        .getElementById("main-audio")
        .addEventListener("timeupdate", async (event) => {
          let target = event.target;
          let friends_of_target = await target.parentNode.children;
          let progress_percent = (target.currentTime / target.duration) * 100;

          Array.from(friends_of_target).forEach((value) => {
            if (value.classList.contains("audio-controls-div")) {
              let audio_progress_div = value.children[0];
              let progress_bar = audio_progress_div.children[0].children[0];

              progress_bar.style.width = progress_percent + "%";
            }
          });
        });
    }
    if (
      !data["data_abt_file"].includes("audio") &&
      !data["data_abt_file"].includes("video") &&
      !data["data_abt_file"].includes("image")
    ) {
      mediaMessage.type = "other";
      mediaMessage.path = data["path"];
    }

    $("#confirmFileModal").modal({ backdrop: "static", keyboard: false });
  });

  document
    .getElementById("send-media-btn")
    .addEventListener("click", (event) => {
      insert_message("me", mediaMessage, "", mediaMessage.type);
      $("#confirmFileModal").modal("hide");

      // Sending file to Rest server to make it available for download once message details are sent
      // Did this because LoadFileData was not reading the file completely
      let buffer_of_file = fs.readFileSync(mediaMessage.path);
      const fileData = new LocalFileData(mediaMessage.path);
      const file = new File([buffer_of_file], fileData.name);

      // Create a FormData object and append the file to it
      const formData = new FormData();
      formData.append("file", file);

      // Send a POST request to the server with the file data

      fetch(`${Config.HOST_URL}/uploadfile`, {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          // Handle the server response
          if (response["success"] === true) {
            mediaMessage.mediaURL = response["mediaURL"];
            // Sending message details to recipient but first goes through socket sever
            ipc.send("send-media", mediaMessage);
          }
        })
        .catch((error) => {
          console.error(error);
        });
    });
  /////////////// Done with sending of media files

  // ! Conatext Menu
  document
    .getElementById("msg-area-div")
    .insertAdjacentElement("afterbegin", msg_area_context_menu);
  show_message.insertAdjacentElement("afterbegin", msg_context_menu);
  document
    .getElementById("message-area")
    .addEventListener("contextmenu", (event) => {
      event.preventDefault();
      msg_area_context_menu.style.top =
        event.pageY - msg_area_context_menu.clientHeight + "px";
      msg_area_context_menu.style.left = event.clientX + "px";
      msg_area_context_menu.style.transform = "scale(1)";
      msg_area_context_menu.style.transition = "transform 200ms ease-in-out";
    });
  // ! ****************************************

  // ! SENDING AUDIO
  const audioRecorder = {
    message: new MediaMessage(),
    audioChunks: [],
    mediaRecorder: null,
    constraint: { audio: true, video: false },

    start: () => {
      audioRecorder.message.uuid = crypto.randomUUID();
      audioRecorder.message.to = account_db[panel_name]["email"];
      audioRecorder.message.name = panel_name;
      audioRecorder.message.albumCover = "music.png";
      audioRecorder.message.path = `${
        homeDir +
        "//.pager//resources//media_messages//" +
        audioRecorder.message["uuid"]
      }.wav`;
      audioRecorder.message.type = "audio";
      return navigator.mediaDevices
        .getUserMedia(audioRecorder.constraint)
        .then((stream) => {
          audioRecorder.mediaRecorder = new MediaRecorder(stream);
          audioRecorder.mediaRecorder.start();

          audioRecorder.mediaRecorder.onstart = (event) => {
            // console.log(event)
            recording_audio = true;
          };

          audioRecorder.mediaRecorder.onstop = (event) => {
            // console.log(event)
            // audioRecorder.message["chunks"] = audioRecorder.audioChunks
            let audio_blob = new Blob(audioRecorder.audioChunks, {
              type: "audio/webm;codecs=opus",
            });

            let file = new File(
              [audio_blob],
              audioRecorder.message["uuid"] + ".wav"
            );
            // Create a FormData object and append the file to it
            const formData = new FormData();
            formData.append("file", file);

            // Send a POST request to the server with the file data

            fetch(`${Config.HOST_URL}/uploadfile`, {
              method: "POST",
              body: formData,
            })
              .then((response) => {
                console.log(response);
                // Handle the server response
                if (response.ok === true) {
                  console.log(response);
                  audioRecorder.message.mediaURL = response["mediaURL"];
                  // Sending message details to recipient but first goes through socket sever
                  if (clique_list.includes(panel_name)) {
                    audioRecorder.message.to = panel_name;
                    ipc.send("send_clique_message", message);
                    insert_message(
                      "me",
                      audioRecorder.message,
                      "",
                      audioRecorder.message.type
                    );
                  } else {
                    audioRecorder.message.to = account_db[panel_name]["email"];

                    ipc.send("send-media", audioRecorder.message);
                    console.log(audioRecorder.message);

                    insert_message(
                      "me",
                      audioRecorder.message,
                      "",
                      audioRecorder.message.type
                    );
                  }
                }
              })
              .catch((error) => {
                console.error(error);
              });
            const reader = new FileReader();

            // Set up a callback for when the FileReader has loaded the contents of the Blob
            reader.onload = (event) => {
              // Access the ArrayBuffer containing the contents of the Blob
              const arrayBuffer = event.target.result;

              // Create a Buffer object from the ArrayBuffer
              const buffer = Buffer.from(arrayBuffer);

              // Now you can use the 'buffer' object as needed, e.g. save to disk using fs.writeFile() in Node.js
              // ...
              fs.writeFileSync(
                `${
                  homeDir +
                  "//.pager//resources//media_messages//" +
                  audioRecorder.message["uuid"]
                }.wav`,
                buffer
              );
            };

            // Read the contents of the Blob as an ArrayBuffer
            reader.readAsArrayBuffer(audio_blob);
          };

          audioRecorder.mediaRecorder.ondataavailable = async (event) => {
            await audioRecorder.audioChunks.push(event.data);
          };
        })
        .catch((err) => {
          if (err) {
            console.log(err);
          }
        });
    },

    stop: () => {
      audioRecorder.mediaRecorder.stop();
    },
  };

  send_audio_btn.addEventListener("mousedown", (event) => {
    timeout_id = setTimeout(() => {
      audioRecorder.start();
    });
  });

  send_audio_btn.addEventListener("mouseup", async (event) => {
    await audioRecorder.stop();

    clearTimeout(timeout_id);
  });

  // ! Displaying the messages that user has in DataBase
  if (Object.keys(account_db[panel_name]).includes("messages")) {
    account_db[panel_name]["messages"].forEach((value, index, array) => {
      if (value["from"] === user_obj[user_obj["active"]]["email"]) {
        insert_message("me", value, "", value["type"]);
      } else {
        console.log(".", value);
        insert_message("other", value, "", value["type"]);
      }
    });
  }
  // ! ***************************************

  // ! Removing the number of unread messages badge from a chat when user clicks on the chat
  if (account_db[panel_name]["email"] in unread_msg) {
    remove_number_of_unread_messaes(panel_name);
    unread_msg[account_db[panel_name]["email"]] = [];
    console.log(unread_msg, "checking if unread messages is cleared");
  }

  // // ! Displaying unread messages
  // if (account_db[panel_name]["email"] in unread_msg) {
  //     unread_msg[account_db[panel_name]["email"]].forEach((value, index, array) => {
  //         insert_message("other", value, "",value["type"])
  //     })
  // }
  // ! ************************************

  if (account_db[panel_name]["unsaved"] === true) {
    insert_save_block_card(panel_name);
  }
};

const insert_message = async (sender, msg, time, message_type) => {
  if (message_type === "txt") {
    if (sender != "me") {
      var msg_html = `<div class="message" id="${msg["uuid"]}">
                                <div class="text-main">
                                    <div class="text-group">
                                        <div class="text">
                                            <p>${msg["message"]}</p>
                                        </div>
                                    </div>
                                    <span>09:46 AM</span>
                                </div>
                            </div>`;
    } else if (sender === "me") {
      var msg_html = `<div class="message me" id="${msg["uuid"]}">
                                <div class="text-main">
                                    <div class="text-group me">
                                        <div class="text me">
                                            <p>${msg["message"]}</p>
                                        </div>
                                    </div>
                                    <span>09:46 AM</span>
                                </div>
                            </div>`;
    }
  }

  if (message_type === "audio") {
    let cover = null;
    let audio_source = null;
    if (sender != "me") {
      console.log(
        "this is path to audio Message",
        `${homeDir + "//.pager//resources//media_messages//" + msg["path"]}`
      );
      if (msg["albumCover"] === "music.png") {
        cover = msg["albumCover"];
      } else {
        cover = `data:image/png;base64,${msg["albumCover"]}`;
      }
      console.log(msg["uuid"]);
      var msg_html = `<div class="message" id="${msg["uuid"]}">
                                <div class="text-main">
                                    <div class="text-group">
                                        <div class="text">
                                            <div class="custom-audio-div">
                                                <div class="audio-image">
                                                    <image src="${cover}" style="width:100%; height:100%;">
                                                </div>
                                                <div class="audio-controls-div">
                                                    <div class="audio-progress">
                                                        <div class="progress" style="height: 3px;">
                                                            <div class="progress-bar" style="width: 0%" role="progressbar" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100"></div>
                                                        </div>
                                                    </div>
                                                    <div class="flex-justify-content">
                                                        <button type="button" onClick="moveForward2sec()" class="btn"><i class="material-icons">replay</i></button>
                                                        <button id="${
                                                          msg["uuid"]
                                                        }-send-audio-message-play-pause" type="button" class="btn"><i class="material-icons">play_arrow</i></button>
                                                        <button type="button" class="btn" ><i class="material-icons">forward_5</i></button>
                                                    </div>
                                                </div>
                                                <audio id="${
                                                  msg["uuid"]
                                                }-audio">
                                                    <source src="${
                                                      homeDir +
                                                      "//.pager//resources//media_messages//" +
                                                      msg["path"]
                                                    }">
                                                </audio>
                                            </div>
                                        </div>
                                    </div>
                                    <span>09:46 AM</span>
                                </div>
                            </div>`;
    } else if (sender === "me") {
      if (msg["albumCover"] === "music.png") {
        cover = msg["albumCover"];
      } else {
        cover = `${
          homeDir + "\\.pager\\resources\\albumCovers\\" + msg["albumCover"]
        }`;
      }

      var msg_html = `<div class="message me" id="${msg["uuid"]}">
                                <div class="text-main">
                                    <div class="text-group me">
                                        <div class="text me">
                                            <div class="custom-audio-div" style="width:300px;">
                                                <div class="audio-image" >
                                                    <image src="${cover}" style="width:100%; height:100%;">
                                                </div>
                                                <div class="audio-controls-div">
                                                    <div class="audio-progress" style="margin-left:10px;">
                                                        <div class="progress" style="height: 3px;">
                                                            <div class="progress-bar" style="width: 0%" role="progressbar" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100"></div>
                                                        </div>
                                                    </div>
                                                    <div class="flex-justify-content">
                                                        <button type="button" onClick="moveForward2sec()" class="btn"><i class="material-icons">replay</i></button>
                                                        <button id="${msg["uuid"]}-send-audio-message-play-pause" type="button" class="btn"><i class="material-icons">play_arrow</i></button>
                                                        <button type="button" class="btn" ><i class="material-icons">forward_5</i></button>
                                                    </div>
                                                </div>
                                                <audio id="${msg["uuid"]}-audio">
                                                    <source src="${msg["path"]}">
                                                </audio>
                                            </div>
                                        </div>
                                    </div>
                                    <span>09:46 AM</span>
                                </div>
                            </div>`;
    }
  }

  if (message_type === "image") {
    if (sender != "me") {
      var msg_html = `<div class="message" id="${msg["uuid"]}">
                                <div class="text-main">
                                    <div class="text-group">
                                        <div class="text" >
                                            <div id="brag" class="flex-justify-content">
                                                <button data-id="${
                                                  homeDir +
                                                  "//.pager//resources//media_messages//" +
                                                  msg["path"]
                                                }" type="button" class="btn download-play-video-btn" id="${
        msg["uuid"]
      }-show-image-message-gallery"><i class="material-icons">photo</i></button>
                                                <div style="width: 135px; padding-left: 20px; padding-top: 8px;">Image</div>
                                            </div>
                                        </div>
                                    </div>
                                    <span>11:07 PM</span>
                                </div>
                            </div>`;
    } else if (sender === "me") {
      var msg_html = `<div class="message me" id="${msg["uuid"]}">
                                <div class="text-main">
                                    <div class="text-group me">
                                        <div class="text me" >
                                            <div id="brag" class="flex-justify-content">
                                                <button data-id="${msg["path"]}" type="button" class="btn download-play-video-btn" id="${msg["uuid"]}-show-image-message-gallery"><i class="material-icons">photo</i></button>
                                                <div style="width: 135px; padding-left: 20px; padding-top: 8px;">Image</div>
                                            </div>
                                        </div>
                                    </div>
                                    <span>11:07 PM</span>
                                </div>
                            </div>`;
    }
  }

  if (message_type === "video") {
    if (sender != "me") {
      var msg_html = `<div class="message" id="${msg["uuid"]}">
                                <div class="text-main">
                                    <div class="text-group">
                                        <div class="text" >
                                            <div id="brag" class="flex-justify-content">
                                                <button data-id="${
                                                  homeDir +
                                                  "//.pager//resources//media_messages//" +
                                                  msg["path"]
                                                }" type="button" class="btn download-play-video-btn" id="${
        msg["uuid"]
      }-show-video-message-gallery"><i class="material-icons">movie</i></button>
                                                <div style="width: 135px; padding-left: 20px; padding-top: 8px;">Video</div>
                                            </div>
                                        </div>
                                    </div>
                                    <span>11:07 PM</span>
                                </div>
                            </div>`;
    } else if (sender === "me") {
      var msg_html = `<div class="message me" id="${msg["uuid"]}">
                                <div class="text-main">
                                    <div class="text-group me">
                                        <div class="text me" >
                                            <div id="brag" class="flex-justify-content">
                                                <button data-id="${msg["path"]} type="button" class="btn download-play-video-btn" id="${msg["uuid"]}-show-video-message-gallery"><i class="material-icons">movie</i></button>
                                                <div style="width: 135px; padding-left: 20px; padding-top: 8px;">Video</div>
                                            </div>
                                        </div>
                                    </div>
                                    <span>11:07 PM</span>
                                </div>
                            </div>`;
    }
  }

  if (message_type === "other") {
    if (sender != "me") {
      var msg_html = `<div class="message">
                                <div class="text-main">
                                    <div class="text-group">
                                        <div class="text">
                                            <div class="attachment">
                                                <button class="btn attach"><i class="material-icons md-18">insert_drive_file</i></button>
                                                <div class="file">
                                                    <h5><a href="#">${msg["path"]}</a></h5>
                                                    <span> Document</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <span>11:07 PM</span>
                                </div>
                            </div>`;
    } else if (sender === "me") {
      var msg_html = `<div class="message">
                                <div class="text-main">
                                    <div class="text-group">
                                        <div class="text">
                                            <div class="attachment">
                                                <button class="btn attach"><i class="material-icons md-18">insert_drive_file</i></button>
                                                <div class="file">
                                                    <h5><a href="#">${msg[
                                                      "path"
                                                    ]
                                                      .split("/")
                                                      .pop()}</a></h5>
                                                    <span> Document</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <span>11:07 PM</span>
                                </div>
                            </div>`;
    }
  }

  show_message.insertAdjacentHTML("beforeend", msg_html);
  document
    .getElementById(msg["uuid"])
    .addEventListener("contextmenu", (event) => {
      msg_context_menu.style.top =
        event.pageY - msg_context_menu.clientHeight + "px";
      msg_context_menu.style.left = event.offsetX + "px";
      msg_context_menu.style.transform = "scale(1)";
      msg_context_menu.style.transition = "transform 200ms ease-in-out";
    });

  if (message_type === "audio") {
    document
      .getElementById(`${msg["uuid"]}-send-audio-message-play-pause`)
      .addEventListener("click", (event) => {
        play_pause_audio(
          `${msg["uuid"]}-send-audio-message-play-pause`,
          `${msg["uuid"]}-audio`
        );
        console.log("play or pause audio", msg["uuid"]);
      });

    document
      .getElementById(`${msg["uuid"]}-audio`)
      .addEventListener("timeupdate", async (event) => {
        let target = event.target;
        let friends_of_target = await target.parentNode.children;
        let progress_percent = (target.currentTime / target.duration) * 100;

        Array.from(friends_of_target).forEach((value) => {
          if (value.classList.contains("audio-controls-div")) {
            let audio_progress_div = value.children[0];
            let progress_bar = audio_progress_div.children[0].children[0];

            progress_bar.style.width = progress_percent + "%";
          }
        });
      });
  }

  if (message_type === "image") {
    document
      .getElementById(`${msg["uuid"]}-show-image-message-gallery`)
      .addEventListener("click", (event) => {
        let image_id = event.currentTarget.dataset.id;
        console.log(image_id, "dataset");
        const image_html = `<button id="close-gallery-button" class="btn"><i class="material-icons">close</i></button>
                                <img id="gallery-img" src="${image_id}" alt="">`;
        gallery_div.innerHTML = image_html;
        // * Closing gallery div
        const close_gallry_btn = document.getElementById(
          "close-gallery-button"
        );
        close_gallry_btn.addEventListener("click", () => {
          layout.style.filter = "blur(0px)";
          gallery_div.style.display = "none";
        });
        layout.style.filter = "blur(8px)";
        gallery_div.style.display = "block";
      });
  }

  if (message_type === "video") {
    document
      .getElementById(`${msg["uuid"]}-show-video-message-gallery`)
      .addEventListener("click", (event) => {
        let video_id = event.currentTarget.dataset.id;

        const video_html = `<button id="close-gallery-button" class="btn"><i class="material-icons">close</i></button>
                                <video id="gallery-video" src="${video_id}"></video>`;
        gallery_div.innerHTML = image_html;
        // * Closing gallery div
        const close_gallry_btn = document.getElementById(
          "close-gallery-button"
        );
        close_gallry_btn.addEventListener("click", () => {
          layout.style.filter = "blur(0px)";
          gallery_div.style.display = "none";
        });
        layout.style.filter = "blur(8px)";
        gallery_div.style.display = "block";
      });
  }
};

const show_number_of_unread_messages = (card_name, number) => {
  var card = document.getElementById(card_name + "-unread-messages");
  card.style.visibility = "visible";
  card.innerHTML = `<span class="badge badge-pill badge-info">${number}</span>`;
};

const remove_number_of_unread_messaes = (card_name) => {
  var card = document.getElementById(card_name + "-unread-messages");
  card.style.visibility = "hidden";
};

const update_message_hint_on_chatCard = (chat_card_name, msg, elements) => {
  elements[chat_card_name].innerText = msg["message"];
  console.log(chat_card_name + "-message-hint", message_hint_element);
};

const insert_save_block_card = (name) => {
  var html = `<div class="block-save-container">
                    <div class="idea">
                        This contact is not among your contact list meaning messages send or received from this contact will disappear
                        after some time. Choose what to do with this contact
                    </div>
                    <div class="message">
                        <button class="btn block-and-save">Block</button>
                        <button class="btn block-and-save">Add to Contact</button>
                    </div>
                </div>`;

  show_message.insertAdjacentHTML("beforeend", html);
};

const create_clique = () => {
  var clique_obj = {};

  new_clique_fields.forEach((value, key, par) => {
    console.log();

    let space_name = value.getAttribute("name");

    if (space_name === "cliqueName") {
      clique_obj["name"] = value.value;
    }
    if (space_name === "cliqueLink") {
      clique_obj["link"] = value.value;
    }
    if (space_name === "cliqueAbout") {
      clique_obj["about"] = value.value;
    }
  });
  document
    .getElementById("finish-choosing-clique-members")
    .addEventListener("click", () => {
      clique_obj["members"] = creating_clique_members;
      console.log(clique_obj);
    });

  document
    .getElementById("change-profile-photo-clique")
    .addEventListener("click", () => {
      ipc.send("choose_profile_pic", 1);

      ipc.on("change_picture", (event, pic) => {
        base64_image = fs.readFileSync(pic, { encoding: "base64" });
        clique_obj["profile_pic"] = base64_image;
        document
          .getElementById("profile-photo-clique")
          .setAttribute("src", `data:image/png;base64,${base64_image}`);
        console.log(clique_obj);
      });
    });
  document.getElementById("create-clique").addEventListener("click", () => {
    clique_obj["settings"] = {
      message: {},
      profile_pic: {},
    };
    if (allow_member_to_send_msg_checkBox.checked) {
      clique_obj["settings"]["message"]["allow_member_msg"] = true;
    } else {
      clique_obj["settings"]["message"]["allow_admin_msg"] = true;
    }

    if (allow_members_to_change_profile_pic.checked) {
      clique_obj["settings"]["profile_pic"]["allow_member_prof_pic"] = true;
    } else {
      clique_obj["settings"]["profile_pic"]["allow_admin_prof_pic"] = true;
    }
    ipc.send("create-clique", clique_obj);
    $("#create-clique")
      .html(
        '<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Loading...'
      )
      .addClass("disabled");
  });

  ipc.on("creation-done", (event, data) => {
    $("#creatCliqueModal").modal("hide");
    $("#create-clique").html("Continue").addClass("enabled");
    insert_chat_card(clique_obj["name"], "Clique Created");
  });
};

// ! HANDLING THE TOGGLING OF CREAT CLIQUE SETTINGS
allow_member_to_send_msg_checkBox.addEventListener("change", (e) => {
  if (e.target.checked === true) {
    allow_only_admins_to_send_msg_checkBox.checked = false;
  }
  if (e.target.checked === false) {
    allow_only_admins_to_send_msg_checkBox.checked = true;
  }
});

allow_only_admins_to_send_msg_checkBox.addEventListener("change", (e) => {
  if (e.target.checked === true) {
    allow_member_to_send_msg_checkBox.checked = false;
  }
  if (e.target.checked === false) {
    allow_member_to_send_msg_checkBox.checked = true;
  }
});

allow_members_to_change_profile_pic.addEventListener("change", (e) => {
  if (e.target.checked === true) {
    allow_only_admins_to_change_profile_pic.checked = false;
  }
  if (e.target.checked === false) {
    allow_only_admins_to_change_profile_pic.checked = true;
  }
});

allow_only_admins_to_change_profile_pic.addEventListener("change", (e) => {
  if (e.target.checked === true) {
    allow_members_to_change_profile_pic.checked = false;
  }
  if (e.target.checked === false) {
    allow_members_to_change_profile_pic.checked = true;
  }
});
// ****************************************************

// ! creating new clique
document
  .getElementById("clique-continue-btn")
  .addEventListener("click", create_clique);

const change_audio_message_btn_id = async (e) => {
  if (e.value.length > 0) {
    buttons_container.childNodes.forEach((value, key, parent) => {
      if (value === send_audio_btn) {
        send_audio_btn.parentNode.replaceChild(
          send_message_btn,
          send_audio_btn
        );
      }
    });
  }
  if (e.value.length === 0) {
    send_message_btn.parentNode.replaceChild(send_audio_btn, send_message_btn);
  }
};

const play_pause_audio = (element, element_id) => {
  // element id is only used when the audio widget is one of those in show messages
  if (audio_playing === false) {
    if (element === "abt_send_msg") {
      send_audio_message_play_pause.innerHTML = `<i class="material-icons">pause</i>`;
      document.getElementById("main-audio").play();
      audio_playing = true;
    } else {
      audio_playing = true;
      document.getElementById(
        element
      ).innerHTML = `<i class="material-icons">pause</i>`;
      document.getElementById(element_id).play();
    }
  } else {
    if (element === "abt_send_msg") {
      send_audio_message_play_pause.innerHTML = `<i class="material-icons">play_arrow</i>`;
      document.getElementById("main-audio").pause();
      audio_playing = false;
    } else {
      audio_playing = false;
      document.getElementById(
        element
      ).innerHTML = `<i class="material-icons">play_arrow</i>`;
      document.getElementById(element_id).pause();
    }
  }
};
