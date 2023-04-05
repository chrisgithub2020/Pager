//Opening json file
const fs = require("fs")
const os = require("os")
const homeDir = os.homedir()


fs.exists(homeDir + "\\.pager\\resources", (resources_exist) => {
    if (resources_exist === false) {
        fs.mkdir(homeDir + "\\.pager\\resources", { recursive: true }, (e) => {
            if (e) {
                console.log(e)
            }
            fs.writeFile(homeDir + "\\.pager\\resources\\user.page", '', null, (err) => {
                if (err) {
                    console.log(err)
                }
            })

        })


    } else {
        fs.exists(homeDir + "\\.pager\\resources\\user.page", (userDB_exist) => {
            if (!userDB_exist) {
                fs.writeFile(homeDir + "\\.pager\\resources\\user.page", '', null, (err) => {
                    if (err) {
                        console.log(err)
                    }
                    console.log(userDB_exist)
                })
            }
        })
    }
})

fs.exists(homeDir + "\\.pager\\resources\\albumCovers",(cover_exist)=>{
    if (!cover_exist){
        fs.mkdir(homeDir + "\\.pager\\resources\\albumCovers",{recursive:true},(err)=>{
            if (err) throw err;
        })
    }
})

module.exports.save_new_user = async (info) => {
    await fs.writeFile(homeDir + "\\.pager\\resources\\user.page", info, (err) => {
        console.log(err)
    })
    console.log(info)
}

module.exports.create_user_database = async (name) => {
    await fs.writeFile(homeDir + "\\.pager\\resources\\" + name + ".page", '', null, () => {
        console.log("file created")
    })
}
// saving anything

module.exports.save_contact = async (active_user, obj) => {
    /// Also used to save messages sent and recieved
    await fs.writeFile(homeDir + "\\.pager\\resources\\" + active_user + ".page", obj, (err) => {
        if (err) throw err
    })
}

module.exports.save_text_message = async (active_user, obj, contact_name, message) => {

    await fs.writeFile(homeDir + "\\.pager\\resources\\" + active_user + ".page", obj, (err) => {
        if (err) throw err
    })
}

module.exports.save_audio_message = async (chunks,id) =>{
    const audioBlob = new Blob(chunks)
    const audioRec =  new File([audioBlob],{type:audioBlob.type})
    fs.writeFileSync(homeDir + `\\.pager\\data\\audio\\${id}.${audioBlob.type}`, audio_chunks, (err) => {
        if (err) {
        console.log(err)
        }
    })
}