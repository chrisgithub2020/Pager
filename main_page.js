const ipc = require("electron").ipcRenderer

/// Displaying html
var contacts_container = document.getElementById("contacts-container")

/// Account db
var account_db = {}
var user_db = {}

/// Displaying accounts
var accounts_card_collapsible = document.getElementById("show-accounts-collapsible")

/// Received Messages
var unread_msg = {}
var last_recieved_message = ""
var panel_visibility = {}
var message_hint_element = {}

/// Displaying chat card
var chats_container = document.getElementById("chats")
var list_chat = document.getElementById("list-chat")
var verify_displayed_chat_card = [] //! contains list of emails of contacts that are displayed as recent chats,used to verify message from contact

/// *  Adding Contact variables
var add_contact_fields = document.querySelectorAll("#participant, #contactName, #message")
var add_contact_button_html = "<button onclick='save_contact()' type='button' class='btn button w-100' id='create-contact-button'>Add Contact</button>"
var verify_contact_button = document.getElementById("verify-contact-button")
var contact_avatar = document.getElementsByClassName("contacts-avatar")
let add_contact_obj = {}

// When a user clicks a contact and wants to perform an action on the contact
let contact_to_perform_action = "" // ! the name of a comtact as saved
document.getElementById("message-contact").addEventListener("click", start_messaging_from_contacts)

var no_contact = false

// Log Out
document.getElementById("log-out").addEventListener("click", () => {
    user_db["active"] = ""
    console.log(user_db["active"])
    ipc.send("log-out", JSON.stringify(user_db))
})

// * Showing create contact modal if user has no contact
console.log("main_page_loaded")
ipc.on("no-contact", (event) => {
    console.log("no-contact")
    no_contact = true
    $("#startnewchat").modal("show")
})

/// Alerts the main process to send the user info
ipc.send("send_user_info", true)


/// Adding contact functions
function get_values() {
    $('#create-contact-button-div').html('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Loading...').addClass('disabled');
    add_contact_fields.forEach((value, key, parent) => {
        let field_name = value.getAttribute("name")
        if (field_name === "participant") {
            const contact_email = value.value
            add_contact_obj["contact_email"] = contact_email
        }

        if (field_name === "contactName") {
            const contact_name = value.value
            add_contact_obj["name"] = contact_name
        }

        if (field_name === "first_message") {
            const first_message = value.value
            add_contact_obj["first_message"] = first_message
        }
    })
    console.log(add_contact_obj)
    ipc.send("verify_contact", JSON.stringify(add_contact_obj))

    ipc.on("contact_exists", (event, contact) => {
        $('#create-contact-button-div').html(add_contact_button_html)
        add_contact_obj = contact[0]
        console.log(add_contact_obj)
    })
}

function save_contact() {
    $('#create-contact-button-div').html('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Loading...').addClass('disabled');
    ipc.send("save_contact", JSON.stringify(add_contact_obj))
}

verify_contact_button.addEventListener("click", get_values)

// * Uses the user info to display information about the user
ipc.on("user_info", (event, user_obj) => {
    user_db = user_obj
    const profile_pic = document.getElementById("profile_photo")
    const username = document.getElementById("username")
    const settings_profile_picture = document.getElementById("setting-profile-picture")
    if (user_obj[user_obj["active"]]["profile_picture"] != "") {

        profile_pic.src = `data:image/png;base64,${user_obj[user_obj["active"]]["profile_picture"]}`
        settings_profile_picture.src = `data:image/png;base64,${user_obj[user_obj["active"]]["profile_picture"]}`
    }
    username.innerText = user_obj[user_obj["active"]]["name"]
    document.getElementById("show-accounts-on-sidenav").innerText = user_obj[user_obj["active"]]["name"]

    db_keys = Object.keys(user_obj)

    db_keys.forEach((value, index, array) => {
        if (value != "active") {
            var html_snippet = `<a style="border-top: 1px solid #1f2a35; text-align:left;" class="btn other-accounts" id="${user_obj[value]["name"]}">
                                    <span><img src="data:image/png;base64,${user_obj[value]["profile_picture"]}" alt="" id="log-account-pic"></span>
                                    ${user_obj[value]["name"]}
                                </a>`
            accounts_card_collapsible.insertAdjacentHTML("afterbegin", html_snippet)

            // document.getElementById(user_obj[value]["name"]).addEventListener("click",()=>{
            //     user_obj["active"] = value
            //     ipc.send("log_in_to_account",JSON.stringify(user_obj))
            // })
        }
    })
})


