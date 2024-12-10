const electron = require("electron")
const ipc = electron.ipcRenderer
const fs = require("fs")
// const constants = require("./constants")
const os = require("os")
const homeDir = os.homedir()


const Config = {
  HOST_URL: `https://9c08-154-161-146-6.ngrok-free.app`
}

var signUP_button = document.getElementById("sign-up-button")
var fields = document.querySelectorAll("#inputEmail, #inputName, #inputPassword")
var pick_profile_picture = document.getElementById("sign-up-profile-picture-button")
var profile_picture_div = document.getElementById("choose-pic")
var verification_code_field = document.getElementById("verification_code_field")
var form_data = {};
var verified_email = ""
var fromData_toSave = {}
// UPDATING PROFILE PICTURE
// var display_profile_picture = `<img id='sign-up-profile-picture' src="${homeDir + "//.pager//resources//default_profile_pic.jpg"}" alt=''>`
// profile_picture_div.innerHTML = display_profile_picture
function submit_form_data() {
    const email_pattern = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
    const username_pattern = /^[a-zA-Z\-]+$/;

    let username_verification = false
    let email_verification = false
    let password_verification = false
    fields.forEach((value, key, parent) => {
        let name_attribute = value.getAttribute("name")

        // VERIFYING THAT THIS IS A CORRECT USERNAME
        if (name_attribute === "username") {
            const username = value.value;
            let success = username_pattern.test(username)
            if (success === true) {
                form_data["name"] = username
                username_verification = true

            } else {
                // Showing alert that username is not real 
                ipc.send("show_message_to_user", 50)
            }
        }

        // VERIFYING THAT THIS IS A CORRECT EMAIL ADDRESS
        if (name_attribute === "email") {
            // GETTING VALUE OF CURRENT FIELD
            const email = value.value
            // CHECKING IF USER EMAII MATCHES PATTERN
            let success = email_pattern.test(email)
            if (success === true) {
                form_data["email"] = email
                email_verification = true
            } else {
                // Showing alert that email is not proper 
                ipc.send("show_message_to_user", 101)
            }
        }

        // VERIFYING THE PASSWORD
        if (name_attribute === "password") {
            // GETTING VALUE OF CURRENT FIELD
            const password = value.value

            // CHECKING IF THE USER'S PASSWORD MATCHES THE PATTERN

            // ENTER DATA IF USER PASSWORD MATCHES THE PATTERN
            form_data["password"] = password
            password_verification = true
        }
        form_data["computer"] = "1"
        form_data["mobile_phone"] = "0"
    });

    if (!Object.keys(form_data).includes("profile_picture")) {
        console.log("no profile pic")
        form_data["profile_picture"] = ""
    }

    if (form_data.length === 0) {
        console.log("Please Fill the form")

    } if (form_data.length > 0 && form_data.length < 3) {
        console.log("Please fill the empty fields")

        // CHECKING IF ALL REQUIRED FIELDS HAVE BEEN FILLED
    } if (username_verification == true && password_verification == true && email_verification == true) {
        if (form_data["profile_picture"] === ""){
            fs.exists(homeDir + "//.pager//resources//default_profile_pic.jpg",(image_exist)=>{
                if (!image_exist){
                    fs.exists(homeDir + "\\.pager\\resources\\emojis.json", (emojis_exist) => {
                        if (!emojis_exist) {
                          console.log("asking for emoji")
                  
                          fetch(`${Config.HOST_URL}/get_emoji`, {
                            method: 'GET',
                            headers: {
                              'Content-Type': 'application/json'
                            }
                          })
                            .then(async (response) => {
                              // Handle the server response
                              if (response) {
                                let media_blob = await response.blob()
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
                                  fs.writeFileSync(homeDir + "//.pager//resources//emojis.json", buffer);
                  
                                };
                  
                                // Read the contents of the Blob as an ArrayBuffer
                                reader.readAsArrayBuffer(media_blob);
                              }
                            })
                  
                        }
                      })
                      fs.exists(homeDir + "\\.pager\\resources\\default_profile_pic.jpg", (pic_exist) => {
                        if (!pic_exist) {
                          console.log("asking for image")
                          fetch(`${Config.HOST_URL}/get_default_profile_pic`, {
                            method: 'GET',
                            headers: {
                              'Content-Type': 'application/json'
                            }
                          })
                            .then(async (response) => {
                              // Handle the server response
                              if (response) {
                                let media_blob = await response.blob()
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
                                  fs.writeFileSync(homeDir + "//.pager//resources//default_profile_pic.jpg", buffer);
                                  convert_image_to_base64(homeDir + "//.pager//resources//default_profile_pic.jpg")

                  
                                };
                  
                                // Read the contents of the Blob as an ArrayBuffer
                                reader.readAsArrayBuffer(media_blob);
                              }
                            })
                  
                        }
                      })
                } else {
                    convert_image_to_base64(homeDir + "//.pager//resources//default_profile_pic.jpg")

                }
            })
            // convert_image_to_base64("./default_profile_pic.jpg")
        }
        // ipc.send("reg-user", form_data)
        console.log(form_data)
        fetch(`${Config.HOST_URL}/register_user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(form_data)
        })
            .then(response => response.json())
            .then((data) => {
                console.log(data)

                // THIS PART IS CALLED WHEN ALL DETAILS HAVE BEEN SENT TO THE SERVER

                fromData_toSave = data
                $('#signUp-button-div').html('<div class="reg-details-sent"><span><i class="material-icons"></i></span>Sent</div>').addClass('disabled');
                $('#enterVerificationCode').modal({ backdrop: 'static', keyboard: false })
                verified_email = form_data["email"]
            })
            .catch(error => console.error(error));
        $('#signUp-button-div').click(function () {
            fields.forEach((value, key, parent) => {
                value.disabled = true;
            })
            $('#signUp-button-div').html('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Loading...').addClass('disabled');
        });

    }
    

}

// THIS FUNCTION ALERTS THE MAIN PROCESS TO OPEN THE DAILOG TO ALLOW THE USER TO SELECT A PICTURE
function choose_profile_pic() {
    ipc.send("choose_profile_pic", 1)
}


signUP_button.addEventListener("click", submit_form_data)
pick_profile_picture.addEventListener("click", choose_profile_pic)

// WHEN A PROFILE PICTURE IS SELECTED
ipc.on("change_picture", (event, image_path) => {
    // THIS PART UPDATES THE PROFILE PICTURE AND CONVERTS IT TO BASE_64 TO BE SENT TO SERVER
    convert_image_to_base64(image_path)
    
})


function send_verification_code() {
    // FUNCTION AUTOMATICALLY VERIFIES THE VERIFICATION CODE THAT THE USER HAS TYPED
    code = verification_code_field.value
    if (code.length === 7) {
        $('#show-verification-result').html('<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Loading...').addClass('disabled');
        var verification_details = JSON.stringify({ "email": verified_email, "code": code })
        fetch(`${Config.HOST_URL}/verify_code`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: verification_details
        })
            .then(response => response.json())
            .then((data) => {
                console.log(data)
                if (data === 1){
                    // Tells the main process that the code is complete and verification is also complete
                    // So the data is saved and app is restarted
                    $('#show-verification-result').html('<div class="reg-details-sent"><span><i class="material-icons"></i></span style="color:green;">Verification complete</div>').addClass('disabled');
                    $("#enterVerificationCode").modal("hide")
                    ipc.send("sign-up-complete", fromData_toSave)
                } else {
                    $('#show-verification-result').html('<div class="wrond-verification-code"><span><i class="material-icons"></i></span>Verification Code is wrong</div>').addClass('disabled');
                }
            })
            .catch(error => console.error(error));
        console.log(code)
    }
}

const convert_image_to_base64 = (image_path)=>{
    // UPDATING PROFILE PICTURE
    var display_profile_picture = `<img id='sign-up-profile-picture' src="${image_path}" alt=''>`
    profile_picture_div.innerHTML = display_profile_picture

    // CONVERTING TO BASE_64
    base64_image = fs.readFileSync(image_path, { encoding: "base64" })
    form_data["profile_picture"] = base64_image
}