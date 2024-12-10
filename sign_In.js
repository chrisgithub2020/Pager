const electron = require("electron")
const ipc = electron.ipcRenderer
const fs = require("fs")
// code that handles signing in
var signIN_button = document.getElementById("sign-in-button").addEventListener("click",submit_sign_in_details)
var fields = document.querySelectorAll("#inputEmail, #inputPassword")
var sign_in_detals = {}

const Config = {
    HOST_URL:"https://847a-154-161-13-158.ngrok-free.app"
}

function submit_sign_in_details(){
    const email_pattern = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
    const password_pattern = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;

    fields.forEach((value,key,parent)=>{
        let name = value.getAttribute("name")

        if(name === "email"){
            const email = value.value
            let success = email_pattern.test(email)
            if (success === true){
                sign_in_detals["email"] = email
            } else {
                ipc.send("show_message_to_user",101)
            }
        }

        if(name === "password"){
            const password = value.value
            let success = email_pattern.test(password)
            if (success === true){
                sign_in_detals["password"] = password
            } else {
                sign_in_detals["password"] = password
                // ipc.send("show_message_to_user",105)
            }
        }
    })
    console.log(sign_in_detals)

    // ipc.send("sign-in",sign_in_detals)
    fetch(`${Config.HOST_URL}/signIN`, {
        method: "POST", 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(sign_in_detals)
    })
    .then(item => item.json())
    .then(response => {
        console.log(response)
        ipc.send("sign-up-complete", response)
    })
    
}

ipc.on("sign-details-correct",(event,resp)=>{
    event.sender.send("sign-up-complete",resp)
})