/// Adds the contact card (html)
/// Also add chat card
ipc.on("add_contact_card", async (event, contacts) => {
    account_db = contacts

    const keys = Object.keys(contacts)
    const contacts_container_children = contacts_container.children

    if (contacts_container_children.length === 0) {
        keys.forEach((value, index, number) => {
            var path_to_img = contacts[value]["profile_picture"]
            var contact_name = value
            var image_path = `data:image/png;base64,${path_to_img}`
            var contact_card = `<a class='active-account contacts-avatar' id="${contact_name}-contact-card" data-toggle="tab" href="#contactInfo">
                                    <img src="${image_path}" alt="" class='settings-profile-photo' id="base64image">
                                    <div id='active-account-name-and-status'>
                                        <h6>${contact_name}</h6>
                                        Online
                                    </div>
                                </a>`
            contacts_container.insertAdjacentHTML("afterend", contact_card)
            document.getElementById(`${contact_name}-contact-card`).addEventListener("click", () => {
                contact_to_perform_action = contact_name
            })
        })
    }

    if (chats_container.children.length === 0) {
        keys.forEach((value, index, number) => {
            if ("messages" in contacts[value]) {
                if (contacts[value]["messages"].length > 0) {

                    insert_chart_card(value)
                    verify_displayed_chat_card.push(contacts[value]["email"])
                    document.getElementById(value).addEventListener("click", () => {
                        show_send_message_panel(value)
                        console.log("show it", value)
                    })

                }

            }
        })
    }
})

function start_messaging_from_contacts() {



    verify_displayed_chat_card.forEach((v, n, a) => {
        if (v === account_db[contact_to_perform_action]["email"]) {
            show_send_message_panel(contact_to_perform_action)


        } else {
            insert_chat_card(contact_to_perform_action)
            show_send_message_panel(contact_to_perform_action)
        }

    })

}

// Add account
document.getElementById("add-account").addEventListener("click", () => {
    ipc.send("add_account", true)
})


// ! Whenever a messag is received
ipc.on("message",  (event, msg) => {
    if (no_contact) {
        if (msg[0]["from"] in unread_msg) {
            unread_msg[msg[0]["from"]].push(msg)
        } else {
            unread_msg[msg[0]["from"]] = msg
        }

        

        /// Getting details of unknown contact
        /// uses any of the messages since each list of messages is from one person
        info = JSON.stringify({ "contact_email": msg[0]["from"], "name": msg[0]["name"] })
        ipc.send("verify_contact", info)
        var m = []

        ipc.on("unknown_contact_exists", async (event, db) => {
            db[0]["user_saving_name"] = msg[0]["from"]
            db[0]["messages"] = msg
            account_db[db[0]["user_saving_name"]] = { "name": db[0]["name"], "email": db[0]["email"], "last_seen": db[0]["last_seen"], "profile_picture": db[0]["profile_picture"],"messages":msg }
            await insert_chat_card(msg[0]["from"],msg[msg.length - 1])
            show_number_of_unread_messages(msg[0]["from"],3)

            document.getElementById(msg[0]["from"]).addEventListener("click", () => {
                show_send_message_panel(msg[0]["from"])
            })

            // ipc.send("save_contact",db)
        })


        // * <----------------------------------------------------> \\

        // last_recieved_message = msg["from"]
        console.log(msg)


    } else {


        // * displaying a message when a message is received from the the chat if not from the chat it is stored in the unread messages
        // Checking whether it openend
        if (panel_visibility["visibility"] === true) {
            // Checking whether the message received is from the chat
            if (panel_visibility["panel_name"] === msg["name"]){

                if (account_db[msg["name"]] in account_db) {
                    account_db[msg["name"]]["messages"].push(msg)
    
                } else {
                    account_db[msg["name"]]["messages"] = [msg]
                }
                insert_message("other", msg, "")

            } else {
                if (msg["from"] in unread_msg) {
                    unread_msg[msg["from"]].push(msg)
                } else {
                    unread_msg[msg["from"]] = [msg]
                }

            }
        } else {
            if (msg["from"] in unread_msg) {
                unread_msg[msg["from"]].push(msg)
            } else {
                unread_msg[msg["from"]] = [msg]
            }
        }
    }
});


