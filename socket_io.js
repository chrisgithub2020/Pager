const io = require("socket.io-client")

const socket = io.connect("http://localhost:5000")

module.exports.socket = socket

module.exports.connect_to_server = async (user_info) => {
    await socket.on("connect",()=>{
        console.log("Connected to Server")
    })
}

// sending messages to the server

module.exports.send_registration_details = async (details) => {
    await socket.emit("registration",details)
}

module.exports.send_verification_code = async (code) =>{
    await socket.emit("verify_registration",code)
}

module.exports.verify_contact_details = async (contact_details) => {
    await socket.emit("verify_contact_details",contact_details)
}

module.exports.change_online_status = async (user_info) => {
    const active = user_info["active"]
    user_info = user_info[active]
    await socket.emit("change_user_online_status",user_info)
}

module.exports.send_text_message = async (message) =>{
    await socket.emit("text_message",message)
}

module.exports.send_sign_in_details = async (details) => {
    await socket.emit("sign_in",details)
}