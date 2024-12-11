const io = require("socket.io-client")

const socket = io("http://192.168.79.53:9000",{transports: ["polling","websocket"], upgrade:true, reconnection: true})
// socket.connect()
module.exports.socket = socket

module.exports.connect_to_server = async () => {
    socket.on("connect", () => {
        console.log("Connected to Server")
    })
}

// sending messages to the server

module.exports.send_registration_details = async (details) => {
    await socket.emit("create_acc", details)
}

module.exports.send_verification_code = async (code) => {
    socket.emit("verify_registration", code)
}

module.exports.verify_contact_details = async (contact_details) => {
    socket.emit("check_if_acc_exist", contact_details)
}

module.exports.change_online_status = async (user_info) => {
    const active = user_info["active"]
    user_info = user_info[active]
    socket.emit("update_status", user_info)
}

module.exports.send_text_message = async (message) => {
    socket.emit("recieve_message", message)
}

module.exports.send_sign_in_details = async (details) => {
    socket.emit("sign_in", details)
}

module.exports.getInfo = async (filter) => {
    socket.emit("check_if_acc_exist", filter)
}

module.exports.send_clique_info_to_create = async (clique_obj) => {
    socket.emit("create_clique", clique_obj)
}

module.exports.send_media = async (data) => {
    socket.emit("media_message", data)
}

module.exports.send_ice_cand = async (data) => {
    socket.emit("send_ice_cand", data)
}

module.exports.send_offer = async (offer) => {
    socket.emit("send_offer", offer)
}

module.exports.send_answer = async (answer) => {
    socket.emit("send_answer", answer)
}

module.exports.send_clique_message = async (message) => {
    socket.emit("send_clique_message", message)
}

module.exports.ready_to_receive_saved_messages = async (code)=>{
    socket.emit("send_saved_messages",code)
}

module.exports.enter_clique_rooms = async (list)=>{
    socket.emit("join_clique_rooms",list)
}

module.exports.start_audioCall = async (l)=>{
    socket.emit("start_audio_call",l)
}

module.exports.voice_call_data = async (call_data)=>{
    socket.emit("voice_call_data",call_data)
}