const insert_chat_card = async (card_name,msg) => {
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
                        </a>`
    } else {

        var chat_card = `<a href="#list-chat" class="filterDiscussions all unread single" id="${card_name}" data-toggle="list" role="tab">
                            <img class="avatar-md" src="data:image/png;base64,${account_db[card_name]["profile_picture"]}" data-toggle="tooltip" data-placement="top" title="Mildred" alt="avatar">
                            <div class="new" id="${card_name}-unread-messages">
                            </div>
                            <div class="data" id="${card_name}-card-details">
                                <h5>${card_name}</h5>
                                <span>Thursday</span>
                                
                            </div>
                        </a>`

    }
    message_hint_element[card_name] = document.createElement("div")
    message_hint_element[card_name].innerText = msg["message"]
    chats_container.insertAdjacentHTML("afterbegin", chat_card)
    document.getElementById(card_name+"-card-details").appendChild(message_hint_element[card_name])
}
{/* <div id="${card_name}-message-hint">${msg["message"]}</div> */}
const show_send_message_panel = (panel_name, messages) => {
    var panel_html = `<div class="chat" id="chat1">
                    <div class="top">
                        <div class="container">
                            <div class="col-md-12">
                                <div class="inside chat-name">
                                    <a href="#"><img class="avatar-md" src="data:image/png;base64,${account_db[panel_name]["profile_picture"]}" data-toggle="tooltip" data-placement="top" title="Keith" alt="avatar"></a>
                                    <div class="data">
                                        <h5><a href="#">${panel_name}</a></h5>
                                        <span>Active now</span>
                                    </div>
                                    <button class="btn connect d-md-block d-none" name="1"><i class="material-icons md-30">phone_in_talk</i></button>
                                    <button class="btn connect d-md-block d-none" name="1"><i class="material-icons md-36">videocam</i></button>
                                    <button class="btn d-md-block d-none"><i class="material-icons md-30">info</i></button>

                                    <div class="dropdown">
                                        <button class="btn" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="material-icons md-30">more_vert</i></button>
                                        <div class="dropdown-menu dropdown-menu-right">
                                            <button class="dropdown-item connect" name="1"><i class="material-icons">phone_in_talk</i>Voice Call</button>
                                            <button class="dropdown-item connect" name="1"><i class="material-icons">videocam</i>Video Call</button>
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
                    <div class="container">
                        <div class="col-md-12">
                            <div class="bottom">
                                <form class="position-relative w-100">
                                    <textarea class="form-control" id="message-area" placeholder="Start typing for reply..." rows="1"></textarea>
                                    <button class="btn emoticons"><i class="material-icons">insert_emoticon</i></button>
                                    <button id="send-message" type="button" class="btn send"><i class="material-icons">send</i></button>
                                </form>
                                <label>
                                    <input type="file">
                                    <span class="btn attach d-sm-block d-none"><i class="material-icons">attach_file</i></span>
                                </label> 
                            </div>
                        </div>
                    </div>
                </div>
                <div class="call" id="call1">
                    <div class="content">
                        <div class="container">
                            <div class="col-md-12">
                                <div class="inside">
                                    <div class="panel">
                                        <div class="participant">
                                            <img class="avatar-xxl" src="data:image/png;base64,${account_db[panel_name]["profile_picture"]}" alt="avatar">
                                            <span>Connecting</span>
                                        </div>							
                                        <div class="options">
                                            <button class="btn option"><i class="material-icons md-30">mic</i></button>
                                            <button class="btn option"><i class="material-icons md-30">videocam</i></button>
                                            <button class="btn option call-end"><i class="material-icons md-30">call_end</i></button>
                                            <button class="btn option"><i class="material-icons md-30">person_add</i></button>
                                            <button class="btn option"><i class="material-icons md-30">volume_up</i></button>
                                        </div>
                                        <button class="btn back" name="1"><i class="material-icons md-24">chat</i></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`
    list_chat.innerHTML = panel_html
    $("#contactsModal").modal("hide")
    $(".connect").click(function () { $("#chat" + $(this).attr("name")).hide(), $("#call" + $(this).attr("name")).show() })
    panel_visibility["visibility"] = true
    panel_visibility["panel_name"] = panel_name
    $(".back").click(function () { $("#call" + $(this).attr("name")).hide(), $("#chat" + $(this).attr("name")).show() })
    $("#send-message").click(() => {
        message = { "time": Date(), "type": "txt", "message": document.getElementById("message-area").value, "from": user_db[user_db["active"]]["email"], "to": account_db[panel_name]["email"], "name": panel_name }
        document.getElementById("message-area").value = ""
        ipc.send("send_text_message", JSON.stringify(message))

        insert_message("me", message, "")

    })
    unread_msg[panel_name].forEach((value, index, array) => {
        insert_message("other", value, "")
    })
}

const insert_message = (sender, msg, time) => {
    if (sender != "me") {
        console.log(msg)
        var msg_html = `<div class="dropdown">
                            <button class="message btn" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                <div class="text-main">
                                    <div class="text-group">
                                        <div class="text">
                                            <p>${msg["message"]}</p>
                                        </div>
                                    </div>
                                    <span>09:46 AM</span>
                                </div>
                            </button>
                            <div class="dropdown-menu dropdown-menu-right">
                                <button class="dropdown-item connect" name="1"><i class="material-icons">phone_in_talk</i>Reply</button>
                                <button class="dropdown-item connect" name="1"><i class="material-icons">videocam</i>Video Call</button>
                                <button class="dropdown-item"><i class="material-icons">clear</i>Clear History</button>
                                <button class="dropdown-item"><i class="material-icons">block</i>Block Contact</button>
                                <button class="dropdown-item"><i class="material-icons">delete</i>Delete Message</button>
                            </div>
                        </div>`
    } else if (sender === "me") {
        console.log(msg)

        var msg_html = `<div class="dropdown">
                            <button class="message me btn" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                <div class="text-main">
                                    <div class="text-group me">
                                        <div class="text me">
                                            <p>${msg["message"]}</p>
                                        </div>
                                    </div>
                                    <span>09:46 AM</span>
                                </div>
                            </button>
                            <div class="dropdown-menu dropdown-menu-right">
                                <button class="dropdown-item connect" name="1"><i class="material-icons">phone_in_talk</i>Voice Call</button>
                                <button class="dropdown-item connect" name="1"><i class="material-icons">videocam</i>Video Call</button>
                                <button class="dropdown-item"><i class="material-icons">clear</i>Clear History</button>
                                <button class="dropdown-item"><i class="material-icons">block</i>Block Contact</button>
                                <button class="dropdown-item"><i class="material-icons">delete</i>Delete Contact</button>
                            </div>
                        </div>`
    }
    document.getElementById("show_messages").insertAdjacentHTML("beforeend", msg_html)

}

const show_number_of_unread_messages = (card_name,number) => {
    var card = document.getElementById(card_name+"-unread-messages");
    card.style.visibility = "visible";
    card.innerHTML = `<span class="badge badge-pill badge-info">${number}</span>`
}

const update_recent_message_hint = (chat_card_name,msg,elements) => {
    elements[chat_card_name].innerText = msg["message"]
    console.log(chat_card_name+"-message-hint",message_hint_element)
}
