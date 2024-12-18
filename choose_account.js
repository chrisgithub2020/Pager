const ipc = require("electron").ipcRenderer
const os = require("os");
const homeDir = os.homedir();
var accounts_card = document.getElementById("accounts")

ipc.on("choose_acc",(event,db)=>{
    db_keys = Object.keys(db)

    db_keys.forEach((value,index,array)=>{
        if (value != "active"){
            console.log(value)
            var html_snippet = `<a style="border-top: 1px solid #1f2a35; text-align:left;" class="btn other-accounts" id="${db[value]["name"]}">
                                    <span><img src="${(db[value]["profile_pic"] === "") ? homeDir + "//.pager//resources//default_profile_pic.jpg": "data:image/png;base64,"+db[value]["profile_pic"]}" alt="" id="log-account-pic"></span>
                                    ${db[value]["name"]}
                                </a>`
            accounts_card.insertAdjacentHTML("beforebegin",html_snippet)

            document.getElementById(db[value]["name"]).addEventListener("click",()=>{
                db["active"] = value
                console.log(db[value])
                console.log(Object.keys(db))
                ipc.send("log_in_to_account",JSON.stringify(db))
            })
        }
    })
})
