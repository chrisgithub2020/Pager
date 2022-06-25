//Opening json file
const fs = require("fs")


module.exports.save_new_user = async (info) =>{    
    await fs.writeFile("./resources/user.page", info,(err)=>{
        console.log(err)
    })
    console.log(info)
}

module.exports.create_user_database = async (name) => {
    await fs.writeFile("./resources/"+name+".page",'',null,()=>{
        console.log("file created")
    })
}
// saving anything

module.exports.save_contact = async (active_user,obj) =>{
    /// Also used to save messages sent and recieved
    await fs.writeFile("./resources/"+active_user+".page",obj,(err)=>{
        if (err) throw err
    })
}

module.exports.save_text_message = async (active_user,obj,contact_name,message) =>{
    
    await fs.writeFile("./resources/"+active_user+".page",obj,(err)=>{
        if (err) throw err
    })
}